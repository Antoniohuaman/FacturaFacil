import { z } from 'zod'

const esquemaMetricaPosthog = z.object({
  clave: z.string().min(1),
  nombre: z.string().min(1),
  valor: z.number().finite().nullable(),
  valor_periodo_actual: z.number().finite().nullable(),
  valor_periodo_anterior: z.number().finite().nullable(),
  delta_absoluto: z.number().finite().nullable(),
  delta_porcentual: z.number().finite().nullable(),
  delta_aplicable: z.boolean(),
  unidad: z.enum(['conteo', 'porcentaje']),
  meta: z.number().finite().nullable(),
  estado_meta: z.enum(['ok', 'atencion', 'riesgo']).nullable(),
  periodo: z.string().min(1),
  disponible: z.boolean()
})

export const esquemaRespuestaMetricasPosthog = z.object({
  fuente: z.literal('posthog'),
  periodo_dias: z.number().int().positive(),
  actualizado_en: z.string().min(1),
  disponible: z.boolean(),
  motivo_no_disponible: z.string().nullable(),
  metricas: z.array(esquemaMetricaPosthog)
})

const esquemaCommitRepo = z.object({
  sha: z.string().min(1),
  mensaje: z.string().min(1),
  autor: z.string().min(1),
  fecha: z.string().min(1),
  url: z.string().url()
})

export const esquemaRespuestaResumenRepo = z.object({
  fuente: z.literal('github'),
  disponible: z.boolean(),
  actualizado_en: z.string().min(1),
  motivo_no_disponible: z.string().nullable(),
  total_commits_7d: z.number().int().nonnegative().nullable(),
  ultimos_commits: z.array(esquemaCommitRepo)
})

export type RespuestaMetricasPosthog = z.infer<typeof esquemaRespuestaMetricasPosthog>
export type RespuestaResumenRepo = z.infer<typeof esquemaRespuestaResumenRepo>
