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
  registerStep2Schema,
  registerStep3Schema,
  type RegisterStep1Data,
  type RegisterStep2Data,
  type RegisterStep3Data,
} from '../schemas';

/**
 * ============================================
 * REGISTER PAGE - Registro Multi-Step
 * ============================================
 */

type RegisterFormData = RegisterStep1Data & RegisterStep2Data & RegisterStep3Data;

export function RegisterPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<RegisterFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 3;

  // Determinar qué schema usar según el step actual
  const getSchemaForStep = () => {
    switch (currentStep) {
      case 1:
        return registerStep1Schema;
      case 2:
        return registerStep2Schema;
      case 3:
        return registerStep3Schema;
      default:
        return registerStep1Schema;
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(getSchemaForStep()),
    defaultValues: formData,
  });

  const password = watch('password');
  const passwordStrength = usePasswordStrength(password || '');

  const handleNext = (data: Partial<RegisterFormData>) => {
    // Guardar datos del step actual
    setFormData((prev) => ({ ...prev, ...data }));

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
      reset(data); // Reset form con los nuevos valores
    } else {
      // Último step, enviar registro
      handleRegister({ ...formData, ...data } as RegisterFormData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleRegister = async (completeData: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Llamar al authRepository para registrar al usuario
      const result = await authRepository.register({
        nombre: completeData.nombre,
        apellido: completeData.apellido,
        celular: completeData.celular,
        email: completeData.email,
        password: completeData.password,
        ruc: completeData.ruc,
        razonSocial: completeData.razonSocial,
        nombreComercial: completeData.nombreComercial,
        direccion: completeData.direccion,
        telefono: completeData.telefono,
        regimen: completeData.regimen,
        actividadEconomica: completeData.actividadEconomica,
      });

      if (!result.success) {
        setError(result.error || 'Error al crear la cuenta');
        return;
      }

      // Redirigir al login con mensaje de éxito
      navigate('/auth/login?registered=true');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout showHero={currentStep === 1}>
      <div className="space-y-8">
        {/* Header con Progress */}
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
            {currentStep === 1 && 'Crea tu cuenta'}
            {currentStep === 2 && 'Información de tu empresa'}
            {currentStep === 3 && 'Configuración inicial'}
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {currentStep === 1 && 'Comienza tu experiencia con SenciYO'}
            {currentStep === 2 && 'Validaremos tu RUC con SUNAT'}
            {currentStep === 3 && 'Últimos detalles para empezar'}
          </p>

          {/* Progress Bar */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                    ${
                      step < currentStep
                        ? 'bg-green-500 text-white'
                        : step === currentStep
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }
                  `}
                >
                  {step < currentStep ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded transition-all ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
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

        {/* Forms por Step */}
        <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
          {/* STEP 1: Datos Personales */}
          {currentStep === 1 && (
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

              {password && (
                <div className="text-xs space-y-1">
                  {passwordStrength.feedback.map((feedback, i) => (
                    <p
                      key={i}
                      className={
                        passwordStrength.isValid
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }
                    >
                      {feedback}
                    </p>
                  ))}
                </div>
              )}

              <PasswordInput
                label="Confirmar contraseña"
                register={register('passwordConfirmation')}
                error={errors.passwordConfirmation?.message as string}
                autoComplete="new-password"
              />
            </div>
          )}

          {/* STEP 2: Datos de Empresa */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  RUC
                </label>
                <input
                  type="text"
                  {...register('ruc')}
                  maxLength={11}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="20123456789"
                />
                {errors.ruc && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.ruc.message as string}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Validaremos tu RUC con SUNAT</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Razón Social
                </label>
                <input
                  type="text"
                  {...register('razonSocial')}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mi Empresa S.A.C."
                />
                {errors.razonSocial && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.razonSocial.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre Comercial (Opcional)
                </label>
                <input
                  type="text"
                  {...register('nombreComercial')}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mi Tienda"
                />
                {errors.nombreComercial && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {errors.nombreComercial.message as string}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dirección Fiscal
                </label>
                <input
                  type="text"
                  {...register('direccion')}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Av. Principal 123, Lima"
                />
                {errors.direccion && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.direccion.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono (Opcional)
                </label>
                <input
                  type="tel"
                  {...register('telefono')}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="987654321"
                />
                {errors.telefono && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.telefono.message as string}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Configuración */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Régimen Tributario
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'general', label: 'Régimen General', desc: 'Para empresas grandes' },
                    { value: 'mype', label: 'Régimen MYPE', desc: 'Para pequeñas y medianas empresas' },
                    { value: 'especial', label: 'Régimen Especial', desc: 'RER - Simplificado' },
                  ].map((regimen) => (
                    <label
                      key={regimen.value}
                      className="flex items-start p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      <input
                        type="radio"
                        {...register('regimen')}
                        value={regimen.value}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-white">{regimen.label}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{regimen.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.regimen && (
                  <p className="mt-1.5 text-sm text-red-600">{errors.regimen.message as string}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actividad Económica (Opcional)
                </label>
                <textarea
                  {...register('actividadEconomica')}
                  rows={3}
                  className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Venta de productos..."
                />
                {errors.actividadEconomica && (
                  <p className="mt-1.5 text-sm text-red-600">
                    {errors.actividadEconomica.message as string}
                  </p>
                )}
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  {...register('aceptaTerminos')}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Acepto los{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-500 font-medium">
                    Términos y Condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">
                    Política de Privacidad
                  </a>
                </label>
              </div>
              {errors.aceptaTerminos && (
                <p className="text-sm text-red-600">{errors.aceptaTerminos.message as string}</p>
              )}
            </div>
          )}

          {/* Botones de Navegación */}
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Atrás
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/50 hover:shadow-xl"
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
                  {currentStep === totalSteps ? 'Creando cuenta...' : 'Procesando...'}
                </>
              ) : (
                <>
                  {currentStep === totalSteps ? (
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
                  ) : (
                    <>
                      Continuar
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </>
              )}
            </button>
          </div>

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
