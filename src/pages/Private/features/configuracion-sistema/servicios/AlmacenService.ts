// src/pages/Private/features/configuracion-sistema/servicios/AlmacenService.ts

import type { Almacen } from '../modelos/Almacen';

/**
 * ============================================
 * ALMACEN SERVICE - Integración con API
 * ============================================
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errorCode?: string;
}

export interface ApiResponsePaginado<T> {
  success: boolean;
  data: T[];
  totalItems: number;
  page: number;
  pageSize: number;
  message: string;
}

class AlmacenService {
  private getHeaders() {
    const tokensStr = localStorage.getItem('senciyo_auth_tokens') || sessionStorage.getItem('senciyo_auth_tokens');
    const tokens = tokensStr ? JSON.parse(tokensStr) : null;
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokens?.accessToken}`,
    };
  }

  /**
   * Obtiene todos los almacenes del tenant (paginado)
   */
  async getAll(page = 1, pageSize = 20, search?: string): Promise<ApiResponsePaginado<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append('search', search);

    const response = await fetch(`${API_BASE_URL}/api/v1/almacenes?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Error al obtener almacenes');
    return response.json();
  }

  /**
   * Obtiene almacenes por establecimiento
   */
  async getByEstablecimiento(establecimientoId: string): Promise<ApiResponsePaginado<any>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/almacenes/establecimiento/${establecimientoId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) throw new Error('Error al obtener almacenes del establecimiento');
    return response.json();
  }

  /**
   * Crea un nuevo almacén
   */
  async create(almacen: any): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/almacenes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(almacen),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear almacén');
    }
    return response.json();
  }

  /**
   * Actualiza un almacén existente
   */
  async update(id: string, almacen: any): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/almacenes/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(almacen),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar almacén');
    }
    return response.json();
  }

  /**
   * Elimina un almacén (borrado lógico)
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/almacenes/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar almacén');
    }
    return response.json();
  }
}

export const almacenService = new AlmacenService();
