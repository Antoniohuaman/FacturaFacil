import type { EntornoAuth } from '../_autorizacion'
import {
  type RespuestaResumenRetroalimentacion,
  calcularPromedioPuntajes,
  crearConsultaRetroalimentacion,
  manejarErrorRetroalimentacion,
  obtenerClienteAutorizado,
  obtenerFiltrosRetroalimentacion,
  responderExito
} from '../_retroalimentacion'

type ContextoRetroalimentacion = {
  env: EntornoAuth
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacion): Promise<Response> => {
  try {
    const cliente = await obtenerClienteAutorizado(context.request, context.env)

    if (cliente instanceof Response) {
      return cliente
    }

    const filtros = obtenerFiltrosRetroalimentacion(context.request)

    const [
      totalResultado,
      estadosResultado,
      ideasResultado,
      calificacionesResultado,
      puntajesResultado,
      estadosAnimoResultado
    ] = await Promise.all([
      crearConsultaRetroalimentacion(cliente, 'id', filtros, { count: 'exact', head: true }),
      crearConsultaRetroalimentacion(cliente, 'id', { ...filtros, tipo: 'estado_animo' }, { count: 'exact', head: true }),
      crearConsultaRetroalimentacion(cliente, 'id', { ...filtros, tipo: 'idea' }, { count: 'exact', head: true }),
      crearConsultaRetroalimentacion(cliente, 'id', { ...filtros, tipo: 'calificacion' }, { count: 'exact', head: true }),
      crearConsultaRetroalimentacion(cliente, 'puntaje', { ...filtros, tipo: 'calificacion' }),
      crearConsultaRetroalimentacion(cliente, 'estado_animo', { ...filtros, tipo: 'estado_animo' })
    ])

    const errores = [
      totalResultado.error,
      estadosResultado.error,
      ideasResultado.error,
      calificacionesResultado.error,
      puntajesResultado.error,
      estadosAnimoResultado.error
    ].filter(Boolean)

    if (errores.length > 0) {
      return manejarErrorRetroalimentacion(errores[0])
    }

    const distribucionEstadoAnimo = new Map<string, number>()

    for (const fila of (estadosAnimoResultado.data ?? []) as unknown as Array<{ estado_animo: string | null }>) {
      if (!fila.estado_animo) {
        continue
      }

      distribucionEstadoAnimo.set(fila.estado_animo, (distribucionEstadoAnimo.get(fila.estado_animo) ?? 0) + 1)
    }

    const respuesta: RespuestaResumenRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: new Date().toISOString(),
      filtros_aplicados: filtros,
      total_registros: totalResultado.count ?? 0,
      totales_por_tipo: {
        estado_animo: estadosResultado.count ?? 0,
        idea: ideasResultado.count ?? 0,
        calificacion: calificacionesResultado.count ?? 0
      },
      promedio_calificacion: calcularPromedioPuntajes(
        (puntajesResultado.data ?? []) as unknown as Array<{ puntaje: number | null }>
      ),
      distribucion_estado_animo: [...distribucionEstadoAnimo.entries()]
        .map(([estado_animo, total]) => ({ estado_animo, total }))
        .sort((a, b) => b.total - a.total),
      cantidad_ideas: ideasResultado.count ?? 0
    }

    return responderExito(respuesta)
  } catch (error) {
    return manejarErrorRetroalimentacion(error)
  }
}