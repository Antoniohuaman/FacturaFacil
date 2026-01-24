export interface Establecimiento {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  codigoDistrito: string;
  codigoProvincia: string;
  codigoDepartamento: string;
  codigoPostal?: string;
  phone?: string;
  email?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  principal: boolean;
  businessHours: {
    monday?: BusinessHours;
    tuesday?: BusinessHours;
    wednesday?: BusinessHours;
    thursday?: BusinessHours;
    friday?: BusinessHours;
    saturday?: BusinessHours;
    sunday?: BusinessHours;
  };
  sunatConfiguration: {
    isRegistered: boolean;
    registrationDate?: Date;
    annexCode?: string;
    economicActivity?: string;
    tributaryAddress?: string;
  };
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
  inventoryConfiguration: {
    managesInventory: boolean;
    isalmacen: boolean;
    allowNegativeStock: boolean;
    autoTransferStock: boolean;
    parentalmacenId?: string;
  };
  financialConfiguration: {
    handlesCash: boolean;
    defaultCurrencyId: string;
    acceptedCurrencies: string[];
    defaultTaxId: string;
    bankAccounts: BankAccount[];
  };
  
  estado: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  esActivo: boolean;
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

export interface UpdateEstablecimientoRequest extends Partial<CreateEstablecimientoRequest> {
  id: string;
}

export interface EstablecimientoSummary {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  distrito: string;
  estado: Establecimiento['estado'];
  principal: boolean;
  esActivo: boolean;
  userCount?: number;
  hasPos: boolean;
}

export const Establecimiento_STATUS = [
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

export interface CreateEstablecimientoRequest {
  codigoEstablecimiento: string;
  nombreEstablecimiento: string;
  direccionEstablecimiento: string;
  codigoDepartamento: string;
  departamentoEstablecimiento: string;
  codigoProvincia: string;
  provinciaEstablecimiento: string;
  codigoDistrito: string;
  distritoEstablecimiento: string;
  codigoPostalEstablecimiento?: string;
  phone?: string;
  email?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  businessHours?: Establecimiento['businessHours'];
  sunatConfiguration?: {
    annexCode?: string;
    economicActivity?: string;
    tributaryAddress?: string;
  };
  inventoryConfiguration?: {
    managesInventory: boolean;
    isalmacen: boolean;
    allowNegativeStock: boolean;
    autoTransferStock: boolean;
    parentalmacenId?: string;
  };
  financialConfiguration?: {
    handlesCash: boolean;
    defaultCurrencyId: string;
    acceptedCurrencies: string[];
    defaultTaxId: string;
  };
  notes?: string;}
