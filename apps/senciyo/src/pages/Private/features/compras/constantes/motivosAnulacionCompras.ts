export const MOTIVOS_ANULACION_OC = [
  'Cambio de proveedor',
  'Error en datos del documento',
  'Proveedor no disponible',
  'Pedido cancelado por área solicitante',
  'Otro',
] as const;

export const MOTIVOS_ANULACION_CC = [
  'Comprobante duplicado',
  'Error en importes',
  'Proveedor incorrecto',
  'Devolución total al proveedor',
  'Otro',
] as const;

export const MOTIVOS_ANULACION_PAGO = [
  'Error en monto pagado',
  'Medio de pago incorrecto',
  'Pago duplicado',
  'Otro',
] as const;

export type MotivoAnulacionOC = (typeof MOTIVOS_ANULACION_OC)[number];
export type MotivoAnulacionCC = (typeof MOTIVOS_ANULACION_CC)[number];
export type MotivoAnulacionPago = (typeof MOTIVOS_ANULACION_PAGO)[number];
