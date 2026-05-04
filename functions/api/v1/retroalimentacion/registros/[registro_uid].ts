import {
  PARAMS_DETALLE_RETROALIMENTACION_V1,
  autorizarDetalleRetroalimentacionV1,
  construirFiltrosRespuestaV1,
  construirRespuestaDetalleRetroalimentacionV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerClienteLecturaV1,
  obtenerColumnasRegistrosRetroalimentacionV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerRequestIdV1,
  responderErrorV1,
  responderExitoV1,
  resolverAlcanceEmpresaRegistrosV1,
  validarPermisosFiltrosRetroalimentacionV1,
  validarRegistroUidRetroalimentacionV1
} from '../../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion } from '../../../_retroalimentacion'

type ContextoRetroalimentacionDetalleV1 = {
  env: EntornoRetroalimentacion
  request: Request
  params: {
    registro_uid?: string
  }
}

export const onRequestGet = async (context: ContextoRetroalimentacionDetalleV1): Promise<Response> => {
  const requestId = obtenerRequestIdV1(context.request)

  try {
    const consumidor = await autorizarDetalleRetroalimentacionV1(context.request, context.env, requestId)

    if (consumidor instanceof Response) {
      return consumidor
    }

    const registroUid = validarRegistroUidRetroalimentacionV1(context.params.registro_uid)
    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_DETALLE_RETROALIMENTACION_V1)
    validarPermisosFiltrosRetroalimentacionV1(filtros, consumidor, {
      permiteSensibles: true,
      permiteFiltroUsuario: false
    })

    const cliente = obtenerClienteLecturaV1(context.env)
    const alcance = resolverAlcanceEmpresaRegistrosV1(filtros, consumidor)
    const filtrosConsulta = construirFiltrosRespuestaV1(filtros, alcance.empresaIdConsulta)
    const columnas = obtenerColumnasRegistrosRetroalimentacionV1(filtros.incluir_sensibles)

    const { data, error } = await crearConsultaRetroalimentacionV1(cliente, columnas, filtrosConsulta)
      .eq('registro_uid', registroUid)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return responderErrorV1(404, 'not_found', 'No se encontro el registro solicitado.', requestId)
    }

    return responderExitoV1(
      construirRespuestaDetalleRetroalimentacionV1(data as any, filtrosConsulta, requestId, filtros.incluir_sensibles)
    )
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}