// src/features/autenticacion/services/AuthRepository.ts
import { authClient } from './AuthClient';
import { tokenService } from './TokenService';
import { contextService } from './ContextService';
import { rateLimitService } from './RateLimitService';
import { useAuthStore } from '../store/AuthStore';
import { useTenantStore } from '../store/TenantStore';
import type { LoginCredentials, AuthResponse } from '../types/auth.types';

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

      // Llamar al API
      const response = await authClient.login(credentials);

      // Si requiere 2FA, detener aquí
      if (response.user.require2FA) {
        useAuthStore.setState({
          user: response.user,
          status: 'requires_2fa',
          require2FA: true,
        });

        // Guardar tokens temporales (para el 2FA)
        tokenService.setTokens(
          response.tokens.accessToken,
          response.tokens.refreshToken,
          response.tokens.expiresIn,
          credentials.recordarme || false
        );

        return { success: false, requires2FA: true };
      }

      // Login exitoso sin 2FA
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
   */
  private async completeAuthentication(
    response: AuthResponse,
    remember: boolean
  ): Promise<{
    success: boolean;
    requiresContext?: boolean;
  }> {
    // Guardar tokens
    tokenService.setTokens(
      response.tokens.accessToken,
      response.tokens.refreshToken,
      response.tokens.expiresIn,
      remember
    );

    // Actualizar estado de auth
    useAuthStore.setState({
      user: response.user,
      isAuthenticated: true,
      hasWorkspace: !response.requiereSeleccionContexto && !!response.contextoActual,
      require2FA: false,
      status: 'authenticated',
      error: null,
    });

    // Actualizar empresas en tenant store
    useTenantStore.setState({
      empresas: response.empresas || [],
    });

    // Si ya tiene contexto, guardarlo
    if (response.contextoActual) {
      contextService.saveContext(response.contextoActual);
      useTenantStore.setState({
        contextoActual: response.contextoActual,
      });

      return { success: true };
    }

    // Si requiere selección de contexto
    if (response.requiereSeleccionContexto) {
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