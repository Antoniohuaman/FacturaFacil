// src/features/autenticacion/guards/ProtectedRoute.tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_PATHS } from '../utils/path';

/**
 * ============================================
 * PROTECTED ROUTE - Guard de Rutas (ACTUALIZADO)
 * ============================================
 * Protege rutas que requieren autenticación
 */

interface ProtectedRouteProps {
  children: ReactNode;
  requireContext?: boolean; // Si requiere workspace configurado
}

export function ProtectedRoute({ children, requireContext = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, status, hasWorkspace } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se inicializa
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to={AUTH_PATHS.LOGIN} state={{ from: location }} replace />;
  }

  // Si requiere 2FA, redirigir
  if (status === 'requires_2fa') {
    return <Navigate to={AUTH_PATHS.TWO_FACTOR} replace />;
  }

  // Si requiere contexto y no lo tiene, redirigir a selección
  if (requireContext && !hasWorkspace) {
    return <Navigate to={AUTH_PATHS.CONTEXT_SELECT} replace />;
  }

  return <>{children}</>;
}