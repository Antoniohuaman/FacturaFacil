// src/features/autenticacion/hooks/useAuth.ts
import { useCallback } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { useTenantStore } from '../store/TenantStore';
import { authRepository } from '../services/AuthRepository';
import type { LoginCredentials } from '../types/auth.types';

/**
 * ============================================
 * USE AUTH HOOK - Hook Principal de Autenticación
 * ============================================
 * Expone todas las funcionalidades de auth
 */

export function useAuth() {
  // Estados de auth
  const {
    user,
    isAuthenticated,
    hasWorkspace,
    require2FA,
    status,
    error,
    clearError,
  } = useAuthStore();

  // Estados de tenant
  const { empresas, contextoActual } = useTenantStore();

  // ==================== ACCIONES ====================

  /**
   * Login
   */
  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await authRepository.login(credentials);
    return result;
  }, []);

  /**
   * Verificar 2FA
   */
  const verify2FA = useCallback(async (otp: string) => {
    const result = await authRepository.verify2FA(otp);
    return result;
  }, []);

  /**
   * Seleccionar contexto
   */
  const selectContext = useCallback(
    async (payload: { empresaId: string; establecimientoId: string }) => {
      const result = await authRepository.selectContext(payload);
      return result;
    },
    []
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    await authRepository.logout();
  }, []);

  /**
   * Refresh de sesión
   */
  const refreshSession = useCallback(async () => {
    return authRepository.refreshSession();
  }, []);

  /**
   * Solicitar reset de contraseña
   */
  const requestPasswordReset = useCallback(async (email: string) => {
    return authRepository.requestPasswordReset(email);
  }, []);

  /**
   * Resetear contraseña
   */
  const resetPassword = useCallback(
    async (payload: { token: string; password: string }) => {
      return authRepository.resetPassword(payload);
    },
    []
  );

  /**
   * Setear contraseña desde invitación
   */
  const setPassword = useCallback(
    async (payload: { token: string; password: string }) => {
      return authRepository.setPassword(payload);
    },
    []
  );

  // ==================== GETTERS ====================

  /**
   * Obtiene la empresa actual
   */
  const getEmpresaActual = useCallback(() => {
    return useTenantStore.getState().getEmpresaActual();
  }, []);

  /**
   * Obtiene el establecimiento actual
   */
  const getEstablecimientoActual = useCallback(() => {
    return useTenantStore.getState().getEstablecimientoActual();
  }, []);

  // ==================== COMPUTED ====================

  const isLoading = status === 'loading';
  const requiresContext = status === 'requires_workspace';

  return {
    // Estado
    user,
    empresas,
    contextoActual,
    isAuthenticated,
    hasWorkspace,
    require2FA,
    status,
    error,
    isLoading,
    requiresContext,

    // Acciones
    login,
    verify2FA,
    selectContext,
    logout,
    refreshSession,
    requestPasswordReset,
    resetPassword,
    setPassword,
    clearError,

    // Getters
    getEmpresaActual,
    getEstablecimientoActual,
  };
}