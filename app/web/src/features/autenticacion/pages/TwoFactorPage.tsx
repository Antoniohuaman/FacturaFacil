/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/autenticacion/pages/TwoFactorPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { twoFactorSchema, type TwoFactorFormData } from '../schemas';
import { useAuth } from '../hooks/useAuth';
import { AUTH_PATHS } from '../utils/path';

/**
 * ============================================
 * TWO FACTOR PAGE - Verificación 2FA
 * ============================================
 */

export function TwoFactorPage() {
  const navigate = useNavigate();
  const { verify2FA, user, requiresContext } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  });

  const otp = watch('otp');

  // Cooldown timer para reenvío
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  const onSubmit = useCallback(async (data: TwoFactorFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await verify2FA(data.otp);

      if (result.success) {
        // Si requiere selección de contexto
        if (result.requiresContext || requiresContext) {
          navigate(AUTH_PATHS.CONTEXT_SELECT, { replace: true });
        } else {
          navigate(AUTH_PATHS.DASHBOARD, { replace: true });
        }
      } else {
        setError(result.error || 'Código incorrecto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código');
    } finally {
      setIsLoading(false);
    }
  }, [navigate, requiresContext, verify2FA]);

  // Auto-submit cuando se completan 6 dígitos
  useEffect(() => {
    if (otp?.length === 6 && !isLoading) {
      handleSubmit(onSubmit)();
    }
  }, [otp, isLoading, handleSubmit, onSubmit]);

  const handleResend = () => {
    // TODO: Implementar reenvío de OTP
    setCanResend(false);
    setCooldown(60); // 60 segundos de cooldown
  };

  return (
    <AuthLayout>
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
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Verificación de Seguridad
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ingresa el código de 6 dígitos enviado a<br />
            <span className="font-medium text-gray-900 dark:text-white">
              {user?.email}
            </span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
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

        {/* OTP Input */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
              Código de Verificación
            </label>
            <input
              type="text"
              {...register('otp')}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              disabled={isLoading}
              className="block w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            {errors.otp && (
              <p className="mt-2 text-sm text-red-600 text-center">
                {errors.otp.message}
              </p>
            )}
          </div>

          {/* Submit implícito al completar 6 dígitos */}
          <button type="submit" className="hidden" />

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-center">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </div>
          )}

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Reenviar código
              </button>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Reenviar código en <span className="font-medium">{cooldown}s</span>
              </p>
            )}
          </div>
        </form>

        {/* Info */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
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
            <p className="text-sm text-blue-700 dark:text-blue-300">
              El código expira en 10 minutos. Si no lo recibiste, verifica tu carpeta de spam.
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}