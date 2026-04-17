import type {
  FiltrosRetroalimentacionPm,
  IdentificadorRetroalimentacionPm,
  ParametrosListadoRetroalimentacionPm
} from '@/dominio/modelos'
import {
  listarRetroalimentacionApiPortalPM,
  obtenerDetalleRetroalimentacionApiPortalPM,
  obtenerDistribucionesRetroalimentacionApiPortalPM,
  obtenerResumenRetroalimentacionApiPortalPM
} from '@/infraestructura/apis/clienteApiPortalPM'

export const repositorioRetroalimentacion = {
  listarRetroalimentacion(accessToken: string | null, parametros?: ParametrosListadoRetroalimentacionPm) {
    return listarRetroalimentacionApiPortalPM(parametros, accessToken)
  },

  obtenerResumenRetroalimentacion(accessToken: string | null, filtros?: FiltrosRetroalimentacionPm) {
    return obtenerResumenRetroalimentacionApiPortalPM(filtros, accessToken)
  },

  obtenerDistribucionesRetroalimentacion(accessToken: string | null, filtros?: FiltrosRetroalimentacionPm) {
    return obtenerDistribucionesRetroalimentacionApiPortalPM(filtros, accessToken)
  },

  obtenerDetalleRetroalimentacion(accessToken: string | null, identificador: IdentificadorRetroalimentacionPm) {
    return obtenerDetalleRetroalimentacionApiPortalPM(identificador, accessToken)
  }
}