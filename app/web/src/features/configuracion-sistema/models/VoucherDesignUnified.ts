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
  imagen: { visible: boolean; label: string; width: number };
  marca: { visible: boolean; label: string; width: number };
  codigoBarras: { visible: boolean; label: string; width: number };
  alias: { visible: boolean; label: string; width: number };
  modelo: { visible: boolean; label: string; width: number };
  codigoFabrica: { visible: boolean; label: string; width: number };
  descuento: { visible: boolean; label: string; width: number };
  descripcion: { visible: boolean; label: string; width: number };
  tipo: { visible: boolean; label: string; width: number };
  codigoSunat: { visible: boolean; label: string; width: number };
  peso: { visible: boolean; label: string; width: number };
  categoria: { visible: boolean; label: string; width: number };
  tipoExistencia: { visible: boolean; label: string; width: number };
  cantidad: { visible: boolean; label: string; width: number };
  precioUnitario: { visible: boolean; label: string; width: number };
  total: { visible: boolean; label: string; width: number };
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
  footer: Omit<FooterConfiguration, 'textAlignment'> & { textAlignment: 'center' };
  documentFields: DocumentFieldsConfiguration;
  productFields: {
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
}

// ===================================================================
// DEFAULTS
// ===================================================================

export const DEFAULT_LOGO_CONFIG: LogoConfiguration = {
  enabled: true,
  width: 100,
  height: 100,
  position: 'left',
};

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfiguration = {
  enabled: false,
  type: 'text',
  text: 'COPIA',
  opacity: 0.1,
  rotation: -45,
  size: 'large',
  position: 'diagonal',
  color: '#000000',
};

export const DEFAULT_FOOTER_CONFIG: FooterConfiguration = {
  enabled: true,
  showCustomText: true,
  customText: 'Gracias por su preferencia',
  textAlignment: 'center',
  fontSize: 'small',
  fontWeight: 'normal',
  padding: 10,
};

export const DEFAULT_DOCUMENT_FIELDS: DocumentFieldsConfiguration = {
  establecimiento: { visible: true, label: 'Establecimiento' },
  observaciones: { visible: true, label: 'Observaciones' },
  direccion: { visible: false, label: 'Dirección' },
  fechaVencimiento: { visible: false, label: 'Fecha de Vencimiento' },
  direccionEnvio: { visible: false, label: 'Dirección de Envío' },
  ordenCompra: { visible: false, label: 'Orden de Compra' },
  guiaRemision: { visible: false, label: 'N° de Guía de Remisión' },
  correoElectronico: { visible: false, label: 'Correo Electrónico' },
  centroCosto: { visible: false, label: 'Centro de Costo' },
  vendedor: { visible: false, label: 'Vendedor' },
};

export const DEFAULT_PRODUCT_FIELDS_A4: ProductFieldsConfiguration = {
  imagen: { visible: false, label: 'Imagen', width: 60 },
  marca: { visible: false, label: 'Marca', width: 100 },
  codigoBarras: { visible: false, label: 'Cód. Barras', width: 120 },
  alias: { visible: false, label: 'Alias', width: 100 },
  modelo: { visible: false, label: 'Modelo', width: 100 },
  codigoFabrica: { visible: false, label: 'Cód. Fábrica', width: 100 },
  descuento: { visible: true, label: 'Descuento', width: 80 },
  descripcion: { visible: true, label: 'Descripción', width: 300 },
  tipo: { visible: false, label: 'Tipo', width: 80 },
  codigoSunat: { visible: false, label: 'Cód. SUNAT', width: 100 },
  peso: { visible: false, label: 'Peso', width: 80 },
  categoria: { visible: false, label: 'Categoría', width: 100 },
  tipoExistencia: { visible: false, label: 'Tipo Existencia', width: 120 },
  cantidad: { visible: true, label: 'Cantidad', width: 80 },
  precioUnitario: { visible: true, label: 'P. Unitario', width: 100 },
  total: { visible: true, label: 'Total', width: 100 },
};

export const DEFAULT_PRODUCT_FIELDS_TICKET: VoucherDesignTicketConfig['productFields'] = {
  descripcion: { visible: true, maxLength: 30 },
  cantidad: { visible: true },
  precioUnitario: { visible: true },
  descuento: { visible: false },
  total: { visible: true },
  codigoBarras: { visible: false },
  marca: { visible: false },
};

export const DEFAULT_A4_CONFIG: VoucherDesignA4Config = {
  logo: DEFAULT_LOGO_CONFIG,
  watermark: DEFAULT_WATERMARK_CONFIG,
  footer: DEFAULT_FOOTER_CONFIG,
  documentFields: DEFAULT_DOCUMENT_FIELDS,
  productFields: DEFAULT_PRODUCT_FIELDS_A4,
};

export const DEFAULT_TICKET_CONFIG: VoucherDesignTicketConfig = {
  logo: {
    enabled: false,
    width: 60,
    height: 60,
    position: 'center',
  },
  footer: {
    enabled: true,
    showCustomText: true,
    customText: 'Gracias por su compra',
    textAlignment: 'center',
    fontSize: 'small',
    fontWeight: 'normal',
    padding: 5,
  },
  documentFields: DEFAULT_DOCUMENT_FIELDS,
  productFields: DEFAULT_PRODUCT_FIELDS_TICKET,
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
};

export const DEFAULT_A4_DESIGN: VoucherDesignConfig = {
  id: 'design-a4-default',
  name: 'Diseño A4 Predeterminado',
  type: 'A4',
  version: '2.0',
  a4Config: DEFAULT_A4_CONFIG,
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const DEFAULT_TICKET_DESIGN: VoucherDesignConfig = {
  id: 'design-ticket-default',
  name: 'Diseño Ticket Predeterminado',
  type: 'TICKET',
  version: '2.0',
  ticketConfig: DEFAULT_TICKET_CONFIG,
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
