// src/features/autenticacion/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';
import { EmailInput } from './EmailInput';
import { PasswordInput } from './PasswordInput';
import { RememberMeToggle } from './RememberMeToggle';
import { Link } from 'react-router-dom';

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      recordarme: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Email */}
      <EmailInput
        register={register('email')}
        error={errors.email?.message}
        autoComplete="email"
        disabled={isLoading}
      />

      {/* Password */}
      <PasswordInput
        register={register('password')}
        error={errors.password?.message}
        autoComplete="current-password"
        disabled={isLoading}
      />

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <RememberMeToggle register={register('recordarme')} />
        
        <Link
          to="/auth/reset"
          className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="
          w-full flex justify-center items-center gap-2
          py-2.5 px-4
          border border-transparent rounded-lg
          text-sm font-medium text-white
          bg-blue-600 hover:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/50
        "
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Iniciando sesión...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Iniciar sesión
          </>
        )}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
            ¿No tienes cuenta?
          </span>
        </div>
      </div>

      {/* Register Link */}
      <Link
        to="/auth/register"
        className="
          w-full flex justify-center items-center gap-2
          py-2.5 px-4
          border border-gray-300 dark:border-gray-600 rounded-lg
          text-sm font-medium 
          text-gray-700 dark:text-gray-300
          bg-white dark:bg-gray-800
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          transition-all duration-200
        "
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
        Crear nueva cuenta
      </Link>
    </form>
  );
}