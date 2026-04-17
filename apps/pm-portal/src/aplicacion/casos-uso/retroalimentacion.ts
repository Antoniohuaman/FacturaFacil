import type {
  FiltrosRetroalimentacionPm,
  IdentificadorRetroalimentacionPm,
  ParametrosListadoRetroalimentacionPm
} from '@/dominio/modelos'
import { repositorioRetroalimentacion } from '@/infraestructura/repositorios/repositorioRetroalimentacion'

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

export function obtenerListadoRetroalimentacion(solicitud: SolicitudListadoRetroalimentacionPm) {
  return repositorioRetroalimentacion.listarRetroalimentacion(solicitud.accessToken, solicitud.parametros)
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