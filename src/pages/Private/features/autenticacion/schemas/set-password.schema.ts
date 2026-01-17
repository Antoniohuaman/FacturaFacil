// src/features/autenticacion/schemas/set-password.schema.ts
import { z } from 'zod';

/**
 * ============================================
 * SET PASSWORD SCHEMA - Password desde invitación
 * ============================================
 */

export const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  passwordConfirmation: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['passwordConfirmation'],
});

export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;
