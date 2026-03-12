// ===================================================================
// CONSTANTES DEL SISTEMA DE COMPROBANTES ELECTRÓNICOS
// ===================================================================

import type { CurrencyInfo, CajaIntegrationConfig, TipoComprobante, TipoComprobanteBase } from './comprobante.types';
import { DEFAULT_BASE_CURRENCY_CODE } from '@/shared/currency';

export interface CodigoNotaCreditoSunat {
  codigo: string;
  descripcion: string;
  descripcionCorta: string;
}

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
// SERIES DE COMPROBANTES
// ===================================================================
export const SERIES_COMPROBANTES = ["B001", "B002", "F001"];
export const SERIES_BOLETA = ["B001", "B002"];
export const SERIES_FACTURA = ["F001"];

export const TIPO_COMPROBANTE_CODIGOS_SUNAT: Record<TipoComprobante, string> = {
  boleta: '03',
  factura: '01',
  nota_credito: '07',
};

export const TIPO_COMPROBANTE_LABELS: Record<TipoComprobante, string> = {
  boleta: 'Boleta de venta',
  factura: 'Factura',
  nota_credito: 'Nota de Crédito Electrónica',
};

export const TIPO_COMPROBANTE_LABELS_CORTOS: Record<TipoComprobante, string> = {
  boleta: 'Boleta',
  factura: 'Factura',
  nota_credito: 'Nota de Crédito',
};

export const CODIGOS_NOTA_CREDITO_SUNAT: CodigoNotaCreditoSunat[] = [
  { codigo: '01', descripcion: 'Anulación de la operación', descripcionCorta: 'Anulación de la operación' },
  { codigo: '02', descripcion: 'Anulación por error en el RUC', descripcionCorta: 'Error en el RUC' },
  { codigo: '03', descripcion: 'Corrección por error en la descripción', descripcionCorta: 'Error en la descripción' },
  { codigo: '04', descripcion: 'Descuento global', descripcionCorta: 'Descuento global' },
  { codigo: '05', descripcion: 'Descuento por ítem', descripcionCorta: 'Descuento por ítem' },
  { codigo: '06', descripcion: 'Devolución total', descripcionCorta: 'Devolución total' },
  { codigo: '07', descripcion: 'Devolución por ítem', descripcionCorta: 'Devolución por ítem' },
  { codigo: '08', descripcion: 'Bonificación', descripcionCorta: 'Bonificación' },
  { codigo: '09', descripcion: 'Disminución en el valor', descripcionCorta: 'Disminución en el valor' },
  { codigo: '10', descripcion: 'Otros Conceptos', descripcionCorta: 'Otros conceptos' },
  { codigo: '11', descripcion: 'Ajustes de operaciones de exportación', descripcionCorta: 'Ajuste de exportación' },
  { codigo: '12', descripcion: 'Ajustes afectos al IVAP', descripcionCorta: 'Ajuste afecto al IVAP' },
  { codigo: '13', descripcion: 'Corrección o modificación del monto neto pendiente de pago y/o la(s) fechas(s) de vencimiento del pago único o de las cuotas y/o los montos correspondientes a cada cuota, de ser el caso', descripcionCorta: 'Corrección de monto o vencimiento' },
];

export const obtenerCodigoSunatPorTipoComprobante = (tipo: TipoComprobante): string => {
  return TIPO_COMPROBANTE_CODIGOS_SUNAT[tipo];
};

export const obtenerEtiquetaTipoComprobante = (tipo: TipoComprobante): string => {
  return TIPO_COMPROBANTE_LABELS[tipo];
};

export const obtenerEtiquetaCortaTipoComprobante = (tipo: TipoComprobante): string => {
  return TIPO_COMPROBANTE_LABELS_CORTOS[tipo];
};

export const obtenerEtiquetaDocumentoRelacionado = (tipo: TipoComprobanteBase): string => {
  return tipo === 'factura' ? 'Factura' : 'Boleta';
};

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

export const FORMA_PAGO_CREDITO_MANUAL = '__credito_manual__';

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
  CAJA_CLOSED_WARNING: "Caja cerrada. Solo necesitas abrirla para cobrar al contado. Puedes emitir a crédito.",
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