import {
  PARAMS_REGISTROS_RETROALIMENTACION_V1,
  aplicarPaginacionRetroalimentacionV1,
  autorizarRegistrosRetroalimentacionV1,
  construirFiltrosRespuestaV1,
  construirRespuestaListadoRetroalimentacionV1,
  crearConsultaRetroalimentacionV1,
  manejarErrorRetroalimentacionV1,
  obtenerClienteLecturaV1,
  obtenerColumnasRegistrosRetroalimentacionV1,
  obtenerFiltrosRetroalimentacionV1,
  obtenerPaginacionRetroalimentacionV1,
  obtenerRequestIdV1,
  resolverAlcanceEmpresaRegistrosV1,
  responderExitoV1,
  validarPermisosFiltrosRetroalimentacionV1
} from '../../_retroalimentacion_v1'
import type { EntornoRetroalimentacion } from '../../_retroalimentacion'

type ContextoRetroalimentacionRegistrosV1 = {
  env: EntornoRetroalimentacion
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacionRegistrosV1): Promise<Response> => {
  const requestId = obtenerRequestIdV1(context.request)

  try {
    const consumidor = await autorizarRegistrosRetroalimentacionV1(context.request, context.env, requestId)

    if (consumidor instanceof Response) {
      return consumidor
    }

    const filtros = obtenerFiltrosRetroalimentacionV1(context.request, PARAMS_REGISTROS_RETROALIMENTACION_V1)
    validarPermisosFiltrosRetroalimentacionV1(filtros, consumidor, {
      permiteSensibles: true,
      permiteFiltroUsuario: true
    })

    const paginacion = obtenerPaginacionRetroalimentacionV1(context.request)
    const cliente = obtenerClienteLecturaV1(context.env)
    const alcance = resolverAlcanceEmpresaRegistrosV1(filtros, consumidor)
    const filtrosConsulta = construirFiltrosRespuestaV1(filtros, alcance.empresaIdConsulta)
    const columnas = obtenerColumnasRegistrosRetroalimentacionV1(filtros.incluir_sensibles)
    const consulta = aplicarPaginacionRetroalimentacionV1(
      crearConsultaRetroalimentacionV1(cliente, columnas, filtrosConsulta, { count: 'exact' }),
      paginacion
    )

    const { data, count, error } = await consulta

    if (error) {
      throw error
    }

    return responderExitoV1(
      construirRespuestaListadoRetroalimentacionV1(
        (data ?? []) as any,
        filtrosConsulta,
        paginacion,
        count ?? 0,
        requestId,
        filtros.incluir_sensibles
      )
    )
  } catch (error) {
    return manejarErrorRetroalimentacionV1(error, requestId)
  }
}