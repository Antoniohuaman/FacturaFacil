import type {
  FiltrosRetroalimentacionPm,
  IdentificadorRetroalimentacionPm,
  ParametrosListadoRetroalimentacionPm,
  RespuestaPanelRetroalimentacionPm,
  RegistroRetroalimentacionPm
} from '@/dominio/modelos'
import { repositorioRetroalimentacion } from '@/infraestructura/repositorios/repositorioRetroalimentacion'

const MAXIMO_TAMANO_LOTE_EXPORTACION_RETROALIMENTACION = 100
const DURACION_CACHE_PANEL_RETROALIMENTACION_MS = 15_000

const cachePanelRetroalimentacion = new Map<
  string,
  {
    expiraEn: number
    respuesta: RespuestaPanelRetroalimentacionPm
  }
>()

export interface SolicitudListadoRetroalimentacionPm {
  accessToken: string | null
  parametros?: ParametrosListadoRetroalimentacionPm
  signal?: AbortSignal
}

export interface SolicitudLecturaRetroalimentacionPm {
  accessToken: string | null
  filtros?: FiltrosRetroalimentacionPm
  signal?: AbortSignal
  omitirCache?: boolean
}

export interface SolicitudDetalleRetroalimentacionPm extends IdentificadorRetroalimentacionPm {
  accessToken: string | null
  signal?: AbortSignal
}

export interface SolicitudExportacionRetroalimentacionPm {
  accessToken: string | null
  parametros?: ParametrosListadoRetroalimentacionPm
  tamanoLote?: number
}

function construirClaveFiltrosRetroalimentacion(filtros?: FiltrosRetroalimentacionPm) {
  return JSON.stringify({
    tipo: filtros?.tipo ?? null,
    desde: filtros?.desde ?? null,
    hasta: filtros?.hasta ?? null,
    empresa_id: filtros?.empresa_id ?? null,
    empresa: filtros?.empresa ?? null,
    usuario_id: filtros?.usuario_id ?? null,
    usuario: filtros?.usuario ?? null,
    modulo: filtros?.modulo ?? null,
    ruta: filtros?.ruta ?? null
  })
}

export function obtenerListadoRetroalimentacion(solicitud: SolicitudListadoRetroalimentacionPm) {
  return repositorioRetroalimentacion.listarRetroalimentacion(
    solicitud.accessToken,
    solicitud.parametros,
    solicitud.signal
  )
}

export async function obtenerTodosLosRegistrosRetroalimentacion(
  solicitud: SolicitudExportacionRetroalimentacionPm
): Promise<RegistroRetroalimentacionPm[]> {
  const tamanoSolicitado = solicitud.tamanoLote ?? solicitud.parametros?.tamano ?? 50
  const parametrosBase = {
    ...solicitud.parametros,
    pagina: 1,
    tamano: Math.max(1, Math.min(tamanoSolicitado, MAXIMO_TAMANO_LOTE_EXPORTACION_RETROALIMENTACION))
  }

  const primeraPagina = await repositorioRetroalimentacion.listarRetroalimentacion(
    solicitud.accessToken,
    parametrosBase
  )

  if (primeraPagina.paginacion.total_paginas <= 1) {
    return primeraPagina.items
  }

  const registros = [...primeraPagina.items]

  for (let pagina = 2; pagina <= primeraPagina.paginacion.total_paginas; pagina += 1) {
    const respuesta = await repositorioRetroalimentacion.listarRetroalimentacion(solicitud.accessToken, {
      ...parametrosBase,
      pagina
    })

    registros.push(...respuesta.items)
  }

  return registros
}

export async function obtenerPanelRetroalimentacion(solicitud: SolicitudLecturaRetroalimentacionPm) {
  const claveCache = construirClaveFiltrosRetroalimentacion(solicitud.filtros)
  const ahora = Date.now()
  const cacheActual = cachePanelRetroalimentacion.get(claveCache)

  if (!solicitud.omitirCache && cacheActual && cacheActual.expiraEn > ahora) {
    return cacheActual.respuesta
  }

  const respuesta = await repositorioRetroalimentacion.obtenerPanelRetroalimentacion(
    solicitud.accessToken,
    solicitud.filtros,
    solicitud.signal
  )

  cachePanelRetroalimentacion.set(claveCache, {
    expiraEn: ahora + DURACION_CACHE_PANEL_RETROALIMENTACION_MS,
    respuesta
  })

  return respuesta
}

export function obtenerResumenRetroalimentacion(solicitud: SolicitudLecturaRetroalimentacionPm) {
  return repositorioRetroalimentacion.obtenerResumenRetroalimentacion(
    solicitud.accessToken,
    solicitud.filtros,
    solicitud.signal
  )
}

export function obtenerDistribucionesRetroalimentacion(solicitud: SolicitudLecturaRetroalimentacionPm) {
  return repositorioRetroalimentacion.obtenerDistribucionesRetroalimentacion(
    solicitud.accessToken,
    solicitud.filtros,
    solicitud.signal
  )
}

export function obtenerDetalleRetroalimentacion(solicitud: SolicitudDetalleRetroalimentacionPm) {
  return repositorioRetroalimentacion.obtenerDetalleRetroalimentacion(solicitud.accessToken, {
    tipo: solicitud.tipo,
    id: solicitud.id
  }, solicitud.signal)
}