import {
  PARAMS_DETALLE_RETROALIMENTACION_V1,
  construirRespuestaDetalleV1,
  manejarErrorRetroalimentacionV1,
  obtenerBloqueoLecturaOperativaV1,
  obtenerClienteLecturaV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerRequestIdV1,
  responderErrorV1,
  responderExitoV1,
  validarAccesoBaseV1,
  validarRegistroUidV1
} from '../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion, RegistroRetroalimentacion } from '../../_retroalimentacion'

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
    const accesoBase = await validarAccesoBaseV1(context.request, context.env, requestId)

    if (accesoBase) {
      return accesoBase
    }

    obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_DETALLE_RETROALIMENTACION_V1)
    const registroUid = validarRegistroUidV1(context.params.registro_uid)
    const bloqueoLectura = obtenerBloqueoLecturaOperativaV1(requestId)

    if (bloqueoLectura) {
      return bloqueoLectura
    }

    const cliente = obtenerClienteLecturaV1(context.env, requestId)

    if (cliente instanceof Response) {
      return cliente
    }

    const { data, error } = await cliente
      .from('v_retroalimentacion_unificada')
      .select(
        'registro_uid, tipo, created_at, empresa_id, empresa_nombre, establecimiento_id, establecimiento_nombre, modulo, valor_principal, puntaje, estado_animo'
      )
      .eq('registro_uid', registroUid)
      .maybeSingle()

    if (error) {
      return manejarErrorRetroalimentacionV1(error, requestId)
    }

    if (!data) {
      return responderErrorV1(404, 'not_found', 'No se encontró el recurso solicitado.', requestId)
    }

    const respuesta = construirRespuestaDetalleV1(data as RegistroRetroalimentacion, requestId)
    return responderExitoV1(200, respuesta, requestId)
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}