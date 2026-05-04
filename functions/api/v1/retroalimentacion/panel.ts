import {
  COLUMNAS_PANEL_V1,
  PARAMS_PANEL_RETROALIMENTACION_V1,
  aplicarAlcanceEmpresaAutorizadoV1,
  autorizarPanelRetroalimentacionV1,
  construirFiltrosRespuestaV1,
  construirRespuestaPanelV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerClienteLecturaV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerRequestIdV1,
  resolverAlcanceEmpresaPanelV1,
  responderExitoV1,
  validarHabilitacionPanelRetroalimentacionV1,
  validarPermisosFiltrosRetroalimentacionV1
} from '../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion } from '../../_retroalimentacion'

type ContextoRetroalimentacionPanelV1 = {
  env: EntornoRetroalimentacion
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacionPanelV1): Promise<Response> => {
  const requestId = obtenerRequestIdV1(context.request)

  try {
    const panelDeshabilitado = validarHabilitacionPanelRetroalimentacionV1(context.env, requestId)

    if (panelDeshabilitado) {
      return panelDeshabilitado
    }

    const consumidor = await autorizarPanelRetroalimentacionV1(context.request, context.env, requestId)

    if (consumidor instanceof Response) {
      return consumidor
    }

    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_PANEL_RETROALIMENTACION_V1)
    validarPermisosFiltrosRetroalimentacionV1(filtros, consumidor, {
      permiteSensibles: false,
      permiteFiltroUsuario: true
    })

    const cliente = obtenerClienteLecturaV1(context.env)
    const alcance = resolverAlcanceEmpresaPanelV1(filtros, consumidor)
    const consulta = aplicarAlcanceEmpresaAutorizadoV1(crearConsultaRetroalimentacionV1(cliente, COLUMNAS_PANEL_V1, filtros), alcance)

    const { data, error } = await consulta

    if (error) {
      throw error
    }

    const filtrosRespuesta = construirFiltrosRespuestaV1(filtros, alcance.empresaIdRespuesta)
    return responderExitoV1(construirRespuestaPanelV1((data ?? []) as any, filtrosRespuesta, requestId))
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}