// gestion-inventario/utils/operacionCuantitativaInventarioComun.ts
//
// Núcleo COMÚN, sin dirección (entrada o salida), del motor cuantitativo de Kardex Valorizado
// (Etapas 1C/1D, §5 del encargo de 1D: "no copies entradaCuantitativaInventario.ts para cambiar
// únicamente signos y nombres"). Todo lo que es genuinamente independiente de la dirección de la
// operación vive aquí una sola vez: normalización canónica de líneas, DTO canónico para el hash,
// validación pura del contrato, verificación de que la reserva corresponde a la operación, lectura
// defensiva de snapshots, y el cálculo secuencial de mutaciones (consolidación por
// producto+almacén, construcción del `MovimientoStock`, liberación opcional de una reserva de OV).
//
// `entradaCuantitativaInventario.ts` (Etapa 1C) y `salidaCuantitativaInventario.ts` (Etapa 1D)
// importan de aquí y solo aportan lo que SÍ difiere por dirección: qué signo corresponde a cada
// `tipoOperacion`, a qué `MovimientoTipo` se traduce, y qué validación de línea adicional aplica
// (p. ej. clasificación inventariable). Nunca se lee ni se escribe `localStorage` aquí — los
// snapshots llegan ya leídos por el llamador (`services/servicioKardexValorizado.ts`).

import type { Product } from '../../catalogo-articulos/models/types';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import { lsKey } from '../../../../../shared/tenant';
import type { DatosLineaOperacionCuantitativa, DatosOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { MovimientoStock, MovimientoTipo, TipoDocumentoOrigenMovimiento } from '../models/inventory.types';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { serializarCanonicamente } from './serializacionCanonicaInventario';
import { calcularHashInventario } from './hashInventario';
import { redondearAPrecision, PRECISION_CANTIDAD_UNIDAD_MINIMA } from './precisionInventario';
import { InventoryService } from '../services/inventory.service';

/**
 * Orden canónico y determinista de las líneas: el mismo conjunto de líneas en cualquier orden de
 * entrada produce siempre esta misma secuencia. Usado tanto para el hash de idempotencia como
 * para el cálculo real de mutaciones — la MISMA normalización en ambos sitios es lo que garantiza
 * que `cantidadAnterior`/`cantidadNueva` por línea sean deterministas sin importar el orden
 * accidental de construcción en memoria del llamador.
 */
export function ordenarLineasCanonicamente(
  lineas: readonly DatosLineaOperacionCuantitativa[]
): DatosLineaOperacionCuantitativa[] {
  return [...lineas].sort((a, b) => (a.lineaId < b.lineaId ? -1 : a.lineaId > b.lineaId ? 1 : 0));
}

/**
 * DTO de negocio canónico que se hashea: solo datos que cambian el significado de la operación —
 * incluye `motivo`/`observaciones`/`documentoReferencia` normalizados (persistidos tal cual en
 * `MovimientoStock`; cambiarlos bajo la misma clave es una operación distinta, nunca un reintento
 * legítimo) — y excluye IDs de movimientos (todavía no existen), fechas técnicas, y cualquier dato
 * de UI. `liberarReservaOV`, cuando está presente, también forma parte del contexto de negocio: un
 * mismo documento que en un reintento libera una porción de reserva distinta es una operación
 * distinta.
 */
export function construirDtoCanonicoOperacion(datos: DatosOperacionCuantitativa): Record<string, unknown> {
  const lineas = ordenarLineasCanonicamente(datos.lineas).map((linea) => ({
    lineaId: linea.lineaId,
    productoId: linea.productoId,
    almacenId: linea.almacenId,
    cantidadUnidadMinima: linea.cantidadUnidadMinima,
    liberarReservaOV: linea.liberarReservaOV
      ? { establecimientoId: linea.liberarReservaOV.establecimientoId, cantidad: linea.liberarReservaOV.cantidad }
      : null,
    liberarReservaLegacyOV: linea.liberarReservaLegacyOV
      ? { cantidad: linea.liberarReservaLegacyOV.cantidad }
      : null,
  }));

  return {
    modoOperacion: datos.modoOperacion,
    empresaId: datos.empresaId,
    documentoId: datos.documentoId,
    tipoDocumento: datos.tipoDocumento,
    tipoOperacion: datos.tipoOperacion,
    motivo: datos.motivo,
    observaciones: (datos.observaciones ?? '').trim(),
    documentoReferencia: (datos.documentoReferencia ?? '').trim(),
    lineas,
  };
}

/** Hash de idempotencia de una operación cuantitativa (entrada o salida) — nunca fabricado a mano por el consumidor. */
export function calcularHashOperacionCuantitativa(datos: DatosOperacionCuantitativa): Promise<string> {
  return calcularHashInventario(serializarCanonicamente(construirDtoCanonicoOperacion(datos)));
}

export const TIPOS_DOCUMENTO_ORIGEN_MOVIMIENTO: readonly TipoDocumentoOrigenMovimiento[] = [
  'comprobante_compra', 'nota_ingreso', 'nota_salida', 'ajuste', 'importacion', 'transferencia', 'venta', 'nota_credito', 'migracion',
];

/** `ReferenciaDocumentoTipoOperacionIdempotente` (Etapa 1B) y `TipoDocumentoOrigenMovimiento` (MovimientoStock) son dos enums distintos con miembros solapados — este guard evita un cast al construir `documentoOrigenId`/`tipoDocumentoOrigen`. */
export function esTipoDocumentoOrigenMovimiento(valor: string): valor is TipoDocumentoOrigenMovimiento {
  return (TIPOS_DOCUMENTO_ORIGEN_MOVIMIENTO as readonly string[]).includes(valor);
}

/**
 * Validación PURA del contrato: depende únicamente de `datos`, nunca de un snapshot de
 * productos/movimientos ni de la reserva. Por eso es segura de ejecutar ANTES de reservar — a
 * diferencia de la validación funcional (producto/almacén existen, stock resultante), que sí
 * depende del estado externo y por lo tanto puede dar una respuesta distinta según el momento en
 * que se ejecute (p. ej. una operación 'repetida' ya aplicada no debe volver a validarse contra el
 * estado YA mutado).
 */
export function validarContrato(datos: DatosOperacionCuantitativa): void {
  if (datos.modoOperacion !== 'cuantitativo') {
    throw new Error(
      `operacionCuantitativaInventarioComun: modoOperacion "${String(datos.modoOperacion)}" no está soportado — solo se acepta la variante cuantitativa.`
    );
  }
  if (!datos.empresaId.trim()) throw new Error('operacionCuantitativaInventarioComun: empresaId no puede estar vacío.');
  if (!datos.documentoId.trim()) throw new Error('operacionCuantitativaInventarioComun: documentoId no puede estar vacío.');
  if (!datos.claveIdempotencia.trim()) throw new Error('operacionCuantitativaInventarioComun: claveIdempotencia no puede estar vacía.');
  if (!datos.usuario.trim()) throw new Error('operacionCuantitativaInventarioComun: usuario no puede estar vacío.');
  if (!datos.fecha.trim()) throw new Error('operacionCuantitativaInventarioComun: fecha no puede estar vacía.');
  if (datos.lineas.length === 0) {
    throw new Error('operacionCuantitativaInventarioComun: la operación debe tener al menos una línea.');
  }

  const idsVistos = new Set<string>();
  for (const linea of datos.lineas) {
    if (!linea.lineaId.trim()) throw new Error('operacionCuantitativaInventarioComun: lineaId no puede estar vacío.');
    if (idsVistos.has(linea.lineaId)) {
      throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" está duplicada en la misma operación.`);
    }
    idsVistos.add(linea.lineaId);
    if (!linea.productoId.trim()) throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" no tiene productoId.`);
    if (!linea.almacenId.trim()) throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" no tiene almacenId.`);
    if (!Number.isFinite(linea.cantidadUnidadMinima) || linea.cantidadUnidadMinima <= 0) {
      throw new Error(
        `operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" tiene una cantidad inválida (${linea.cantidadUnidadMinima}) — debe ser finita y mayor a cero.`
      );
    }
    const redondeada = redondearAPrecision(linea.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);
    if (redondeada !== linea.cantidadUnidadMinima) {
      throw new Error(
        `operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" tiene una cantidad (${linea.cantidadUnidadMinima}) con más precisión que la permitida (${PRECISION_CANTIDAD_UNIDAD_MINIMA} decimales).`
      );
    }
    if (linea.liberarReservaOV) {
      if (!linea.liberarReservaOV.establecimientoId.trim()) {
        throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" tiene liberarReservaOV sin establecimientoId.`);
      }
      if (!Number.isFinite(linea.liberarReservaOV.cantidad) || linea.liberarReservaOV.cantidad <= 0) {
        throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" tiene una cantidad de liberarReservaOV inválida.`);
      }
    }
    if (linea.liberarReservaLegacyOV) {
      if (!Number.isFinite(linea.liberarReservaLegacyOV.cantidad) || linea.liberarReservaLegacyOV.cantidad <= 0) {
        throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" tiene una cantidad de liberarReservaLegacyOV inválida.`);
      }
    }
  }
}

/** Verifica que la operación ya reservada corresponda exactamente a esta operación (empresa, clave, hash, tipo) — nunca se confía en la reserva sin volver a comprobarla. */
export function validarReservaCoincide(
  datos: DatosOperacionCuantitativa,
  operacionReservada: OperacionIdempotenteInventario,
  hashEntrada: string
): void {
  if (operacionReservada.empresaId !== datos.empresaId) {
    throw new Error('operacionCuantitativaInventarioComun: la operación reservada pertenece a otra empresa.');
  }
  if (operacionReservada.clave !== datos.claveIdempotencia) {
    throw new Error('operacionCuantitativaInventarioComun: la operación reservada no corresponde a la clave de idempotencia de esta operación.');
  }
  if (operacionReservada.hashEntrada !== hashEntrada) {
    throw new Error('operacionCuantitativaInventarioComun: la operación reservada no corresponde al hash de esta operación.');
  }
  if (operacionReservada.tipoOperacion !== datos.tipoOperacion) {
    throw new Error('operacionCuantitativaInventarioComun: la operación reservada no corresponde al tipo de operación de esta operación.');
  }
}

export function parsearColeccion(raw: string | null, nombreRecurso: string): unknown[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`operacionCuantitativaInventarioComun: ${nombreRecurso} no es un arreglo — no se puede interpretar como colección.`);
  }
  return parsed;
}

export function esProductoAlmacenable(valor: unknown): valor is Product {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

export interface ResultadoMutacionesCuantitativas {
  movimientosGenerados: MovimientoStock[];
  /** Solo los productos tocados por esta operación, ya con `recalcularTotalesStock` aplicado. */
  productosActualizados: Product[];
  /** Colección completa de productos, con las actualizaciones ya fusionadas — lista para serializar. */
  productosFinales: Product[];
  /** Colección completa de movimientos (anteriores + nuevos) — lista para serializar. */
  movimientosFinales: unknown[];
  claveProductos: string;
  claveMovimientos: string;
}

export interface ParametrosCalcularMutacionesCuantitativas {
  datos: DatosOperacionCuantitativa;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  /** `1` para toda entrada real, `-1` para toda salida real — resuelto por el motor de dirección (entrada/salida) a partir de `tipoOperacion`, nunca derivado aquí. */
  signo: 1 | -1;
  /** `MovimientoTipo` ya resuelto a partir de `tipoOperacion` por el motor de dirección. */
  tipoMovimiento: MovimientoTipo;
  /** Validación adicional específica del dominio de cada motor de dirección (p. ej. clasificación inventariable) — se ejecuta por línea, ya con producto y almacén resueltos, antes de calcular stock. */
  validarLinea?: (contexto: { producto: Product; almacen: Almacen; linea: DatosLineaOperacionCuantitativa }) => void;
  /**
   * Configuración de TENANT (no de documento — nunca forma parte del hash de idempotencia, igual
   * que `almacenes`), por eso llega aquí y no en `datos`. Cuando es `true`, una línea puede dejar
   * el stock en negativo sin que la operación completa se rechace (Etapa 1D, §21: venta con
   * `allowNegativeStock` configurado — el único consumidor que hoy necesita esto es
   * `venta_salida`). Por defecto `false`/ausente: idéntico al comportamiento ya aprobado de NS,
   * ajuste_negativo y toda entrada — nunca se permite negativo salvo que el llamador lo declare
   * explícitamente.
   */
  permitirStockNegativo?: boolean;
}

/**
 * Cálculo puro y completo de un documento cuantitativo (entrada o salida): valida el contrato,
 * valida que cada línea referencie un producto y un almacén reales, calcula todas las mutaciones
 * en memoria consolidando líneas repetidas del mismo producto+almacén de forma secuencial (en el
 * orden canónico, no en el orden de entrada), libera opcionalmente la porción de reserva de OV que
 * cada línea declare, y devuelve las colecciones finales listas para escribir. Nunca toca
 * `localStorage`. No depende de que exista una reserva — se puede invocar ANTES de reservar
 * (validación temprana) y de nuevo antes de confirmar (con el snapshot más reciente), sin duplicar
 * la lógica de cálculo.
 */
export function calcularMutacionesCuantitativas(
  params: ParametrosCalcularMutacionesCuantitativas
): ResultadoMutacionesCuantitativas {
  const { datos, productosRaw, movimientosRaw, almacenes, generarId, signo, tipoMovimiento, validarLinea, permitirStockNegativo } = params;

  validarContrato(datos);

  if (!esTipoDocumentoOrigenMovimiento(datos.tipoDocumento)) {
    throw new Error(`operacionCuantitativaInventarioComun: tipoDocumento "${datos.tipoDocumento}" no es válido como origen de un movimiento de stock.`);
  }
  const tipoDocumentoOrigen = datos.tipoDocumento;

  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, datos.empresaId);
  const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, datos.empresaId);

  const productosCrudos = parsearColeccion(productosRaw, `la colección de productos ("${claveProductos}")`);
  const productos: Product[] = [];
  productosCrudos.forEach((elemento, indice) => {
    if (!esProductoAlmacenable(elemento)) {
      throw new Error(`operacionCuantitativaInventarioComun: el elemento en el índice ${indice} de "${claveProductos}" no tiene la forma esperada de un producto.`);
    }
    productos.push(elemento);
  });
  const productosPorId = new Map(productos.map((producto) => [producto.id, producto] as const));

  const movimientosAnteriores = parsearColeccion(movimientosRaw, `la colección de movimientos ("${claveMovimientos}")`);

  const fechaOperacion = new Date(datos.fecha);

  const stockTrabajo = new Map<string, number>(); // clave: `${productoId}:${almacenId}`
  const reservaTrabajo = new Map<string, number>(); // clave: `${productoId}:${establecimientoId}` — reserva OV (nueva) restante en memoria
  const reservaLegacyTrabajo = new Map<string, number>(); // clave: `${productoId}:${almacenId}` — reserva OV legacy restante en memoria
  const productosTocadosIds: string[] = [];
  const movimientosGenerados: MovimientoStock[] = [];
  // Para validar que ninguna liberación (nueva o legacy) exceda el total realmente despachado del
  // producto EN ESTA MISMA operación (corrección post-1D, §2) — nunca se corrige en silencio.
  const despachoTotalPorProducto = new Map<string, number>();
  const liberadoEstablecimientoPorProducto = new Map<string, number>();
  const liberadoLegacyPorProducto = new Map<string, number>();

  for (const linea of ordenarLineasCanonicamente(datos.lineas)) {
    const producto = productosPorId.get(linea.productoId);
    if (!producto) {
      throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" referencia un producto ("${linea.productoId}") que no existe en el catálogo.`);
    }
    const almacen = almacenes.get(linea.almacenId);
    if (!almacen) {
      throw new Error(`operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" referencia un almacén ("${linea.almacenId}") que no existe.`);
    }

    validarLinea?.({ producto, almacen, linea });

    const claveStock = `${linea.productoId}:${linea.almacenId}`;
    const cantidadAnterior = stockTrabajo.has(claveStock)
      ? (stockTrabajo.get(claveStock) as number)
      : (producto.stockPorAlmacen?.[linea.almacenId] ?? 0);
    const cantidadNueva = redondearAPrecision(cantidadAnterior + signo * linea.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);

    if (cantidadNueva < 0 && !permitirStockNegativo) {
      throw new Error(
        `operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" dejaría el stock de "${producto.nombre}" en "${almacen.nombreAlmacen}" en ${cantidadNueva} (negativo) — operación rechazada completa.`
      );
    }

    stockTrabajo.set(claveStock, cantidadNueva);
    if (!productosTocadosIds.includes(linea.productoId)) {
      productosTocadosIds.push(linea.productoId);
    }
    despachoTotalPorProducto.set(
      linea.productoId,
      (despachoTotalPorProducto.get(linea.productoId) ?? 0) + linea.cantidadUnidadMinima
    );

    if (linea.liberarReservaOV) {
      const claveReserva = `${linea.productoId}:${linea.liberarReservaOV.establecimientoId}`;
      const reservaAnterior = reservaTrabajo.has(claveReserva)
        ? (reservaTrabajo.get(claveReserva) as number)
        : (producto.stockReservadoOVPorEstablecimiento?.[linea.liberarReservaOV.establecimientoId] ?? 0);
      const reservaNueva = redondearAPrecision(reservaAnterior - linea.liberarReservaOV.cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);
      if (reservaNueva < 0) {
        throw new Error(
          `operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" liberaría ${linea.liberarReservaOV.cantidad} de la reserva OV de "${producto.nombre}" en el establecimiento "${linea.liberarReservaOV.establecimientoId}", pero solo hay ${reservaAnterior} reservados — operación rechazada completa.`
        );
      }
      reservaTrabajo.set(claveReserva, reservaNueva);
      liberadoEstablecimientoPorProducto.set(
        linea.productoId,
        (liberadoEstablecimientoPorProducto.get(linea.productoId) ?? 0) + linea.liberarReservaOV.cantidad
      );
      if (!productosTocadosIds.includes(linea.productoId)) {
        productosTocadosIds.push(linea.productoId);
      }
    }

    if (linea.liberarReservaLegacyOV) {
      const claveReservaLegacy = `${linea.productoId}:${linea.almacenId}`;
      const reservaLegacyAnterior = reservaLegacyTrabajo.has(claveReservaLegacy)
        ? (reservaLegacyTrabajo.get(claveReservaLegacy) as number)
        : (producto.stockReservadoPorAlmacen?.[linea.almacenId] ?? 0);
      const reservaLegacyNueva = redondearAPrecision(reservaLegacyAnterior - linea.liberarReservaLegacyOV.cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);
      if (reservaLegacyNueva < 0) {
        throw new Error(
          `operacionCuantitativaInventarioComun: la línea "${linea.lineaId}" liberaría ${linea.liberarReservaLegacyOV.cantidad} de la reserva OV legacy de "${producto.nombre}" en "${almacen.nombreAlmacen}", pero solo hay ${reservaLegacyAnterior} reservados — operación rechazada completa.`
        );
      }
      reservaLegacyTrabajo.set(claveReservaLegacy, reservaLegacyNueva);
      liberadoLegacyPorProducto.set(
        linea.productoId,
        (liberadoLegacyPorProducto.get(linea.productoId) ?? 0) + linea.liberarReservaLegacyOV.cantidad
      );
      if (!productosTocadosIds.includes(linea.productoId)) {
        productosTocadosIds.push(linea.productoId);
      }
    }

    movimientosGenerados.push({
      id: generarId(),
      productoId: producto.id,
      productoCodigo: producto.codigo,
      productoNombre: producto.nombre,
      tipo: tipoMovimiento,
      motivo: datos.motivo,
      cantidad: linea.cantidadUnidadMinima,
      cantidadAnterior,
      cantidadNueva,
      usuario: datos.usuario,
      observaciones: datos.observaciones,
      documentoReferencia: datos.documentoReferencia,
      fecha: fechaOperacion,
      almacenId: almacen.id,
      almacenCodigo: almacen.codigoAlmacen,
      almacenNombre: almacen.nombreAlmacen,
      EstablecimientoId: almacen.establecimientoId,
      EstablecimientoCodigo: almacen.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacen.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: false,
      empresaId: datos.empresaId,
      documentoOrigenId: datos.documentoId,
      tipoDocumentoOrigen,
      lineaOrigenId: linea.lineaId,
      estado: 'confirmado',
      claveIdempotencia: datos.claveIdempotencia,
    });
  }

  // Cruce final: ninguna liberación (nueva + legacy) puede exceder lo realmente despachado del
  // mismo producto EN ESTA operación — nunca se asume que el llamador ya lo garantizó.
  for (const [productoId, totalLiberado] of [
    ...liberadoEstablecimientoPorProducto.entries(),
    ...liberadoLegacyPorProducto.entries(),
  ].reduce((acumulado, [productoId, cantidad]) => {
    acumulado.set(productoId, (acumulado.get(productoId) ?? 0) + cantidad);
    return acumulado;
  }, new Map<string, number>())) {
    const totalDespachado = despachoTotalPorProducto.get(productoId) ?? 0;
    if (totalLiberado > totalDespachado) {
      const producto = productosPorId.get(productoId);
      throw new Error(
        `operacionCuantitativaInventarioComun: la operación libera ${totalLiberado} de reserva OV para "${producto?.nombre ?? productoId}" pero solo despacha ${totalDespachado} en esta misma operación — operación rechazada completa.`
      );
    }
  }

  const almacenesArray = Array.from(almacenes.values());
  const productosActualizados: Product[] = productosTocadosIds.map((productoId) => {
    const producto = productosPorId.get(productoId) as Product;
    const stockPorAlmacenActualizado = { ...(producto.stockPorAlmacen ?? {}) };
    stockTrabajo.forEach((cantidad, clave) => {
      const separadorIndice = clave.indexOf(':');
      const pid = clave.slice(0, separadorIndice);
      const almacenId = clave.slice(separadorIndice + 1);
      if (pid === productoId) {
        stockPorAlmacenActualizado[almacenId] = cantidad;
      }
    });

    const reservaOVActualizada = { ...(producto.stockReservadoOVPorEstablecimiento ?? {}) };
    let tieneReservaActualizada = false;
    reservaTrabajo.forEach((cantidad, clave) => {
      const separadorIndice = clave.indexOf(':');
      const pid = clave.slice(0, separadorIndice);
      const establecimientoId = clave.slice(separadorIndice + 1);
      if (pid === productoId) {
        reservaOVActualizada[establecimientoId] = cantidad;
        tieneReservaActualizada = true;
      }
    });

    const reservaLegacyActualizada = { ...(producto.stockReservadoPorAlmacen ?? {}) };
    let tieneReservaLegacyActualizada = false;
    reservaLegacyTrabajo.forEach((cantidad, clave) => {
      const separadorIndice = clave.indexOf(':');
      const pid = clave.slice(0, separadorIndice);
      const almacenId = clave.slice(separadorIndice + 1);
      if (pid === productoId) {
        reservaLegacyActualizada[almacenId] = cantidad;
        tieneReservaLegacyActualizada = true;
      }
    });

    const productoConStockNuevo: Product = {
      ...producto,
      stockPorAlmacen: stockPorAlmacenActualizado,
      ...(tieneReservaActualizada ? { stockReservadoOVPorEstablecimiento: reservaOVActualizada } : {}),
      ...(tieneReservaLegacyActualizada ? { stockReservadoPorAlmacen: reservaLegacyActualizada } : {}),
      fechaActualizacion: fechaOperacion,
    };
    return InventoryService.recalcularTotalesStock(productoConStockNuevo, almacenesArray);
  });

  const productosActualizadosPorId = new Map(productosActualizados.map((producto) => [producto.id, producto] as const));
  const productosFinales = productos.map((producto) => productosActualizadosPorId.get(producto.id) ?? producto);

  return {
    movimientosGenerados,
    productosActualizados,
    productosFinales,
    movimientosFinales: [...movimientosAnteriores, ...movimientosGenerados],
    claveProductos,
    claveMovimientos,
  };
}
