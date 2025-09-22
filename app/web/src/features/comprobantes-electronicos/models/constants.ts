// ===================================================================
// CONSTANTES DEL SISTEMA DE COMPROBANTES ELECTRÓNICOS
// ===================================================================

import type { UnidadMedida, Product } from './comprobante.types';

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
export const SERIES_COMPROBANTES: string[] = ["B001", "B002", "F001"];

// Filtros para series por tipo
export const SERIES_BOLETA = SERIES_COMPROBANTES.filter(s => s.startsWith('B'));
export const SERIES_FACTURA = SERIES_COMPROBANTES.filter(s => s.startsWith('F'));

// ===================================================================
// PRODUCTOS DISPONIBLES (MODO POS)
// ===================================================================
export const AVAILABLE_PRODUCTS: Product[] = [
  { id: '1', code: '00156389', name: 'Hojas Bond A4 ATLAS', price: 60.00, category: 'Útiles' },
  { id: '2', code: '00168822', name: 'Sketch ARTESCO', price: 18.00, category: 'Útiles' },
  { id: '3', code: '00170001', name:'Resma Bond A3', price: 120.00, category: 'Útiles' },
  { id: '4', code: '00180001', name: 'Lapicero BIC', price: 2.50, category: 'Útiles' },
  { id: '5', code: '00190001', name: 'Cuaderno Loro', price: 8.00, category: 'Útiles' },
  { id: '6', code: '00145678', name: 'Martillo de acero', price: 45.50, category: 'Herramientas' },
  { id: '7', code: '00187654', name: 'Destornillador Phillips', price: 12.00, category: 'Herramientas' },
  { id: '8', code: '00198765', name: 'Taladro eléctrico', price: 250.00, category: 'Herramientas' }
];

// ===================================================================
// MONTOS DE PAGO RÁPIDO
// ===================================================================
export const QUICK_PAYMENT_BASE_AMOUNTS: number[] = [20.00, 50.00, 100.00, 200.00];

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
// MONEDAS
// ===================================================================
export const CURRENCIES = [
  { value: 'PEN', label: 'Soles (PEN)', symbol: 'S/' },
  { value: 'USD', label: 'Dólares (USD)', symbol: '$' }
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
  // Duración del toast en milisegundos
  TOAST_DURATION: 2500,
  
  // IGV por defecto
  DEFAULT_IGV_PERCENT: 18,
  
  // Cantidad mínima en carrito
  MIN_CART_QUANTITY: 1,
  
  // Máximo de productos en carrito
  MAX_CART_ITEMS: 100,
  
  // Formato de fecha por defecto
  DATE_FORMAT: 'YYYY-MM-DD',
  
  // Prefijo para IDs de borradores
  DRAFT_ID_PREFIX: 'DRAFT-',
  
  // Key para localStorage de borradores
  DRAFTS_STORAGE_KEY: 'borradores'
};

// ===================================================================
// VALIDACIONES
// ===================================================================
export const VALIDATION_RULES = {
  // Longitud mínima para nombres de productos
  MIN_PRODUCT_NAME_LENGTH: 3,
  
  // Precio mínimo
  MIN_PRICE: 0.01,
  
  // Precio máximo
  MAX_PRICE: 999999.99,
  
  // Cantidad máxima por producto
  MAX_QUANTITY: 9999,
  
  // Longitud de DNI
  DNI_LENGTH: 8,
  
  // Longitud de RUC
  RUC_LENGTH: 11
};

// ===================================================================
// CATEGORÍAS DE PRODUCTOS
// ===================================================================
export const PRODUCT_CATEGORIES = [
  'Útiles',
  'Herramientas',
  'Oficina',
  'Tecnología',
  'Limpieza',
  'Otros'
];

// ===================================================================
// ESTADOS DE CAJA
// ===================================================================
export const CAJA_STATUS = {
  ABIERTA: 'abierta' as const,
  CERRADA: 'cerrada' as const
};