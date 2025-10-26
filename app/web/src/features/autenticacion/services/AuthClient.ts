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
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true' || !import.meta.env.VITE_API_URL;

interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

class AuthClient {
  /**
   * Limpiar usuarios de desarrollo (solo para testing)
   */
  clearDevUsers(): void {
    if (DEV_MODE) {
      localStorage.removeItem('dev_users');
      console.log('[DEV MODE] Usuarios de desarrollo eliminados');
    }
  }

  /**
   * Ver usuarios de desarrollo (solo para testing)
   */
  getDevUsers(): any[] {
    if (DEV_MODE) {
      const users = JSON.parse(localStorage.getItem('dev_users') || '[]');
      return users.map((u: any) => ({
        email: u.email,
        nombre: u.nombre,
        apellido: u.apellido,
        ruc: u.ruc,
      }));
    }
    return [];
  }

  /**
   * Simular delay de red
   */
  private async simulateNetworkDelay(ms = 1000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Request genérico con manejo de errores
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Si estamos en modo desarrollo sin backend, usar simulaciones
    if (DEV_MODE) {
      return this.handleDevModeRequest<T>(endpoint, options);
    }

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

  /**
   * Manejador de requests en modo desarrollo
   */
  private async handleDevModeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.simulateNetworkDelay(800);

    const body = options.body ? JSON.parse(options.body as string) : {};

    // Simular registro
    if (endpoint === '/auth/register' && options.method === 'POST') {
      const users = JSON.parse(localStorage.getItem('dev_users') || '[]');

      // Normalizar email a lowercase
      const normalizedEmail = body.email.toLowerCase().trim();

      // Verificar si el email ya existe
      if (users.some((u: any) => u.email === normalizedEmail)) {
        throw {
          code: 'EMAIL_EXISTS',
          message: 'El correo electrónico ya está registrado',
        };
      }

      // Guardar usuario con email normalizado
      const newUser = {
        id: `user_${Date.now()}`,
        ...body,
        email: normalizedEmail,
        createdAt: new Date().toISOString(),
      };
      users.push(newUser);
      localStorage.setItem('dev_users', JSON.stringify(users));

      console.log('[DEV MODE] Usuario registrado:', { email: normalizedEmail, id: newUser.id });

      return {
        message: 'Cuenta creada exitosamente',
        userId: newUser.id,
      } as T;
    }

    // Simular login
    if (endpoint === '/auth/login' && options.method === 'POST') {
      const users = JSON.parse(localStorage.getItem('dev_users') || '[]');

      // Normalizar email a lowercase
      const normalizedEmail = body.email.toLowerCase().trim();

      console.log('[DEV MODE] Intentando login:', { email: normalizedEmail });
      console.log('[DEV MODE] Usuarios registrados:', users.map((u: any) => ({ email: u.email })));

      const user = users.find((u: any) =>
        u.email === normalizedEmail && u.password === body.password
      );

      if (!user) {
        console.error('[DEV MODE] Login fallido - credenciales no coinciden');
        throw {
          code: 'INVALID_CREDENTIALS',
          message: 'Credenciales inválidas',
        };
      }

      console.log('[DEV MODE] Login exitoso:', { email: user.email, id: user.id });

      // Generar tokens simulados
      return {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          celular: user.celular,
          role: 'admin',
          require2FA: false,
        },
        tokens: {
          accessToken: `dev_token_${Date.now()}`,
          refreshToken: `dev_refresh_${Date.now()}`,
          expiresIn: 3600,
        },
        empresas: [
          {
            id: `empresa_${user.id}`,
            ruc: user.ruc,
            razonSocial: user.razonSocial,
            nombreComercial: user.nombreComercial || user.razonSocial,
            establecimientos: [
              {
                id: `estab_${user.id}`,
                codigo: '0001',
                nombre: 'Principal',
                direccion: user.direccion,
              },
            ],
          },
        ],
        contextoActual: {
          empresaId: `empresa_${user.id}`,
          establecimientoId: `estab_${user.id}`,
          empresa: {
            id: `empresa_${user.id}`,
            ruc: user.ruc,
            razonSocial: user.razonSocial,
            nombreComercial: user.nombreComercial || user.razonSocial,
          },
          establecimiento: {
            id: `estab_${user.id}`,
            codigo: '0001',
            nombre: 'Principal',
            direccion: user.direccion,
          },
        },
        requiereSeleccionContexto: false,
      } as T;
    }

    // Simular get profile
    if (endpoint === '/auth/me' && options.method === 'GET') {
      const token = tokenService.getAccessToken();
      if (!token || !token.startsWith('dev_token_')) {
        throw {
          code: 'UNAUTHORIZED',
          message: 'No autorizado',
        };
      }

      const users = JSON.parse(localStorage.getItem('dev_users') || '[]');
      const user = users[users.length - 1]; // Último usuario registrado

      return {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        celular: user.celular,
        role: 'admin',
        require2FA: false,
      } as T;
    }

    // Simular logout
    if (endpoint === '/auth/logout' && options.method === 'POST') {
      return { success: true } as T;
    }

    // Simular refresh token
    if (endpoint === '/auth/refresh' && options.method === 'POST') {
      return {
        accessToken: `dev_token_${Date.now()}`,
        expiresIn: 3600,
      } as T;
    }

    // Simular password reset request
    if (endpoint === '/auth/request-password-reset' && options.method === 'POST') {
      return {
        message: 'Se ha enviado un correo con las instrucciones',
      } as T;
    }

    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Endpoint no implementado en modo desarrollo',
    };
  }

  // ==================== AUTENTICACIÓN ====================

  /**
   * Registro de nuevo usuario
   */
  async register(data: {
    nombre: string;
    apellido: string;
    celular: string;
    email: string;
    password: string;
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion: string;
    telefono?: string;
    regimen: string;
    actividadEconomica?: string;
  }): Promise<{ message: string; userId: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

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

// Exponer utilidades de desarrollo en el objeto window (solo en modo dev)
if (DEV_MODE && typeof window !== 'undefined') {
  (window as any).__DEV_AUTH__ = {
    clearUsers: () => authClient.clearDevUsers(),
    getUsers: () => authClient.getDevUsers(),
    info: () => {
      console.log('=== DEV MODE AUTH UTILS ===');
      console.log('Modo desarrollo activo. Usuarios guardados en localStorage.');
      console.log('');
      console.log('Comandos disponibles:');
      console.log('  __DEV_AUTH__.getUsers()   - Ver usuarios registrados');
      console.log('  __DEV_AUTH__.clearUsers() - Limpiar todos los usuarios');
      console.log('');
      console.log('Usuarios actuales:', authClient.getDevUsers().length);
    },
  };

  console.log('%c🔧 DEV MODE ACTIVADO', 'color: #3b82f6; font-size: 14px; font-weight: bold');
  console.log('Escribe __DEV_AUTH__.info() para ver los comandos disponibles');
}