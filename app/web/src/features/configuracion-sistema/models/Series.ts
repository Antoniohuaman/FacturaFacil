export interface Series {
  id: string;
  establishmentId: string;
  documentType: DocumentType;
  series: string; // Serie (ej: F001, B001)
  correlativeNumber: number; // Número correlativo actual
  
  // Configuration
  configuration: {
    prefix?: string; // Prefijo opcional antes de la serie
    suffix?: string; // Sufijo opcional después del número
    minimumDigits: number; // Mínimo de dígitos para el número correlativo
    startNumber: number; // Número inicial
    endNumber?: number; // Número final (opcional)
    autoIncrement: boolean; // Auto incrementar el correlativo
    allowManualNumber: boolean; // Permitir número manual
    requireAuthorization: boolean; // Requiere autorización para usar
  };
  
  // SUNAT specific
  sunatConfiguration: {
    isElectronic: boolean; // Es comprobante electrónico
    environmentType: 'TESTING' | 'PRODUCTION';
    certificateRequired: boolean;
    mustReportToSunat: boolean;
    maxDaysToReport: number; // Días máximos para reportar a SUNAT
    sunatResolution?: string; // Resolución de autorización SUNAT
    authorizationDate?: Date;
    expiryDate?: Date;
  };
  
  // Status and control
  status: 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'CANCELLED';
  isDefault: boolean; // Serie por defecto para este tipo de documento
  
  // Usage statistics
  statistics: {
    documentsIssued: number;
    lastUsedDate?: Date;
    averageDocumentsPerDay: number;
    estimatedExhaustionDate?: Date;
  };
  
  // Validation rules
  validation: {
    allowZeroAmount: boolean;
    requireCustomer: boolean;
    allowedPaymentMethods?: string[];
    minAmount?: number;
    maxAmount?: number;
    restrictedHours?: {
      start: string;
      end: string;
    };
  };
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface DocumentType {
  id: string;
  code: string; // SUNAT code (01, 03, 07, 08, etc.)
  name: string;
  shortName: string;
  category: 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'GUIDE' | 'QUOTATION' | 'SALES_NOTE' | 'OTHER';
  
  // Document properties
  properties: {
    affectsTaxes: boolean;
    requiresCustomerRuc: boolean;
    requiresCustomerName: boolean;
    allowsCredit: boolean;
    requiresPaymentMethod: boolean;
    canBeVoided: boolean;
    canHaveCreditNote: boolean;
    canHaveDebitNote: boolean;
    isElectronic: boolean;
    requiresSignature: boolean;
  };
  
  // Series configuration
  seriesConfiguration: {
    defaultPrefix: string;
    seriesLength: number; // Length of series part (usually 3)
    correlativeLength: number; // Length of correlative number
    allowedPrefixes: string[];
  };
  
  isActive: boolean;
}

export interface CreateSeriesRequest {
  establishmentId: string;
  documentTypeId: string;
  series: string;
  configuration: Series['configuration'];
  sunatConfiguration?: Partial<Series['sunatConfiguration']>;
  validation?: Partial<Series['validation']>;
  notes?: string;
}

export interface UpdateSeriesRequest extends Partial<CreateSeriesRequest> {
  id: string;
}

export interface SeriesSummary {
  id: string;
  establishmentName: string;
  documentTypeName: string;
  series: string;
  correlativeNumber: number;
  status: Series['status'];
  isDefault: boolean;
  isElectronic: boolean;
  documentsIssued: number;
  estimatedExhaustionDate?: Date;
}

// SUNAT document types catalog
export const SUNAT_DOCUMENT_TYPES: DocumentType[] = [
  {
    id: '01',
    code: '01',
    name: 'Factura',
    shortName: 'FAC',
    category: 'INVOICE',
    properties: {
      affectsTaxes: true,
      requiresCustomerRuc: true,
      requiresCustomerName: true,
      allowsCredit: true,
      requiresPaymentMethod: true,
      canBeVoided: true,
      canHaveCreditNote: true,
      canHaveDebitNote: true,
      isElectronic: true,
      requiresSignature: false,
    },
    seriesConfiguration: {
      defaultPrefix: 'F',
      seriesLength: 3,
      correlativeLength: 8,
      allowedPrefixes: ['F'],
    },
    isActive: true,
  },
  {
    id: '03',
    code: '03',
    name: 'Boleta de Venta',
    shortName: 'BOL',
    category: 'RECEIPT',
    properties: {
      affectsTaxes: true,
      requiresCustomerRuc: false,
      requiresCustomerName: false,
      allowsCredit: false,
      requiresPaymentMethod: true,
      canBeVoided: true,
      canHaveCreditNote: true,
      canHaveDebitNote: false,
      isElectronic: true,
      requiresSignature: false,
    },
    seriesConfiguration: {
      defaultPrefix: 'B',
      seriesLength: 3,
      correlativeLength: 8,
      allowedPrefixes: ['B'],
    },
    isActive: true,
  },
  {
    id: '07',
    code: '07',
    name: 'Nota de Crédito',
    shortName: 'NCR',
    category: 'CREDIT_NOTE',
    properties: {
      affectsTaxes: true,
      requiresCustomerRuc: false,
      requiresCustomerName: true,
      allowsCredit: false,
      requiresPaymentMethod: false,
      canBeVoided: true,
      canHaveCreditNote: false,
      canHaveDebitNote: false,
      isElectronic: true,
      requiresSignature: false,
    },
    seriesConfiguration: {
      defaultPrefix: 'FC',
      seriesLength: 3,
      correlativeLength: 8,
      allowedPrefixes: ['FC', 'BC'],
    },
    isActive: true,
  },
  {
    id: '08',
    code: '08',
    name: 'Nota de Débito',
    shortName: 'NDB',
    category: 'DEBIT_NOTE',
    properties: {
      affectsTaxes: true,
      requiresCustomerRuc: false,
      requiresCustomerName: true,
      allowsCredit: false,
      requiresPaymentMethod: false,
      canBeVoided: true,
      canHaveCreditNote: false,
      canHaveDebitNote: false,
      isElectronic: true,
      requiresSignature: false,
    },
    seriesConfiguration: {
      defaultPrefix: 'FD',
      seriesLength: 3,
      correlativeLength: 8,
      allowedPrefixes: ['FD', 'BD'],
    },
    isActive: true,
  },
] as const;

export const SERIES_STATUS = [
  { value: 'ACTIVE', label: 'Activa', color: 'green' },
  { value: 'INACTIVE', label: 'Inactiva', color: 'gray' },
  { value: 'EXHAUSTED', label: 'Agotada', color: 'orange' },
  { value: 'EXPIRED', label: 'Vencida', color: 'red' },
  { value: 'CANCELLED', label: 'Cancelada', color: 'red' },
] as const;

export const ENVIRONMENT_TYPES = [
  { value: 'TESTING', label: 'Pruebas' },
  { value: 'PRODUCTION', label: 'Producción' },
] as const;