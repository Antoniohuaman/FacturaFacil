// src/features/gestion-inventario/services/notaSalida.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../models';
import { InventoryService } from './inventory.service';
import { CORRELATIVO_DIGITOS_NS } from '../models/notaSalida.constants';
import type { NotaSalida, TipoSalida, LineaNotaSalida } from '../models/notaSalida.types';
import type { MovimientoMotivo } from '../models/inventory.types';

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

  const almacen = almacenesMap.get(nota.almacenOrigenId);
  if (!almacen) {
    throw new Error('Almacén de origen no encontrado.');
  }
  if (!almacen.estaActivoAlmacen) {
    throw new Error(
      `No se puede generar la Nota de Salida: el almacén "${almacen.nombreAlmacen}" está inactivo. Actívalo desde Configuración → Almacenes antes de registrar salidas.`,
    );
  }

  // ── Validación de stock suficiente (TRANSACCIONAL: si falla una línea, abortar todo) ──
  const lineasBienes = nota.lineas.filter(l => l.tipoBienServicio === 'bien');
  for (const linea of lineasBienes) {
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;
    const almacenLinea = almacenesMap.get(linea.almacenId ?? nota.almacenOrigenId);
    if (!almacenLinea) continue;
    const stockActual = InventoryService.getStock(producto, almacenLinea.id);
    if (stockActual < linea.cantidad) {
      throw new Error(
        `No hay stock suficiente en el almacén seleccionado para generar la nota de salida. ` +
        `El producto "${linea.productoNombre}" tiene stock ${stockActual} en "${almacenLinea.nombreAlmacen}" ` +
        `y se necesitan ${linea.cantidad}.`,
      );
    }
  }

  // ── Procesamiento (solo después de validar todo) ──
  const correlativo = generarCorrelativoNS(notasExistentes, nota.serie);
  const numero = `${nota.serie}-${correlativo}`;
  const motivo = mapTipoSalidaAMotivo(nota.tipoSalida);
  const ahora = new Date().toISOString();

  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;

    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    const almacenLinea = almacenesMap.get(linea.almacenId ?? nota.almacenOrigenId);
    if (!almacenLinea) continue;

    const data: StockAdjustmentData = {
      productoId: linea.productoId,
      almacenId: almacenLinea.id,
      tipo: 'SALIDA',
      motivo,
      cantidad: linea.cantidad,
      observaciones: `NS ${numero} - ${nota.observaciones ?? ''}`.trim(),
      documentoReferencia: numero,
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
    estado: 'Generada',
    esBorrador: false,
    correlativo,
    numero,
    origen: 'Manual',
    updatedAt: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Generada',
        detalle: `Número asignado: ${numero}. ${movimientos.length} línea(s) procesadas.`,
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

    const almacenLinea = almacenesMap.get(linea.almacenId ?? nota.almacenOrigenId);
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
