export interface Establishment {
  id: string;
  code: string; // SUNAT establishment code (4 digits)
  name: string;
  address: string;
  district: string;
  province: string;
  department: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  
  // Geographic information
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  
  // Business information
  isMainEstablishment: boolean;
  businessHours: {
    monday?: BusinessHours;
    tuesday?: BusinessHours;
    wednesday?: BusinessHours;
    thursday?: BusinessHours;
    friday?: BusinessHours;
    saturday?: BusinessHours;
    sunday?: BusinessHours;
  };
  
  // SUNAT configuration
  sunatConfiguration: {
    isRegistered: boolean;
    registrationDate?: Date;
    annexCode?: string; // Código de anexo SUNAT
    economicActivity?: string;
    tributaryAddress?: string; // Domicilio fiscal if different
  };
  
  // Point of sale configuration
  posConfiguration?: {
    hasPos: boolean;
    terminalCount: number;
    printerConfiguration: {
      hasPrinter: boolean;
      printerType: 'THERMAL' | 'INKJET' | 'LASER';
      paperSize: 'A4' | 'TICKET_58MM' | 'TICKET_80MM';
      isNetworkPrinter: boolean;
      printerIp?: string;
    };
    cashDrawerConfiguration: {
      hasCashDrawer: boolean;
      openMethod: 'PRINTER' | 'MANUAL' | 'ELECTRONIC';
      currency: string;
    };
    barcodeScanner: {
      hasScanner: boolean;
      scannerType: 'USB' | 'BLUETOOTH' | 'WIFI';
    };
  };
  
  // Inventory configuration
  inventoryConfiguration: {
    managesInventory: boolean;
    isWarehouse: boolean;
    allowNegativeStock: boolean;
    autoTransferStock: boolean;
    parentWarehouseId?: string;
  };
  
  // Financial configuration
  financialConfiguration: {
    handlesCash: boolean;
    defaultCurrencyId: string;
    acceptedCurrencies: string[];
    defaultTaxId: string;
    bankAccounts: BankAccount[];
  };
  
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface BusinessHours {
  isOpen: boolean;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  breakStart?: string;
  breakEnd?: string;
  is24Hours: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'BUSINESS';
  accountNumber: string;
  currency: string;
  isMain: boolean;
  isActive: boolean;
}

export interface UpdateEstablishmentRequest extends Partial<CreateEstablishmentRequest> {
  id: string;
}

export interface EstablishmentSummary {
  id: string;
  code: string;
  name: string;
  address: string;
  district: string;
  status: Establishment['status'];
  isMainEstablishment: boolean;
  employeeCount?: number;
  hasPos: boolean;
}

export const ESTABLISHMENT_STATUS = [
  { value: 'ACTIVE', label: 'Activo', color: 'green' },
  { value: 'INACTIVE', label: 'Inactivo', color: 'gray' },
  { value: 'SUSPENDED', label: 'Suspendido', color: 'yellow' },
] as const;

export const PRINTER_TYPES = [
  { value: 'THERMAL', label: 'Impresora Térmica' },
  { value: 'INKJET', label: 'Impresora de Tinta' },
  { value: 'LASER', label: 'Impresora Láser' },
] as const;

export const PAPER_SIZES = [
  { value: 'A4', label: 'A4 (210 x 297 mm)' },
  { value: 'TICKET_58MM', label: 'Ticket 58mm' },
  { value: 'TICKET_80MM', label: 'Ticket 80mm' },
] as const;

export const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Cuenta Corriente' },
  { value: 'SAVINGS', label: 'Cuenta de Ahorros' },
  { value: 'BUSINESS', label: 'Cuenta Empresarial' },
] as const;

export interface BusinessHours {
  isOpen: boolean;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  breakStart?: string;
  breakEnd?: string;
  is24Hours: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: 'CHECKING' | 'SAVINGS' | 'BUSINESS';
  accountNumber: string;
  currency: string;
  isMain: boolean;
  isActive: boolean;
}

export interface CreateEstablishmentRequest {
  code: string;
  name: string;
  address: string;
  district: string;
  province: string;
  department: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  businessHours?: Establishment['businessHours'];
  sunatConfiguration?: {
    annexCode?: string;
    economicActivity?: string;
    tributaryAddress?: string;
  };
  inventoryConfiguration?: {
    managesInventory: boolean;
    isWarehouse: boolean;
    allowNegativeStock: boolean;
    autoTransferStock: boolean;
    parentWarehouseId?: string;
  };
  financialConfiguration?: {
    handlesCash: boolean;
    defaultCurrencyId: string;
    acceptedCurrencies: string[];
    defaultTaxId: string;
  };
  notes?: string;}
