import { z } from 'zod'
import {
  camposOrdenRetroalimentacionPm,
  direccionesOrdenRetroalimentacionPm,
  tiposRetroalimentacionPm,
  type FiltrosRetroalimentacionAplicadosPm,
  type PaginacionRetroalimentacionPm,
  type RegistroRetroalimentacionPm,
  type RespuestaDetalleRetroalimentacionPm,
  type RespuestaDistribucionesRetroalimentacionPm,
  type RespuestaListadoRetroalimentacionPm,
  type RespuestaPanelRetroalimentacionPm,
  type RespuestaResumenRetroalimentacionPm
} from '@/dominio/modelos'

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
  codigo_error: z.string().nullable().optional(),
  rango: z
    .object({
      tipo: z.enum(['periodo', 'personalizado']),
      desde: z.string().nullable(),
      hasta: z.string().nullable()
    })
    .optional(),
  diagnostico: z
    .object({
      host_dominio: z.string().nullable(),
      project_id_enmascarado: z.string().nullable(),
      eventos_consultados: z.array(z.string().min(1))
    })
    .optional(),
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

const esquemaTipoRetroalimentacionPm = z.enum(tiposRetroalimentacionPm)
const esquemaCampoOrdenRetroalimentacionPm = z.enum(camposOrdenRetroalimentacionPm)
const esquemaDireccionOrdenRetroalimentacionPm = z.enum(direccionesOrdenRetroalimentacionPm)

const esquemaRegistroRetroalimentacionPm: z.ZodType<RegistroRetroalimentacionPm> = z.object({
  registro_uid: z.string().min(1),
  tipo: esquemaTipoRetroalimentacionPm,
  id: z.string().min(1),
  created_at: z.string().min(1),
  usuario_id: z.string().min(1),
  usuario_nombre: z.string().min(1),
  usuario_correo: z.string().email().nullable(),
  empresa_id: z.string().min(1),
  empresa_ruc: z.string().min(1).nullable(),
  empresa_razon_social: z.string().min(1).nullable(),
  empresa_nombre: z.string().min(1),
  establecimiento_id: z.string().min(1).nullable(),
  establecimiento_nombre: z.string().min(1).nullable(),
  modulo: z.string().min(1),
  ruta: z.string().min(1),
  valor_principal: z.string().min(1),
  detalle: z.string().nullable(),
  puntaje: z.number().finite().nullable(),
  estado_animo: z.string().min(1).nullable()
})

const esquemaFiltrosRetroalimentacionAplicadosPm: z.ZodType<FiltrosRetroalimentacionAplicadosPm> = z.object({
  tipo: esquemaTipoRetroalimentacionPm.nullable(),
  desde: z.string().min(1).nullable(),
  hasta: z.string().min(1).nullable(),
  empresa_id: z.string().min(1).nullable(),
  empresa: z.string().min(1).nullable(),
  usuario_id: z.string().min(1).nullable(),
  usuario: z.string().min(1).nullable(),
  modulo: z.string().min(1).nullable(),
  ruta: z.string().min(1).nullable()
})

const esquemaPaginacionRetroalimentacionPm: z.ZodType<PaginacionRetroalimentacionPm> = z.object({
  pagina: z.number().int().positive(),
  tamano: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  total_paginas: z.number().int().positive(),
  ordenar_por: esquemaCampoOrdenRetroalimentacionPm,
  direccion: esquemaDireccionOrdenRetroalimentacionPm
})

export const esquemaRespuestaListadoRetroalimentacionPm: z.ZodType<RespuestaListadoRetroalimentacionPm> = z.object({
  fuente: z.literal('supabase'),
  actualizado_en: z.string().min(1),
  filtros_aplicados: esquemaFiltrosRetroalimentacionAplicadosPm,
  paginacion: esquemaPaginacionRetroalimentacionPm,
  items: z.array(esquemaRegistroRetroalimentacionPm)
})

export const esquemaRespuestaResumenRetroalimentacionPm: z.ZodType<RespuestaResumenRetroalimentacionPm> = z.object({
  fuente: z.literal('supabase'),
  actualizado_en: z.string().min(1),
  filtros_aplicados: esquemaFiltrosRetroalimentacionAplicadosPm,
  total_registros: z.number().int().nonnegative(),
  totales_por_tipo: z.object({
    estado_animo: z.number().int().nonnegative(),
    idea: z.number().int().nonnegative(),
    calificacion: z.number().int().nonnegative()
  }),
  promedio_calificacion: z.number().finite().nullable(),
  distribucion_estado_animo: z.array(
    z.object({
      estado_animo: z.string().min(1),
      total: z.number().int().nonnegative()
    })
  ),
  cantidad_ideas: z.number().int().nonnegative()
})

export const esquemaRespuestaDistribucionesRetroalimentacionPm: z.ZodType<RespuestaDistribucionesRetroalimentacionPm> = z.object({
  fuente: z.literal('supabase'),
  actualizado_en: z.string().min(1),
  filtros_aplicados: esquemaFiltrosRetroalimentacionAplicadosPm,
  por_tipo: z.array(
    z.object({
      tipo: esquemaTipoRetroalimentacionPm,
      total: z.number().int().nonnegative()
    })
  ),
  por_modulo: z.array(
    z.object({
      modulo: z.string().min(1),
      total: z.number().int().nonnegative()
    })
  ),
  puntajes: z.array(
    z.object({
      puntaje: z.number().finite(),
      total: z.number().int().nonnegative()
    })
  ),
  estados_animo: z.array(
    z.object({
      estado_animo: z.string().min(1),
      total: z.number().int().nonnegative()
    })
  ),
  serie_diaria: z.array(
    z.object({
      fecha: z.string().min(1),
      total: z.number().int().nonnegative(),
      estado_animo: z.number().int().nonnegative(),
      idea: z.number().int().nonnegative(),
      calificacion: z.number().int().nonnegative()
    })
  )
})

export const esquemaRespuestaPanelRetroalimentacionPm: z.ZodType<RespuestaPanelRetroalimentacionPm> = z.object({
  fuente: z.literal('supabase'),
  actualizado_en: z.string().min(1),
  filtros_aplicados: esquemaFiltrosRetroalimentacionAplicadosPm,
  resumen: esquemaRespuestaResumenRetroalimentacionPm,
  distribuciones: esquemaRespuestaDistribucionesRetroalimentacionPm
})

export const esquemaRespuestaDetalleRetroalimentacionPm: z.ZodType<RespuestaDetalleRetroalimentacionPm> = z.object({
  fuente: z.literal('supabase'),
  actualizado_en: z.string().min(1),
  item: esquemaRegistroRetroalimentacionPm
})

export type RespuestaMetricasPosthog = z.infer<typeof esquemaRespuestaMetricasPosthog>
export type RespuestaResumenRepo = z.infer<typeof esquemaRespuestaResumenRepo>
