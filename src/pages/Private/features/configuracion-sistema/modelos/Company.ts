export interface Company {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal: string;
  distrito: string;
  provincia: string;
  departamento: string;
  codigoPostal?: string;

  // Contacto - múltiples teléfonos y correos
  telefonos: string[];
  correosElectronicos: string[];
  sitioWeb?: string;

  // Branding
  logoEmpresa?: string;
  textoPiePagina?: string;

  // Negocio
  actividadEconomica: string;
  regimenTributario: 'GENERAL' | 'MYPE' | 'ESPECIAL';
  monedaBase: 'PEN' | 'USD';

  representanteLegal: {
    nombreRepresentanteLegal: string;
    tipoDocumentoRepresentante: 'DNI' | 'CE' | 'PASSPORT';
    numeroDocumentoRepresentante: string;
  };
  certificadoDigital?: {
    tieneCertificadoValido: boolean;
    emisorCertificado?: string;
    fechaVencimientoCertificado?: Date;
  };
  configuracionSunatEmpresa: {
    estaConfiguradoEnSunat: boolean;
    usuarioSunat?: string;
    entornoSunat: 'TESTING' | 'PRODUCTION';
    fechaUltimaSincronizacionSunat?: Date;
  };
  creadoEl: Date;
  actualizadoEl: Date;
  estaActiva: boolean;
}

export interface CreateCompanyRequest {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal: string;
  distrito: string;
  provincia: string;
  departamento: string;
  codigoPostal?: string;
  telefonos: string[];
  correosElectronicos: string[];
  sitioWeb?: string;
  textoPiePagina?: string;
  actividadEconomica: string;
  regimenTributario: 'GENERAL' | 'MYPE' | 'ESPECIAL';
  monedaBase: 'PEN' | 'USD';
  representanteLegal: {
    nombreRepresentanteLegal: string;
    tipoDocumentoRepresentante: 'DNI' | 'CE' | 'PASSPORT';
    numeroDocumentoRepresentante: string;
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