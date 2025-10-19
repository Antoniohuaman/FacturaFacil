// src/features/autenticacion/schemas/twofactor.schema.ts
import { z } from 'zod';

/**
 * ============================================
 * TWO FACTOR SCHEMA - Validación OTP
 * ============================================
 */

export const twoFactorSchema = z.object({
  otp: z
    .string()
    .length(6, 'El código debe tener exactamente 6 dígitos')
    .regex(/^\d{6}$/, 'El código debe contener solo números'),
});

export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;
