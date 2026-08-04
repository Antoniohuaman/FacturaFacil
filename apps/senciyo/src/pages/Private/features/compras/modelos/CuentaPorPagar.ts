import type { MonedaCompra } from './tiposBaseCompras';
import type { EventoHistorialCompras } from './EventoHistorialCompras';
import type { EstadoPago } from '@/shared/status/estadoPago';

export type EstadoPagoCxP = 'pendiente' | 'parcial' | 'pagada' | 'anulada';
export type EstadoVencimientoCxP = 'vigente' | 'por_vencer' | 'vence_hoy' | 'vencida';

/**
 * Reexporta el tipo transversal `EstadoPago` (`shared/status/estadoPago.ts`,
 * fuente canónica) por compatibilidad con el código existente que lo importa
 * desde aquí (`ComprobanteCompra.ts` como `EstadoPagoCC`, `Gasto.ts` como
 * `EstadoPagoGasto`) — nunca una segunda unión paralela.
 */
export type { EstadoPago };

export const ESTADO_PAGO_CXP_LABELS: Record<EstadoPagoCxP, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

export const ESTADO_VENCIMIENTO_CXP_LABELS: Record<EstadoVencimientoCxP, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vence_hoy: 'Vence hoy',
  vencida: 'Vencida',
};

export interface CuotaCuentaPorPagar {
  id: string;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCuota: number;
  montoPagado: number;
  saldoPendiente: number;
  diasCredito?: number;
  estadoPago: 'pendiente' | 'parcial' | 'pagada';
  estadoVencimiento: EstadoVencimientoCxP;
}

/**
 * Origen documental de una Cuenta por Pagar — generalización aditiva (nunca
 * una segunda CxP paralela) para que Gastos reutilice el mismo motor de
 * aplicar/revertir pago sin acoplarse a `ComprobanteCompra`. Ausente en
 * registros persistidos ANTES de esta generalización: se normaliza a
 * `'compra'` al leer (ver `repositorios/repositorioCuentasPorPagar.ts`),
 * nunca se asume en el resto del código sin pasar por esa normalización.
 */
export type TipoOrigenCxP = 'compra' | 'gasto';

export interface CuentaPorPagar {
  id: string;

  // Origen — `tipoOrigen`/`documentoOrigenId` son la fuente canónica y
  // genérica; `comprobanteCompraId`/`comprobanteCompraNumero`/
  // `tipoComprobanteOrigen` se conservan SOLO para `tipoOrigen === 'compra'`
  // (compatibilidad con todo el código y las pruebas existentes de Compras
  // — nunca una segunda fuente independiente: `documentoOrigenId` siempre
  // espeja `comprobanteCompraId` cuando el origen es 'compra'). Para
  // `tipoOrigen === 'gasto'` quedan como cadena vacía — ningún consumidor de
  // Compras debe leerlos sin filtrar antes por `tipoOrigen === 'compra'`.
  tipoOrigen: TipoOrigenCxP;
  documentoOrigenId: string;
  comprobanteCompraId: string;
  comprobanteCompraNumero: string;
  tipoComprobanteOrigen: string;
  /**
   * Referencia propia y neutral del documento origen (§4 de la corrección
   * puntual) — para "compra" no se usa (ya cubierto por
   * `comprobanteCompraNumero`); para "gasto" es la `referenciaInterna` del
   * Gasto (ej. "G001-00000004"). Nunca confundir con el documento
   * sustentatorio del proveedor (`numeroDocumentoSustentatorio`).
   */
  numeroDocumentoOrigen?: string;
  /**
   * Documento sustentatorio del proveedor asociado al gasto (ej. "Factura ·
   * F001-000123"), cuando existe — un dato SEPARADO del documento origen,
   * nunca interpretado como si fuera el propio documento del sistema.
   * Ausente para origen "compra" (`comprobanteCompraNumero`/
   * `tipoComprobanteOrigen` YA son ese documento).
   */
  numeroDocumentoSustentatorio?: string;

  // Proveedor
  proveedorId: string;
  proveedorNombre: string;
  proveedorNumeroDocumento: string;

  // Financiero
  moneda: MonedaCompra;
  tipoCambio?: number;
  total: number;
  totalPagado: number;
  saldoPendiente: number;

  // Condiciones
  formaPago: 'contado' | 'credito';
  formaPagoMetodoId?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  cuotas?: CuotaCuentaPorPagar[];

  // Estados
  estadoPago: EstadoPagoCxP;
  estadoVencimiento: EstadoVencimientoCxP;

  // Relaciones
  pagosRelacionados: string[];

  // Auditoría
  historial: EventoHistorialCompras[];
  observaciones?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}
