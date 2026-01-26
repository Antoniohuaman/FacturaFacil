// ===================================================================
// MODELO UNIFICADO DE DISEÑO DE COMPROBANTES - VERSIÓN 2.0
// Consolida todos los modelos existentes en una sola fuente de verdad
// ===================================================================

// ===================================================================
// TIPOS BASE
// ===================================================================
export type DesignType = 'A4' | 'TICKET';
export type DesignVersion = '2.0';

// ===================================================================
// LOGO CONFIGURATION
// ===================================================================
export interface LogoConfiguration {
  enabled: boolean;
  width: number;
  height: number;
  position: 'left' | 'center' | 'right';
  layout?: 'horizontal' | 'vertical-logo-top' | 'vertical-logo-bottom'; // Layout del header
  url?: string;
}

// ===================================================================
// WATERMARK CONFIGURATION
// ===================================================================
export interface WatermarkConfiguration {
  enabled: boolean;
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  opacity: number;
  rotation: number;
  size: 'small' | 'medium' | 'large';
  position: 'center' | 'diagonal' | 'repeat';
  color?: string;
}

// ===================================================================
// FOOTER CONFIGURATION
// ===================================================================
export interface FooterConfiguration {
  enabled: boolean;
  showCustomText: boolean;
  customText: string;
  textAlignment: 'left' | 'center' | 'right';
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: 'normal' | 'bold';
  backgroundColor?: string;
  textColor?: string;
  padding: number;
}

// ===================================================================
// DOCUMENT FIELDS CONFIGURATION
// ===================================================================
export interface DocumentFieldsConfiguration {
  establecimiento: { visible: boolean; label: string };
  observaciones: { visible: boolean; label: string };
  direccion: { visible: boolean; label: string };
  fechaVencimiento: { visible: boolean; label: string };
  direccionEnvio: { visible: boolean; label: string };
  ordenCompra: { visible: boolean; label: string };
  guiaRemision: { visible: boolean; label: string };
  correoElectronico: { visible: boolean; label: string };
  centroCosto: { visible: boolean; label: string };
  vendedor: { visible: boolean; label: string };
}

// ===================================================================
// PRODUCT FIELDS CONFIGURATION
// ===================================================================
export interface ProductFieldsConfiguration {
  numero: { visible: boolean; label: string; width: number };
  cantidad: { visible: boolean; label: string; width: number };
  descripcion: { visible: boolean; label: string; width: number };
  unidadMedida: { visible: boolean; label: string; width: number };
  precioUnitario: { visible: boolean; label: string; width: number };
  total: { visible: boolean; label: string; width: number };
  imagen: { visible: boolean; label: string; width: number };
  marca: { visible: boolean; label: string; width: number };
  codigoBarras: { visible: boolean; label: string; width: number };
  alias: { visible: boolean; label: string; width: number };
  modelo: { visible: boolean; label: string; width: number };
  codigoFabrica: { visible: boolean; label: string; width: number };
  descuento: { visible: boolean; label: string; width: number };
  tipo: { visible: boolean; label: string; width: number };
  codigoSunat: { visible: boolean; label: string; width: number };
  peso: { visible: boolean; label: string; width: number };
  categoria: { visible: boolean; label: string; width: number };
  tipoExistencia: { visible: boolean; label: string; width: number };
}

// ===================================================================
// A4 CONFIGURATION
// ===================================================================
export interface VoucherDesignA4Config {
  logo: LogoConfiguration;
  watermark: WatermarkConfiguration;
  footer: FooterConfiguration;
  documentFields: DocumentFieldsConfiguration;
  productFields: ProductFieldsConfiguration;
}

// ===================================================================
// TICKET CONFIGURATION
// ===================================================================
export interface VoucherDesignTicketConfig {
  logo: Omit<LogoConfiguration, 'position'> & { position: 'center' };
  watermark: WatermarkConfiguration; // Agregado: soporte para watermark en ticket
  footer: Omit<FooterConfiguration, 'textAlignment'> & { textAlignment: 'center' };
  documentFields: DocumentFieldsConfiguration;
  productFields: {
    numero: { visible: boolean };
    codigo: { visible: boolean };
    descripcion: { visible: boolean; maxLength: number };
    cantidad: { visible: boolean };
    precioUnitario: { visible: boolean };
    descuento: { visible: boolean };
    total: { visible: boolean };
    codigoBarras: { visible: boolean };
    marca: { visible: boolean };
  };
  general: {
    paperWidth: 58 | 80;
    lineSpacing: number;
    characterWidth: number;
    margins: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
  };
  typography: {
    fontSize: {
      header: 'small' | 'medium' | 'large';
      body: 'small' | 'medium' | 'large';
      footer: 'small' | 'medium' | 'large';
    };
    fontWeight: {
      header: 'normal' | 'bold';
      totals: 'normal' | 'bold';
    };
  };
  qrCode: {
    enabled: boolean;
    size: 'small' | 'medium' | 'large';
  };
  separators: {
    useSeparators: boolean;
    character: string;
  };
  metadata: {
    thankYouMessage: string;
    consultationUrl: string;
  };
}

// ===================================================================
// MODELO PRINCIPAL UNIFICADO
// ===================================================================
export interface VoucherDesignConfig {
  id: string;
  name: string;
  type: DesignType;
  version: DesignVersion;
  a4Config?: VoucherDesignA4Config;
  ticketConfig?: VoucherDesignTicketConfig;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===================================================================
// CONFIGURACIÓN SIMPLIFICADA PARA EL HOOK
// ===================================================================
export interface VoucherDesignConfigurationExtended {
  logo: LogoConfiguration;
  watermark: WatermarkConfiguration;
  footer: FooterConfiguration;
  documentFields: DocumentFieldsConfiguration;
  productFields: ProductFieldsConfiguration | VoucherDesignTicketConfig['productFields'];
  /**
   * Solo aplica a TICKET. Permite que la UI nueva controle 58/80 sin hardcode.
   * Se persiste en: ticketConfig.general.paperWidth
   */
  ticketPaperWidth?: 58 | 80;
}

// ===================================================================
// DEFAULTS
// ===================================================================

export const CONFIGURACION_LOGO_PREDETERMINADA: LogoConfiguration = {
  enabled: true,
  width: 100,
  height: 100,
  position: 'left',
  layout: 'horizontal', // Layout por defecto
};

export const CONFIGURACION_MARCA_AGUA_PREDETERMINADA: WatermarkConfiguration = {
  enabled: false,
  type: 'text',
  text: 'COPIA',
  opacity: 0.1,
  rotation: -45,
  size: 'large',
  position: 'diagonal',
  color: '#000000',
};

export const CONFIGURACION_PIE_PAGINA_PREDETERMINADA: FooterConfiguration = {
  enabled: true,
  showCustomText: true,
  customText: 'Gracias por su preferencia',
  textAlignment: 'center',
  fontSize: 'small',
  fontWeight: 'normal',
  padding: 10,
};

// Configuraciones independientes para A4 y Ticket
export const CAMPOS_DOCUMENTO_A4_PREDETERMINADOS: DocumentFieldsConfiguration = {
  establecimiento: { visible: true, label: 'Establecimiento' },
  observaciones: { visible: true, label: 'Observaciones' },
  direccion: { visible: true, label: 'Dirección' },
  fechaVencimiento: { visible: true, label: 'Fecha de Vencimiento' },
  direccionEnvio: { visible: false, label: 'Dirección de Envío' },
  ordenCompra: { visible: false, label: 'Orden de Compra' },
  guiaRemision: { visible: false, label: 'N° de Guía de Remisión' },
  correoElectronico: { visible: false, label: 'Correo Electrónico' },
  centroCosto: { visible: false, label: 'Centro de Costo' },
  vendedor: { visible: false, label: 'Vendedor' },
};

export const CAMPOS_DOCUMENTO_TICKET_PREDETERMINADOS: DocumentFieldsConfiguration = {
  establecimiento: { visible: false, label: 'Establecimiento' },
  observaciones: { visible: false, label: 'Observaciones' },
  direccion: { visible: false, label: 'Dirección' },
  fechaVencimiento: { visible: false, label: 'Fecha de Vencimiento' },
  direccionEnvio: { visible: false, label: 'Dirección de Envío' },
  ordenCompra: { visible: false, label: 'Orden de Compra' },
  guiaRemision: { visible: false, label: 'N° de Guía de Remisión' },
  correoElectronico: { visible: false, label: 'Correo Electrónico' },
  centroCosto: { visible: false, label: 'Centro de Costo' },
  vendedor: { visible: false, label: 'Vendedor' },
};

// Mantener CAMPOS_DOCUMENTO_PREDETERMINADOS por compatibilidad (deprecado)
export const CAMPOS_DOCUMENTO_PREDETERMINADOS = CAMPOS_DOCUMENTO_A4_PREDETERMINADOS;

export const CAMPOS_PRODUCTO_A4_PREDETERMINADOS: ProductFieldsConfiguration = {
  // Columnas por defecto (6 visibles) - ORDEN OBLIGATORIO
  numero: { visible: true, label: 'N°', width: 50 },
  cantidad: { visible: true, label: 'Cant.', width: 70 },
  descripcion: { visible: true, label: 'Descripción', width: 280 },
  unidadMedida: { visible: true, label: 'U.M.', width: 70 },
  precioUnitario: { visible: true, label: 'P. Unit.', width: 90 },
  total: { visible: true, label: 'Total', width: 90 },
  // Columnas opcionales (ocultas por defecto)
  imagen: { visible: false, label: 'Imagen', width: 60 },
  marca: { visible: false, label: 'Marca', width: 90 },
  codigoBarras: { visible: false, label: 'Cód. Barras', width: 110 },
  alias: { visible: false, label: 'Alias', width: 90 },
  modelo: { visible: false, label: 'Modelo', width: 90 },
  codigoFabrica: { visible: false, label: 'Cód. Fábrica', width: 100 },
  descuento: { visible: false, label: 'Desc.', width: 70 },
  tipo: { visible: false, label: 'Tipo', width: 80 },
  codigoSunat: { visible: false, label: 'Cód. SUNAT', width: 100 },
  peso: { visible: false, label: 'Peso', width: 70 },
  categoria: { visible: false, label: 'Categoría', width: 100 },
  tipoExistencia: { visible: false, label: 'Tipo Exist.', width: 100 },
};

// Columnas por defecto para TICKET: CÓDIGO | DESCRIPCIÓN | CANT | P.UNIT | DSCTO. | TOTAL
export const CAMPOS_PRODUCTO_TICKET_PREDETERMINADOS: VoucherDesignTicketConfig['productFields'] = {
  numero: { visible: false }, // N° desactivado por defecto, pero disponible
  codigo: { visible: true },
  descripcion: { visible: true, maxLength: 30 },
  cantidad: { visible: true },
  precioUnitario: { visible: true },
  descuento: { visible: true }, // DSCTO. visible por defecto
  total: { visible: true },
  codigoBarras: { visible: false },
  marca: { visible: false },
};

export const CONFIGURACION_A4_PREDETERMINADA: VoucherDesignA4Config = {
  logo: CONFIGURACION_LOGO_PREDETERMINADA,
  watermark: CONFIGURACION_MARCA_AGUA_PREDETERMINADA,
  footer: CONFIGURACION_PIE_PAGINA_PREDETERMINADA,
  documentFields: CAMPOS_DOCUMENTO_A4_PREDETERMINADOS,
  productFields: CAMPOS_PRODUCTO_A4_PREDETERMINADOS,
};

export const CONFIGURACION_TICKET_PREDETERMINADA: VoucherDesignTicketConfig = {
  logo: {
    enabled: false,
    width: 60,
    height: 60,
    position: 'center',
  },
  watermark: CONFIGURACION_MARCA_AGUA_PREDETERMINADA, // Agregado: watermark para ticket
  footer: {
    enabled: true,
    showCustomText: true,
    customText: 'Gracias por su compra',
    textAlignment: 'center',
    fontSize: 'small',
    fontWeight: 'normal',
    padding: 5,
  },
  documentFields: CAMPOS_DOCUMENTO_TICKET_PREDETERMINADOS,
  productFields: CAMPOS_PRODUCTO_TICKET_PREDETERMINADOS,
  general: {
    paperWidth: 80,
    lineSpacing: 1.2,
    characterWidth: 42,
    margins: {
      left: 2,
      right: 2,
      top: 5,
      bottom: 10,
    },
  },
  typography: {
    fontSize: {
      header: 'medium',
      body: 'small',
      footer: 'small',
    },
    fontWeight: {
      header: 'bold',
      totals: 'bold',
    },
  },
  qrCode: {
    enabled: true,
    size: 'medium',
  },
  separators: {
    useSeparators: true,
    character: '=',
  },
  metadata: {
    thankYouMessage: '¡Gracias por su compra!',
    consultationUrl: 'https://comprobantes.facturafacil.com/',
  },
};

export const DISENO_A4_PREDETERMINADO: VoucherDesignConfig = {
  id: 'design-a4-default',
  name: 'Diseño A4 Predeterminado',
  type: 'A4',
  version: '2.0',
  a4Config: CONFIGURACION_A4_PREDETERMINADA,
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const DISENO_TICKET_PREDETERMINADO: VoucherDesignConfig = {
  id: 'design-ticket-default',
  name: 'Diseño Ticket Predeterminado',
  type: 'TICKET',
  version: '2.0',
  ticketConfig: CONFIGURACION_TICKET_PREDETERMINADA,
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
