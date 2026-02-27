import { z } from 'zod'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'

const estadoSchema = z.enum(estadosRegistro)
const prioridadSchema = z.enum(prioridadesRegistro)

export const objetivoSchema = z.object({
  nombre: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(120),
  descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres').max(500),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const iniciativaSchema = z.object({
  objetivo_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().min(5).max(500),
  alcance: z.number().min(1).max(100),
  impacto: z.number().min(1).max(100),
  confianza: z.number().min(1).max(100),
  esfuerzo: z.number().min(1).max(100),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const entregaSchema = z.object({
  iniciativa_id: z.string().uuid().nullable().optional(),
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().min(5).max(500),
  fecha_objetivo: z.string().nullable().optional(),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const matrizValorSchema = z.object({
  iniciativa_id: z.string().uuid('Selecciona una iniciativa válida'),
  titulo: z.string().trim().min(3).max(120),
  valor_negocio: z.number().min(1).max(100),
  esfuerzo: z.number().min(1).max(100),
  riesgo: z.number().min(1).max(100),
  estado: estadoSchema,
  prioridad: prioridadSchema
})

export const ingresoSchema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  contrasena: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

export type ObjetivoEntrada = z.infer<typeof objetivoSchema>
export type IniciativaEntrada = z.infer<typeof iniciativaSchema>
export type EntregaEntrada = z.infer<typeof entregaSchema>
export type MatrizValorEntrada = z.infer<typeof matrizValorSchema>
export type IngresoEntrada = z.infer<typeof ingresoSchema>
