export type TipoAdjuntoCompra =
  | 'cotizacion_proveedor'
  | 'factura_proveedor'
  | 'guia_remision'
  | 'voucher_pago'
  | 'contrato'
  | 'orden_compra_firmada'
  | 'otro';

export const TIPO_ADJUNTO_COMPRA_LABELS: Record<TipoAdjuntoCompra, string> = {
  cotizacion_proveedor: 'Cotización del proveedor',
  factura_proveedor: 'Factura del proveedor',
  guia_remision: 'Guía de remisión',
  voucher_pago: 'Voucher de pago',
  contrato: 'Contrato',
  orden_compra_firmada: 'Orden de compra firmada',
  otro: 'Otro',
};

export interface AdjuntoCompra {
  id: string;
  tipoAdjunto: TipoAdjuntoCompra;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanio?: number;
  urlLocal?: string;
  fechaCarga: string;
  cargadoPor?: string;
  observacion?: string;
}
