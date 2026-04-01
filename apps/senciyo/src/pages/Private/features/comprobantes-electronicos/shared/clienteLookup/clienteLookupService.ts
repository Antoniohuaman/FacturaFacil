import type { ClientData } from '../../models/comprobante.types';
import {
  servicioConsultaDocumentos,
  type DatosConsultaDni as ServicioDatosConsultaDni,
  type DatosConsultaRuc as ServicioDatosConsultaRuc,
} from '@/shared/documentos/servicioConsultaDocumentos';

export type ClienteLookupSource = 'RENIEC' | 'SUNAT';

export interface ReniecLookupData {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

export interface SunatLookupData {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  tipo: string;
  direccion: string;
  estado: string;
  condicion: string;
  pais: string;
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  referenciaDireccion?: string;
  fechaInscripcion: string;
  sistemaEmision: string;
  actEconomicas: string[];
  esAgenteRetencion: boolean;
  esAgentePercepcion: boolean;
  esBuenContribuyente: boolean;
  esEmisorElectronico: boolean;
  exceptuadaPercepcion: boolean;
}

export interface ClienteLookupResult extends ClientData {
  origen: ClienteLookupSource;
  reniec?: ReniecLookupData;
  sunat?: SunatLookupData;
}

const normalizeDigits = (value: string): string => value.replace(/\D/g, '');

const construirNombrePersona = (data: ReniecLookupData): string => {
  if (data.nombreCompleto.trim()) {
    return data.nombreCompleto.trim();
  }

  return [data.nombres, data.apellidoPaterno, data.apellidoMaterno]
    .filter(Boolean)
    .join(' ')
    .trim();
};

const mapearReniec = (data: ServicioDatosConsultaDni): ReniecLookupData => ({
  dni: data.dni,
  nombres: data.nombres,
  apellidoPaterno: data.apellidoPaterno,
  apellidoMaterno: data.apellidoMaterno,
  nombreCompleto: data.nombreCompleto,
});

const mapearSunat = (data: ServicioDatosConsultaRuc): SunatLookupData => ({
  ruc: data.ruc,
  razonSocial: data.razonSocial,
  nombreComercial: data.nombreComercial,
  tipo: data.tipo ?? 'No disponible',
  direccion: data.direccion || 'Dirección no definida',
  estado: data.estado || 'No disponible',
  condicion: data.condicion || 'No disponible',
  pais: data.pais || 'PE',
  departamento: data.departamento || '',
  provincia: data.provincia || '',
  distrito: data.distrito || '',
  ubigeo: data.ubigeo || '',
  referenciaDireccion: data.referenciaDireccion,
  fechaInscripcion: data.fechaInscripcion || '',
  sistemaEmision: data.sistemaEmision || data.sistEmsion || '',
  actEconomicas: data.actEconomicas || [],
  esAgenteRetencion: data.esAgenteRetencion ?? false,
  esAgentePercepcion: data.esAgentePercepcion ?? false,
  esBuenContribuyente: data.esBuenContribuyente ?? false,
  esEmisorElectronico: data.esEmisorElectronico ?? false,
  exceptuadaPercepcion: data.exceptuadaPercepcion ?? false,
});

export const lookupPersonaPorDni = async (dni: string): Promise<ClienteLookupResult | null> => {
  const normalized = normalizeDigits(dni);
  if (normalized.length !== 8) {
    return null;
  }

  const response = await servicioConsultaDocumentos.consultarDni(normalized);
  if (!response.success || !response.data) {
    return null;
  }

  const reniec = mapearReniec(response.data);
  const nombreNatural = construirNombrePersona(reniec);

  return {
    nombre: nombreNatural,
    tipoDocumento: 'dni',
    documento: normalized,
    direccion: undefined,
    email: undefined,
    telefono: undefined,
    origen: 'RENIEC',
    reniec,
  };
};

export const lookupEmpresaPorRuc = async (ruc: string): Promise<ClienteLookupResult | null> => {
  const normalized = normalizeDigits(ruc);
  if (normalized.length !== 11) {
    return null;
  }

  if (!(normalized.startsWith('1') || normalized.startsWith('2'))) {
    return null;
  }

  const response = await servicioConsultaDocumentos.consultarRuc(normalized);
  if (!response.success || !response.data) {
    return null;
  }

  const sunat = mapearSunat(response.data);

  return {
    nombre: sunat.razonSocial,
    tipoDocumento: 'ruc',
    documento: normalized,
    direccion: sunat.direccion,
    email: undefined,
    telefono: undefined,
    origen: 'SUNAT',
    sunat,
  };
};
