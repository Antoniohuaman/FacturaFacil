// ===================================================================
// CONSTANTES PARA DOCUMENTOS DE NEGOCIACIÓN
// ===================================================================

export const TABLE_CONFIG = {
  DEFAULT_RECORDS_PER_PAGE: 10,
  RECORDS_PER_PAGE_OPTIONS: [10, 25, 50, 100],
  COLUMN_CONFIG_STORAGE_KEY: 'documentos_column_config',
  FILTERS_STORAGE_KEY: 'documentos_filters'
} as const;

export const PAGINATION_CONFIG = {
  COTIZACIONES_PER_PAGE: 10,
  NOTAS_VENTA_PER_PAGE: 10
} as const;

// TODO: reemplazar por API real o ConfigurationContext (no agregar más datos mock)
export const MOCK_VENDORS = [
  { id: 'v1', name: 'Vendedor' }
];

// TODO: reemplazar por API real o ConfigurationContext (no agregar más datos mock)
export const MOCK_PAYMENT_METHODS = [
  { id: 'efectivo', name: 'Efectivo' }
];
