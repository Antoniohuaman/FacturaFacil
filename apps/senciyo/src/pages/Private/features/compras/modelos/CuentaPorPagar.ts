import type { MonedaCompra } from './tiposBaseCompras';
import type { EventoHistorialCompras } from './EventoHistorialCompras';

export type EstadoPagoCxP = 'pendiente' | 'parcial' | 'pagada' | 'anulada';
export type EstadoVencimientoCxP = 'vigente' | 'por_vencer' | 'vence_hoy' | 'vencida';

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

export interface CuentaPorPagar {
  id: string;

  // Origen
  comprobanteCompraId: string;
  comprobanteCompraNumero: string;
  tipoComprobanteOrigen: string;

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
