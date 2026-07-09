export type { EventoHistorialCompras } from './EventoHistorialCompras';

export type { TipoAdjuntoCompra, AdjuntoCompra } from './AdjuntoCompra';
export { TIPO_ADJUNTO_COMPRA_LABELS } from './AdjuntoCompra';

export type { TrazabilidadCompra } from './TrazabilidadCompra';

export type {
  MonedaCompra,
  TotalesCompra,
  DatosDetraccionCompra,
  DatosPercepcionCompra,
  DatosRetencionCompra,
} from './tiposBaseCompras';

export type { ClasificacionLineaCompra, TipoAfectacionCompra, LineaCompra } from './LineaCompra';
export { CLASIFICACION_LINEA_LABELS } from './LineaCompra';

export type {
  EstadoDocumentoOC,
  EstadoAprobacionOC,
  EstadoRecepcionOC,
  EstadoFacturacionOC,
  EstadoInventarioOC,
  OrdenCompra,
} from './OrdenCompra';
export {
  ESTADO_DOCUMENTO_OC_LABELS,
  ESTADO_RECEPCION_OC_LABELS,
  ESTADO_FACTURACION_OC_LABELS,
  ESTADO_INVENTARIO_OC_LABELS,
} from './OrdenCompra';

export type {
  EstadoDocumentoCC,
  EstadoPagoCC,
  EstadoInventarioCC,
  ModalidadInventarioCC,
  ComprobanteCompra,
} from './ComprobanteCompra';
export {
  ESTADO_DOCUMENTO_CC_LABELS,
  ESTADO_PAGO_CC_LABELS,
  ESTADO_INVENTARIO_CC_LABELS,
  MODALIDAD_INVENTARIO_CC_LABELS,
} from './ComprobanteCompra';

export type {
  EstadoPagoCxP,
  EstadoVencimientoCxP,
  CuotaCuentaPorPagar,
  CuentaPorPagar,
} from './CuentaPorPagar';
export { ESTADO_PAGO_CXP_LABELS, ESTADO_VENCIMIENTO_CXP_LABELS } from './CuentaPorPagar';

export type { EstadoDocumentoPago, MedioPagoCompra, PagoCompra } from './PagoCompra';
export { ESTADO_DOCUMENTO_PAGO_LABELS } from './PagoCompra';
