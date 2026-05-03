import {
  PARAMS_RESUMEN_RETROALIMENTACION_V1,
  aplicarAlcanceEmpresaAutorizadoV1,
  autorizarResumenRetroalimentacionV1,
  type RegistroRetroalimentacionResumenV1,
  construirRespuestaResumenV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerClienteLecturaV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerRequestIdV1,
  resolverAlcanceEmpresaResumenV1,
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
    const consumidor = await autorizarResumenRetroalimentacionV1(context.request, context.env, requestId)

    if (consumidor instanceof Response) {
      return consumidor
    }

    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_RESUMEN_RETROALIMENTACION_V1)
    const alcanceEmpresas = resolverAlcanceEmpresaResumenV1(filtros, consumidor)
    const filtrosConsulta = {
      ...filtros,
      empresa_id: alcanceEmpresas.empresaIdsConsulta.length === 1 ? alcanceEmpresas.empresaIdsConsulta[0] : null
    }
    const filtrosRespuesta = {
      ...filtros,
      empresa_id: alcanceEmpresas.empresaIdRespuesta
    }

    const cliente = obtenerClienteLecturaV1(context.env, requestId)

    if (cliente instanceof Response) {
      return cliente
    }

    const consulta = aplicarAlcanceEmpresaAutorizadoV1(
      crearConsultaRetroalimentacionV1(
        cliente,
        'tipo, created_at, puntaje, estado_animo',
        filtrosConsulta
      ),
      alcanceEmpresas
    )

    const { data, error } = await consulta.order('created_at', { ascending: true })

    if (error) {
      return manejarErrorRetroalimentacionV1(error, requestId)
    }

    const respuesta = construirRespuestaResumenV1(
      (data ?? []) as unknown as RegistroRetroalimentacionResumenV1[],
      filtrosRespuesta,
      requestId
    )
    return responderExitoV1(200, respuesta, requestId)
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}