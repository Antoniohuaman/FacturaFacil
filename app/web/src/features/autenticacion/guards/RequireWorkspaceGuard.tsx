// src/features/autenticacion/guards/RequireWorkspaceGuard.tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_PATHS } from '../utils/path';

/**
 * ============================================
 * REQUIRE WORKSPACE GUARD
 * ============================================
 * Bloquea el acceso a rutas si el usuario no tiene workspace configurado
 * Dispara callback para abrir modal RUC (manejado por onboarding)
 */

interface RequireWorkspaceGuardProps {
  children: ReactNode;
  onWorkspaceRequired?: () => void; // Callback para abrir modal RUC
}

export function RequireWorkspaceGuard({ 
  children, 
  onWorkspaceRequired 
}: RequireWorkspaceGuardProps) {
  const { isAuthenticated, hasWorkspace, status, isLoading } = useAuth();
  const location = useLocation();

  // Disparar callback cuando se requiere workspace
  useEffect(() => {
    if (isAuthenticated && !hasWorkspace && onWorkspaceRequired) {
      onWorkspaceRequired();
    }
  }, [isAuthenticated, hasWorkspace, onWorkspaceRequired]);

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

  // Si no tiene workspace, mostrar pantalla de bloqueo
  if (!hasWorkspace || status === 'requires_workspace') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Configura tu Espacio de Trabajo
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Para continuar, necesitas configurar tu empresa con tu RUC.
          </p>

          <div className="space-y-3">
            <button
              onClick={onWorkspaceRequired}
              className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/50 hover:shadow-xl"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Configurar Ahora
            </button>

            <button
              onClick={() => window.location.href = AUTH_PATHS.LOGIN}
              className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-blue-700 dark:text-blue-300 text-left">
                Solo necesitas tu RUC empresarial. Validaremos automáticamente los datos con SUNAT.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Todo OK, renderizar children
  return <>{children}</>;
}