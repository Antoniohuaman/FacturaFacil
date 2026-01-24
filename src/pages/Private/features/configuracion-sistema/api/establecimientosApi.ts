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
  estado?: boolean;
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
      estado: params.estado,
    });

    return fetchApi<ApiResponsePaginado<EstablecimientoBackendDto>>(
      `/establecimientos${queryString}`
    );
  },

  async getById(id: string): Promise<ApiResponse<EstablecimientoBackendDto>> {
    const empresaId = getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<EstablecimientoBackendDto>>(
      `/establecimientos/${id}${queryString}`
    );
  },

  async create(
    data: EstablecimientoInputDto
  ): Promise<ApiResponse<EstablecimientoBackendDto>> {
    const empresaId = data.empresaId || getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<EstablecimientoBackendDto>>(
      `/establecimientos${queryString}`,
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
    const empresaId = data.empresaId || getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<EstablecimientoBackendDto>>(
      `/establecimientos/${id}${queryString}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  async delete(id: string): Promise<ApiResponse<null>> {
    const empresaId = getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<null>>(`/establecimientos/${id}${queryString}`, {
      method: 'DELETE',
    });
  },

  async listAll(params: {
    empresaId?: string;
    search?: string;
    estado?: boolean;
  } = {}): Promise<EstablecimientoBackendDto[]> {
    const allItems: EstablecimientoBackendDto[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.list({ ...params, page, pageSize: 100 });

      if (response.data && response.data.length > 0) {
        allItems.push(...response.data);
      }

      hasMore = response.paginacion.hasNext;
      page++;
    }

    return allItems;
  },
};
