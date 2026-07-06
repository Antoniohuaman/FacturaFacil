import type { LineaCompra } from './LineaCompra';
import type { TotalesCompra, MonedaCompra } from './tiposBaseCompras';
import type { AdjuntoCompra } from './AdjuntoCompra';
import type { TrazabilidadCompra } from './TrazabilidadCompra';
import type { EventoHistorialCompras } from './EventoHistorialCompras';
import type { CreditScheduleTerms } from '@/shared/payments/paymentTerms';

export type EstadoDocumentoOC = 'borrador' | 'registrado' | 'cerrado' | 'anulado';
export type EstadoAprobacionOC = 'no_requiere' | 'pendiente' | 'aprobada' | 'rechazada';
export type EstadoRecepcionOC = 'pendiente' | 'parcial' | 'completa' | 'no_aplica';
export type EstadoFacturacionOC = 'pendiente' | 'parcial' | 'completa' | 'no_aplica';
export type EstadoInventarioOC = 'pendiente' | 'parcial' | 'completo' | 'automatico' | 'no_aplica';

export const ESTADO_DOCUMENTO_OC_LABELS: Record<EstadoDocumentoOC, string> = {
  borrador: 'Borrador',
  registrado: 'Registrado',
  cerrado: 'Cerrado',
  anulado: 'Anulado',
};

export const ESTADO_APROBACION_OC_LABELS: Record<EstadoAprobacionOC, string> = {
  no_requiere: 'Sin requerimiento',
  pendiente: 'Pendiente aprobación',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export const ESTADO_RECEPCION_OC_LABELS: Record<EstadoRecepcionOC, string> = {
  pendiente: 'Pendiente',
  parcial: 'Recepción parcial',
  completa: 'Recepción completa',
  no_aplica: 'No aplica',
};

export const ESTADO_FACTURACION_OC_LABELS: Record<EstadoFacturacionOC, string> = {
  pendiente: 'Sin facturar',
  parcial: 'Facturación parcial',
  completa: 'Facturación completa',
  no_aplica: 'No aplica',
};

export const ESTADO_INVENTARIO_OC_LABELS: Record<EstadoInventarioOC, string> = {
  pendiente: 'Sin ingresar',
  parcial: 'Ingreso parcial',
  completo: 'Ingreso completo',
  automatico: 'Ingreso automático',
  no_aplica: 'No aplica',
};

export interface OrdenCompra {
  // Identidad
  id: string;
  tipoDocumento: 'orden_compra';
  serie: string;
  correlativo: string;
  numero: string;

  // Fechas
  fechaEmision: string;
  fechaVencimiento?: string;
  fechaEntregaEsperada?: string;

  // Proveedor
  proveedorId: string;
  proveedorTipoDocumento: string;
  proveedorNumeroDocumento: string;
  proveedorNombre: string;
  proveedorDireccionFacturacion?: string;
  proveedorDireccionEntrega?: string;
  proveedorContactoId?: string;

  // Comprador (usuario que registra)
  compradorId?: string;
  compradorNombre?: string;

  // Financiero
  moneda: MonedaCompra;
  tipoCambio?: number;
  formaPago: 'contado' | 'credito';
  /** Identificador de la forma de pago real seleccionada en Configuración. */
  formaPagoMetodoId?: string;
  condicionesPago?: string;
  /** Cronograma de cuotas cuando formaPago es 'credito'. */
  creditTerms?: CreditScheduleTerms;

  // Aprobación básica
  requiereAprobacion: boolean;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  rechazadoPor?: string;
  fechaRechazo?: string;
  motivoRechazo?: string;

  // Contenido
  lineas: LineaCompra[];
  totales: TotalesCompra;

  // Campos opcionales
  centroCosto?: string;
  presupuesto?: string;
  observaciones?: string;
  observacionPresupuestal?: string;

  // Adjuntos y trazabilidad
  adjuntos?: AdjuntoCompra[];
  trazabilidad?: TrazabilidadCompra;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  // Estados separados por dimensión
  estadoDocumento: EstadoDocumentoOC;
  estadoAprobacion: EstadoAprobacionOC;
  estadoRecepcion: EstadoRecepcionOC;
  estadoFacturacion: EstadoFacturacionOC;
  estadoInventario: EstadoInventarioOC;

  // Anulación
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;

  // Referencias a documentos relacionados
  requerimientoCompraOrigenId?: string;
  comprobantesCompraRelacionados?: string[];
  notasIngresoRelacionadas?: string[];
}
