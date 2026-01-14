export interface Configuration {
  id: string;
  companyId: string;
  
  // Configuraciones generales
  general: {
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    decimalPlaces: number;
    thousandsSeparator: ',' | '.' | ' ';
    decimalSeparator: ',' | '.';
    language: 'es' | 'en';
  };

  // Configuraciones de ventas
  sales: {
    allowNegativeStock: boolean;
    autoCalculateTax: boolean;
    defaultTaxId: string;
    requireCustomerSelection: boolean;
    allowPartialPayments: boolean;
    autoGenerateCorrelativeNumber: boolean;
    showProductImages: boolean;
    enableDiscounts: boolean;
    maxDiscountPercentage: number;
    requireDiscountReason: boolean;
    enablePromotions: boolean;
    printReceiptAfterSale: boolean;
    openCashDrawerAfterPrint: boolean;
  };

  // Configuraciones de facturación
  billing: {
    defaultEstablishmentId: string;
    defaultSeriesId: string;
    autoSendToSunat: boolean;
    autoGeneratePdf: boolean;
    emailCopyToCompany: boolean;
    includeQrCode: boolean;
    includeDetraccionInfo: boolean;
    voucherDesign: 'A4' | 'TICKET';
    showProductCodes: boolean;
    showUnitPrices: boolean;
    showTotalTaxes: boolean;
  };

  // Configuraciones de inventario
  inventory: {
    trackStock: boolean;
    allowNegativeStock: boolean;
    autoUpdateCosts: boolean;
    costMethod: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC';
    enableBarcodes: boolean;
    enableSerialNumbers: boolean;
    enableBatches: boolean;
    enableExpirationDates: boolean;
    lowStockThreshold: number;
    enableStockAlerts: boolean;
    enableStockReservation: boolean;
  };

  // Configuraciones de usuarios
  users: {
    enableTimeTracking: boolean;
    enableCommissions: boolean;
    enableMultipleRoles: boolean;
    requirePinForActions: boolean;
    enablePermissionsByModule: boolean;
    sessionTimeoutMinutes: number;
    maxConcurrentSessions: number;
  };

  // Configuraciones de reportes
  reports: {
    defaultPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    autoGenerateReports: boolean;
    emailReportsSchedule: string | null;
    includeGraphics: boolean;
    exportFormat: 'PDF' | 'EXCEL' | 'CSV';
    retentionDays: number;
  };

  // Configuraciones de notificaciones
  notifications: {
    email: {
      enabled: boolean;
      smtp: {
        server: string;
        port: number;
        username: string;
        password: string;
        useTLS: boolean;
      };
    };
    sms: {
      enabled: boolean;
      provider: string;
      apiKey: string;
    };
    push: {
      enabled: boolean;
    };
  };

  // Configuraciones de integración
  integrations: {
    sunat: {
      enabled: boolean;
      environment: 'TESTING' | 'PRODUCTION';
      username: string;
      password: string;
      certificatePath?: string;
    };
    accounting: {
      enabled: boolean;
      system: string;
      syncFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY';
    };
    ecommerce: {
      enabled: boolean;
      platforms: string[];
      syncInventory: boolean;
      syncPrices: boolean;
    };
  };

  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ConfigurationModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  isConfigured: boolean;
  lastUpdated?: Date;
  status: 'PENDING' | 'CONFIGURED' | 'ERROR';
  progress: number;
}

export interface ConfigurationStep {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  order: number;
  validationRules?: string[];
}

export const CONFIGURATION_MODULES: ConfigurationModule[] = [
  {
    id: 'company',
    name: 'Información de la Empresa',
    description: 'Configurar datos básicos de la empresa',
    icon: 'Building2',
    isConfigured: false,
    status: 'PENDING',
    progress: 0,
  },
  {
    id: 'establishments',
    name: 'Establecimientos',
    description: 'Gestionar sucursales y puntos de venta',
    icon: 'Store',
    isConfigured: false,
    status: 'PENDING',
    progress: 0,
  },
  {
    id: 'business',
    name: 'Configuración Comercial',
    description: 'Métodos de pago, monedas, impuestos',
    icon: 'Settings',
    isConfigured: false,
    status: 'PENDING',
    progress: 0,
  },
  {
    id: 'series',
    name: 'Series de Comprobantes',
    description: 'Configurar numeración de documentos',
    icon: 'FileText',
    isConfigured: false,
    status: 'PENDING',
    progress: 0,
  },
  {
    id: 'users',
    name: 'Usuarios y Roles',
    description: 'Gestionar personal y permisos',
    icon: 'Users',
    isConfigured: false,
    status: 'PENDING',
    progress: 0,
  },
  {
    id: 'voucher-design',
    name: 'Diseño de Comprobantes',
    description: 'Personalizar apariencia de documentos',
    icon: 'Palette',
    isConfigured: false,
    status: 'PENDING',
    progress: 0,
  },
];