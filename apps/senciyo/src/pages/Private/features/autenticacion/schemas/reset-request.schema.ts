// ==========================================

// src/features/autenticacion/schemas/reset-request.schema.ts
import { z } from 'zod';

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Correo electrónico inválido')
    .toLowerCase()
    .trim(),
});

export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
