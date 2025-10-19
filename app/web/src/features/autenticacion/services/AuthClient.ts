// src/features/autenticacion/services/AuthClient.ts
import type {
  LoginCredentials,
  AuthResponse,
  PasswordResetRequest,
  PasswordReset,
} from '../types/auth.types';
import { tokenService } from './TokenService';

/**
 * ============================================
 * AUTH CLIENT - Cliente API (Solo I/O)
 * ============================================
 * Maneja ÚNICAMENTE las llamadas HTTP a /auth/*
 * NO contiene lógica de negocio (eso va en AuthRepository)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

class AuthClient {
  /**
   * Request genérico con manejo de errores
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = tokenService.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
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
      // Re-throw para que sea manejado por AuthRepository
      throw {
        code: error.code || 'NETWORK_ERROR',
        message: error.message || 'Error de conexión',
        details: error.details,
      };
    }
  }

  // ==================== AUTENTICACIÓN ====================

  /**
   * Login de usuario
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Verificar 2FA
   */
  async verify2FA(otp: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
  }

  /**
   * Obtener perfil del usuario actual
   */
  async getProfile(): Promise<AuthResponse['user']> {
    return this.request('/auth/me', {
      method: 'GET',
    });
  }

  /**
   * Refresh del access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // ==================== CONTEXTO ====================

  /**
   * Seleccionar contexto de trabajo
   */
  async selectContext(payload: {
    empresaId: string;
    establecimientoId: string;
  }): Promise<AuthResponse['contextoActual']> {
    return this.request('/auth/context', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==================== CONTRASEÑA ====================

  /**
   * Solicitar reset de contraseña
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<{
    message: string;
  }> {
    return this.request('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Resetear contraseña con token
   */
  async resetPassword(data: PasswordReset): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Setear contraseña desde invitación
   */
  async setPassword(payload: {
    token: string;
    password: string;
  }): Promise<{ message: string }> {
    return this.request('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ==================== VALIDACIONES ====================

  /**
   * Verificar si el email ya existe
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean }> {
    return this.request(`/auth/check-email?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  }
}

export const authClient = new AuthClient();