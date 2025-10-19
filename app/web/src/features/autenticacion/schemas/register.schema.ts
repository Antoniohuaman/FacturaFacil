// src/features/autenticacion/schemas/register.schema.ts
import { z } from 'zod';

/**
 * ============================================
 * REGISTER SCHEMA - Registro Multi-Step
 * ============================================
 */

// Paso 1: Información Personal
export const registerStep1Schema = z.object({
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),

  apellido: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras'),

  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido')
    .toLowerCase(),

  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),

  passwordConfirmation: z.string(),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['passwordConfirmation'],
});

export type RegisterStep1Data = z.infer<typeof registerStep1Schema>;

// Paso 2: Información de Empresa
export const registerStep2Schema = z.object({
  ruc: z
    .string()
    .length(11, 'El RUC debe tener exactamente 11 dígitos')
    .regex(/^[0-9]+$/, 'El RUC solo puede contener números')
    .refine(
      (ruc) => {
        // Validación básica de RUC peruano
        const firstDigit = parseInt(ruc[0]);
        return firstDigit === 1 || firstDigit === 2;
      },
      { message: 'RUC inválido' }
    ),

  razonSocial: z
    .string()
    .min(3, 'La razón social debe tener al menos 3 caracteres')
    .max(200, 'La razón social no puede exceder 200 caracteres'),

  nombreComercial: z
    .string()
    .max(100, 'El nombre comercial no puede exceder 100 caracteres')
    .optional(),

  direccion: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(300, 'La dirección no puede exceder 300 caracteres'),

  telefono: z
    .string()
    .regex(/^[0-9+\-\s()]+$/, 'Teléfono inválido')
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional(),
});

export type RegisterStep2Data = z.infer<typeof registerStep2Schema>;

// Paso 3: Configuración Inicial
export const registerStep3Schema = z.object({
  regimen: z.enum(['general', 'mype', 'especial'], {
    errorMap: () => ({ message: 'Selecciona un régimen tributario' }),
  }),

  actividadEconomica: z
    .string()
    .max(200, 'La actividad económica no puede exceder 200 caracteres')
    .optional(),

  aceptaTerminos: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Debes aceptar los términos y condiciones',
    }),
});

export type RegisterStep3Data = z.infer<typeof registerStep3Schema>;

// Schema completo (todos los pasos combinados)
export const registerCompleteSchema = z.object({
  // Step 1
  nombre: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$/, 'El nombre solo puede contener letras'),

  apellido: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$/, 'El apellido solo puede contener letras'),

  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido')
    .toLowerCase(),

  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),

  passwordConfirmation: z.string(),

  // Step 2
  ruc: z
    .string()
    .length(11, 'El RUC debe tener exactamente 11 dígitos')
    .regex(/^[0-9]+$/, 'El RUC solo puede contener números')
    .refine(
      (ruc) => {
        const firstDigit = parseInt(ruc[0]);
        return firstDigit === 1 || firstDigit === 2;
      },
      { message: 'RUC inválido' }
    ),

  razonSocial: z
    .string()
    .min(3, 'La razón social debe tener al menos 3 caracteres')
    .max(200, 'La razón social no puede exceder 200 caracteres'),

  nombreComercial: z
    .string()
    .max(100, 'El nombre comercial no puede exceder 100 caracteres')
    .optional(),

  direccion: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(300, 'La dirección no puede exceder 300 caracteres'),

  telefono: z
    .string()
    .regex(/^[0-9+\\-\\s()]+$/, 'Teléfono inválido')
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional(),

  // Step 3
  regimen: z.enum(['general', 'mype', 'especial'], {
    errorMap: () => ({ message: 'Selecciona un régimen tributario' }),
  }),

  actividadEconomica: z
    .string()
    .max(200, 'La actividad económica no puede exceder 200 caracteres')
    .optional(),

  aceptaTerminos: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Debes aceptar los términos y condiciones',
    }),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['passwordConfirmation'],
});

export type RegisterCompleteData = z.infer<typeof registerCompleteSchema>;
