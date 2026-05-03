import {
  PARAMS_LISTADO_RETROALIMENTACION_V1,
  construirRespuestaListadoV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerBloqueoLecturaOperativaV1,
  obtenerClienteLecturaV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerPaginacionRetroalimentacionV1,
  obtenerRequestIdV1,
  validarAccesoBaseV1,
  responderExitoV1
} from '../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion, RegistroRetroalimentacion } from '../../_retroalimentacion'

type ContextoRetroalimentacionV1 = {
  env: EntornoRetroalimentacion
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacionV1): Promise<Response> => {
  const requestId = obtenerRequestIdV1(context.request)

  try {
    const accesoBase = await validarAccesoBaseV1(context.request, context.env, requestId)

    if (accesoBase) {
      return accesoBase
    }

    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_LISTADO_RETROALIMENTACION_V1)
    const paginacion = obtenerPaginacionRetroalimentacionV1(context.request)
    const bloqueoLectura = obtenerBloqueoLecturaOperativaV1(requestId)

    if (bloqueoLectura) {
      return bloqueoLectura
    }

    const cliente = obtenerClienteLecturaV1(context.env, requestId)

    if (cliente instanceof Response) {
      return cliente
    }

    const desde = (paginacion.pagina - 1) * paginacion.tamano
    const hasta = desde + paginacion.tamano - 1

    let consulta = crearConsultaRetroalimentacionV1(
      cliente,
      'registro_uid, tipo, created_at, empresa_id, empresa_nombre, establecimiento_id, establecimiento_nombre, modulo, valor_principal, puntaje, estado_animo',
      filtros,
      { count: 'exact' }
    )
      .order(paginacion.ordenar_por, { ascending: paginacion.direccion === 'asc' })

    if (paginacion.ordenar_por !== 'created_at') {
      consulta = consulta.order('created_at', { ascending: false })
    }

    const { data, error, count } = await consulta.range(desde, hasta)

    if (error) {
      return manejarErrorRetroalimentacionV1(error, requestId)
    }

    const respuesta = construirRespuestaListadoV1(
      (data ?? []) as unknown as RegistroRetroalimentacion[],
      filtros,
      paginacion,
      count ?? 0,
      requestId
    )

    return responderExitoV1(200, respuesta, requestId)
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}