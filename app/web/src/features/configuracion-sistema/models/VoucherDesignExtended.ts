// ===================================================================
// VOUCHER DESIGN EXTENDED - MODELO COMPLETO DE PERSONALIZACIÓN
// Sistema completo para personalizar la apariencia de comprobantes
// ===================================================================

/**
 * Configuración extendida de diseño de comprobantes
 * Incluye personalización completa para A4 y Tickets
 */

// ===================================================================
// LOGO CONFIGURATION
// ===================================================================
export interface LogoConfiguration {
  enabled: boolean;
  width: number; // Ancho en px (40-200)
  height: number; // Alto en px (40-200)
  position: 'left' | 'center' | 'right';
  url?: string; // URL de la imagen del logo
}

// ===================================================================
// WATERMARK CONFIGURATION
// ===================================================================
export interface WatermarkConfiguration {
  enabled: boolean;
  type: 'text' | 'image'; // Marca de agua de texto o imagen
  text?: string; // Texto para marca de agua tipo texto
  imageUrl?: string; // URL de la imagen para marca de agua tipo imagen
  opacity: number; // 0-1
  rotation: number; // -90 a 90 grados
  size: 'small' | 'medium' | 'large';
  position: 'center' | 'diagonal' | 'repeat'; // Centro, diagonal, o repetida
  color?: string; // Color del texto (solo para tipo texto)
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
  // Campos de información del documento
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
  // Columnas de la tabla de productos
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
// EXTENDED VOUCHER DESIGN SETTINGS (A4)
// ===================================================================
export interface VoucherDesignSettingsA4Extended {
  // === CONFIGURACIÓN DE LOGO ===
  logo: LogoConfiguration;

  // === MARCA DE AGUA ===
  watermark: WatermarkConfiguration;

  // === PIE DE PÁGINA ===
  footer: FooterConfiguration;

  // === CAMPOS DEL DOCUMENTO ===
  documentFields: DocumentFieldsConfiguration;

  // === CAMPOS DE PRODUCTOS ===
  productFields: ProductFieldsConfiguration;

  // === CONFIGURACIÓN GENERAL ===
  general: {
    showCompanyInfo: boolean;
    showBorder: boolean;
    borderColor: string;
    borderWidth: number;
    pageMargins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };

  // === COLORES ===
  colors: {
    headerBackground: string;
    headerText: string;
    tableHeaderBackground: string;
    tableHeaderText: string;
    tableBorderColor: string;
    textPrimary: string;
    textSecondary: string;
    backgroundColor: string;
  };

  // === TIPOGRAFÍA ===
  typography: {
    fontFamily: 'Arial' | 'Helvetica' | 'Times New Roman' | 'Courier';
    fontSize: {
      header: number;
      body: number;
      footer: number;
      table: number;
    };
  };

  // === QR CODE ===
  qrCode: {
    enabled: boolean;
    position: 'left' | 'center' | 'right';
    size: 'small' | 'medium' | 'large';
  };
}

// ===================================================================
// EXTENDED VOUCHER DESIGN SETTINGS (TICKET)
// ===================================================================
export interface VoucherDesignSettingsTicketExtended {
  // === CONFIGURACIÓN DE LOGO ===
  logo: Omit<LogoConfiguration, 'position'> & {
    position: 'center'; // En tickets el logo siempre va centrado
  };

  // === PIE DE PÁGINA ===
  footer: Omit<FooterConfiguration, 'textAlignment'> & {
    textAlignment: 'center'; // En tickets siempre centrado
  };

  // === CAMPOS DEL DOCUMENTO ===
  documentFields: DocumentFieldsConfiguration;

  // === CAMPOS DE PRODUCTOS (SIMPLIFICADO PARA TICKET) ===
  productFields: {
    descripcion: { visible: boolean; maxLength: number };
    cantidad: { visible: boolean };
    precioUnitario: { visible: boolean };
    descuento: { visible: boolean };
    total: { visible: boolean };
    codigoBarras: { visible: boolean };
    marca: { visible: boolean };
  };

  // === CONFIGURACIÓN GENERAL ===
  general: {
    paperWidth: 58 | 80; // mm
    lineSpacing: number;
    characterWidth: number;
    margins: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
  };

  // === TIPOGRAFÍA ===
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

  // === QR CODE ===
  qrCode: {
    enabled: boolean;
    size: 'small' | 'medium' | 'large';
  };

  // === SEPARADORES ===
  separators: {
    useSeparators: boolean;
    character: string; // Ej: '=', '-', '*'
  };
}

// ===================================================================
// VOUCHER DESIGN CONFIGURATION EXTENDED (Simplified for UI)
// ===================================================================
export interface VoucherDesignConfigurationExtended {
  logo: LogoConfiguration;
  watermark: WatermarkConfiguration;
  footer: FooterConfiguration;
  documentFields: DocumentFieldsConfiguration;
  productFields: ProductFieldsConfiguration;
}

// ===================================================================
// EXTENDED VOUCHER DESIGN
// ===================================================================
export interface VoucherDesignExtended {
  id: string;
  name: string;
  type: 'A4' | 'TICKET';
  settingsA4?: VoucherDesignSettingsA4Extended;
  settingsTicket?: VoucherDesignSettingsTicketExtended;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===================================================================
// DEFAULT CONFIGURATIONS
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

// Aliases para compatibilidad con el UI
export const DEFAULT_DOCUMENT_FIELDS_CONFIG = DEFAULT_DOCUMENT_FIELDS;
export const DEFAULT_PRODUCT_FIELDS_CONFIG = DEFAULT_PRODUCT_FIELDS_A4;

// ===================================================================
// DEFAULT A4 DESIGN EXTENDED
// ===================================================================
export const DEFAULT_A4_DESIGN_EXTENDED: VoucherDesignSettingsA4Extended = {
  logo: DEFAULT_LOGO_CONFIG,
  watermark: DEFAULT_WATERMARK_CONFIG,
  footer: DEFAULT_FOOTER_CONFIG,
  documentFields: DEFAULT_DOCUMENT_FIELDS,
  productFields: DEFAULT_PRODUCT_FIELDS_A4,

  general: {
    showCompanyInfo: true,
    showBorder: true,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    pageMargins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
  },

  colors: {
    headerBackground: '#2563eb',
    headerText: '#ffffff',
    tableHeaderBackground: '#1f2937',
    tableHeaderText: '#ffffff',
    tableBorderColor: '#e5e7eb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    backgroundColor: '#ffffff',
  },

  typography: {
    fontFamily: 'Arial',
    fontSize: {
      header: 16,
      body: 11,
      footer: 9,
      table: 10,
    },
  },

  qrCode: {
    enabled: true,
    position: 'right',
    size: 'medium',
  },
};

// ===================================================================
// DEFAULT TICKET DESIGN EXTENDED
// ===================================================================
export const DEFAULT_TICKET_DESIGN_EXTENDED: VoucherDesignSettingsTicketExtended = {
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

  productFields: {
    descripcion: { visible: true, maxLength: 30 },
    cantidad: { visible: true },
    precioUnitario: { visible: true },
    descuento: { visible: false },
    total: { visible: true },
    codigoBarras: { visible: false },
    marca: { visible: false },
  },

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
