// src/features/autenticacion/pages/RegisterPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { EmailInput } from '../components/EmailInput';
import { PasswordInput } from '../components/PasswordInput';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { authRepository } from '../services/AuthRepository';
import {
  registerStep1Schema,
  type RegisterStep1Data,
} from '../schemas';

/**
 * ============================================
 * REGISTER PAGE - Registro Simple (1 Paso)
 * ============================================
 */

export function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerStep1Schema),
  });

  const password = watch('password');
  const passwordStrength = usePasswordStrength(password || '');

  const handleRegister = async (data: RegisterStep1Data) => {
    try {
      setIsLoading(true);
      setError(null);

      // Llamar al authRepository para registrar al usuario
      const result = await authRepository.register({
        nombre: data.nombre,
        apellido: data.apellido,
        celular: data.celular,
        email: data.email,
        password: data.password,
      });

      if (!result.success) {
        setError(result.error || 'Error al crear la cuenta');
        return;
      }

      // ✅ Registro exitoso - AuthRepository ya manejó:
      // - Guardar tokens
      // - Ejecutar AutoConfigService
      // - Sincronizar TenantStore
      // - Crear empresa por defecto en backend
      
      // Navegar según el estado de la autenticación
      if (result.requiresContext) {
        navigate('/auth/context', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showHero={true}>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Crea tu cuenta
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comienza tu experiencia con SenciYO
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de Registro */}
        <form onSubmit={handleSubmit(handleRegister)} className="space-y-6">
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  {...register('nombre')}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan"
                />
                {errors.nombre && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.nombre.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  {...register('apellido')}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Pérez"
                />
                {errors.apellido && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.apellido.message as string}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Celular
              </label>
              <input
                type="tel"
                {...register('celular')}
                maxLength={9}
                className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="987654321"
              />
              {errors.celular && (
                <p className="mt-1.5 text-sm text-red-600">{errors.celular.message as string}</p>
              )}
            </div>

            <EmailInput
              register={register('email')}
              error={errors.email?.message as string}
              autoComplete="email"
            />

            <PasswordInput
              label="Contraseña"
              register={register('password')}
              error={errors.password?.message as string}
              autoComplete="new-password"
              showStrengthMeter
              strengthScore={passwordStrength.score}
            />

            {/* Indicador Visual de Requisitos de Contraseña */}
            {password && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tu contraseña debe incluir:
                </p>
                <div className="space-y-2">
                  {passwordStrength.requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          passwordStrength.isValid && req.met
                            ? 'bg-green-500 text-white'
                            : req.met
                            ? 'bg-gray-400 dark:bg-gray-500 text-white'
                            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {passwordStrength.isValid && req.met ? '✓' : req.met ? '✓' : '○'}
                      </div>
                      <span
                        className={`text-xs transition-colors ${
                          passwordStrength.isValid && req.met
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : req.met
                            ? 'text-gray-600 dark:text-gray-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
                {passwordStrength.isValid && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-xs font-medium">¡Contraseña segura!</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <PasswordInput
              label="Confirmar contraseña"
              register={register('passwordConfirmation')}
              error={errors.passwordConfirmation?.message as string}
              autoComplete="new-password"
            />
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50 hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creando cuenta...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Crear cuenta
              </>
            )}
          </button>

          {/* Link to Login */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
