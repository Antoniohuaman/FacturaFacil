import type { MonedaCompra } from './tiposBaseCompras';
import type { AdjuntoCompra } from './AdjuntoCompra';
import type { EventoHistorialCompras } from './EventoHistorialCompras';

export type EstadoDocumentoPago = 'registrado' | 'anulado';

export const ESTADO_DOCUMENTO_PAGO_LABELS: Record<EstadoDocumentoPago, string> = {
  registrado: 'Registrado',
  anulado: 'Anulado',
};

export interface MedioPagoCompra {
  id: string;
  medioPagoCodigo: string;
  medioPagoNombre: string;
  monto: number;
  moneda?: MonedaCompra;
  tipoCambio?: number;
  cajaId?: string;
  cuentaBancariaId?: string;
  referenciaOperacion?: string;
  fechaOperacion?: string;
}

export interface PagoCompra {
  id: string;
  numeroPago: string;

  // Fechas
  fechaPago: string;

  // Proveedor
  proveedorId: string;
  proveedorNombre: string;

  // Financiero
  moneda: MonedaCompra;
  tipoCambio?: number;
  montoTotalPagado: number;

  // Medios de pago (múltiples medios en un mismo pago)
  mediosPago: MedioPagoCompra[];

  // CxP aplicadas (Fase 1: solo una; Fase 2: múltiples)
  cuentasPorPagarAplicadas: string[];
  comprobantesCompraAplicados: string[];

  /**
   * Cuando la CxP de origen tiene cronograma real (varias cuotas), registra
   * exactamente qué cuota recibió cuánto — permite anular el pago revirtiendo
   * la cuota correcta, en vez de redistribuir de la más antigua a la más
   * nueva. Ausente en pagos de contado o CxP sin cuotas (comportamiento
   * agregado ya existente, sin cambios).
   */
  asignacionesCuotas?: Array<{ cuotaId: string; monto: number }>;

  // Caja / Cuenta bancaria principal
  cajaId?: string;
  cuentaBancariaId?: string;

  // Sustento del pago
  documentoSustentoTipo?: string;
  documentoSustentoSerie?: string;
  documentoSustentoNumero?: string;

  // Notas
  concepto?: string;
  observaciones?: string;
  adjuntos?: AdjuntoCompra[];

  // Estado
  estadoDocumento: EstadoDocumentoPago;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
}
