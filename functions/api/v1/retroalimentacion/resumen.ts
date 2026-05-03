import {
  PARAMS_RESUMEN_RETROALIMENTACION_V1,
  type RegistroRetroalimentacionResumenV1,
  construirRespuestaResumenV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerBloqueoLecturaOperativaV1,
  obtenerClienteLecturaV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerRequestIdV1,
  validarAccesoBaseV1,
  responderExitoV1
} from '../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion } from '../../_retroalimentacion'

type ContextoRetroalimentacionResumenV1 = {
  env: EntornoRetroalimentacion
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacionResumenV1): Promise<Response> => {
  const requestId = obtenerRequestIdV1(context.request)

  try {
    const accesoBase = await validarAccesoBaseV1(context.request, context.env, requestId)

    if (accesoBase) {
      return accesoBase
    }

    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_RESUMEN_RETROALIMENTACION_V1)
    const bloqueoLectura = obtenerBloqueoLecturaOperativaV1(requestId)

    if (bloqueoLectura) {
      return bloqueoLectura
    }

    const cliente = obtenerClienteLecturaV1(context.env, requestId)

    if (cliente instanceof Response) {
      return cliente
    }

    const { data, error } = await crearConsultaRetroalimentacionV1(
      cliente,
      'tipo, created_at, puntaje, estado_animo',
      filtros
    ).order('created_at', { ascending: true })

    if (error) {
      return manejarErrorRetroalimentacionV1(error, requestId)
    }

    const respuesta = construirRespuestaResumenV1(
      (data ?? []) as unknown as RegistroRetroalimentacionResumenV1[],
      filtros,
      requestId
    )
    return responderExitoV1(200, respuesta, requestId)
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}