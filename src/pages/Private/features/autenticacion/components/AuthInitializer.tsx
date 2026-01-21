// src/features/autenticacion/components/AuthInitializer.tsx
import { useEffect, useState } from 'react';
import { authRepository } from '../services/AuthRepository';

interface AuthInitializerProps {
  children: React.ReactNode;
}

/**
 * Componente que inicializa la sesión al cargar la aplicación.
 * Verifica si hay tokens válidos y restaura el estado de autenticación.
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await authRepository.initializeSession();
      } catch (error) {
        console.error('Error al inicializar sesión:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  // Mostrar loading mientras se inicializa la sesión
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
