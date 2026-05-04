import {
  COLUMNAS_RESUMEN_V1,
  PARAMS_RESUMEN_RETROALIMENTACION_V1,
  aplicarAlcanceEmpresaAutorizadoV1,
  autorizarResumenRetroalimentacionV1,
  construirFiltrosRespuestaV1,
  construirRespuestaResumenV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerClienteLecturaV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerRequestIdV1,
  resolverAlcanceEmpresaResumenV1,
  responderExitoV1,
  validarPermisosFiltrosRetroalimentacionV1
} from '../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion } from '../../_retroalimentacion'

type ContextoRetroalimentacionResumenV1 = {
  env: EntornoRetroalimentacion
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacionResumenV1): Promise<Response> => {
  const requestId = obtenerRequestIdV1(context.request)

  try {
    const consumidor = await autorizarResumenRetroalimentacionV1(context.request, context.env, requestId)

    if (consumidor instanceof Response) {
      return consumidor
    }

    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_RESUMEN_RETROALIMENTACION_V1)
    validarPermisosFiltrosRetroalimentacionV1(filtros, consumidor, {
      permiteSensibles: false,
      permiteFiltroUsuario: true
    })

    const cliente = obtenerClienteLecturaV1(context.env)
    const alcanceEmpresas = resolverAlcanceEmpresaResumenV1(filtros, consumidor)
    const consulta = aplicarAlcanceEmpresaAutorizadoV1(
      crearConsultaRetroalimentacionV1(cliente, COLUMNAS_RESUMEN_V1, filtros),
      alcanceEmpresas
    )

    const { data, error } = await consulta.order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    const filtrosRespuesta = construirFiltrosRespuestaV1(filtros, alcanceEmpresas.empresaIdRespuesta)
    return responderExitoV1(construirRespuestaResumenV1((data ?? []) as any, filtrosRespuesta, requestId))
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}