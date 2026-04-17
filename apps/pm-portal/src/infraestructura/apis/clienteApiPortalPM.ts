import { z } from 'zod'
import type {
  FiltrosRetroalimentacionPm,
  IdentificadorRetroalimentacionPm,
  ParametrosListadoRetroalimentacionPm,
  RespuestaDetalleRetroalimentacionPm,
  RespuestaDistribucionesRetroalimentacionPm,
  RespuestaListadoRetroalimentacionPm,
  RespuestaResumenRetroalimentacionPm
} from '@/dominio/modelos'
import {
  esquemaRespuestaDetalleRetroalimentacionPm,
  esquemaRespuestaDistribucionesRetroalimentacionPm,
  esquemaRespuestaListadoRetroalimentacionPm,
  esquemaRespuestaMetricasPosthog,
  esquemaRespuestaResumenRetroalimentacionPm,
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

function solicitarJsonAutenticado<T>(url: string, esquema: z.ZodSchema<T>, accessToken: string | null): Promise<T> {
  if (!accessToken) {
    return Promise.reject(new Error('No autorizado. Inicia sesión nuevamente.'))
  }

  return solicitarJson(url, esquema, { accessToken })
}

function construirRutaConQuery(rutaBase: string, search: URLSearchParams): string {
  const query = search.toString()
  return query ? `${rutaBase}?${query}` : rutaBase
}

function agregarParametro(search: URLSearchParams, clave: string, valor: string | number | null | undefined) {
  if (valor === null || valor === undefined) {
    return
  }

  if (typeof valor === 'string') {
    const valorNormalizado = valor.trim()

    if (!valorNormalizado) {
      return
    }

    search.set(clave, valorNormalizado)
    return
  }

  search.set(clave, String(valor))
}

function agregarFiltrosRetroalimentacion(search: URLSearchParams, filtros?: FiltrosRetroalimentacionPm) {
  if (!filtros) {
    return
  }

  agregarParametro(search, 'tipo', filtros.tipo)
  agregarParametro(search, 'desde', filtros.desde)
  agregarParametro(search, 'hasta', filtros.hasta)
  agregarParametro(search, 'empresa_id', filtros.empresa_id)
  agregarParametro(search, 'empresa', filtros.empresa)
  agregarParametro(search, 'usuario_id', filtros.usuario_id)
  agregarParametro(search, 'usuario', filtros.usuario)
  agregarParametro(search, 'modulo', filtros.modulo)
  agregarParametro(search, 'ruta', filtros.ruta)
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
  return solicitarJsonAutenticado(construirRutaMetricas(parametros), esquemaRespuestaMetricasPosthog, accessToken)
}

export function obtenerResumenRepo(): Promise<RespuestaResumenRepo> {
  return solicitarJson('/api/resumen-repo', esquemaRespuestaResumenRepo)
}

function construirRutaListadoRetroalimentacion(parametros?: ParametrosListadoRetroalimentacionPm): string {
  const search = new URLSearchParams()

  if (parametros) {
    agregarParametro(search, 'pagina', parametros.pagina)
    agregarParametro(search, 'tamano', parametros.tamano)
    agregarParametro(search, 'ordenar_por', parametros.ordenar_por)
    agregarParametro(search, 'direccion', parametros.direccion)
    agregarFiltrosRetroalimentacion(search, parametros)
  }

  return construirRutaConQuery('/api/retroalimentacion', search)
}

function construirRutaRetroalimentacion(rutaBase: string, filtros?: FiltrosRetroalimentacionPm): string {
  const search = new URLSearchParams()
  agregarFiltrosRetroalimentacion(search, filtros)
  return construirRutaConQuery(rutaBase, search)
}

export function listarRetroalimentacionApiPortalPM(
  parametros: ParametrosListadoRetroalimentacionPm | undefined,
  accessToken: string | null
): Promise<RespuestaListadoRetroalimentacionPm> {
  return solicitarJsonAutenticado(
    construirRutaListadoRetroalimentacion(parametros),
    esquemaRespuestaListadoRetroalimentacionPm,
    accessToken
  )
}

export function obtenerResumenRetroalimentacionApiPortalPM(
  filtros: FiltrosRetroalimentacionPm | undefined,
  accessToken: string | null
): Promise<RespuestaResumenRetroalimentacionPm> {
  return solicitarJsonAutenticado(
    construirRutaRetroalimentacion('/api/retroalimentacion/resumen', filtros),
    esquemaRespuestaResumenRetroalimentacionPm,
    accessToken
  )
}

export function obtenerDistribucionesRetroalimentacionApiPortalPM(
  filtros: FiltrosRetroalimentacionPm | undefined,
  accessToken: string | null
): Promise<RespuestaDistribucionesRetroalimentacionPm> {
  return solicitarJsonAutenticado(
    construirRutaRetroalimentacion('/api/retroalimentacion/distribuciones', filtros),
    esquemaRespuestaDistribucionesRetroalimentacionPm,
    accessToken
  )
}

export function obtenerDetalleRetroalimentacionApiPortalPM(
  identificador: IdentificadorRetroalimentacionPm,
  accessToken: string | null
): Promise<RespuestaDetalleRetroalimentacionPm> {
  const ruta = `/api/retroalimentacion/${encodeURIComponent(identificador.tipo)}/${encodeURIComponent(identificador.id)}`

  return solicitarJsonAutenticado(ruta, esquemaRespuestaDetalleRetroalimentacionPm, accessToken)
}
