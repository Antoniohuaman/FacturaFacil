// src/features/gestion-inventario/services/notaSalida.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../models';
import { InventoryService } from './inventory.service';
import { CORRELATIVO_DIGITOS_NS } from '../models/notaSalida.constants';
import type { NotaSalida, TipoSalida, LineaNotaSalida } from '../models/notaSalida.types';
import type { MovimientoMotivo } from '../models/inventory.types';
import { obtenerReservasDeOV } from '../../../../../shared/documentosComerciales/postEmisionOrdenVenta';
import {
  resolvealmacenesForSaleFIFO,
  allocateSaleAcrossalmacenes,
  computeAvailable,
} from '../../../../../shared/inventory/stockGateway';

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

export const resolveIgvRateNS = (impuesto?: string): number => {
  if (!impuesto) return 0.18;
  const lower = impuesto.toLowerCase();
  if (lower.includes('exonerado') || lower.includes('inafecto') || lower.includes('gratuita'))
    return 0;
  const m = impuesto.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) {
    const pct = parseFloat(m[1]);
    return Number.isFinite(pct) ? pct / 100 : 0.18;
  }
  return 0.18;
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

export interface ResultadoGenerarNS {
  notaActualizada: NotaSalida;
  productosActualizados: Product[];
  movimientos: MovimientoStock[];
}

export const generarNSEnInventario = (
  nota: NotaSalida,
  notasExistentes: NotaSalida[],
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  usuario: string,
  establecimientoId: string,
): ResultadoGenerarNS => {
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

  const lineasBienes = nota.lineas.filter(l => l.tipoBienServicio === 'bien');
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
        // Suma la reserva pendiente propia de la OV a través de todos los almacenes que reservó
        const totalOvPendiente = ovReservasProd.reduce((sum, r) => {
          const reservadoAlmacen = InventoryService.getReservedStock(producto, r.almacenId);
          return sum + Math.min(r.cantidad, reservadoAlmacen);
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

  // ── Procesamiento (solo después de validar todo) ──
  const correlativo = generarCorrelativoNS(notasExistentes, nota.serie);
  const numero = `${nota.serie}-${correlativo}`;
  const motivo = mapTipoSalidaAMotivo(nota.tipoSalida);
  const ahora = new Date().toISOString();

  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];
  // Líneas expandidas por almacén real: reemplaza las líneas originales del usuario para que
  // la anulación pueda revertir exactamente el stock por almacén afectado.
  const lineasExpandidas: LineaNotaSalida[] = [];

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') {
      lineasExpandidas.push(linea);
      continue;
    }

    const producto = productsMap.get(linea.productoId);
    if (!producto) {
      lineasExpandidas.push(linea);
      continue;
    }

    // Calcular asignación por almacén según el tipo de NS
    const allocations: { almacenId: string; qty: number }[] = [];

    if (esNSVinculadaAOV) {
      const ovReservasProd = reservasOV.filter(r => r.sku === producto.codigo);
      if (ovReservasProd.length > 0) {
        // Asignación guiada por la distribución de la OV (FIFO entre almacenes que reservó la OV)
        const ovPorAlmacen = new Map<string, number>();
        for (const r of ovReservasProd) {
          ovPorAlmacen.set(r.almacenId, (ovPorAlmacen.get(r.almacenId) ?? 0) + r.cantidad);
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
        // Sin reserva OV para este producto → FIFO normal
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

    if (!allocations.length) {
      lineasExpandidas.push(linea);
      continue;
    }

    const igvRate = resolveIgvRateNS(linea.impuesto);

    for (const alloc of allocations) {
      const almacenLinea = almacenesMap.get(alloc.almacenId);
      if (!almacenLinea) continue;

      // Leer el producto actualizado por las asignaciones anteriores del mismo producto
      const prodActual = productsMap.get(linea.productoId);
      if (!prodActual) continue;

      const data: StockAdjustmentData = {
        productoId: linea.productoId,
        almacenId: almacenLinea.id,
        tipo: 'SALIDA',
        motivo,
        cantidad: alloc.qty,
        observaciones: `NS ${numero} - ${nota.observaciones ?? ''}`.trim(),
        documentoReferencia: numero,
      };

      const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
        prodActual,
        almacenLinea,
        data,
        usuario,
      );

      const productoFinal = InventoryService.recalcularTotalesStock(productoActualizado, almacenesArray);
      productsMap.set(linea.productoId, productoFinal);
      productosActualizados.push(productoFinal);
      movimientos.push(movement);

      const subSubtotal = parseFloat((alloc.qty * linea.pvUnitario).toFixed(2));
      const subIgv = parseFloat((subSubtotal * igvRate).toFixed(2));
      lineasExpandidas.push({
        ...linea,
        id: `${linea.id}-${alloc.almacenId}`,
        almacenId: alloc.almacenId,
        almacenNombre: almacenLinea.nombreAlmacen,
        cantidad: alloc.qty,
        subtotal: subSubtotal,
        igv: subIgv,
        total: parseFloat((subSubtotal + subIgv).toFixed(2)),
      });
    }
  }

  const notaActualizada: NotaSalida = {
    ...nota,
    estado: 'Generada',
    esBorrador: false,
    correlativo,
    numero,
    lineas: lineasExpandidas,
    updatedAt: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Generada',
        detalle: `Número asignado: ${numero}. ${movimientos.length} movimiento(s) de stock procesados.`,
      },
    ],
  };

  return { notaActualizada, productosActualizados, movimientos };
};

// ─── Anulación ────────────────────────────────────────────────────────────

export interface ResultadoAnularNS {
  notaActualizada: NotaSalida;
  productosActualizados: Product[];
  movimientos: MovimientoStock[];
}

export const anularNSEnInventario = (
  nota: NotaSalida,
  productsMap: Map<string, Product>,
  almacenesMap: Map<string, Almacen>,
  motivo: string,
  usuario: string,
): ResultadoAnularNS => {
  if (nota.estado !== 'Generada') {
    throw new Error(
      nota.estado === 'Entregada'
        ? 'No se puede anular una Nota de Salida en estado Entregada. Contacte a soporte para gestionar esta devolución.'
        : 'Solo se pueden anular Notas de Salida en estado Generada.',
    );
  }

  const ahora = new Date().toISOString();
  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];
  const motivoMovimiento = mapTipoSalidaAMotivo(nota.tipoSalida);

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    const resolvedAlmId = linea.almacenId ?? nota.almacenOrigenId;
    if (!resolvedAlmId) continue;
    const almacenLinea = almacenesMap.get(resolvedAlmId);
    if (!almacenLinea) continue;

    const data: StockAdjustmentData = {
      productoId: linea.productoId,
      almacenId: almacenLinea.id,
      tipo: 'AJUSTE_POSITIVO',
      motivo: motivoMovimiento,
      cantidad: linea.cantidad,
      observaciones: `Anulación NS ${nota.numero ?? ''} - ${motivo}`.trim(),
      documentoReferencia: nota.numero ?? nota.id,
    };

    const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
      producto,
      almacenLinea,
      data,
      usuario,
    );

    const almacenesArray = Array.from(almacenesMap.values());
    const productoFinal = InventoryService.recalcularTotalesStock(productoActualizado, almacenesArray);
    productsMap.set(linea.productoId, productoFinal);
    productosActualizados.push(productoFinal);
    movimientos.push(movement);
  }

  const notaActualizada: NotaSalida = {
    ...nota,
    estado: 'Anulada',
    motivoAnulacion: motivo,
    fechaAnulacion: ahora,
    usuarioAnulacion: usuario,
    updatedAt: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Anulada',
        detalle: `Motivo: ${motivo}. Stock repuesto en ${movimientos.length} línea(s).`,
      },
    ],
  };

  return { notaActualizada, productosActualizados, movimientos };
};

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
