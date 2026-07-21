// src/features/gestion-inventario/services/notaSalida.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock } from '../models';
import { InventoryService } from './inventory.service';
import { CORRELATIVO_DIGITOS_NS } from '../models/notaSalida.constants';
import type { NotaSalida, TipoSalida, LineaNotaSalida, DespachoOVBasico, PreparacionInventarioNS } from '../models/notaSalida.types';
import type { MovimientoMotivo } from '../models/inventory.types';
import type { DatosOperacionSalidaCuantitativa, DatosLineaOperacionCuantitativa } from '../models/operacionEntradaInventario.types';
import type { DatosAnulacionDocumentoInventario } from '../models/operacionReversoInventario.types';
import { parsearColeccion } from '../utils/operacionCuantitativaInventarioComun';
import { esProductoInventariable } from '../../../../../shared/inventory/clasificacionInventario';
import { obtenerReservasDeOV } from '../../../../../shared/documentosComerciales/postEmisionOrdenVenta';
import {
  resolvealmacenesForSaleFIFO,
  allocateSaleAcrossalmacenes,
  computeAvailable,
} from '../../../../../shared/inventory/stockGateway';
import { parsearEtiquetaImpuesto } from '@/shared/catalogos-sunat/resolucionTributaria';

// ─── Mapeo de tipo de salida a motivo Kardex ───────────────────────────────

const TIPO_SALIDA_A_MOTIVO: Record<TipoSalida, MovimientoMotivo> = {
  '01': 'VENTA',
  '04': 'OTRO',
  '06': 'DEVOLUCION_PROVEEDOR',
  '07': 'VENTA',
  '08': 'OTRO',
  '09': 'OTRO',
  '10': 'PRODUCCION',
  '11': 'TRANSFERENCIA_ALMACEN',
  '12': 'OTRO',
  '13': 'MERMA',
  '14': 'MERMA',
  '15': 'PRODUCTO_DAÑADO',
  '17': 'VENTA',
  '23': 'AJUSTE_INVENTARIO',
  '25': 'DEVOLUCION_PROVEEDOR',
  '27': 'PRODUCCION',
  '28': 'AJUSTE_INVENTARIO',
  '30': 'OTRO',
  '32': 'OTRO',
  '33': 'OTRO',
  '34': 'OTRO',
  '35': 'OTRO',
  '36': 'OTRO',
  '37': 'OTRO',
  '38': 'OTRO',
};

export const mapTipoSalidaAMotivo = (tipo: TipoSalida): MovimientoMotivo =>
  TIPO_SALIDA_A_MOTIVO[tipo];

// ─── Correlativo ──────────────────────────────────────────────────────────

export const generarCorrelativoNS = (
  notasExistentes: NotaSalida[],
  serie: string,
): string => {
  const usados = notasExistentes
    .filter(n => n.serie === serie && n.correlativo)
    .map(n => parseInt(n.correlativo ?? '0', 10))
    .filter(Number.isFinite);

  const siguiente = usados.length > 0 ? Math.max(...usados) + 1 : 1;
  return String(siguiente).padStart(CORRELATIVO_DIGITOS_NS, '0');
};

// ─── Formato documento origen ─────────────────────────────────────────────

/**
 * Devuelve el texto visible para la columna "Documento origen" de una NS.
 * Ejemplos: "Manual", "Boleta B001-00000012", "Factura F001-00000008",
 *           "OV01-00000005", "NV01-00000003"
 */
export function formatDocumentoOrigenNS(
  nota: Pick<NotaSalida, 'origen' | 'documentoOrigen' | 'numeroDocumentoOrigen'>,
): string {
  if (!nota.origen || nota.origen === 'Manual') return 'Manual';
  if (!nota.documentoOrigen) return 'Manual';
  if (nota.origen === 'Comprobante') {
    const t = nota.documentoOrigen.toLowerCase();
    let tipoCorto: string;
    if (t.includes('boleta')) tipoCorto = 'Boleta';
    else if (t.includes('factura')) tipoCorto = 'Factura';
    else tipoCorto = nota.documentoOrigen.split(' ')[0] ?? nota.documentoOrigen;
    return nota.numeroDocumentoOrigen
      ? `${tipoCorto} ${nota.numeroDocumentoOrigen}`
      : tipoCorto;
  }
  // OrdenVenta / NotaVenta: mostrar el número de documento; si no hay número, el tipo
  return nota.numeroDocumentoOrigen ?? nota.documentoOrigen;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────

/**
 * Adaptador delgado sobre `parsearEtiquetaImpuesto` (shared/catalogos-sunat/resolucionTributaria.ts)
 * — mismo criterio que `resolveIgvRate` (notaIngreso.service.ts): sin regex/palabras clave
 * propias, sin fallback silencioso a 18%. Un impuesto no resuelto devuelve 0, nunca una tasa
 * inventada.
 */
export const resolveIgvRateNS = (impuesto?: string): number => {
  const { categoria, tasa } = parsearEtiquetaImpuesto(impuesto);
  return categoria === 'gravado' ? tasa : 0;
};

export interface GrupoImpuestoNS {
  key: string;
  labelBase: string;
  labelIgv?: string;
  rate: number;
  base: number;
  igv: number;
}

export const calcularDesgloseTributarioNS = (lineas: LineaNotaSalida[]): GrupoImpuestoNS[] => {
  const grupos = new Map<string, GrupoImpuestoNS>();
  for (const l of lineas) {
    const rate = resolveIgvRateNS(l.impuesto);
    let key: string;
    let labelBase: string;
    let labelIgv: string | undefined;
    if (rate > 0) {
      const pct = Math.round(rate * 100);
      key = `igv_${rate}`;
      labelBase = 'Op. gravadas';
      labelIgv = `IGV ${pct}%`;
    } else {
      const lower = (l.impuesto ?? '').toLowerCase();
      if (lower.includes('exonerado')) { key = 'exonerado'; labelBase = 'Op. exoneradas'; }
      else if (lower.includes('inafecto')) { key = 'inafecto'; labelBase = 'Op. inafectas'; }
      else if (lower.includes('gratuita')) { key = 'gratuita'; labelBase = 'Op. gratuitas'; }
      else { key = 'no_gravado'; labelBase = 'Op. no gravadas'; }
    }
    const existing = grupos.get(key) ?? { key, labelBase, labelIgv, rate, base: 0, igv: 0 };
    existing.base = parseFloat((existing.base + l.subtotal).toFixed(2));
    existing.igv = parseFloat((existing.igv + l.igv).toFixed(2));
    grupos.set(key, existing);
  }
  return Array.from(grupos.values()).sort((a, b) => b.rate - a.rate);
};

// ─── Generación ───────────────────────────────────────────────────────────
//
// Etapa 1D (§6, §13.C): el cálculo de asignación FIFO/OV es PURO — no llama a
// `registerAdjustment` ni toca `localStorage`. Devuelve las líneas listas para el motor genérico
// (`ServicioKardexValorizado.registrarSalidaValorizada`, invocado por el llamador), que es quien
// ejecuta la reserva idempotente, la preparación y la escritura real en una sola confirmación.

export interface ResultadoPrepararSalidaNS {
  correlativo: string;
  numero: string;
  motivo: MovimientoMotivo;
  /** Líneas ya expandidas por almacén (una por asignación FIFO) — para mostrar y persistir en la NS. */
  lineasExpandidas: LineaNotaSalida[];
  /**
   * Líneas listas para `DatosOperacionSalidaCuantitativa.lineas` — el llamador solo agrega
   * empresaId/documentoId/claveIdempotencia/usuario/fecha. Puede estar vacío (NS compuesta
   * únicamente por servicios y/o productos legítimamente no inventariables) — en ese caso el
   * llamador NO invoca al motor: no hay operación, no hay versión nueva, no hay movimientos.
   * `liberarReservaOV`/`liberarReservaLegacyOV` ya van incluidos en cada línea que corresponda —
   * el motor los aplica en la MISMA escritura que el descuento de stock (corrección post-1D, §2).
   */
  lineasOperacion: DatosLineaOperacionCuantitativa[];
  /** Para `atenderOrdenVentaPostNSDirecta`/`atenderOrdenVentaPostNS` — misma cantidad que la liberación (global o legacy), pero reportada siempre, la maneje quien la maneje. */
  despachosOV: DespachoOVBasico[];
}

/**
 * Cálculo puro de la Nota de Salida (Etapa 1D, §6): resuelve correlativo/número, valida stock
 * suficiente con mensajes específicos de NS (validación PREVIA — antes de reservar, §10) y calcula
 * la distribución FIFO por almacén de cada línea. Nunca muta `productsMap` ni el catálogo — simula
 * el consumo de stock en memoria únicamente para que líneas repetidas del mismo producto dentro de
 * la misma NS se asignen correctamente entre almacenes.
 */
export function prepararSalidaNS(
  nota: NotaSalida,
  notasExistentes: NotaSalida[],
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  establecimientoId: string,
): ResultadoPrepararSalidaNS {
  if (nota.estado === 'Generada') {
    throw new Error('Esta Nota de Salida ya fue generada.');
  }
  if (nota.estado === 'Anulada') {
    throw new Error('No se puede generar una Nota de Salida anulada.');
  }
  if (nota.estado === 'Entregada') {
    throw new Error('No se puede generar una Nota de Salida entregada.');
  }
  if (nota.lineas.length === 0) {
    throw new Error('La Nota de Salida debe tener al menos una línea de producto.');
  }

  // Almacenes ordenados por prioridad de salida FIFO para el establecimiento activo.
  // Si no hay establecimientoId (edge case), usar todos los activos sin filtro por sede.
  const almacenesArray = Array.from(almacenesMap.values());
  let almacenesOrdenados = resolvealmacenesForSaleFIFO({
    almacenes: almacenesArray,
    EstablecimientoId: establecimientoId,
  });
  if (!almacenesOrdenados.length) {
    almacenesOrdenados = almacenesArray.filter(
      a => a.estaActivoAlmacen !== false && a.establecimientoId === establecimientoId,
    );
  }

  // Fail-closed (corrección post-1D, §4): un producto INEXISTENTE en una línea de "bien" es un
  // error de datos, nunca un motivo para excluir la línea en silencio — se rechaza el documento
  // completo antes de calcular nada más. Esto es distinto de "producto real pero no inventariable"
  // (tipoExistencia no controlado por stock), que sí puede excluirse legítimamente más abajo.
  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'bien' && !productsMap.get(linea.productoId)) {
      throw new Error(
        `La Nota de Salida referencia un producto inexistente ("${linea.productoNombre ?? linea.productoId}") en una línea de bien — no se puede generar.`,
      );
    }
  }

  // Línea inventariable: "bien" declarado en el documento Y producto realmente controlado por
  // stock (Etapa 1D, §14: reemplaza el filtro anterior `tipoBienServicio === 'bien'` que no
  // consultaba la clasificación real del catálogo — mismo criterio que NI/ajuste_positivo). El
  // guard anterior ya garantiza que, si `tipoBienServicio === 'bien'`, el producto existe.
  const esLineaInventariable = (linea: LineaNotaSalida): boolean => {
    if (linea.tipoBienServicio !== 'bien') return false;
    const producto = productsMap.get(linea.productoId) as Product;
    return esProductoInventariable(producto);
  };

  const lineasBienes = nota.lineas.filter(esLineaInventariable);
  const esNSVinculadaAOV = Boolean(nota.ordenVentaOrigenId);
  const reservasOV = esNSVinculadaAOV && nota.ordenVentaOrigenId
    ? obtenerReservasDeOV(nota.ordenVentaOrigenId)
    : [];

  // ── Validación de stock suficiente (TRANSACCIONAL: si falla una línea, abortar todo) ──
  // NS manual:       valida disponible libre total del establecimiento = Σ(real − reservado) por almacén.
  // NS vinculada OV: valida contra reserva pendiente propia = Σ min(ovOriginal, reservadoActual) por almacén OV.
  //   min() asegura que despachos parciales previos se reflejen en la reserva restante.
  for (const linea of lineasBienes) {
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    if (esNSVinculadaAOV) {
      const ovReservasProd = reservasOV.filter(r => r.sku === producto.codigo);
      if (ovReservasProd.length > 0) {
        // Suma la reserva pendiente de la OV para este producto.
        // Nueva arquitectura: reserva global por establecimiento (sin almacenId).
        // Legacy: reserva por almacén (con almacenId).
        const totalOvPendiente = ovReservasProd.reduce((sum, r) => {
          if (r.establecimientoId) {
            // Reserva global: la cantidad en la reserva ES la pendiente (ya calculada por calcularReservasPendientes)
            return sum + r.cantidad;
          }
          if (r.almacenId) {
            // Reserva legacy por almacén
            const reservadoAlmacen = InventoryService.getReservedStock(producto, r.almacenId);
            return sum + Math.min(r.cantidad, reservadoAlmacen);
          }
          return sum;
        }, 0);
        if (linea.cantidad > totalOvPendiente) {
          throw new Error(
            `La cantidad solicitada (${linea.cantidad}) excede la reserva pendiente de la Orden de Venta ` +
            `para "${linea.productoNombre}" (reserva pendiente: ${totalOvPendiente}).`,
          );
        }
        // Verificar también que el stock físico alcanza
        const realTotal = almacenesOrdenados.reduce(
          (s, a) => s + InventoryService.getStock(producto, a.id),
          0,
        );
        if (linea.cantidad > realTotal) {
          throw new Error(
            `No hay stock físico suficiente para "${linea.productoNombre}" ` +
            `(real disponible: ${realTotal}, solicitado: ${linea.cantidad}).`,
          );
        }
      } else {
        // Sin reserva OV para este producto → disponible libre como fallback
        const totalDisponible = almacenesOrdenados.reduce((sum, a) =>
          sum + computeAvailable(
            InventoryService.getStock(producto, a.id),
            InventoryService.getReservedStock(producto, a.id),
          ), 0);
        if (linea.cantidad > totalDisponible) {
          throw new Error(
            `No hay stock disponible suficiente para "${linea.productoNombre}" ` +
            `(disponible: ${totalDisponible}, solicitado: ${linea.cantidad}).`,
          );
        }
      }
    } else {
      const totalReservado = almacenesOrdenados.reduce(
        (s, a) => s + InventoryService.getReservedStock(producto, a.id),
        0,
      );
      const totalDisponible = almacenesOrdenados.reduce((sum, a) =>
        sum + computeAvailable(
          InventoryService.getStock(producto, a.id),
          InventoryService.getReservedStock(producto, a.id),
        ), 0);
      if (linea.cantidad > totalDisponible) {
        const totalReal = almacenesOrdenados.reduce(
          (s, a) => s + InventoryService.getStock(producto, a.id),
          0,
        );
        const detalle = totalReservado > 0
          ? ` (${totalReal} real − ${totalReservado} reservado = ${totalDisponible} disponible)`
          : ` (stock disponible: ${totalDisponible})`;
        throw new Error(
          `No hay stock disponible suficiente. Existen unidades reservadas para otros documentos. ` +
          `El producto "${linea.productoNombre}"${detalle} y se necesitan ${linea.cantidad}.`,
        );
      }
    }
  }

  // ── Cálculo puro de asignación (solo después de validar todo) — sin registerAdjustment ──
  const correlativo = generarCorrelativoNS(notasExistentes, nota.serie);
  const numero = `${nota.serie}-${correlativo}`;
  const motivo = mapTipoSalidaAMotivo(nota.tipoSalida);

  // Líneas expandidas por almacén real: reemplaza las líneas originales del usuario para que
  // la anulación pueda revertir exactamente el stock por almacén afectado.
  const lineasExpandidas: LineaNotaSalida[] = [];
  const lineasOperacion: DatosLineaOperacionCuantitativa[] = [];
  // Simula el consumo de stock EN MEMORIA (nunca en `productsMap`) para que una segunda línea del
  // mismo producto dentro de la misma NS asigne correctamente sobre lo que dejó la primera.
  const stockSimulado = new Map<string, Record<string, number>>();

  const obtenerProductoDeTrabajo = (productoId: string): Product | undefined => {
    const base = productsMap.get(productoId);
    if (!base) return undefined;
    const simulado = stockSimulado.get(productoId);
    return simulado ? { ...base, stockPorAlmacen: simulado } : base;
  };

  for (const linea of nota.lineas) {
    if (!esLineaInventariable(linea)) {
      lineasExpandidas.push(linea);
      continue;
    }

    // Garantizado por el guard fail-closed de arriba: una línea "bien" siempre tiene producto.
    const producto = obtenerProductoDeTrabajo(linea.productoId) as Product;

    // Calcular asignación por almacén según el tipo de NS
    const allocations: { almacenId: string; qty: number }[] = [];

    if (esNSVinculadaAOV) {
      const ovReservasProd = reservasOV.filter(r => r.sku === producto.codigo);
      // Legacy OV reservations have almacenId; new global reservations do not.
      // Only use per-almacén guided allocation if legacy reservations exist for this product.
      const ovReservasLegacy = ovReservasProd.filter(r => r.almacenId !== undefined && r.almacenId !== null);
      if (ovReservasLegacy.length > 0) {
        // Legacy: asignación guiada por la distribución de la OV (FIFO entre almacenes que reservó)
        const ovPorAlmacen = new Map<string, number>();
        for (const r of ovReservasLegacy) {
          if (r.almacenId) {
            ovPorAlmacen.set(r.almacenId, (ovPorAlmacen.get(r.almacenId) ?? 0) + r.cantidad);
          }
        }
        let remaining = linea.cantidad;
        for (const almacen of almacenesOrdenados) {
          if (remaining <= 0) break;
          const ovOriginal = ovPorAlmacen.get(almacen.id) ?? 0;
          if (ovOriginal <= 0) continue;
          const reservadoAlmacen = InventoryService.getReservedStock(producto, almacen.id);
          const pendiente = Math.min(ovOriginal, reservadoAlmacen);
          if (pendiente <= 0) continue;
          const take = Math.min(remaining, pendiente);
          allocations.push({ almacenId: almacen.id, qty: take });
          remaining -= take;
        }
      } else {
        // Nueva arquitectura (global OV reservation) o sin reserva: FIFO normal por almacén
        // La reserva global ya fue validada arriba; la salida física usa FIFO estándar.
        const fifo = allocateSaleAcrossalmacenes({
          product: producto,
          almacenesOrdered: almacenesOrdenados,
          qtyUnidadMinima: linea.cantidad,
          respectReservations: true,
        });
        for (const a of fifo) allocations.push({ almacenId: a.almacenId, qty: a.qtyUnidadMinima });
      }
    } else {
      // NS manual → FIFO por prioridad de almacenes
      const fifo = allocateSaleAcrossalmacenes({
        product: producto,
        almacenesOrdered: almacenesOrdenados,
        qtyUnidadMinima: linea.cantidad,
        respectReservations: true,
      });
      for (const a of fifo) allocations.push({ almacenId: a.almacenId, qty: a.qtyUnidadMinima });
    }

    // Fail-closed (corrección post-1D, §4): esta línea ya fue validada como stock suficiente en el
    // paso previo — una asignación vacía o parcial aquí es una inconsistencia real (no un caso
    // legítimo a omitir en silencio). Se rechaza el documento completo.
    const totalAsignado = allocations.reduce((sum, alloc) => sum + alloc.qty, 0);
    if (totalAsignado !== linea.cantidad) {
      throw new Error(
        `No se pudo asignar exactamente ${linea.cantidad} unidad(es) de "${linea.productoNombre}" entre los almacenes disponibles ` +
        `(asignado: ${totalAsignado}) — operación rechazada completa.`,
      );
    }

    const igvRate = resolveIgvRateNS(linea.impuesto);
    const stockPorAlmacenSimulado = { ...(producto.stockPorAlmacen ?? {}) };

    for (const alloc of allocations) {
      const almacenLinea = almacenesMap.get(alloc.almacenId);
      if (!almacenLinea) continue;

      stockPorAlmacenSimulado[alloc.almacenId] = (stockPorAlmacenSimulado[alloc.almacenId] ?? 0) - alloc.qty;

      const subSubtotal = parseFloat((alloc.qty * linea.pvUnitario).toFixed(2));
      const subIgv = parseFloat((subSubtotal * igvRate).toFixed(2));
      const idLineaExpandida = `${linea.id}-${alloc.almacenId}`;
      lineasExpandidas.push({
        ...linea,
        id: idLineaExpandida,
        almacenId: alloc.almacenId,
        almacenNombre: almacenLinea.nombreAlmacen,
        cantidad: alloc.qty,
        subtotal: subSubtotal,
        igv: subIgv,
        total: parseFloat((subSubtotal + subIgv).toFixed(2)),
      });

      lineasOperacion.push({
        lineaId: idLineaExpandida,
        productoId: linea.productoId,
        almacenId: alloc.almacenId,
        cantidadUnidadMinima: alloc.qty,
      });
    }

    stockSimulado.set(linea.productoId, stockPorAlmacenSimulado);
  }

  // Una NS compuesta únicamente por servicios y/o productos legítimamente no inventariables NUNCA
  // es un error (comportamiento preservado de antes de Etapa 1D) — `lineasOperacion` queda vacío,
  // el llamador debe omitir la llamada al motor por completo (sin operación, sin versión, sin
  // movimientos) y de todos modos permitir que la NS se marque como Generada.
  const despachosOV = aplicarLiberacionesOV(nota, lineasExpandidas, lineasOperacion, productsMap);

  return { correlativo, numero, motivo, lineasExpandidas, lineasOperacion, despachosOV };
}

/**
 * Asigna, en el arreglo `lineasOperacion` ya construido (mutándolo in-place), la liberación de
 * reserva de OV que corresponda a cada línea — arquitectura nueva (`liberarReservaOV`, por
 * establecimiento) y legacy (`liberarReservaLegacyOV`, por almacén). Depende ÚNICAMENTE de
 * `reservasOV` (el propio ledger de reservas de la OV, ver `obtenerReservasDeOV`) y de las
 * cantidades ya despachadas en `lineasExpandidas` — NUNCA del stock vigente del producto — por eso
 * es seguro volver a ejecutarla en un reintento (§1 de la corrección post-1D) sin recalcular FIFO.
 * Devuelve `despachosOV` para `atenderOrdenVentaPostNSDirecta`/`atenderOrdenVentaPostNS`.
 */
function aplicarLiberacionesOV(
  nota: Pick<NotaSalida, 'ordenVentaOrigenId' | 'almacenOrigenId'>,
  lineasExpandidas: LineaNotaSalida[],
  lineasOperacion: DatosLineaOperacionCuantitativa[],
  productsMap: Map<string, Product>,
): DespachoOVBasico[] {
  const despachosOV: DespachoOVBasico[] = [];
  if (!nota.ordenVentaOrigenId) return despachosOV;

  const reservasOV = obtenerReservasDeOV(nota.ordenVentaOrigenId);

  const despachoPorSku = new Map<string, number>();
  // Acumula por SKU+almacén (corrección post-1D, §3) — varias líneas expandidas de la misma NS
  // (mismo producto, mismo almacén, ya sea por dos líneas originales o por un reparto FIFO entre
  // varias) deben validar el TOTAL acumulado contra la reserva legacy, nunca cada una por separado.
  const despachoPorSkuAlm = new Map<string, number>();
  for (const linea of lineasExpandidas) {
    if (linea.tipoBienServicio !== 'bien') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto?.codigo) continue;
    despachoPorSku.set(producto.codigo, (despachoPorSku.get(producto.codigo) ?? 0) + linea.cantidad);
    const almId = linea.almacenId ?? nota.almacenOrigenId;
    if (!almId) continue;
    const claveSkuAlm = `${producto.codigo}::${almId}`;
    despachoPorSkuAlm.set(claveSkuAlm, (despachoPorSkuAlm.get(claveSkuAlm) ?? 0) + linea.cantidad);
  }

  const skusGlobalesLiberados = new Set<string>();
  for (const linea of lineasExpandidas) {
    if (linea.tipoBienServicio !== 'bien') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto?.codigo) continue;

    const reservaGlobal = reservasOV.find(r => r.sku === producto.codigo && r.establecimientoId);
    if (reservaGlobal?.establecimientoId) {
      if (skusGlobalesLiberados.has(producto.codigo)) continue;
      const totalDespachado = despachoPorSku.get(producto.codigo) ?? 0;
      if (totalDespachado <= 0) continue;
      // Suma TODAS las reservas del mismo SKU+establecimiento (corrección post-1D, §3) — nunca
      // solo la primera coincidencia.
      const maxLiberable = reservasOV
        .filter(r => r.sku === producto.codigo && r.establecimientoId)
        .reduce((s, r) => s + r.cantidad, 0);
      // Fail-closed: NUNCA `Math.min` para ocultar una inconsistencia — si el despacho excede la
      // reserva disponible, se rechaza la NS completa. Un despacho parcial legítimo (despachado <
      // reservado) libera EXACTAMENTE lo despachado, dejando el resto reservado.
      if (totalDespachado > maxLiberable) {
        throw new Error(
          `La cantidad despachada de "${producto.nombre}" (${totalDespachado}) excede la reserva pendiente de la Orden de Venta ` +
          `(${maxLiberable}) — operación rechazada completa.`,
        );
      }
      const lineaOp = lineasOperacion.find(op => op.lineaId === linea.id);
      if (lineaOp) {
        lineaOp.liberarReservaOV = { establecimientoId: reservaGlobal.establecimientoId, cantidad: totalDespachado };
        skusGlobalesLiberados.add(producto.codigo);
        despachosOV.push({ sku: producto.codigo, cantidad: totalDespachado, establecimientoId: reservaGlobal.establecimientoId });
      }
    } else {
      const almId = linea.almacenId ?? nota.almacenOrigenId;
      if (!almId) continue;
      // Suma TODAS las reservas legacy del mismo SKU+almacén (corrección post-1D, §3) — nunca solo
      // la primera coincidencia.
      const maxLiberable = reservasOV
        .filter(r => r.sku === producto.codigo && r.almacenId === almId)
        .reduce((s, r) => s + r.cantidad, 0);
      if (maxLiberable <= 0) {
        throw new Error(
          `No se encontró una reserva de la Orden de Venta para "${producto.nombre}" en el almacén "${almId}" — operación rechazada completa.`,
        );
      }
      // Valida el TOTAL acumulado (varias líneas del mismo SKU+almacén), no solo esta línea aislada.
      const claveSkuAlm = `${producto.codigo}::${almId}`;
      const totalDespachadoCombo = despachoPorSkuAlm.get(claveSkuAlm) ?? 0;
      if (totalDespachadoCombo > maxLiberable) {
        throw new Error(
          `La cantidad despachada de "${producto.nombre}" en el almacén "${almId}" (${totalDespachadoCombo}) excede la reserva pendiente ` +
          `(${maxLiberable}) — operación rechazada completa.`,
        );
      }
      // Legacy: cada línea expandida ya está atada a UN almacén — se libera en la MISMA línea
      // (corrección post-1D, §2: dentro del mismo plan, nunca en una llamada separada después
      // de confirmar). Libera EXACTAMENTE lo despachado por esta línea.
      const lineaOp = lineasOperacion.find(op => op.lineaId === linea.id);
      if (lineaOp) {
        lineaOp.liberarReservaLegacyOV = { cantidad: linea.cantidad };
        despachosOV.push({ sku: producto.codigo, cantidad: linea.cantidad, almacenId: almId });
      }
    }
  }

  return despachosOV;
}

/**
 * Construye el snapshot inmutable de preparación de inventario (§2 de la corrección post-1D) a
 * partir de un resultado recién calculado por `prepararSalidaNS` — se persiste en la NS junto con
 * `numero`/`correlativo`/`lineas`, ANTES de invocar al motor.
 */
export function construirPreparacionInventarioNS(resultado: ResultadoPrepararSalidaNS): PreparacionInventarioNS {
  return {
    lineasOperacion: resultado.lineasOperacion,
    despachosOV: resultado.despachosOV,
    sinMovimientoInventario: resultado.lineasOperacion.length === 0,
  };
}

function esLineaOperacionValida(valor: unknown): valor is DatosLineaOperacionCuantitativa {
  if (typeof valor !== 'object' || valor === null) return false;
  const l = valor as Record<string, unknown>;
  if (typeof l.lineaId !== 'string' || !l.lineaId.trim()) return false;
  if (typeof l.productoId !== 'string' || !l.productoId.trim()) return false;
  if (typeof l.almacenId !== 'string' || !l.almacenId.trim()) return false;
  if (typeof l.cantidadUnidadMinima !== 'number' || !Number.isFinite(l.cantidadUnidadMinima) || l.cantidadUnidadMinima <= 0) return false;
  return true;
}

/**
 * Reconstruye la operación de salida ÚNICAMENTE desde el snapshot INMUTABLE ya persistido
 * (`nota.preparacionInventario`) — corrección post-1D, §2. Nunca recalcula FIFO, nunca vuelve a
 * consultar `esProductoInventariable` ni el catálogo vigente, nunca reconstruye cantidades o
 * almacenes desde el stock actual: si el producto cambió de clasificación, desapareció del
 * catálogo, cambió el almacén o el stock desde la primera preparación, el snapshot ya congelado
 * sigue siendo la única fuente de verdad — así el hash coincide y el motor devuelve 'repetida' en
 * vez de descontar de nuevo. Si el snapshot está ausente, corrupto, incompleto o tiene IDs
 * duplicados, rechaza la NS completa.
 */
export function reconstruirOperacionNSDesdeSnapshot(nota: NotaSalida): ResultadoPrepararSalidaNS {
  if (!nota.numero || !nota.correlativo) {
    throw new Error(
      'reconstruirOperacionNSDesdeSnapshot: la Nota de Salida no tiene numero/correlativo asignado por un intento previo.',
    );
  }
  const snapshot = nota.preparacionInventario;
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error(
      'reconstruirOperacionNSDesdeSnapshot: la Nota de Salida no tiene un snapshot de preparación de inventario persistido — no se puede reintentar.',
    );
  }
  if (!Array.isArray(snapshot.lineasOperacion) || !Array.isArray(snapshot.despachosOV) || typeof snapshot.sinMovimientoInventario !== 'boolean') {
    throw new Error(
      'reconstruirOperacionNSDesdeSnapshot: el snapshot de preparación de inventario de la Nota de Salida está incompleto o corrupto.',
    );
  }
  if (snapshot.sinMovimientoInventario !== (snapshot.lineasOperacion.length === 0)) {
    throw new Error(
      'reconstruirOperacionNSDesdeSnapshot: el snapshot de preparación de inventario de la Nota de Salida es inconsistente (sinMovimientoInventario no coincide con las líneas persistidas).',
    );
  }

  const idsVistos = new Set<string>();
  for (const linea of snapshot.lineasOperacion) {
    if (!esLineaOperacionValida(linea)) {
      throw new Error('reconstruirOperacionNSDesdeSnapshot: el snapshot contiene una línea de operación inválida.');
    }
    if (idsVistos.has(linea.lineaId)) {
      throw new Error(`reconstruirOperacionNSDesdeSnapshot: el snapshot contiene la línea "${linea.lineaId}" duplicada.`);
    }
    idsVistos.add(linea.lineaId);
  }

  const motivo = mapTipoSalidaAMotivo(nota.tipoSalida);
  return {
    correlativo: nota.correlativo,
    numero: nota.numero,
    motivo,
    lineasExpandidas: nota.lineas,
    lineasOperacion: snapshot.lineasOperacion,
    despachosOV: snapshot.despachosOV,
  };
}

export interface ParametrosConstruirDatosOperacionSalidaNS {
  nota: NotaSalida;
  resultado: ResultadoPrepararSalidaNS;
  empresaId: string;
  usuario: string;
  fecha: string;
}

/** Ensambla el contrato del motor genérico (§7) a partir del cálculo puro de `prepararSalidaNS`. `nota.id` ya es estable y persistente (asignado al guardar el borrador) — no requiere sesión pendiente de UI. */
export function construirDatosOperacionSalidaNS(
  params: ParametrosConstruirDatosOperacionSalidaNS,
): DatosOperacionSalidaCuantitativa {
  const { nota, resultado, empresaId, usuario, fecha } = params;
  return {
    modoOperacion: 'cuantitativo',
    empresaId,
    documentoId: nota.id,
    tipoDocumento: 'nota_salida',
    tipoOperacion: 'nota_salida',
    claveIdempotencia: `nota_salida:${nota.id}`,
    usuario,
    fecha,
    motivo: resultado.motivo,
    observaciones: `NS ${resultado.numero} - ${nota.observaciones ?? ''}`.trim(),
    documentoReferencia: resultado.numero,
    lineas: resultado.lineasOperacion,
  };
}

/**
 * Construye el documento NS final (estado 'Generada') a partir del resultado ya CONFIRMADO por el
 * motor — nunca se marca 'Generada' antes de que la escritura real haya ocurrido.
 */
export function construirNotaSalidaGenerada(
  nota: NotaSalida,
  resultado: ResultadoPrepararSalidaNS,
  usuario: string,
  fecha: string,
): NotaSalida {
  return {
    ...nota,
    estado: 'Generada',
    esBorrador: false,
    correlativo: resultado.correlativo,
    numero: resultado.numero,
    lineas: resultado.lineasExpandidas,
    updatedAt: fecha,
    historial: [
      ...nota.historial,
      {
        fecha,
        usuario,
        accion: 'Generada',
        detalle: `Número asignado: ${resultado.numero}. ${resultado.lineasOperacion.length} movimiento(s) de stock procesados.`,
      },
    ],
  };
}

// ─── Anulación (Etapa 1E, §9) ───────────────────────────────────────────────
//
// Los movimientos ORIGINALES confirmados (`documentoOrigenId === nota.id`, `tipoDocumentoOrigen
// === 'nota_salida'`, `claveIdempotencia === 'nota_salida:${nota.id}'`) son la ÚNICA fuente de
// verdad — nunca se recalcula un ajuste desde `nota.lineas` actuales (que pudieron cambiar de
// almacén/catálogo desde que se generó la NS). `prepararAnulacionNS` es PURA: localiza esos
// movimientos y arma el contrato de `ServicioKardexValorizado.anularDocumentoValorizado`, sin
// tocar `localStorage` ni invocar al motor — eso le corresponde al llamador (`useNotasSalida.ts`),
// que solo debe marcar el documento 'Anulada' DESPUÉS de que Inventario confirme o repita.

function esMovimientoAlmacenable(valor: unknown): valor is MovimientoStock {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

export interface ResultadoPrepararAnulacionNS {
  /** `null` cuando la NS legítimamente no generó movimientos de inventario (solo servicios/no inventariables) — no hay nada que revertir. */
  datosAnulacion: DatosAnulacionDocumentoInventario | null;
}

export function prepararAnulacionNS(
  nota: NotaSalida,
  empresaId: string,
  movimientosRaw: string | null,
  motivo: string,
  usuario: string,
  fecha: string,
): ResultadoPrepararAnulacionNS {
  if (nota.estado !== 'Generada') {
    throw new Error(
      nota.estado === 'Entregada'
        ? 'No se puede anular una Nota de Salida en estado Entregada. Contacte a soporte para gestionar esta devolución.'
        : 'Solo se pueden anular Notas de Salida en estado Generada.',
    );
  }

  const claveOriginal = `nota_salida:${nota.id}`;
  const movimientosCrudos = parsearColeccion(movimientosRaw, 'la colección de movimientos');
  const movimientos: MovimientoStock[] = [];
  movimientosCrudos.forEach((elemento, indice) => {
    if (!esMovimientoAlmacenable(elemento)) {
      throw new Error(`notaSalida.service: el elemento en el índice ${indice} de la colección de movimientos no tiene la forma esperada.`);
    }
    movimientos.push(elemento);
  });

  const movimientosDeLaNS = movimientos.filter(
    (m) => m.documentoOrigenId === nota.id && m.tipoDocumentoOrigen === 'nota_salida' && m.claveIdempotencia === claveOriginal,
  );

  if (movimientosDeLaNS.length === 0) {
    if (nota.preparacionInventario?.sinMovimientoInventario) {
      return { datosAnulacion: null };
    }
    throw new Error(
      `No se encontraron los movimientos de inventario originales de la Nota de Salida "${nota.numero ?? nota.id}" — no se puede anular con seguridad.`,
    );
  }

  return {
    datosAnulacion: {
      empresaId,
      tipoOperacion: 'anulacion',
      documentoId: nota.id,
      tipoDocumentoOrigen: 'nota_salida',
      movimientoIds: movimientosDeLaNS.map((m) => m.id),
      claveIdempotencia: `ANULACION-nota_salida-${nota.id}`,
      usuario,
      fecha,
      motivoUsuario: motivo,
      documentoReferencia: nota.numero ?? nota.id,
    },
  };
}

/** Construye el documento 'Anulada' — solo debe persistirse DESPUÉS de que el motor confirme (o repita) la anulación. */
export function construirNotaSalidaAnulada(
  nota: NotaSalida,
  motivo: string,
  usuario: string,
  fecha: string,
  cantidadLineasRevertidas: number,
): NotaSalida {
  return {
    ...nota,
    estado: 'Anulada',
    motivoAnulacion: motivo,
    fechaAnulacion: fecha,
    usuarioAnulacion: usuario,
    updatedAt: fecha,
    historial: [
      ...nota.historial,
      {
        fecha,
        usuario,
        accion: 'Anulada',
        detalle: `Motivo: ${motivo}. Stock repuesto en ${cantidadLineasRevertidas} línea(s).`,
      },
    ],
  };
}

// ─── Marcar como entregada ────────────────────────────────────────────────

export const marcarNSComoEntregada = (nota: NotaSalida, usuario: string): NotaSalida => {
  if (nota.estado !== 'Generada') {
    throw new Error('Solo se puede marcar como entregada una Nota de Salida en estado Generada.');
  }
  const ahora = new Date().toISOString();
  return {
    ...nota,
    estado: 'Entregada',
    updatedAt: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Entregada',
        detalle: 'Mercancía entregada. Sin impacto adicional en stock.',
      },
    ],
  };
};

// ─── Duplicado ────────────────────────────────────────────────────────────

export const prepararDuplicadoNS = (original: NotaSalida): NotaSalida => {
  const ahora = new Date().toISOString();
  const hoy = ahora.split('T')[0];
  return {
    ...original,
    id: `NS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    estado: 'Borrador',
    esBorrador: true,
    correlativo: undefined,
    numero: undefined,
    fechaDocumento: hoy,
    fechaEntregaPrevista: undefined,
    createdAt: ahora,
    updatedAt: ahora,
    motivoAnulacion: undefined,
    fechaAnulacion: undefined,
    usuarioAnulacion: undefined,
    historial: [],
    lineas: original.lineas.map((l, i) => ({
      ...l,
      id: `linea-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    })),
  };
};
