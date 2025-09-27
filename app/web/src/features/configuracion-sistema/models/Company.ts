export interface Company {
  id: string;
  ruc: string;
  businessName: string;
  tradeName?: string;
  address: string;
  district: string;
  province: string;
  department: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  economicActivity: string;
  taxRegime: 'GENERAL' | 'MYPE' | 'ESPECIAL';
  legalRepresentative: {
    name: string;
    documentType: 'DNI' | 'CE' | 'PASSPORT';
    documentNumber: string;
  };
  digitalCertificate?: {
    hasValidCertificate: boolean;
    issuer?: string;
    expiryDate?: Date;
  };
  sunatConfiguration: {
    isConfigured: boolean;
    username?: string;
    environment: 'TESTING' | 'PRODUCTION';
    lastSyncDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CreateCompanyRequest {
  ruc: string;
  businessName: string;
  tradeName?: string;
  address: string;
  district: string;
  province: string;
  department: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  economicActivity: string;
  taxRegime: 'GENERAL' | 'MYPE' | 'ESPECIAL';
  legalRepresentative: {
    name: string;
    documentType: 'DNI' | 'CE' | 'PASSPORT';
    documentNumber: string;
  };
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
  id: string;
}

export const TAX_REGIMES = [
  { value: 'GENERAL', label: 'Régimen General' },
  { value: 'MYPE', label: 'Régimen MYPE Tributario' },
  { value: 'ESPECIAL', label: 'Régimen Especial' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
] as const;

export const SUNAT_ENVIRONMENTS = [
  { value: 'TESTING', label: 'Ambiente de Pruebas' },
  { value: 'PRODUCTION', label: 'Ambiente de Producción' },
] as const;