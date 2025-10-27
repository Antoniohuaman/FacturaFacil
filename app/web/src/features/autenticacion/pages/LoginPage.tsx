// src/features/autenticacion/pages/LoginPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../hooks';
import type { LoginFormData } from '../schemas/login.schema';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated, status, clearError } = useAuth();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && status === 'authenticated') {
      navigate('/', { replace: true });
    } else if (status === 'requires_workspace') {
      navigate('/auth/context', { replace: true });
    } else if (status === 'requires_2fa') {
      navigate('/auth/verify-2fa', { replace: true });
    }
  }, [isAuthenticated, status, navigate]);

  // Limpiar errores al desmontar
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data);
      // La navegación se maneja en el useEffect anterior
    } catch (err) {
      // El error ya está manejado en el AuthProvider
      console.error('Error en login:', err);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        {/* Header con Logo */}
        <div className="text-center">
          {/* Logo SenciYO - Arriba */}
          <div className="flex justify-center mb-8">
            <img 
              src="/SenciYO.svg" 
              alt="SenciYO" 
              className="h-10 w-auto"
            />
          </div>
          
          {/* Título y subtítulo */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Ingresa a tu cuenta
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Toma el control de tu negocio
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                  Error al iniciar sesión
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {typeof error === 'string' ? error : 'Credenciales inválidas. Verifica tu correo y contraseña.'}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  onClick={clearError}
                  className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} />

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>
            Al iniciar sesión, aceptas nuestros{' '}
            <a href="/terms" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              Términos y Condiciones
            </a>
            {' '}y{' '}
            <a href="/privacy" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              Política de Privacidad
            </a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}