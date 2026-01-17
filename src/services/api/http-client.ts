import { tokenService } from '../../pages/Private/features/autenticacion/services/TokenService';
import { API_CONFIG, STORAGE_KEYS, HTTP_STATUS } from './api.config';
import type { RequestConfig, ApiResponse } from './api.types';
import { ApiError } from './api.types';

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getEmpresaId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.EMPRESA_ID);
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}/api/${API_CONFIG.API_VERSION}${endpoint}`, window.location.origin);

    const empresaId = this.getEmpresaId();
    if (empresaId) {
      url.searchParams.set('empresa_id', empresaId);
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private getHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new Headers({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...customHeaders,
    });

    const token = tokenService.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (response.status === HTTP_STATUS.UNAUTHORIZED) {
      tokenService.clearTokens();
      window.location.href = '/login';
      throw new ApiError('Sesión expirada', HTTP_STATUS.UNAUTHORIZED);
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      throw new ApiError(
        data?.message || `Error HTTP ${response.status}`,
        response.status,
        data?.errors
      );
    }

    return {
      data: data as T,
      status: response.status,
      ok: response.ok,
    };
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', headers, body, params, timeout = API_CONFIG.TIMEOUT, signal } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.buildUrl(endpoint, params), {
        method,
        headers: this.getHeaders(headers),
        body: body ? JSON.stringify(body) : undefined,
        signal: signal || controller.signal,
      });

      return await this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
export { HttpClient };
