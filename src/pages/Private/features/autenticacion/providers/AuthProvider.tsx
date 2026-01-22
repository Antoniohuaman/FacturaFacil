// src/features/autenticacion/providers/AuthProvider.tsx
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authRepository } from '../services/AuthRepository';

/**
 * ============================================
 * AUTH PROVIDER - Inicializador de Sesión
 * ============================================
 *
 * Responsabilidades:
 * - Inicializar la sesión al cargar la aplicación
 * - Verificar si hay tokens válidos en storage
 * - Recuperar el perfil del usuario si está autenticado
 * - Mostrar loading mientras se inicializa
 * - Solo renderizar children cuando la sesión esté inicializada
 *
 * Flujo:
 * 1. App se carga
 * 2. AuthProvider se monta
 * 3. Llama a initializeSession()
 * 4. Si hay tokens válidos → recupera sesión
 * 5. Si no hay tokens → marca como unauthenticated
 * 6. Renderiza children (Router)
 */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        console.log('[AuthProvider] Iniciando sesión...');

        // Llamar a initializeSession que:
        // - Verifica si hay tokens válidos
        // - Obtiene el perfil del usuario
        // - Actualiza el AuthStore
        // - Si falla, intenta refresh
        await authRepository.initializeSession();

        console.log('[AuthProvider] Sesión inicializada correctamente');
      } catch (error) {
        // Si falla la inicialización, no es crítico
        // El usuario simplemente no estará autenticado
        console.warn('[AuthProvider] Error al inicializar sesión:', error);
      } finally {
        // Solo actualizar si el componente sigue montado
        if (mounted) {
          setIsInitialized(true);
        }
      }
    }

    initializeAuth();

    // Cleanup
    return () => {
      mounted = false;
    };
  }, []);

  // Mientras se inicializa, mostrar loading
  if (!isInitialized) {
    return <LoadingScreen />;
  }

  // Una vez inicializado, renderizar children (Router)
  return <>{children}</>;
}

/**
 * Loading Screen mientras se inicializa la sesión
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        {/* Spinner animado */}
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6" />

        {/* Texto */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Iniciando Senciyo
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Verificando sesión...
        </p>

        {/* Indicador de progreso sutil */}
        <div className="mt-6 w-48 mx-auto">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
