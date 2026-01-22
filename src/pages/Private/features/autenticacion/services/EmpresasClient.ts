// src/features/autenticacion/services/EmpresasClient.ts

import { httpClient } from '../../../../../services/api/http-client';
import type {
  EmpresaCompletaDTO,
  EmpresaCompletaResponse,
  CreateEmpresaRequest,
  CreateEmpresaResponse,
  UpdateEmpresaRequest,
  UpdateEmpresaResponse,
} from '../types/api.types';

/**
 * ============================================
 * EMPRESAS CLIENT - Gestión de Empresas
 * ============================================
 * Cliente HTTP para operaciones relacionadas con empresas
 */

class EmpresasClient {
  private readonly baseEndpoint = '/empresas';

  /**
   * Obtiene los datos completos de una empresa por su ID
   * @param empresaId - ID de la empresa
   * @returns Datos completos de la empresa
   */
  async fetchEmpresa(empresaId: string): Promise<EmpresaCompletaDTO> {
    try {
      console.log('[EmpresasClient] Solicitando empresa con ID:', empresaId);
      console.log('[EmpresasClient] URL completa:', `${this.baseEndpoint}/${empresaId}`);

      const response = await httpClient.get<EmpresaCompletaResponse>(
        `${this.baseEndpoint}/${empresaId}`
      );

      console.log('[EmpresasClient] Respuesta HTTP completa:', {
        status: response.status,
        ok: response.ok,
        data: response.data,
      });

      if (response.data && response.data.exito && response.data.data) {
        console.log('[EmpresasClient] ✅ Empresa completa obtenida:', response.data.data);
        return response.data.data;
      }

      console.error('[EmpresasClient] ❌ Respuesta sin datos válidos:', response.data);
      throw new Error(response.data?.mensaje || 'Error al obtener empresa: respuesta sin datos');
    } catch (error: any) {
      console.error('[EmpresasClient] ❌ Error en fetchEmpresa:', {
        error,
        message: error?.message,
        status: error?.status,
      });
      throw error;
    }
  }

  /**
   * Obtiene la empresa completa usando el RUC
   * @param ruc - RUC de la empresa
   */
  async fetchEmpresaPorRuc(ruc: string): Promise<EmpresaCompletaDTO> {
    return this.fetchEmpresa(ruc);
  }

  /**
   * Obtiene la empresa completa usando el empresaId
   * @param empresaId - ID de la empresa
   */
  async fetchEmpresaPorId(empresaId: string): Promise<EmpresaCompletaDTO> {
    return this.fetchEmpresa(empresaId);
  }

  /**
   * Crea una nueva empresa
   * @param data - Datos de la empresa a crear
   * @returns Empresa creada
   */
  async createEmpresa(data: CreateEmpresaRequest): Promise<EmpresaCompletaDTO> {
    try {
      console.log('[EmpresasClient] Creando nueva empresa:', data);

      const response = await httpClient.post<CreateEmpresaResponse>(
        this.baseEndpoint,
        data
      );

      console.log('[EmpresasClient] Respuesta HTTP de creación:', {
        status: response.status,
        ok: response.ok,
        data: response.data,
      });

      if (response.data && response.data.exito && response.data.data) {
        console.log('[EmpresasClient] ✅ Empresa creada exitosamente:', response.data.data);
        return response.data.data;
      }

      console.error('[EmpresasClient] ❌ Respuesta sin datos válidos:', response.data);
      throw new Error(response.data?.mensaje || 'Error al crear empresa: respuesta sin datos');
    } catch (error: any) {
      console.error('[EmpresasClient] ❌ Error en createEmpresa:', {
        error,
        message: error?.message,
        status: error?.status,
      });
      throw error;
    }
  }

  /**
   * Actualiza una empresa existente
   * @param empresaId - ID de la empresa
   * @param data - Datos a actualizar
   * @returns Empresa actualizada
   */
  async updateEmpresa(empresaId: string, data: UpdateEmpresaRequest): Promise<EmpresaCompletaDTO> {
    try {
      console.log('[EmpresasClient] Actualizando empresa con ID:', empresaId);
      console.log('[EmpresasClient] Datos de actualización:', data);

      const response = await httpClient.put<UpdateEmpresaResponse>(
        `${this.baseEndpoint}/${empresaId}`,
        data
      );

      console.log('[EmpresasClient] Respuesta HTTP de actualización:', {
        status: response.status,
        ok: response.ok,
        data: response.data,
      });

      if (response.data && response.data.exito && response.data.data) {
        console.log('[EmpresasClient] ✅ Empresa actualizada exitosamente:', response.data.data);
        return response.data.data;
      }

      console.error('[EmpresasClient] ❌ Respuesta sin datos válidos:', response.data);
      throw new Error(response.data?.mensaje || 'Error al actualizar empresa: respuesta sin datos');
    } catch (error: any) {
      console.error('[EmpresasClient] ❌ Error en updateEmpresa:', {
        error,
        message: error?.message,
        status: error?.status,
      });
      throw error;
    }
  }
}

// Singleton
export const empresasClient = new EmpresasClient();
