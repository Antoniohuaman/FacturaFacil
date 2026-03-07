// ===============================================================
// CONTRATO DE IMPRESIÓN (CENTRALIZADO)
// Define tipos compartidos para estandarizar impresión por iframe.
// ===============================================================

export const TipoDocumentoImprimible = {
  ComprobanteElectronico: 'COMPROBANTE_ELECTRONICO',
} as const;

export type TipoDocumentoImprimible = (typeof TipoDocumentoImprimible)[keyof typeof TipoDocumentoImprimible];

export const FormatoSalida = {
  Ticket: 'ticket',
  Hoja: 'hoja',
} as const;

export type FormatoSalida = (typeof FormatoSalida)[keyof typeof FormatoSalida];

export const TamanoPapel = {
  Mm58: 'mm58',
  Mm80: 'mm80',
  A5: 'a5',
  A4: 'a4',
} as const;

export type TamanoPapel = (typeof TamanoPapel)[keyof typeof TamanoPapel];

export type TrabajoImpresion<TData = unknown> = {
  data: TData;
  tipoDocumento: TipoDocumentoImprimible;
  formatoSalida: FormatoSalida;
  tamanoPapel: TamanoPapel;
  titulo?: string;
};
