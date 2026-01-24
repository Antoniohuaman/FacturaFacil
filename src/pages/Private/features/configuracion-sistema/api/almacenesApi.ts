import { fetchApi, buildQueryString } from './fetchApi';
import { getCurrentEmpresaId } from './config';
import type {
  ApiResponse,
  ApiResponsePaginado,
  AlmacenBackendDto,
  AlmacenInputDto,
} from '../types/backend-types';

export interface ListAlmacenesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  empresaId?: string;
  estado?: boolean;
  establecimientoId?: string;
}

export const almacenesApi = {
  async list(
    params: ListAlmacenesParams = {}
  ): Promise<ApiResponsePaginado<AlmacenBackendDto>> {
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
      establecimiento_id: params.establecimientoId,
    });

    return fetchApi<ApiResponsePaginado<AlmacenBackendDto>>(
      `/almacenes${queryString}`
    );
  },

  async getById(id: string): Promise<ApiResponse<AlmacenBackendDto>> {
    const empresaId = getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<AlmacenBackendDto>>(
      `/almacenes/${id}${queryString}`
    );
  },

  async create(
    data: AlmacenInputDto
  ): Promise<ApiResponse<AlmacenBackendDto>> {
    const empresaId = data.empresaId || getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<AlmacenBackendDto>>(
      `/almacenes${queryString}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  async update(
    id: string,
    data: AlmacenInputDto
  ): Promise<ApiResponse<AlmacenBackendDto>> {
    const empresaId = data.empresaId || getCurrentEmpresaId();
    if (!empresaId) {
      throw new Error('No se pudo determinar el ID de la empresa');
    }

    const queryString = buildQueryString({ empresa_id: empresaId });
    return fetchApi<ApiResponse<AlmacenBackendDto>>(
      `/almacenes/${id}${queryString}`,
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
    return fetchApi<ApiResponse<null>>(`/almacenes/${id}${queryString}`, {
      method: 'DELETE',
    });
  },

  async listAll(params: {
    empresaId?: string;
    search?: string;
    estado?: boolean;
    establecimientoId?: string;
  } = {}): Promise<AlmacenBackendDto[]> {
    const allItems: AlmacenBackendDto[] = [];
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
