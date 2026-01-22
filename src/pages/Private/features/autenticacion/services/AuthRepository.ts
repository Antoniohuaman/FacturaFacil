/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// src/features/autenticacion/services/AuthRepository.ts
import { authClient } from './AuthClient';
import { tokenService } from './TokenService';
import { contextService } from './ContextService';
import { rateLimitService } from './RateLimitService';
import { empresasClient } from './EmpresasClient';
import { useAuthStore } from '../store/AuthStore';
import { useTenantStore } from '../store/TenantStore';
import type { LoginCredentials, AuthResponse } from '../types/auth.types';
import type { LoginResponse } from '../types/api.types';

/**
 * ============================================
 * AUTH REPOSITORY - Orquestación de Flujos
 * ============================================
 * Contiene la lógica de negocio y orquesta los flujos:
 * - login → 2FA? → contexto? → éxito
 * - reset password
 * - set password
 * - refresh/logout
 */

class AuthRepository {
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
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await authClient.register(data);
      return {
        success: true,
        message: response.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error al crear la cuenta'
      };
    }
  }

  /**
   * Login completo con manejo de 2FA y contexto
   */
  async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    requires2FA?: boolean;
    requiresContext?: boolean;
    error?: string;
  }> {
    try {
      // Verificar rate limiting
      if (rateLimitService.isBlocked('login', credentials.email)) {
        const remaining = rateLimitService.getRemainingCooldown('login', credentials.email);
        throw {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos. Espera ${remaining} segundos.`,
        };
      }

      // Registrar intento
      rateLimitService.recordAttempt('login', credentials.email);

      // Llamar al API - ahora devuelve LoginResponse
      const response = await authClient.login(credentials);

      // Verificar éxito del login
      if (!response.exito || !response.data) {
        throw {
          code: 'LOGIN_FAILED',
          message: response.mensaje || 'Error al iniciar sesión',
        };
      }

      const { data } = response;

      return this.completeAuthentication(response, credentials.recordarme || false);
    } catch (error: any) {
      useAuthStore.setState({
        error: error.message,
        status: 'unauthenticated',
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar código 2FA
   */
  async verify2FA(otp: string): Promise<{
    success: boolean;
    requiresContext?: boolean;
    error?: string;
  }> {
    try {
      // Verificar rate limiting
      const userEmail = useAuthStore.getState().user?.email || 'unknown';
      
      if (rateLimitService.isBlocked('otp', userEmail)) {
        const remaining = rateLimitService.getRemainingCooldown('otp', userEmail);
        throw {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos. Espera ${remaining} segundos.`,
        };
      }

      rateLimitService.recordAttempt('otp', userEmail);

      // Verificar OTP
      const response = await authClient.verify2FA(otp);

      // Resetear rate limit en éxito
      rateLimitService.reset('otp', userEmail);

      // Completar autenticación
      return this.completeAuthentication(response, true);
    } catch (error: any) {
      useAuthStore.setState({ error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Completar autenticación (después de login o 2FA)
   * Ahora soporta LoginResponse (estructura nueva del backend)
   */
  private async completeAuthentication(
    response: LoginResponse | AuthResponse,
    remember: boolean
  ): Promise<{
    success: boolean;
    requiresContext?: boolean;
  }> {
    // Detectar si es LoginResponse (nueva estructura) o AuthResponse (legacy)
    const isNewStructure = 'exito' in response && 'data' in response;

    if (isNewStructure) {
      const loginResponse = response as LoginResponse;
      const { data } = loginResponse;

      // Guardar token (ahora es un string simple, no objeto)
      tokenService.setTokens(
        data.token,
        data.token, // Por ahora usamos el mismo para refresh (ajustar si backend envía refreshToken)
        3600, // 1 hora por defecto
        remember
      );

      // Crear objeto User compatible
      const user = {
        id: data.id,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        avatar: undefined,
        rol: 'admin' as any, // TODO: obtener del backend
        estado: 'activo' as any,
        emailVerificado: true,
        require2FA: false,
        fechaCreacion: new Date().toISOString(),
      };

      // Actualizar estado de auth
      useAuthStore.setState({
        user,
        isAuthenticated: true,
        hasWorkspace: true, // Siempre hay al menos una empresa demo
        require2FA: false,
        status: 'authenticated',
        error: null,
      });

      // Configurar empresas y establecimientos en TenantStore
      // Esto aplica automáticamente la regla empresas[0]
      useTenantStore.getState().setLoginData(data.empresas, data.establecimientos);

      // Obtener el estado actualizado después de setLoginData
      const { empresaActiva, establecimientos } = useTenantStore.getState();

      if (empresaActiva) {
        try {
          console.log('[AuthRepository] Iniciando carga de empresa completa...');
          useTenantStore.setState({ isLoading: true });

          const empresaCompleta = await empresasClient.fetchEmpresa(empresaActiva.empresaId);

          useTenantStore.getState().setEmpresaCompleta(empresaCompleta);

          console.log('[AuthRepository] ✅ Empresa completa cargada exitosamente:', empresaCompleta);
        } catch (error: any) {
          console.error('[AuthRepository] ❌ Error al cargar empresa completa:', error);

          const establecimientoActivo = establecimientos.find(e => e.id === empresaActiva.establecimientoId);

          const empresaDesdeLogin = {
            empresaId: empresaActiva.empresaId,
            ruc: empresaActiva.empresaRuc,
            razonSocial: empresaActiva.empresaRazonSocial,
            nombreComercial: empresaActiva.empresaRazonSocial,
            direccionFiscal: establecimientoActivo?.direccion || '',
            telefono: establecimientoActivo?.telefono || undefined,
            email: establecimientoActivo?.correo || undefined,
            monedaBase: 'PEN',
            entornoSunat: 'PRUEBA' as const,
          };

          console.log('[AuthRepository] ⚠️  Usando datos del login como fallback:', empresaDesdeLogin);
          useTenantStore.getState().setEmpresaCompleta(empresaDesdeLogin);
        }
      }

      return { success: true };
    }

    // Legacy: AuthResponse (estructura vieja)
    const authResponse = response as AuthResponse;

    // Guardar tokens
    tokenService.setTokens(
      authResponse.tokens.accessToken,
      authResponse.tokens.refreshToken,
      authResponse.tokens.expiresIn,
      remember
    );

    // Actualizar estado de auth
    useAuthStore.setState({
      user: authResponse.user,
      isAuthenticated: true,
      hasWorkspace: !authResponse.requiereSeleccionContexto && !!authResponse.contextoActual,
      require2FA: false,
      status: 'authenticated',
      error: null,
    });

    // Actualizar empresas en tenant store
    useTenantStore.setState({
      empresas: authResponse.empresas || [],
    });

    // Si ya tiene contexto, guardarlo
    if (authResponse.contextoActual) {
      contextService.saveContext(authResponse.contextoActual);
      useTenantStore.setState({
        contextoActual: authResponse.contextoActual,
      });

      return { success: true };
    }

    // Si requiere selección de contexto
    if (authResponse.requiereSeleccionContexto) {
      useAuthStore.setState({ status: 'requires_workspace' });
      return { success: true, requiresContext: true };
    }

    return { success: true };
  }

  /**
   * Seleccionar contexto de trabajo
   */
  async selectContext(payload: {
    empresaId: string;
    establecimientoId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      useTenantStore.setState({ isLoading: true });

      const contexto = await authClient.selectContext(payload);

      // Guardar contexto
      contextService.saveContext(contexto!);
      useTenantStore.setState({ contextoActual: contexto });
      useAuthStore.setState({ hasWorkspace: true, status: 'authenticated' });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      useTenantStore.setState({ isLoading: false });
    }
  }

  /**
   * Refresh de sesión
   */
  async refreshSession(): Promise<boolean> {
    try {
      const refreshToken = tokenService.getRefreshToken();
      if (!refreshToken) return false;

      const response = await authClient.refreshToken(refreshToken);

      // Actualizar access token
      tokenService.setTokens(
        response.accessToken,
        refreshToken,
        response.expiresIn,
        !!localStorage.getItem('senciyo_auth_tokens')
      );

      // Obtener perfil actualizado
      const user = await authClient.getProfile();
      useAuthStore.setState({ user });

      return true;
    } catch (error) {
      // Si el refresh falla, hacer logout
      await this.logout();
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await authClient.logout();
    } catch (error) {
      // Continuar con logout local incluso si falla la API
      console.error('Error en logout:', error);
    } finally {
      // Limpiar todo
      tokenService.clearTokens();
      contextService.clearContext();
      rateLimitService.clearAll();
      useAuthStore.getState().reset();
      useTenantStore.getState().reset();
    }
  }

  /**
   * Solicitar reset de contraseña
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Verificar rate limiting
      if (rateLimitService.isBlocked('password_reset', email)) {
        const remaining = rateLimitService.getRemainingCooldown('password_reset', email);
        throw {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos. Espera ${remaining} segundos.`,
        };
      }

      rateLimitService.recordAttempt('password_reset', email);

      await authClient.requestPasswordReset({ email });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Resetear contraseña
   */
  async resetPassword(payload: {
    token: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await authClient.resetPassword({
        token: payload.token,
        password: payload.password,
        passwordConfirmation: payload.password,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Setear contraseña desde invitación
   */
  async setPassword(payload: {
    token: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      await authClient.setPassword(payload);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Inicializar sesión (al cargar la app)
   */
  async initializeSession(): Promise<void> {
    try {
      // Verificar si hay tokens válidos
      if (!tokenService.hasValidTokens()) {
        useAuthStore.setState({ status: 'unauthenticated' });
        return;
      }

      // Obtener perfil
      const user = await authClient.getProfile();
      
      // Verificar workspace
      const hasWorkspace = contextService.hasContext();
      const contextoActual = contextService.getContext();

      useAuthStore.setState({
        user,
        isAuthenticated: true,
        hasWorkspace,
        status: hasWorkspace ? 'authenticated' : 'requires_workspace',
      });

      if (contextoActual) {
        useTenantStore.setState({ contextoActual });
      }
    } catch (error) {
      // Si falla, intentar refresh
      const refreshed = await this.refreshSession();
      
      if (!refreshed) {
        useAuthStore.setState({ status: 'unauthenticated' });
      }
    }
  }
}

export const authRepository = new AuthRepository();