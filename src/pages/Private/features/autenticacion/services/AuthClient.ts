// src/features/autenticacion/services/AuthClient.ts
import type {
  LoginCredentials,
  AuthResponse,
  PasswordResetRequest,
  PasswordReset,
} from '../types/auth.types';
import { usuariosService, type UsuarioResponse, type LoginResponse, type RegisterResponse, type EmpresaUsuario } from '@/services/api';

function adaptApiLoginResponse(apiResponse: UsuarioResponse): AuthResponse {
  const data = apiResponse.data as LoginResponse | RegisterResponse;

  const empresas = (data.empresas || []).map((emp: EmpresaUsuario) => {
    const establecimiento = {
      id: emp.establecimientoId || '',
      codigo: emp.establecimientoCodigo || '0001',
      nombre: emp.establecimientoNombre || 'Principal',
      direccion: '',
      esPrincipal: true,
      activo: emp.esActivo !== false,
    };

    return {
      id: emp.empresaId || emp.id || '',
      ruc: emp.empresaRuc || '',
      razonSocial: emp.empresaRazonSocial || '',
      nombreComercial: emp.empresaRazonSocial || '',
      direccion: '',
      estado: 'activa' as const,
      establecimientos: [establecimiento],
      configuracion: {
        emisionElectronica: true,
      },
    };
  });

  const tieneEmpresas = empresas.length > 0;
  const contextoActual = tieneEmpresas ? {
    empresaId: empresas[0].id,
    establecimientoId: empresas[0].establecimientos[0].id,
    empresa: empresas[0],
    establecimiento: empresas[0].establecimientos[0],
    permisos: [],
    configuracion: {},
  } : undefined;

  return {
    user: {
      id: data.id || '',
      email: data.email || '',
      nombre: data.nombre || '',
      apellido: data.apellido || '',
      rol: 'admin',
      estado: 'activo',
      emailVerificado: true,
      require2FA: false,
      fechaCreacion: new Date().toISOString(),
    },
    tokens: {
      accessToken: data.token || '',
      refreshToken: data.token || '',
      expiresIn: 28800,
      tokenType: 'Bearer',
    },
    empresas,
    requiereSeleccionContexto: false,
    contextoActual,
  };
}

class AuthClient {

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
    const apiResponse = await usuariosService.register({
      nombre: data.nombre,
      apellido: data.apellido,
      celular: data.celular,
      email: data.email,
      password: data.password,
      username: data.email.split('@')[0],
      requiereCambioPassword: false,
      esActivo: true,
      usuarioId: null,
      usuarioNombre: null,
    });

    if (!apiResponse.exito || apiResponse.codigoError !== '0') {
      throw {
        code: apiResponse.codigoError || 'REGISTER_ERROR',
        message: apiResponse.mensaje || 'Error en el registro',
      };
    }

    const registerData = apiResponse.data as RegisterResponse;

    return {
      message: apiResponse.mensaje,
      userId: registerData.id,
    };
  }

  /**
   * Login de usuario
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const apiResponse = await usuariosService.login({
      email: credentials.email,
      password: credentials.password,
    });

    if (!apiResponse.exito || apiResponse.codigoError !== '0') {
      throw {
        code: apiResponse.codigoError || 'LOGIN_ERROR',
        message: apiResponse.mensaje || 'Error en el login',
      };
    }

    return adaptApiLoginResponse(apiResponse);
  }

  async verify2FA(_otp: string): Promise<AuthResponse> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad 2FA pendiente de implementación',
    };
  }

  async getProfile(): Promise<AuthResponse['user']> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad getProfile pendiente de implementación',
    };
  }

  async refreshToken(_refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad refreshToken pendiente de implementación',
    };
  }

  async logout(): Promise<void> {
    return Promise.resolve();
  }

  async selectContext(_payload: {
    empresaId: string;
    establecimientoId: string;
  }): Promise<AuthResponse['contextoActual']> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad selectContext pendiente de implementación',
    };
  }

  async requestPasswordReset(_data: PasswordResetRequest): Promise<{
    message: string;
  }> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad reset password pendiente de implementación',
    };
  }

  async resetPassword(_data: PasswordReset): Promise<{ message: string }> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad reset password pendiente de implementación',
    };
  }

  async setPassword(_payload: {
    token: string;
    password: string;
  }): Promise<{ message: string }> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad set password pendiente de implementación',
    };
  }

  async checkEmailExists(_email: string): Promise<{ exists: boolean }> {
    throw {
      code: 'NOT_IMPLEMENTED',
      message: 'Funcionalidad check email pendiente de implementación',
    };
  }
}

export const authClient = new AuthClient();