import { fetchApi } from './fetchApi';
import { API_CONFIG } from './config';
import type { 
  ApiResponse, 
  ApiResponsePaginado, 
  EmpresaBackendDto, 
  EmpresaInputDto 
} from '../types/backend-types';

export const empresasApi = {
  /**
   * Obtiene una lista paginada de empresas
   */
  async list(params: { page?: number; pageSize?: number; search?: string } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.search) query.append('search', params.search);

    const queryString = query.toString();
    const endpoint = `${API_CONFIG.ENDPOINTS.EMPRESAS}${queryString ? `?${queryString}` : ''}`;
    
    return fetchApi<ApiResponsePaginado<EmpresaBackendDto>>(endpoint);
  },

  /**
   * Obtiene el detalle de una empresa por ID
   */
  async getById(id: string) {
    return fetchApi<ApiResponse<EmpresaBackendDto>>(`${API_CONFIG.ENDPOINTS.EMPRESAS}/${id}`);
  },

  /**
   * Crea una nueva empresa
   */
  async create(data: EmpresaInputDto) {
    return fetchApi<ApiResponse<EmpresaBackendDto>>(API_CONFIG.ENDPOINTS.EMPRESAS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualiza una empresa existente
   */
  async update(id: string, data: EmpresaInputDto) {
    return fetchApi<ApiResponse<EmpresaBackendDto>>(`${API_CONFIG.ENDPOINTS.EMPRESAS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Elimina una empresa
   */
  async delete(id: string) {
    return fetchApi<ApiResponse<void>>(`${API_CONFIG.ENDPOINTS.EMPRESAS}/${id}`, {
      method: 'DELETE',
    });
  }
};
