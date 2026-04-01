import { tokenService } from '@/pages/Private/features/autenticacion/services/TokenService';

const RUTA_BASE_DOCUMENTOS = '/api/documentos';
const DNI_REGEX = /^\d{8}$/;
const RUC_REGEX = /^[12]\d{10}$/;

export interface DatosConsultaDni {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

export interface DatosConsultaRuc {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  tipo?: string;
  direccion: string;
  estado: string;
  condicion: string;
  pais?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  referenciaDireccion?: string;
  fechaInscripcion?: string;
  sistEmsion?: string;
  sistemaEmision?: string;
  sistContabilidad?: string;
  actEconomicas?: string[];
  actividadEconomicaPrincipal?: string;
  esAgenteRetencion?: boolean;
  esAgentePercepcion?: boolean;
  esBuenContribuyente?: boolean;
  esEmisorElectronico?: boolean;
  exceptuadaPercepcion?: boolean;
}

export interface RespuestaConsultaDni {
  success: boolean;
  data?: DatosConsultaDni;
  message?: string;
  codigoError?: string;
}

export interface RespuestaConsultaRuc {
  success: boolean;
  data?: DatosConsultaRuc;
  message?: string;
  codigoError?: string;
}

function construirHeaders(): Headers {
  const headers = new Headers({
    Accept: 'application/json',
  });

  const token = tokenService.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

function errorComoTexto(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la consulta documental.';
}

async function consultarEndpoint<T extends { success: boolean; message?: string; codigoError?: string }>(
  endpoint: string,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: construirHeaders(),
      signal,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const body = isJson ? (await response.json()) as T : null;

    if (!response.ok) {
      if (body) {
        return body;
      }

      throw new Error(`Error HTTP ${response.status}`);
    }

    if (!body) {
      throw new Error('La respuesta del servicio documental no es válida.');
    }

    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La consulta documental superó el tiempo de espera permitido.');
    }

    throw new Error(errorComoTexto(error));
  }
}

async function consultarDni(dni: string, options: { signal?: AbortSignal } = {}): Promise<RespuestaConsultaDni> {
  const numero = (dni || '').trim();
  if (!DNI_REGEX.test(numero)) {
    return {
      success: false,
      message: 'DNI inválido. Debe tener exactamente 8 dígitos.',
      codigoError: 'documento_invalido',
    };
  }

  return consultarEndpoint<RespuestaConsultaDni>(`${RUTA_BASE_DOCUMENTOS}/dni/${numero}`, options.signal);
}

async function consultarRuc(ruc: string, options: { signal?: AbortSignal } = {}): Promise<RespuestaConsultaRuc> {
  const numero = (ruc || '').trim();
  if (!RUC_REGEX.test(numero)) {
    return {
      success: false,
      message: 'RUC inválido. Debe tener 11 dígitos y comenzar con 1 o 2.',
      codigoError: 'documento_invalido',
    };
  }

  return consultarEndpoint<RespuestaConsultaRuc>(`${RUTA_BASE_DOCUMENTOS}/ruc/${numero}`, options.signal);
}

export const servicioConsultaDocumentos = {
  consultarDni,
  consultarRuc,
};