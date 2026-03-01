import { z } from 'zod'
import {
  esquemaRespuestaMetricasPosthog,
  esquemaRespuestaResumenRepo,
  type RespuestaMetricasPosthog,
  type RespuestaResumenRepo
} from '@/infraestructura/apis/esquemasApiPortalPM'

interface OpcionesSolicitud {
  accessToken?: string | null
}

export type PeriodoMetricas = 7 | 30 | 90

export type ParametrosMetricasPosthog =
  | {
      tipo: 'periodo'
      periodoDias: PeriodoMetricas
    }
  | {
      tipo: 'personalizado'
      desde: string
      hasta: string
    }

async function solicitarJson<T>(url: string, esquema: z.ZodSchema<T>, opciones?: OpcionesSolicitud): Promise<T> {
  const headers: HeadersInit = {
    accept: 'application/json'
  }

  if (opciones?.accessToken) {
    headers.authorization = `Bearer ${opciones.accessToken}`
  }

  const respuesta = await fetch(url, {
    method: 'GET',
    headers
  })

  if (!respuesta.ok) {
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new Error('No autorizado. Inicia sesión nuevamente.')
    }

    throw new Error(`La API respondió con ${String(respuesta.status)}.`)
  }

  const json = (await respuesta.json()) as unknown
  const validacion = esquema.safeParse(json)

  if (!validacion.success) {
    throw new Error('La API devolvió un formato inesperado.')
  }

  return validacion.data
}

function construirRutaMetricas(parametros?: ParametrosMetricasPosthog): string {
  if (!parametros) {
    return '/api/metricas-posthog'
  }

  const search = new URLSearchParams()

  if (parametros.tipo === 'periodo') {
    search.set('periodo_dias', String(parametros.periodoDias))
  }

  if (parametros.tipo === 'personalizado') {
    search.set('desde', parametros.desde)
    search.set('hasta', parametros.hasta)
  }

  return `/api/metricas-posthog?${search.toString()}`
}

export function obtenerMetricasPosthog(parametros?: ParametrosMetricasPosthog): Promise<RespuestaMetricasPosthog> {
  return solicitarJson(construirRutaMetricas(parametros), esquemaRespuestaMetricasPosthog)
}

export function obtenerMetricasPosthogAutenticado(
  parametros: ParametrosMetricasPosthog,
  accessToken: string | null
): Promise<RespuestaMetricasPosthog> {
  if (!accessToken) {
    return Promise.reject(new Error('No autorizado. Inicia sesión nuevamente.'))
  }

  return solicitarJson(construirRutaMetricas(parametros), esquemaRespuestaMetricasPosthog, {
    accessToken
  })
}

export function obtenerResumenRepo(): Promise<RespuestaResumenRepo> {
  return solicitarJson('/api/resumen-repo', esquemaRespuestaResumenRepo)
}
