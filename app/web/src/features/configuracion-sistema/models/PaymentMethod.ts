import type { CreditInstallmentDefinition } from '../../../shared/payments/paymentTerms';
export interface PaymentMethod {
  id: string;
  code: string; // Internal code for identification
  name: string;
  type: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'CREDIT' | 'DIGITAL_WALLET' | 'OTHER';
  
  // SUNAT configuration
  sunatCode: string; // Official SUNAT catalog code
  sunatDescription: string;
  
  // Behavior configuration
  configuration: {
    requiresReference: boolean; // Requires transaction reference/authorization
    allowsPartialPayments: boolean;
    requiresValidation: boolean; // Requires additional validation
    hasCommission: boolean;
    commissionType?: 'FIXED' | 'PERCENTAGE';
    commissionAmount?: number;
    minimumAmount?: number;
    maximumAmount?: number;
    requiresCustomerData: boolean;
    allowsCashBack: boolean;
    requiresSignature: boolean;
  };
  
  // Financial configuration
  financial: {
    affectsCashFlow: boolean; // If it affects cash drawer
    settlementPeriod: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; // When funds are received
    accountingAccount?: string; // Associated accounting account
    bankId?: string; // Associated bank for cards/transfers
    terminalId?: string; // POS terminal ID if applicable
  };
  
  // UI configuration
  display: {
    icon: string; // Icon name for UI
    color: string; // Color code for UI
    displayOrder: number;
    isVisible: boolean;
    showInPos: boolean;
    showInInvoicing: boolean;
  };
  
  // Validation rules
  validation: {
    documentTypes: string[]; // Which document types accept this payment method
    customerTypes: ('INDIVIDUAL' | 'BUSINESS')[]; // Which customer types can use it
    minTransactionAmount?: number;
    maxTransactionAmount?: number;
    allowedCurrencies: string[];
  };
  
  // Credit schedule template (only for credit methods)
  creditSchedule?: CreditInstallmentDefinition[];
  
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodRequest {
  code: string;
  name: string;
  type: PaymentMethod['type'];
  sunatCode: string;
  configuration: PaymentMethod['configuration'];
  financial: PaymentMethod['financial'];
  display: PaymentMethod['display'];
  validation: PaymentMethod['validation'];
  creditSchedule?: CreditInstallmentDefinition[];
}

export interface UpdatePaymentMethodRequest extends Partial<CreatePaymentMethodRequest> {
  id: string;
}

export interface PaymentMethodSummary {
  id: string;
  code: string;
  name: string;
  type: PaymentMethod['type'];
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
}

// Predefined payment methods based on SUNAT catalog
export const SUNAT_PAYMENT_METHODS = [
  {
    code: '001',
    name: 'Depósito en cuenta',
    type: 'TRANSFER' as const,
    description: 'Depósito en cuenta corriente o de ahorros',
  },
  {
    code: '002',
    name: 'Giro',
    type: 'TRANSFER' as const,
    description: 'Giro bancario o postal',
  },
  {
    code: '003',
    name: 'Transferencia de fondos',
    type: 'TRANSFER' as const,
    description: 'Transferencia bancaria de fondos',
  },
  {
    code: '004',
    name: 'Orden de pago',
    type: 'TRANSFER' as const,
    description: 'Orden de pago bancaria',
  },
  {
    code: '005',
    name: 'Tarjeta de débito',
    type: 'CARD' as const,
    description: 'Pago con tarjeta de débito',
  },
  {
    code: '006',
    name: 'Tarjeta de crédito',
    type: 'CARD' as const,
    description: 'Pago con tarjeta de crédito',
  },
  {
    code: '007',
    name: 'Cheques con la cláusula de "no negociable"',
    type: 'CHECK' as const,
    description: 'Cheque no negociable',
  },
  {
    code: '008',
    name: 'Efectivo',
    type: 'CASH' as const,
    description: 'Pago en efectivo',
  },
  {
    code: '009',
    name: 'Efectivo, y el vuelto en otros medios de pago',
    type: 'CASH' as const,
    description: 'Pago mixto con efectivo',
  },
  {
    code: '010',
    name: 'Medios de pago usados en comercio exterior',
    type: 'OTHER' as const,
    description: 'Medios de pago para comercio exterior',
  },
  {
    code: '011',
    name: 'Letras de cambio',
    type: 'CREDIT' as const,
    description: 'Pago con letras de cambio',
  },
  {
    code: '012',
    name: 'Pagarés',
    type: 'CREDIT' as const,
    description: 'Pago con pagarés',
  },
  {
    code: '013',
    name: 'Factoring',
    type: 'CREDIT' as const,
    description: 'Pago mediante factoring',
  },
  {
    code: '014',
    name: 'Leasing',
    type: 'CREDIT' as const,
    description: 'Pago mediante leasing',
  },
  {
    code: '015',
    name: 'Servicios de pago digital',
    type: 'DIGITAL_WALLET' as const,
    description: 'Billeteras digitales y servicios de pago online',
  },
] as const;

export const PAYMENT_METHOD_TYPES = [
  { value: 'CASH', label: 'Efectivo', icon: 'Banknote', color: '#10b981' },
  { value: 'CARD', label: 'Tarjeta', icon: 'CreditCard', color: '#3b82f6' },
  { value: 'TRANSFER', label: 'Transferencia', icon: 'ArrowRightLeft', color: '#8b5cf6' },
  { value: 'CHECK', label: 'Cheque', icon: 'Receipt', color: '#f59e0b' },
  { value: 'CREDIT', label: 'Crédito', icon: 'Clock', color: '#ef4444' },
  { value: 'DIGITAL_WALLET', label: 'Billetera Digital', icon: 'Smartphone', color: '#06b6d4' },
  { value: 'OTHER', label: 'Otro', icon: 'MoreHorizontal', color: '#6b7280' },
] as const;

export const COMMISSION_TYPES = [
  { value: 'FIXED', label: 'Monto Fijo' },
  { value: 'PERCENTAGE', label: 'Porcentaje' },
] as const;

export const SETTLEMENT_PERIODS = [
  { value: 'IMMEDIATE', label: 'Inmediato' },
  { value: 'DAILY', label: 'Diario' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
] as const;