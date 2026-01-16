// ===================================================================
// CONSTANTES DEL SISTEMA DE COMPROBANTES ELECTRÓNICOS
// ===================================================================

import type { CurrencyInfo, CajaIntegrationConfig, UnidadMedida } from './comprobante.types';
import { DEFAULT_BASE_CURRENCY_CODE } from '@/shared/currency';

// ===================================================================
// CONFIGURACIÓN DE MONEDAS
// ===================================================================
export const CURRENCIES: Record<string, CurrencyInfo> = {
  PEN: {
    code: 'PEN',
    symbol: 'S/',
    name: 'Soles Peruanos',
    rate: 1
  },
  USD: {
    code: 'USD', 
    symbol: '$',
    name: 'Dólares Americanos',
    rate: 3.75 // Tipo de cambio mock - en producción viene del backend
  }
};

export const DEFAULT_CURRENCY = DEFAULT_BASE_CURRENCY_CODE;

// ===================================================================
// UNIDADES DE MEDIDA SUNAT
// ===================================================================
export const UNIDADES_MEDIDA: UnidadMedida[] = [
  { value: 'UNIDAD', label: 'NIU', fullLabel: '(NIU) UNIDAD' },
  { value: 'DOCENA', label: 'DZN', fullLabel: '(DZN) DOCENA' },
  { value: 'CENTIMOS', label: 'CMT', fullLabel: '(CMT) CENTIMOS' },
  { value: 'KILOGRAMO', label: 'KGM', fullLabel: '(KGM) KILOGRAMO' }
];

// ===================================================================
// SERIES DE COMPROBANTES
// ===================================================================
export const SERIES_COMPROBANTES = ["B001", "B002", "F001"];
export const SERIES_BOLETA = ["B001", "B002"];
export const SERIES_FACTURA = ["F001"];

// ===================================================================
// CATEGORÍAS DE PRODUCTOS
// ===================================================================
export const PRODUCT_CATEGORIES = [
  { id: "utiles", name: "Útiles" },
  { id: "herramientas", name: "Herramientas" },
  { id: "oficina", name: "Oficina" },
  { id: "electronica", name: "Electrónica" }
];

// ===================================================================
// MONTOS DE PAGO RÁPIDO
// ===================================================================
export const QUICK_PAYMENT_BASE_AMOUNTS = [20.00, 50.00, 100.00, 200.00];

// ===================================================================
// TIPOS DE IGV
// ===================================================================
export const IGV_TYPES = [
  { value: 'igv18', label: 'IGV 18%', percent: 18 },
  { value: 'igv10', label: 'IGV 10%', percent: 10 },
  { value: 'exonerado', label: 'Exonerado', percent: 0 },
  { value: 'inafecto', label: 'Inafecto', percent: 0 },
  { value: 'gratuito', label: 'Gratuito', percent: 0 }
];

// ===================================================================
// MÉTODOS DE PAGO
// ===================================================================
export const PAYMENT_METHODS = [
  { value: 'contado', label: 'Contado' },
  { value: 'deposito', label: 'Depósito en cuenta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'plin', label: 'Plin' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'yape', label: 'Yape' }
];

// ===================================================================
// CONFIGURACIONES DE TIENDA (PLACEHOLDER PARA DESARROLLO)
// ===================================================================
// TODO: reemplazar por configuración real de empresa/establecimiento desde backend o ConfigurationContext
export const DEFAULT_STORE_INFO = {
  name: '',
  address: '',
  ruc: '',
  phone: ''
};

// ===================================================================
// OPCIONES DE ACCIONES DE BORRADOR
// ===================================================================
export const DRAFT_ACTIONS = [
  { value: 'borradores', label: 'Ir a lista de borradores' },
  { value: 'continuar', label: 'Continuar emitiendo (formulario vacío)' },
  { value: 'terminar', label: 'Terminar (ir a lista de comprobantes)' }
];

// ===================================================================
// CONFIGURACIONES DEL SISTEMA
// ===================================================================
export const SYSTEM_CONFIG = {
  TOAST_DURATION: 2500,
  DEFAULT_IGV_PERCENT: 18,
  DRAFT_ID_PREFIX: 'DRAFT-',
  DRAFTS_STORAGE_KEY: 'borradores',
  MIN_CART_QUANTITY: 0.01,
  MAX_CART_QUANTITY: 999,
  SEARCH_DEBOUNCE_MS: 300,
  DEFAULT_CURRENCY: DEFAULT_CURRENCY
};

// ===================================================================
// CONFIGURACIÓN TEMPORAL DE CAJA (PLACEHOLDER)
// ===================================================================
// TODO: reemplazar por integración real con módulo de Caja (no agregar más datos mock)
export const DEFAULT_CAJA_CONFIG: CajaIntegrationConfig = {
  requiereCajaParaComprobantes: false,
  requiereCajaAbierta: false,
  modoPosSoloConcaja: false,
  usuarioTieneCajaAsignada: false,
  cajaEstaAbierta: false
};

// ===================================================================
// CONFIGURACIÓN DE BÚSQUEDA DE PRODUCTOS
// ===================================================================
export const SEARCH_CONFIG = {
  MIN_SEARCH_LENGTH: 2,
  MAX_RESULTS_PER_PAGE: 20,
  DEBOUNCE_DELAY: 300,
  SHOW_BARCODE_SCANNER: true
};

// ===================================================================
// TEXTO DE PLACEHOLDERS Y MENSAJES
// ===================================================================
export const UI_MESSAGES = {
  SEARCH_PLACEHOLDER: "Buscar por nombre, código o categoría...",
  BARCODE_PLACEHOLDER: "Escanear código de barras",
  EMPTY_CART: "Tu carrito está vacío",
  CART_LOADING: "Procesando...",
  SEARCH_LOADING: "Buscando productos...",
  NO_PRODUCTS_FOUND: "No se encontraron productos",
  CAJA_CLOSED_WARNING: "La caja está cerrada. No se pueden procesar ventas.",
  CREATE_PRODUCT_SUCCESS: "Producto creado exitosamente",
  PAYMENT_SUCCESS: "Venta procesada exitosamente"
};

// ===================================================================
// TIPOS DE PRECIO (TEMPORAL - SERÁ REEMPLAZADO POR MÓDULO DE PRECIOS)
// ===================================================================
export const PRICE_TYPES = {
  base: { value: 'base' as const, label: 'Precio Base' },
  mayorista: { value: 'mayorista' as const, label: 'Precio Mayorista' },
  distribuidor: { value: 'distribuidor' as const, label: 'Precio Distribuidor' },
  vip: { value: 'vip' as const, label: 'Precio VIP' },
  campana: { value: 'campana' as const, label: 'Precio Campaña' }
} as const;

// ===================================================================
// LÍMITES DE SUNAT PARA BORRADORES
// ===================================================================
export const SUNAT_DRAFT_LIMITS = {
  BOLETA_MAX_DAYS: 5,  // Boletas pueden emitirse hasta 5 días después de la fecha de emisión
  FACTURA_MAX_DAYS: 1  // Facturas pueden emitirse hasta 1 día después de la fecha de emisión
} as const;

// ===================================================================
// CONFIGURACIÓN DE TABLA
// ===================================================================
export const TABLE_CONFIG = {
  DEFAULT_RECORDS_PER_PAGE: 10,
  RECORDS_PER_PAGE_OPTIONS: [10, 25, 50],
  DEFAULT_DENSITY: 'comfortable' as const,
  COLUMN_CONFIG_STORAGE_KEY: 'lista_comprobantes_columns_v1'
} as const;

// ===================================================================
// CONFIGURACIÓN DE PAGINACIÓN
// ===================================================================
export const PAGINATION_CONFIG = {
  DRAFTS_PER_PAGE: 25,
  MAX_PAGINATION_BUTTONS: 5
} as const;

// ===================================================================
// CONFIGURACIÓN DE FORMULARIOS
// ===================================================================
export const FORM_VALIDATION = {
  PRODUCT_NAME_MIN_LENGTH: 3,
  PRODUCT_NAME_MAX_LENGTH: 100,
  PRODUCT_CODE_MIN_LENGTH: 4,
  PRODUCT_CODE_MAX_LENGTH: 20,
  PRICE_MIN: 0.01,
  PRICE_MAX: 999999.99
};