import { z } from 'zod'
import {
  esquemaRespuestaMetricasPosthog,
  esquemaRespuestaResumenRepo,
  type RespuestaMetricasPosthog,
  type RespuestaResumenRepo
} from '@/infraestructura/apis/esquemasApiPortalPM'

async function solicitarJson<T>(url: string, esquema: z.ZodSchema<T>): Promise<T> {
  const respuesta = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json'
    }
  })

  if (!respuesta.ok) {
    throw new Error(`La API respondió con ${String(respuesta.status)}.`)
  }

  const json = (await respuesta.json()) as unknown
  const validacion = esquema.safeParse(json)

  if (!validacion.success) {
    throw new Error('La API devolvió un formato inesperado.')
  }

  return validacion.data
}

export function obtenerMetricasPosthog(): Promise<RespuestaMetricasPosthog> {
  return solicitarJson('/api/metricas-posthog', esquemaRespuestaMetricasPosthog)
}

export function obtenerResumenRepo(): Promise<RespuestaResumenRepo> {
  return solicitarJson('/api/resumen-repo', esquemaRespuestaResumenRepo)
}
