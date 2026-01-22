import { fetchApi, buildQueryString } from './fetchApi';
import { getCurrentEmpresaId } from './config';
import type {
  ApiResponse,
  ApiResponsePaginado,
  EstablecimientoBackendDto,
  EstablecimientoInputDto,
} from '../types/backend-types';

export interface ListEstablecimientosParams {
  page?: number;
  pageSize?: number;
  search?: string;
  empresaId?: string;
}

export const establecimientosApi = {
  async list(
    params: ListEstablecimientosParams = {}
  ): Promise<ApiResponsePaginado<EstablecimientoBackendDto>> {
    const empresaId = params.empresaId || getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      search: params.search,
      empresa_id: empresaId,
    });

    return fetchApi<ApiResponsePaginado<EstablecimientoBackendDto>>(
      `/establecimientos${queryString}`
    );
  },

  async getById(id: string): Promise<ApiResponse<EstablecimientoBackendDto>> {
    return fetchApi<ApiResponse<EstablecimientoBackendDto>>(
      `/establecimientos/${id}`
    );
  },

  async create(
    data: EstablecimientoInputDto
  ): Promise<ApiResponse<EstablecimientoBackendDto>> {
    return fetchApi<ApiResponse<EstablecimientoBackendDto>>(
      '/establecimientos',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async update(
    id: string,
    data: EstablecimientoInputDto
  ): Promise<ApiResponse<EstablecimientoBackendDto>> {
    return fetchApi<ApiResponse<EstablecimientoBackendDto>>(
      `/establecimientos/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    return fetchApi<ApiResponse<null>>(`/establecimientos/${id}`, {
      method: 'DELETE',
    });
  },

  async listAll(empresaId?: string): Promise<EstablecimientoBackendDto[]> {
    const allItems: EstablecimientoBackendDto[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.list({ empresaId, page, pageSize: 100 });
      
      if (response.data && response.data.length > 0) {
        allItems.push(...response.data);
      }

      hasMore = response.paginacion.hasNext;
      page++;
    }

    return allItems;
  },
};
