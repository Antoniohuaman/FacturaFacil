// src/features/autenticacion/schemas/login.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Correo electrónico inválido')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  recordarme: z.boolean().optional().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;