// ===================================================================
// CONSTANTES DEL SISTEMA DE COMPROBANTES ELECTRÓNICOS
// ===================================================================

import type { Product, CurrencyInfo, CajaIntegrationConfig, UnidadMedida } from './comprobante.types';

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

export const DEFAULT_CURRENCY = 'PEN';

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
// PRODUCTOS DISPONIBLES (MODO POS) - Ahora con más datos para búsqueda
// ===================================================================
export const AVAILABLE_PRODUCTS: Product[] = [
  {
    id: "1",
    code: "00156389",
    name: "Hojas Bond A4 ATLAS",
    price: 60.00,
    category: "Útiles",
    description: "Hojas bond tamaño A4, marca Atlas, paquete x500 hojas",
    stock: 25
  },
  {
    id: "2", 
    code: "00168822",
    name: "Sketch ARTESCO",
    price: 18.00,
    category: "Útiles",
    description: "Block de dibujo Artesco, 20 hojas",
    stock: 15
  },
  {
    id: "3",
    code: "00170001", 
    name: "Resma Bond A3",
    price: 120.00,
    category: "Útiles",
    description: "Resma bond A3, 500 hojas",
    stock: 10
  },
  {
    id: "4",
    code: "00180001",
    name: "Lapicero BIC",
    price: 2.50,
    category: "Útiles", 
    description: "Lapicero BIC azul, punta fina",
    stock: 100
  },
  {
    id: "5",
    code: "00190001",
    name: "Cuaderno Loro",
    price: 8.00,
    category: "Útiles",
    description: "Cuaderno Loro 100 hojas, rayado",
    stock: 30
  },
  {
    id: "6",
    code: "00145678",
    name: "Martillo de acero",
    price: 45.50,
    category: "Herramientas",
    description: "Martillo de acero, mango de madera",
    stock: 8
  },
  {
    id: "7",
    code: "00187654", 
    name: "Destornillador Phillips",
    price: 12.00,
    category: "Herramientas",
    description: "Destornillador Phillips mediano",
    stock: 20
  },
  {
    id: "8",
    code: "00198765",
    name: "Taladro eléctrico", 
    price: 250.00,
    category: "Herramientas",
    description: "Taladro eléctrico 600W, incluye brocas",
    stock: 3
  }
];

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
// CONFIGURACIONES DE TIENDA
// ===================================================================
export const DEFAULT_STORE_INFO = {
  name: 'Gamarra 2',
  address: 'Jr. Gamarra 123, La Victoria, Lima',
  ruc: '20123456789',
  phone: '(01) 123-4567'
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
  MIN_CART_QUANTITY: 1,
  MAX_CART_QUANTITY: 999,
  SEARCH_DEBOUNCE_MS: 300,
  DEFAULT_CURRENCY: DEFAULT_CURRENCY
};

// ===================================================================
// CONFIGURACIÓN TEMPORAL DE CAJA
// ===================================================================
export const DEFAULT_CAJA_CONFIG: CajaIntegrationConfig = {
  requiereCajaParaComprobantes: false,  // Por defecto deshabilitado para desarrollo
  requiereCajaAbierta: false,
  modoPosSoloConcaja: true,
  usuarioTieneCajaAsignada: true,      // Mock: usuario tiene caja asignada
  cajaEstaAbierta: true                // Mock: caja está abierta
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