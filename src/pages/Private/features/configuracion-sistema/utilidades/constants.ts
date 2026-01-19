// Configuración del Sistema - Constantes
// ====================================

// Estados del Sistema
export const SYSTEM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance'
} as const;

// Tipos de Documentos SUNAT
export const DOCUMENT_TYPES = {
  FACTURA: '01',
  BOLETA: '03',
  NOTA_CREDITO: '07',
  NOTA_DEBITO: '08'
} as const;

// Monedas
export const CURRENCIES = {
  PEN: 'PEN',
  USD: 'USD'
} as const;

// Estados de Configuración
export const CONFIG_STATUS = {
  PENDING: 'pending',
  CONFIGURED: 'configured',
  ERROR: 'error'
} as const;

// Tipos de Configuración
export const CONFIG_TYPES = {
  COMPANY: 'company',
  TAX: 'tax',
  CERTIFICATES: 'certificates',
  SERIES: 'series',
  PRINTER: 'printer'
} as const;