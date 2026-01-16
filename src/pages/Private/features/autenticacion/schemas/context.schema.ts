// src/features/autenticacion/schemas/context.schema.ts
import { z } from 'zod';

export const contextSelectionSchema = z.object({
  empresaId: z.string().uuid('ID de empresa inválido'),
  establecimientoId: z.string().uuid('ID de establecimiento inválido'),
});

export type ContextSelectionData = z.infer<typeof contextSelectionSchema>;
