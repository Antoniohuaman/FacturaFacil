/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import type { Compra, CompraDetalle } from '../models';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || !import.meta.env.VITE_API_URL;

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

class ComprasClient {
  private async simulateNetworkDelay(ms = 800): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (DEV_MODE) {
      return this.handleDevModeRequest<T>(endpoint, options);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          code: 'UNKNOWN_ERROR',
          message: 'Error en la solicitud',
        }));
        throw error;
      }

      return response.json();
    } catch (error: any) {
      throw {
        code: error.code || 'NETWORK_ERROR',
        message: error.message || 'Error de conexión',
        details: error.details,
      };
    }
  }

  private async handleDevModeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.simulateNetworkDelay(600);

    // GET /clientes/:clienteId/compras
    if (endpoint.match(/\/clientes\/\d+\/compras$/) && options.method === 'GET') {
      return { data: [] } as T;
    }

    // GET /clientes/:clienteId/compras/:compraId
    if (endpoint.match(/\/clientes\/\d+\/compras\/\d+$/) && options.method === 'GET') {
      throw {
        code: 'NOT_FOUND',
        message: 'Compra no encontrada',
      };
    }

    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Endpoint no implementado en modo desarrollo',
    };
  }

  /**
   * Obtener compras de un cliente
   */
  async getComprasByCliente(clienteId: number | string, options: { signal?: AbortSignal } = {}): Promise<{ data: Compra[] }> {
    return this.request<{ data: Compra[] }>(`/clientes/${clienteId}/compras`, {
      method: 'GET',
      signal: options.signal,
    });
  }

  /**
   * Obtener detalle de una compra
   */
  async getCompraDetalle(
    clienteId: number | string,
    compraId: number | string,
    options: { signal?: AbortSignal } = {}
  ): Promise<CompraDetalle> {
    return this.request<CompraDetalle>(`/clientes/${clienteId}/compras/${compraId}`, {
      method: 'GET',
      signal: options.signal,
    });
  }
}

export const comprasClient = new ComprasClient();
