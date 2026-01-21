import { httpClient } from './http-client';
import type { ApiResponse } from './api.types';

export interface EmpresaUsuario {
  id: string;
  empresaId: string;
  usuarioId: string;
  establecimientoId: string;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  esActivo: boolean;
  createdAt: string;
  updatedAt: string;
  empresaRuc: string;
  empresaRazonSocial: string;
  establecimientoCodigo: string;
  establecimientoNombre: string;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  celular?: string;
  email: string;
  username: string;
  requiereCambioPassword: boolean;
  esActivo: boolean;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  requiereCambioPassword: boolean;
  empresas: EmpresaUsuario[];
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  celular?: string;
  email: string;
  password: string;
  username: string;
  requiereCambioPassword?: boolean;
  esActivo?: boolean;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
}

export interface RegisterResponse {
  token: string;
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  requiereCambioPassword: boolean;
  empresas: EmpresaUsuario[];
}

export interface UsuarioResponse {
  exito: boolean;
  mensaje: string;
  codigoError: string;
  data: LoginResponse | RegisterResponse | Usuario;
  timestamp?: string;
}

export const usuariosService = {
  login: async (credentials: LoginRequest): Promise<UsuarioResponse> => {
    const response = await httpClient.post<UsuarioResponse>('/usuarios/login', credentials);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<UsuarioResponse> => {
    const response = await httpClient.post<UsuarioResponse>('/usuarios', data);
    return response.data;
  },

  getById: async (id: string): Promise<UsuarioResponse> => {
    const response = await httpClient.get<UsuarioResponse>(`/usuarios/${id}`);
    return response.data;
  },

  cambiarPassword: async (id: string, data: { passwordActual: string; passwordNuevo: string }): Promise<UsuarioResponse> => {
    const response = await httpClient.patch<UsuarioResponse>(`/usuarios/${id}/cambiar-password`, data);
    return response.data;
  },

  resetPassword: async (id: string, newPassword: string): Promise<UsuarioResponse> => {
    const response = await httpClient.patch<UsuarioResponse>(`/usuarios/${id}/reset-password`, newPassword);
    return response.data;
  },

  logout: async (): Promise<UsuarioResponse> => {
    const response = await httpClient.post<UsuarioResponse>('/usuarios/logout');
    return response.data;
  },
};
