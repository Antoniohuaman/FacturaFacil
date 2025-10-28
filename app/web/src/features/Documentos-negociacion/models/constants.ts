// ===================================================================
// CONSTANTES PARA DOCUMENTOS DE NEGOCIACIÓN
// ===================================================================

export const TABLE_CONFIG = {
  DEFAULT_RECORDS_PER_PAGE: 10,
  COLUMN_CONFIG_STORAGE_KEY: 'documentos_column_config',
  FILTERS_STORAGE_KEY: 'documentos_filters'
} as const;

export const PAGINATION_CONFIG = {
  COTIZACIONES_PER_PAGE: 10,
  NOTAS_VENTA_PER_PAGE: 10
} as const;

export const MOCK_VENDORS = [
  'Javier Masías Loza',
  'María González',
  'Carlos Rodríguez',
  'Ana López'
] as const;

export const MOCK_PAYMENT_METHODS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Crédito'
] as const;
