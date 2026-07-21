import type { CartItem, DatosFormularioDocumentoComercial } from '../models/documentoComercial.types';
import type { ReservaStockItem } from '../models/documentoComercial.types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { DatosLineaOperacionCuantitativa, DatosOperacionSalidaCuantitativa } from '../../gestion-inventario/models/operacionEntradaInventario.types';
import type { DatosAnulacionDocumentoInventario } from '../../gestion-inventario/models/operacionReversoInventario.types';
import type { MovimientoStock } from '../../gestion-inventario/models/inventory.types';
import { ServicioKardexValorizado } from '../../gestion-inventario/services/servicioKardexValorizado';
import { parsearColeccion } from '../../gestion-inventario/utils/operacionCuantitativaInventarioComun';
import { sincronizarInventarioTrasConfirmacion } from '../../../../../shared/inventory/accionesStock';
import {
  obtenerDatosOperacionPendiente,
  guardarDatosOperacionPendiente,
  limpiarSesionPendienteOperacion,
} from '../../../../../shared/inventory/sesionPendienteOperacionInventario';
import { serializarCanonicamente } from '../../gestion-inventario/utils/serializacionCanonicaInventario';
import { generarIdDocumento } from './documentoComercial.helpers';
import {
  summarizeProductStock,
  resolvealmacenesForSaleFIFO,
  allocateSaleAcrossalmacenes,
  calculateRequiredUnidadMinima,
} from '@/shared/inventory/stockGateway';

export const ESPACIO_NOTA_VENTA_SALIDA = 'nota_venta_salida';

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Determina si un ítem requiere validación/reserva de stock en una Orden de Venta.
 *
 * Reglas:
 * - Servicios: nunca validan stock.
 * - Ítems de entrada libre (modo libre): no tienen respaldo en catálogo, no se validan.
 * - Bienes de catálogo: siempre validan, independientemente de requiresStockControl.
 *   (requiresStockControl solo indica si el producto tiene datos de stock configurados,
 *    no si debe saltarse la validación en una OV.)
 * - Tipo desconocido de catálogo: validar salvo que requiresStockControl sea explícitamente false.
 */
function debeControlarStock(item: CartItem): boolean {
  if (item.tipoBienServicio === 'servicio') return false;
  if (item.tipoDetalle === 'libre') return false;
  if (item.tipoBienServicio === 'bien') return true;
  // Tipo no determinado para ítem de catálogo: validar si no está marcado explícitamente como "sin control"
  return item.requiresStockControl !== false;
}

/**
 * Verifica si el producto tiene datos de stock registrados en alguna fuente.
 */
function tieneStockDataRegistrado(producto: ReturnType<typeof useProductStore.getState>['allProducts'][number]): boolean {
  return Boolean(
    producto.stockPorAlmacen ||
    typeof producto.cantidad === 'number' ||
    (producto.stockPorEstablecimiento && Object.keys(producto.stockPorEstablecimiento).length > 0),
  );
}

/**
 * Consolida los ítems de un documento en cantidades por SKU en unidad mínima.
 * Solo incluye bienes de catálogo que requieran control de stock.
 * En modo 'validar' retorna error ante producto ausente o sin datos de stock;
 * en modo 'reservar' omite silenciosamente esos ítems.
 */
function prepararCantidadesReservaOV(
  items: CartItem[],
  modo: 'validar' | 'reservar',
): { cantidades: Map<string, { nombre: string; qtyEnUnidadMinima: number }>; error?: string } {
  const productos = useProductStore.getState().allProducts;
  const cantidades = new Map<string, { nombre: string; qtyEnUnidadMinima: number }>();

  for (const item of items) {
    if (!debeControlarStock(item)) continue;

    const producto = productos.find((p) => p.codigo === item.code);
    if (!producto) {
      if (modo === 'validar') {
        return {
          cantidades,
          error: `No se puede generar la orden de venta. El producto "${item.name}" no se encontró en el inventario. Solo los ítems del catálogo pueden incluirse en una Orden de Venta con reserva de stock.`,
        };
      }
      continue;
    }

    if (modo === 'validar' && !tieneStockDataRegistrado(producto)) {
      return {
        cantidades,
        error: `No se puede generar la orden de venta. El producto "${item.name}" no tiene stock registrado. Configure el stock del producto antes de incluirlo en una Orden de Venta.`,
      };
    }

    const qtyEnUnidadMinima = calculateRequiredUnidadMinima({
      product: producto,
      quantity: item.quantity,
      unitCode: item.presentacionId || item.unidadMedida || item.unit,
    });
    if (qtyEnUnidadMinima <= 0) continue;

    const existente = cantidades.get(item.code);
    if (existente) {
      existente.qtyEnUnidadMinima += qtyEnUnidadMinima;
    } else {
      cantidades.set(item.code, { nombre: item.name, qtyEnUnidadMinima });
    }
  }

  return { cantidades };
}

/**
 * Valida que todos los bienes de la orden tengan stock disponible suficiente.
 * Usa summarizeProductStock().totalAvailable que ya incluye la reserva global de OVs
 * (stockReservadoOVPorEstablecimiento) además de stockReservadoPorAlmacen.
 *
 * Si algún BIEN:
 *  - No se encuentra en el inventario (catálogo): bloquea.
 *  - No tiene stock registrado en ningún almacén: bloquea con mensaje específico.
 *  - Tiene stock registrado pero insuficiente: bloquea con cantidades.
 *
 * Servicios e ítems libres: nunca bloquean por stock.
 * Si la validación falla, no se modifica nada (sin correlativo, sin estado, sin reserva).
 */
export function validarStockParaOrden(
  items: CartItem[],
  almacenes: Almacen[],
  establecimientoId: string,
): { valido: boolean; error?: string } {
  const { cantidades, error } = prepararCantidadesReservaOV(items, 'validar');
  if (error) return { valido: false, error };

  const productos = useProductStore.getState().allProducts;
  for (const [sku, { nombre, qtyEnUnidadMinima }] of cantidades) {
    const producto = productos.find((p) => p.codigo === sku);
    if (!producto) continue;

    const resumen = summarizeProductStock({
      product: producto,
      almacenes,
      EstablecimientoId: establecimientoId,
    });
    if (resumen.totalAvailable < qtyEnUnidadMinima) {
      return {
        valido: false,
        error: `No se puede generar la orden de venta. El producto "${nombre}" no tiene stock disponible suficiente (disponible: ${resumen.totalAvailable}, solicitado: ${qtyEnUnidadMinima}).`,
      };
    }
  }

  return { valido: true };
}

/**
 * Reserva stock GLOBALMENTE para cada bien de la orden después de que la validación pasó.
 * Incrementa stockReservadoOVPorEstablecimiento en el producto del catálogo (NO por almacén).
 * No ejecuta FIFO. No modifica el stock real.
 * Consolida ítems duplicados del mismo SKU.
 * Retorna el detalle de cada reserva realizada con establecimientoId pero SIN almacenId.
 *
 * INVARIANTE: disponible = real - (stockReservadoPorAlmacen total) - (stockReservadoOVPorEstablecimiento)
 * El stock disponible disminuye al crear la OV y NO vuelve a disminuir al despachar.
 *
 * Solo se llama si validarStockParaOrden retornó { valido: true }.
 */
export function reservarStockOrden(
  items: CartItem[],
  _almacenes: Almacen[],
  establecimientoId: string,
): ReservaStockItem[] {
  const { cantidades } = prepararCantidadesReservaOV(items, 'reservar');

  const reservas: ReservaStockItem[] = [];

  for (const [sku, { nombre, qtyEnUnidadMinima: cantidad }] of cantidades) {
    // Leer estado fresco para no pisar actualizaciones previas en el mismo lote
    const productoCurrent = useProductStore.getState().allProducts.find((p) => p.codigo === sku);
    if (!productoCurrent) continue;

    const reservadoActual = toNum(
      (productoCurrent.stockReservadoOVPorEstablecimiento ?? {})[establecimientoId],
    );

    useProductStore.getState().updateProduct(productoCurrent.id, {
      stockReservadoOVPorEstablecimiento: {
        ...(productoCurrent.stockReservadoOVPorEstablecimiento ?? {}),
        [establecimientoId]: reservadoActual + cantidad,
      },
    });

    reservas.push({
      sku,
      nombre,
      cantidad,
      establecimientoId,
      // almacenId intencionalmente ausente — reserva global, no por almacén
    });
  }

  return reservas;
}

export interface ResultadoPrepararDescuentoDocumento {
  /** Mismo formato que el histórico `descontarStockParaDocumento` — usado por historial. La anulación (Etapa 1E, §2) ya no usa estas cantidades cacheadas: `prepararAnulacionDescuentoStockNV` localiza los movimientos ORIGINALES en su lugar. */
  reservasStock: ReservaStockItem[];
  /** Listas para `DatosOperacionSalidaCuantitativa.lineas` — el llamador arma el resto del contrato. */
  lineasOperacion: DatosLineaOperacionCuantitativa[];
}

/**
 * Cálculo puro (Etapa 1D, §6) de la distribución FIFO para descontar stock real de un documento
 * comercial en modo automático (Nota de Venta). Mismo criterio de selección de almacén que el
 * histórico `descontarStockParaDocumento` (ya migrado al motor central) — pero nunca muta
 * `useProductStore` ni llama a `InventoryService.registerAdjustment`: solo lee el estado actual y
 * simula el consumo EN MEMORIA para que dos líneas del mismo producto en el mismo documento se
 * asignen correctamente entre almacenes. El llamador debe ejecutar el resultado mediante
 * `ServicioKardexValorizado.registrarSalidaValorizada`.
 */
export function prepararDescuentoStockDocumento(
  items: CartItem[],
  almacenes: Almacen[],
  establecimientoId: string,
  operacionId: string,
): ResultadoPrepararDescuentoDocumento {
  const almacenesOrdered = resolvealmacenesForSaleFIFO({
    almacenes,
    EstablecimientoId: establecimientoId,
  });
  const almacenMap = new Map(almacenesOrdered.map((a) => [a.id, a]));
  const reservasStock: ReservaStockItem[] = [];
  const lineasOperacion: DatosLineaOperacionCuantitativa[] = [];
  const stockSimulado = new Map<string, Record<string, number>>();
  let indiceLinea = 0;

  for (const item of items) {
    if (!debeControlarStock(item)) continue;

    // Fail-closed (corrección post-1D, §4): un ítem que SÍ controla stock pero cuyo producto no
    // existe en el catálogo es un error de datos — nunca se omite en silencio, se rechaza el
    // documento completo.
    const productoBase = useProductStore.getState().allProducts.find((p) => p.codigo === item.code);
    if (!productoBase) {
      throw new Error(
        `El producto "${item.name}" (código "${item.code}") no se encontró en el catálogo — no se puede generar el documento.`,
      );
    }

    const simulado = stockSimulado.get(productoBase.id);
    const producto = simulado ? { ...productoBase, stockPorAlmacen: simulado } : productoBase;

    const qtyEnUnidadMinima = calculateRequiredUnidadMinima({
      product: producto,
      quantity: item.quantity,
      unitCode: item.presentacionId || item.unidadMedida || item.unit,
    });
    if (qtyEnUnidadMinima <= 0) continue;

    const allocations = allocateSaleAcrossalmacenes({
      product: producto,
      almacenesOrdered,
      qtyUnidadMinima: qtyEnUnidadMinima,
      respectReservations: true,
    });

    // Fail-closed (corrección post-1D, §4): una asignación vacía o parcial es una inconsistencia
    // real (el stock ya debió validarse antes con `validarStockParaOrden`) — nunca se omite en
    // silencio, se rechaza el documento completo.
    const totalAsignado = allocations.reduce((sum, alloc) => sum + alloc.qtyUnidadMinima, 0);
    if (totalAsignado !== qtyEnUnidadMinima) {
      throw new Error(
        `No se pudo asignar exactamente ${qtyEnUnidadMinima} unidad(es) de "${item.name}" entre los almacenes disponibles ` +
        `(asignado: ${totalAsignado}) — operación rechazada completa.`,
      );
    }

    const stockPorAlmacenSimulado = { ...(producto.stockPorAlmacen ?? {}) };
    for (const alloc of allocations) {
      const almacenObj = almacenMap.get(alloc.almacenId);
      if (!almacenObj) {
        throw new Error(
          `No se encontró el almacén "${alloc.almacenId}" al descontar stock para el documento.`,
        );
      }

      stockPorAlmacenSimulado[alloc.almacenId] = (stockPorAlmacenSimulado[alloc.almacenId] ?? 0) - alloc.qtyUnidadMinima;

      reservasStock.push({
        sku: producto.codigo,
        nombre: item.name,
        cantidad: alloc.qtyUnidadMinima,
        almacenId: alloc.almacenId,
        almacenNombre: almacenObj.nombreAlmacen,
      });

      lineasOperacion.push({
        lineaId: `${operacionId}-${indiceLinea}`,
        productoId: producto.id,
        almacenId: alloc.almacenId,
        cantidadUnidadMinima: alloc.qtyUnidadMinima,
      });
      indiceLinea += 1;
    }
    stockSimulado.set(producto.id, stockPorAlmacenSimulado);
  }

  return { reservasStock, lineasOperacion };
}

/**
 * Huella de la Nota de Venta para la sesión pendiente de idempotencia (corrección post-1D, §3) —
 * calculada a partir de `datos` (estable entre reintentos del mismo click), nunca del `numero`
 * generado dentro de la misma llamada. Incluye `documentoIdExistente` (corrección post-1D, §2):
 * un borrador con el mismo contenido que OTRO borrador nunca debe compartir sesión — sin este
 * campo, dos borradores de carrito idéntico producirían la MISMA huella y "robarían" la sesión
 * pendiente entre sí.
 */
export function construirHuellaNotaVenta(
  datos: DatosFormularioDocumentoComercial,
  establecimientoId: string,
  documentoIdExistente?: string,
): string {
  return serializarCanonicamente({
    tipo: datos.tipo,
    serie: datos.serie,
    establecimientoId,
    documentoIdExistente: documentoIdExistente ?? '',
    items: datos.items.map((item) => ({
      id: item.id,
      code: item.code ?? '',
      quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 0,
      tipoDetalle: item.tipoDetalle ?? '',
      requiresStockControl: Boolean(item.requiresStockControl),
      unidad: item.presentacionId ?? item.unidadMedida ?? item.unit ?? '',
    })),
  });
}

/**
 * Datos cacheados en la sesión pendiente de una Nota de Venta (corrección post-1D, §3).
 * `documentoId`/`numero`/`correlativo` se resuelven UNA sola vez (en la primera preparación real
 * para esta huella) y se reutilizan tal cual en cualquier reintento — incluso si mientras tanto
 * otro documento consumió el siguiente correlativo de la serie.
 */
export interface CacheDescuentoNV {
  documentoId: string;
  numero: string;
  correlativo: string;
  lineasOperacion: DatosLineaOperacionCuantitativa[];
  reservasStock: ReservaStockItem[];
}

function esLineaOperacionValida(valor: unknown): valor is DatosLineaOperacionCuantitativa {
  if (typeof valor !== 'object' || valor === null) return false;
  const l = valor as Record<string, unknown>;
  return (
    typeof l.lineaId === 'string' && l.lineaId.trim() !== '' &&
    typeof l.productoId === 'string' && l.productoId.trim() !== '' &&
    typeof l.almacenId === 'string' && l.almacenId.trim() !== '' &&
    typeof l.cantidadUnidadMinima === 'number' && Number.isFinite(l.cantidadUnidadMinima) && l.cantidadUnidadMinima > 0
  );
}

function esReservaStockValida(valor: unknown): valor is ReservaStockItem {
  if (typeof valor !== 'object' || valor === null) return false;
  const r = valor as Record<string, unknown>;
  return typeof r.sku === 'string' && r.sku.trim() !== '' && typeof r.cantidad === 'number' && Number.isFinite(r.cantidad);
}

/**
 * Validación en tiempo de ejecución de `CacheDescuentoNV` (corrección post-1D, §2) — una caché
 * corrupta o incompleta NUNCA puede tratarse como "ya calculada": eso omitiría el descuento de
 * inventario en silencio (p. ej. si `lineasOperacion` llegara corrupta como `[]`, el llamador
 * saltaría el motor creyendo que esta NV no afecta stock). Ante cualquier forma inesperada, se
 * descarta la caché por completo y se recalcula desde cero.
 */
function esCacheDescuentoNVValida(valor: unknown): valor is CacheDescuentoNV {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Record<string, unknown>;
  return (
    typeof c.documentoId === 'string' && c.documentoId.trim() !== '' &&
    typeof c.numero === 'string' && c.numero.trim() !== '' &&
    typeof c.correlativo === 'string' && c.correlativo.trim() !== '' &&
    Array.isArray(c.lineasOperacion) && c.lineasOperacion.every(esLineaOperacionValida) &&
    Array.isArray(c.reservasStock) && c.reservasStock.every(esReservaStockValida)
  );
}

export interface ParametrosEjecutarDescuentoStockNV {
  datos: DatosFormularioDocumentoComercial;
  almacenes: Almacen[];
  establecimientoId: string;
  empresaId: string;
  usuario: string;
  /** El `doc.id` real de un borrador ya persistido tiene prioridad absoluta; `undefined` cuando el documento es genuinamente nuevo. */
  documentoIdExistente: string | undefined;
  /** Solo se invoca en la primera preparación real (sin sesión cacheada) — nunca en un reintento. */
  resolverNumeroFallback: () => { numero: string; correlativo: string };
}

export interface ResultadoEjecutarDescuentoStockNV {
  documentoId: string;
  numero: string;
  correlativo: string;
  reservasStock: ReservaStockItem[];
  limpiarSesion: () => void;
}

/**
 * Limpia explícitamente la sesión pendiente de `nota_venta_salida` — corrección post-1D, §2: debe
 * invocarse al cancelar el formulario de Nota de Venta o al iniciar otro documento, nunca durante
 * un fallo incierto de la propia preparación/confirmación (esa sesión debe sobrevivir al
 * reintento). Evita que una sesión abandonada quede disponible para un borrador o documento futuro
 * cuyo contenido coincida por casualidad.
 */
export function cancelarNotaVentaPendiente(empresaId: string): void {
  limpiarSesionPendienteOperacion(ESPACIO_NOTA_VENTA_SALIDA, empresaId);
}

/**
 * Descuenta stock real para una Nota de Venta en modo automático mediante el motor central de
 * salidas — orquestación real y testeable (no un `useCallback` acoplado a React), compartida por
 * `generarDocumento` y `generarDesdeBorrador`.
 *
 * Corrección post-1D:
 * - §1/§3: la huella de contenido determina si ya existe una preparación cacheada — si existe, se
 *   reutiliza TAL CUAL (documentoId, numero, correlativo, líneas), sin recalcular FIFO contra un
 *   stock que pudo haber cambiado, y sin generar otro correlativo aunque mientras tanto otro
 *   documento haya consumido el siguiente número de la serie.
 * - Identidad del documento: `documentoIdExistente` (el `doc.id` real, ya estable, cuando se genera
 *   desde un borrador) tiene prioridad absoluta.
 * - §5 (persistencia única): sincroniza la UI con `sincronizarInventarioTrasConfirmacion`, nunca con `updateProduct`.
 * - La sesión NO se limpia aquí — el llamador debe invocar `limpiarSesion()` únicamente después de
 *   persistir el documento comercial completo.
 */
export async function ejecutarDescuentoStockNV(
  params: ParametrosEjecutarDescuentoStockNV,
): Promise<ResultadoEjecutarDescuentoStockNV> {
  const { datos, almacenes, establecimientoId, empresaId, usuario, documentoIdExistente, resolverNumeroFallback } = params;
  // `documentoIdExistente` forma parte de la huella (corrección post-1D, §2): dos borradores con
  // el mismo contenido nunca comparten sesión pendiente.
  const huella = construirHuellaNotaVenta(datos, establecimientoId, documentoIdExistente);
  const limpiarSesion = () => limpiarSesionPendienteOperacion(ESPACIO_NOTA_VENTA_SALIDA, empresaId);

  const cacheCruda = obtenerDatosOperacionPendiente<unknown>(ESPACIO_NOTA_VENTA_SALIDA, empresaId, huella);
  let cache: CacheDescuentoNV | undefined = esCacheDescuentoNVValida(cacheCruda) ? cacheCruda : undefined;

  // Prioridad real al documentoIdExistente (corrección post-1D, §2): un `doc.id` real ya
  // persistido nunca debe ceder ante una caché que apunte a una identidad distinta (defensivo
  // ante una caché corrupta o remanente de otro flujo) — se descarta y se recalcula desde cero.
  if (cache && documentoIdExistente && cache.documentoId !== documentoIdExistente) {
    cache = undefined;
  }

  if (!cache) {
    const { numero, correlativo } = resolverNumeroFallback();
    const documentoId = documentoIdExistente ?? generarIdDocumento();
    const resultadoPrep = prepararDescuentoStockDocumento(datos.items, almacenes, establecimientoId, documentoId);
    cache = {
      documentoId,
      numero,
      correlativo,
      lineasOperacion: resultadoPrep.lineasOperacion,
      reservasStock: resultadoPrep.reservasStock,
    };
    guardarDatosOperacionPendiente(ESPACIO_NOTA_VENTA_SALIDA, empresaId, huella, documentoId, cache);
  }

  if (cache.lineasOperacion.length > 0) {
    const almacenesMap = new Map(almacenes.map((a) => [a.id, a]));
    const datosOperacion: DatosOperacionSalidaCuantitativa = {
      modoOperacion: 'cuantitativo',
      empresaId,
      documentoId: cache.documentoId,
      tipoDocumento: 'venta',
      tipoOperacion: 'venta_salida',
      claveIdempotencia: `${ESPACIO_NOTA_VENTA_SALIDA}:${cache.documentoId}`,
      usuario,
      fecha: new Date().toISOString(),
      motivo: 'VENTA',
      observaciones: `Nota de Venta ${cache.numero}`,
      documentoReferencia: cache.numero,
      lineas: cache.lineasOperacion,
    };

    await ServicioKardexValorizado.registrarSalidaValorizada(datosOperacion, {
      almacenes: almacenesMap,
      generarId: () => crypto.randomUUID(),
      fechaActual: () => new Date().toISOString(),
    });

    // Sincronización oficial de UI (Etapa 1B) — nunca una segunda escritura de productos.
    sincronizarInventarioTrasConfirmacion();
  }

  return {
    documentoId: cache.documentoId,
    numero: cache.numero,
    correlativo: cache.correlativo,
    reservasStock: cache.reservasStock,
    limpiarSesion,
  };
}

function esMovimientoAlmacenable(valor: unknown): valor is MovimientoStock {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

/**
 * Localiza los movimientos ORIGINALES confirmados del descuento de stock de una Nota de Venta
 * (`documentoOrigenId === documentoId`, `tipoDocumentoOrigen === 'venta'`, `claveIdempotencia ===
 * 'nota_venta_salida:${documentoId}'`) y construye el contrato para
 * `ServicioKardexValorizado.anularDocumentoValorizado` (cierre final de Etapa 1E, §2) — NUNCA
 * recalcula el ajuste desde las cantidades cacheadas en `reservasStock`. Función pura: no toca
 * `localStorage` ni invoca al motor — el llamador (`useDocumentoComercialActions.ts`) debe
 * hacerlo y solo marcar el documento 'Anulada' DESPUÉS de que Inventario confirme o repita.
 */
export function prepararAnulacionDescuentoStockNV(
  documentoId: string,
  empresaId: string,
  movimientosRaw: string | null,
  usuario: string,
  fecha: string,
): DatosAnulacionDocumentoInventario {
  const claveOriginal = `${ESPACIO_NOTA_VENTA_SALIDA}:${documentoId}`;
  const movimientosCrudos = parsearColeccion(movimientosRaw, 'la colección de movimientos');
  const movimientos: MovimientoStock[] = [];
  movimientosCrudos.forEach((elemento, indice) => {
    if (!esMovimientoAlmacenable(elemento)) {
      throw new Error(`servicioReservaStock: el elemento en el índice ${indice} de la colección de movimientos no tiene la forma esperada.`);
    }
    movimientos.push(elemento);
  });

  const movimientosDeLaNV = movimientos.filter(
    (m) => m.documentoOrigenId === documentoId && m.tipoDocumentoOrigen === 'venta' && m.claveIdempotencia === claveOriginal,
  );
  if (movimientosDeLaNV.length === 0) {
    throw new Error(
      `No se encontraron los movimientos de inventario originales de la Nota de Venta "${documentoId}" — no se puede anular con seguridad.`,
    );
  }

  return {
    empresaId,
    tipoOperacion: 'anulacion',
    documentoId,
    tipoDocumentoOrigen: 'venta',
    movimientoIds: movimientosDeLaNV.map((m) => m.id),
    claveIdempotencia: `ANULACION-venta-${documentoId}`,
    usuario,
    fecha,
  };
}

/**
 * Libera la reserva global de stock al anular una Orden de Venta.
 * Maneja tanto reservas nuevas (con establecimientoId) como reservas legacy (con almacenId).
 * - Nueva: decrementa stockReservadoOVPorEstablecimiento[establecimientoId].
 * - Legacy (almacenId): decrementa stockReservadoPorAlmacen[almacenId].
 * Nunca permite stock reservado negativo.
 */
export function liberarReservaOrden(reservas: ReservaStockItem[]): void {
  for (const reserva of reservas) {
    const producto = useProductStore.getState().allProducts.find((p) => p.codigo === reserva.sku);
    if (!producto) continue;

    if (reserva.establecimientoId) {
      // Nueva reserva global por establecimiento
      const reservadoActual = toNum(
        (producto.stockReservadoOVPorEstablecimiento ?? {})[reserva.establecimientoId],
      );
      const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoOVPorEstablecimiento: {
          ...(producto.stockReservadoOVPorEstablecimiento ?? {}),
          [reserva.establecimientoId]: nuevoReservado,
        },
      });
    } else if (reserva.almacenId) {
      // Reserva legacy por almacén (compatibilidad con OVs creadas antes de esta versión)
      const reservadoActual = toNum(
        (producto.stockReservadoPorAlmacen ?? {})[reserva.almacenId],
      );
      const nuevoReservado = Math.max(0, reservadoActual - reserva.cantidad);
      useProductStore.getState().updateProduct(producto.id, {
        stockReservadoPorAlmacen: {
          ...(producto.stockReservadoPorAlmacen ?? {}),
          [reserva.almacenId]: nuevoReservado,
        },
      });
    }
  }
}
