import type {
  TipoDocumentoComercial,
  EstadoCotizacion,
  EstadoNotaVenta,
  EstadoOrdenVenta,
} from './documentoComercial.types';

export const TIPO_DOCUMENTO_COMERCIAL_LABELS: Record<TipoDocumentoComercial, string> = {
  cotizacion: 'Cotización',
  nota_venta: 'Nota de Venta',
  orden_venta: 'Orden de Venta',
};

export const TIPO_DOCUMENTO_COMERCIAL_PLURAL: Record<TipoDocumentoComercial, string> = {
  cotizacion: 'Cotizaciones',
  nota_venta: 'Notas de Venta',
  orden_venta: 'Órdenes de Venta',
};

export const TIPO_DOCUMENTO_COMERCIAL_NUEVA: Record<TipoDocumentoComercial, string> = {
  cotizacion: 'Nueva cotización',
  nota_venta: 'Nueva nota de venta',
  orden_venta: 'Nueva orden de venta',
};

export const TIPO_DOCUMENTO_COMERCIAL_CODIGOS: Record<TipoDocumentoComercial, string[]> = {
  cotizacion: ['COT', 'COTIZACION', 'QUOTATION'],
  nota_venta: ['NV', 'NOTA_VENTA', 'SALES_NOTE'],
  orden_venta: ['OV', 'ORDEN_VENTA', 'SALES_ORDER'],
};

export const TIPO_DOCUMENTO_COMERCIAL_CATEGORIAS: Record<TipoDocumentoComercial, string[]> = {
  cotizacion: ['QUOTATION', 'COTIZACION'],
  nota_venta: ['SALES_NOTE', 'NOTA_VENTA'],
  orden_venta: ['SALES_ORDER', 'ORDEN_VENTA'],
};

export const ESTADOS_COTIZACION: EstadoCotizacion[] = [
  'Borrador',
  'Generada',
  'Aprobada',
  'Rechazada',
  'Cerrada perdida',
  'Convertida',
  'Anulada',
  'Vencida',
];

export const ESTADOS_NOTA_VENTA: EstadoNotaVenta[] = [
  'Borrador',
  'Generada',
  'Convertida',
  'Anulada',
];

export const ESTADOS_ORDEN_VENTA: EstadoOrdenVenta[] = [
  'Borrador',
  'Generada',
  'Reservada',
  'Atendida parcial',
  'Atendida total',
  'Convertida',
  'Anulada',
  'Vencida',
];

export const ESTADOS_POR_TIPO: Record<TipoDocumentoComercial, string[]> = {
  cotizacion: ESTADOS_COTIZACION,
  nota_venta: ESTADOS_NOTA_VENTA,
  orden_venta: ESTADOS_ORDEN_VENTA,
};

export const STORAGE_KEYS = {
  DOCUMENTOS: 'documentos_comerciales_v1',
  CAMPOS_PREFIJO: 'documentos_comerciales_campos_',
  COLUMNAS_PREFIJO: 'documentos_comerciales_columnas_',
  BORRADOR_APP: 'documentos_comerciales',
} as const;

export const BORRADOR_EN_PROGRESO_VERSION = 1;
export const BORRADOR_EN_PROGRESO_TTL_DIAS = 14;
export const CORRELATIVO_DIGITOS_DEFAULT = 4;

export const COLUMNAS_DEFAULT_LISTADO = [
  'numero',
  'cliente',
  'documentoCliente',
  'fecha',
  'moneda',
  'total',
  'estado',
  'acciones',
] as const;
