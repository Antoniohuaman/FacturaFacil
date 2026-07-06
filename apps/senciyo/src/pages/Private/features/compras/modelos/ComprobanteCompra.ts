import type { LineaCompra } from './LineaCompra';
import type {
  TotalesCompra,
  MonedaCompra,
  DatosDetraccionCompra,
  DatosPercepcionCompra,
  DatosRetencionCompra,
} from './tiposBaseCompras';
import type { AdjuntoCompra } from './AdjuntoCompra';
import type { TrazabilidadCompra } from './TrazabilidadCompra';
import type { EventoHistorialCompras } from './EventoHistorialCompras';
import type { CreditScheduleTerms } from '@/shared/payments/paymentTerms';

export type EstadoDocumentoCC = 'borrador' | 'registrado' | 'anulado';
export type EstadoPagoCC = 'pendiente' | 'parcial' | 'pagado';
export type EstadoInventarioCC = 'pendiente' | 'parcial' | 'completo' | 'automatico' | 'no_aplica';

/** Define cómo este comprobante afecta el stock al ser registrado */
export type ModalidadInventarioCC =
  | 'con_nota_ingreso'
  | 'ingreso_automatico'
  | 'no_afecta_inventario';

export const ESTADO_DOCUMENTO_CC_LABELS: Record<EstadoDocumentoCC, string> = {
  borrador: 'Borrador',
  registrado: 'Registrado',
  anulado: 'Anulado',
};

export const ESTADO_PAGO_CC_LABELS: Record<EstadoPagoCC, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
};

export const ESTADO_INVENTARIO_CC_LABELS: Record<EstadoInventarioCC, string> = {
  pendiente: 'Sin ingresar',
  parcial: 'Ingreso parcial',
  completo: 'Ingreso completo',
  automatico: 'Ingreso automático',
  no_aplica: 'No aplica',
};

export const MODALIDAD_INVENTARIO_CC_LABELS: Record<ModalidadInventarioCC, string> = {
  con_nota_ingreso: 'Con Nota de Ingreso',
  ingreso_automatico: 'Ingreso automático de stock',
  no_afecta_inventario: 'No afecta inventario',
};

export interface ComprobanteCompra {
  // Identidad interna
  id: string;
  tipoRegistro: 'comprobante_compra';

  // Datos del documento del proveedor (NO es emisión propia)
  tipoComprobanteProveedor: string;
  serieProveedor: string;
  numeroProveedor: string;
  fechaEmisionProveedor: string;

  // Datos de registro interno
  fechaRegistro: string;
  fechaVencimiento?: string;
  serie?: string;
  correlativo?: string;

  // Proveedor
  proveedorId: string;
  proveedorTipoDocumento: string;
  proveedorNumeroDocumento: string;
  proveedorNombre: string;
  proveedorDireccionFacturacion?: string;
  proveedorDireccionEntrega?: string;

  // Tributario
  tipoOperacion?: string;

  // Comprador (usuario que registra)
  compradorId?: string;
  compradorNombre?: string;

  // Financiero
  moneda: MonedaCompra;
  tipoCambio?: number;
  formaPago: 'contado' | 'credito';
  condicionesPago?: string;
  /** Cronograma de cuotas específico de este comprobante cuando formaPago es 'credito'. */
  creditTerms?: CreditScheduleTerms;

  // Modalidad de afectación de inventario
  modalidadInventario: ModalidadInventarioCC;

  // Contenido
  lineas: LineaCompra[];
  totales: TotalesCompra;

  // Tributación especial
  detraccion?: DatosDetraccionCompra;
  percepcion?: DatosPercepcionCompra;
  retencion?: DatosRetencionCompra;

  // Campos opcionales
  centroCosto?: string;
  presupuesto?: string;
  observaciones?: string;
  observacionPresupuestal?: string;

  // Referencias a otros documentos
  ordenCompraOrigenId?: string;
  cuentaPorPagarId?: string;
  pagosRelacionados?: string[];
  notasIngresoRelacionadas?: string[];
  movimientosInventarioRelacionados?: string[];

  // Adjuntos y trazabilidad
  adjuntos: AdjuntoCompra[];
  trazabilidad?: TrazabilidadCompra;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  // Estados separados por dimensión
  estadoDocumento: EstadoDocumentoCC;
  estadoPago: EstadoPagoCC;
  estadoInventario: EstadoInventarioCC;

  // Anulación
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;
}
