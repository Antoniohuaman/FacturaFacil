// src/features/configuracion-sistema/models/VoucherDesign.ts

/**
 * Configuración de diseño de comprobantes
 * Define la apariencia y personalización de facturas y boletas
 */

export interface VoucherDesignSettings {
  // General
  showLogo: boolean;
  showCompanyInfo: boolean;
  showFooter: boolean;
  footerText: string;
  
  // Colors
  headerColor: string;
  textColor: string;
  borderColor: string;
  
  // Typography
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'Arial' | 'Helvetica' | 'Times';
  
  // Visual
  showBorder: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
}

export interface VoucherDesign {
  id: string;
  name: string;
  type: 'A4' | 'TICKET';
  settings: VoucherDesignSettings;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Default designs
export const DEFAULT_A4_DESIGN_SETTINGS: VoucherDesignSettings = {
  showLogo: true,
  showCompanyInfo: true,
  showFooter: true,
  footerText: 'Gracias por su preferencia',
  headerColor: '#2563eb',
  textColor: '#374151',
  borderColor: '#e5e7eb',
  fontSize: 'medium',
  fontFamily: 'Arial',
  showBorder: true,
  showWatermark: false,
  watermarkText: '',
  watermarkOpacity: 0.1
};

export const DEFAULT_TICKET_DESIGN_SETTINGS: VoucherDesignSettings = {
  showLogo: true,
  showCompanyInfo: true,
  showFooter: true,
  footerText: 'Gracias por su compra',
  headerColor: '#1f2937',
  textColor: '#000000',
  borderColor: '#000000',
  fontSize: 'small',
  fontFamily: 'Arial',
  showBorder: false,
  showWatermark: false,
  watermarkText: '',
  watermarkOpacity: 0.1
};

// Full default voucher designs (with metadata)
export const DEFAULT_A4_DESIGN: VoucherDesign = {
  id: 'design-a4-default',
  name: 'Diseño A4 Predeterminado',
  type: 'A4',
  settings: DEFAULT_A4_DESIGN_SETTINGS,
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

export const DEFAULT_TICKET_DESIGN: VoucherDesign = {
  id: 'design-ticket-default',
  name: 'Diseño Ticket Predeterminado',
  type: 'TICKET',
  settings: DEFAULT_TICKET_DESIGN_SETTINGS,
  isDefault: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};
