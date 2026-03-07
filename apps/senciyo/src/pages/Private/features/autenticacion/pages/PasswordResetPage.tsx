// src/features/autenticacion/pages/PasswordResetPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { PasswordInput } from '../components/PasswordInput';
import { passwordResetSchema, type PasswordResetData } from '../schemas';
import { useAuth } from '../hooks/useAuth';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

/**
 * ============================================
 * PASSWORD RESET - Confirmar Reset
 * ============================================
 */

export function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { resetPassword: resetPasswordAction } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordResetData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { token },
  });

  const password = watch('password');
  const passwordStrength = usePasswordStrength(password);

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Enlace Inválido
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              El enlace de recuperación no es válido o ha expirado.
            </p>
          </div>
          <Link
            to="/auth/reset"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Solicitar nuevo enlace
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: PasswordResetData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await resetPasswordAction({
        token: data.token,
        password: data.password,
      });

      if (result.success) {
        navigate('/auth/login?reset=success');
      } else {
        setError(result.error || 'Error al restablecer la contraseña');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Error al restablecer la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Nueva Contraseña
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ingresa tu nueva contraseña segura
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <input type="hidden" {...register('token')} />

          <PasswordInput
            label="Nueva contraseña"
            register={register('password')}
            error={errors.password?.message}
            autoComplete="new-password"
            disabled={isLoading}
            showStrengthMeter
            strengthScore={passwordStrength.score}
          />

          {password && (
            <div className="text-xs space-y-1">
              {passwordStrength.feedback.map((feedback, i) => (
                <p
                  key={i}
                  className={passwordStrength.isValid ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}
                >
                  {feedback}
                </p>
              ))}
            </div>
          )}

          <PasswordInput
            label="Confirmar nueva contraseña"
            register={register('passwordConfirmation')}
            error={errors.passwordConfirmation?.message}
            autoComplete="new-password"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50 hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Restableciendo...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Restablecer contraseña
              </>
            )}
          </button>

          <div className="text-center">
            <Link
              to="/auth/login"
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Volver al login
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
