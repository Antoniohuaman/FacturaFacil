import type {
  FiltrosRetroalimentacionPm,
  IdentificadorRetroalimentacionPm,
  ParametrosListadoRetroalimentacionPm
} from '@/dominio/modelos'
import {
  listarRetroalimentacionApiPortalPM,
  obtenerDetalleRetroalimentacionApiPortalPM,
  obtenerDistribucionesRetroalimentacionApiPortalPM,
  obtenerPanelRetroalimentacionApiPortalPM,
  obtenerResumenRetroalimentacionApiPortalPM
} from '@/infraestructura/apis/clienteApiPortalPM'

export const repositorioRetroalimentacion = {
  listarRetroalimentacion(
    accessToken: string | null,
    parametros?: ParametrosListadoRetroalimentacionPm,
    signal?: AbortSignal
  ) {
    return listarRetroalimentacionApiPortalPM(parametros, accessToken, signal)
  },

  obtenerPanelRetroalimentacion(accessToken: string | null, filtros?: FiltrosRetroalimentacionPm, signal?: AbortSignal) {
    return obtenerPanelRetroalimentacionApiPortalPM(filtros, accessToken, signal)
  },

  obtenerResumenRetroalimentacion(accessToken: string | null, filtros?: FiltrosRetroalimentacionPm, signal?: AbortSignal) {
    return obtenerResumenRetroalimentacionApiPortalPM(filtros, accessToken, signal)
  },

  obtenerDistribucionesRetroalimentacion(accessToken: string | null, filtros?: FiltrosRetroalimentacionPm, signal?: AbortSignal) {
    return obtenerDistribucionesRetroalimentacionApiPortalPM(filtros, accessToken, signal)
  },

  obtenerDetalleRetroalimentacion(
    accessToken: string | null,
    identificador: IdentificadorRetroalimentacionPm,
    signal?: AbortSignal
  ) {
    return obtenerDetalleRetroalimentacionApiPortalPM(identificador, accessToken, signal)
  }
}