import type { ApiResponse } from './api.types';
import { ApiError } from './api.types';

export interface SunatRucData {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion: string;
  direccionFiscal?: string;
  ubigeo?: string;
  codigo_departamento?: string;
  codigo_provincia?: string;
  codigo_distrito?: string;
  actEconomicas?: string[];
  estado?: string;
  condicion?: string;
}

export interface RucValidationResult {
  isValid: boolean;
  message: string;
  data?: {
    razonSocial: string;
    nombreComercial: string;
    direccionFiscal: string;
    ubigeo: string;
    actividadEconomica: string;
    codigoDepartamento: string;
    codigoProvincia: string;
    codigoDistrito: string;
  };
}

const SUNAT_API_BASE_URL = 'https://cuenta.contasiscorp.com/api';

export const sunatService = {
  validateRuc: async (ruc: string): Promise<RucValidationResult> => {
    if (!ruc || ruc.length !== 11) {
      return {
        isValid: false,
        message: 'El RUC debe tener 11 dígitos',
      };
    }

    if (!/^\d+$/.test(ruc)) {
      return {
        isValid: false,
        message: 'El RUC solo debe contener números',
      };
    }

    try {
      const response = await fetch(`${SUNAT_API_BASE_URL}/sunat-ruc/${ruc}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            isValid: false,
            message: 'RUC no encontrado en SUNAT. Verifica que esté correctamente escrito.',
          };
        }

        if (response.status === 500) {
          return {
            isValid: false,
            message: 'Error del servidor SUNAT. Intenta nuevamente en unos momentos.',
          };
        }

        throw new ApiError(`Error HTTP: ${response.status}`, response.status);
      }

      const responseData = await response.json();
      const data: SunatRucData = responseData?.data || {};

      if (!data || !data.razonSocial) {
        return {
          isValid: false,
          message: 'No se pudieron obtener los datos completos desde SUNAT. Intenta nuevamente.',
        };
      }

      const actividadPrincipal =
        data.actEconomicas?.[0] && /^\s*Principal\b/i.test(data.actEconomicas[0])
          ? data.actEconomicas[0]
          : '';

      const ubigeo = data.codigo_departamento && data.codigo_provincia && data.codigo_distrito
        ? `${data.codigo_departamento}${data.codigo_provincia}${data.codigo_distrito}`
        : data.ubigeo || '';

      return {
        isValid: true,
        message: 'RUC válido. Datos completados automáticamente desde SUNAT.',
        data: {
          razonSocial: data.razonSocial || '',
          nombreComercial: data.nombreComercial || '',
          direccionFiscal: data.direccion || data.direccionFiscal || '',
          ubigeo,
          actividadEconomica: actividadPrincipal,
          codigoDepartamento: data.codigo_departamento || '',
          codigoProvincia: data.codigo_provincia || '',
          codigoDistrito: data.codigo_distrito || '',
        },
      };
    } catch (error) {
      console.error('[SunatService] Error al consultar SUNAT:', error);

      if (error instanceof ApiError) {
        throw error;
      }

      return {
        isValid: false,
        message: 'Error al conectar con SUNAT. Verifica tu conexión a internet e intenta nuevamente.',
      };
    }
  },
};

export type { ApiResponse };
