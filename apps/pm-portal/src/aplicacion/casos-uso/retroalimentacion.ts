import type {
  FiltrosRetroalimentacionPm,
  IdentificadorRetroalimentacionPm,
  ParametrosListadoRetroalimentacionPm,
  RegistroRetroalimentacionPm
} from '@/dominio/modelos'
import { repositorioRetroalimentacion } from '@/infraestructura/repositorios/repositorioRetroalimentacion'

const MAXIMO_TAMANO_LOTE_EXPORTACION_RETROALIMENTACION = 100

export interface SolicitudListadoRetroalimentacionPm {
  accessToken: string | null
  parametros?: ParametrosListadoRetroalimentacionPm
}

export interface SolicitudLecturaRetroalimentacionPm {
  accessToken: string | null
  filtros?: FiltrosRetroalimentacionPm
}

export interface SolicitudDetalleRetroalimentacionPm extends IdentificadorRetroalimentacionPm {
  accessToken: string | null
}

export interface SolicitudExportacionRetroalimentacionPm {
  accessToken: string | null
  parametros?: ParametrosListadoRetroalimentacionPm
  tamanoLote?: number
}

export function obtenerListadoRetroalimentacion(solicitud: SolicitudListadoRetroalimentacionPm) {
  return repositorioRetroalimentacion.listarRetroalimentacion(solicitud.accessToken, solicitud.parametros)
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

export function obtenerResumenRetroalimentacion(solicitud: SolicitudLecturaRetroalimentacionPm) {
  return repositorioRetroalimentacion.obtenerResumenRetroalimentacion(solicitud.accessToken, solicitud.filtros)
}

export function obtenerDistribucionesRetroalimentacion(solicitud: SolicitudLecturaRetroalimentacionPm) {
  return repositorioRetroalimentacion.obtenerDistribucionesRetroalimentacion(
    solicitud.accessToken,
    solicitud.filtros
  )
}

export function obtenerDetalleRetroalimentacion(solicitud: SolicitudDetalleRetroalimentacionPm) {
  return repositorioRetroalimentacion.obtenerDetalleRetroalimentacion(solicitud.accessToken, {
    tipo: solicitud.tipo,
    id: solicitud.id
  })
}