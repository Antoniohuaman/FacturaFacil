import { httpClient } from './http-client';
import type { ApiResponse, PaginatedResponse } from './api.types';

export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ruc?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClienteDTO {
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  ruc?: string;
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {
  id: number;
}

export const clientesService = {
  getAll: (params?: { page?: number; per_page?: number; search?: string }): Promise<ApiResponse<PaginatedResponse<Cliente>>> => {
    return httpClient.get('/clientes', params);
  },

  getById: (id: number): Promise<ApiResponse<Cliente>> => {
    return httpClient.get(`/clientes/${id}`);
  },

  create: (data: CreateClienteDTO): Promise<ApiResponse<Cliente>> => {
    return httpClient.post('/clientes', data);
  },

  update: (data: UpdateClienteDTO): Promise<ApiResponse<Cliente>> => {
    return httpClient.put(`/clientes/${data.id}`, data);
  },

  delete: (id: number): Promise<ApiResponse<void>> => {
    return httpClient.delete(`/clientes/${id}`);
  },
};
