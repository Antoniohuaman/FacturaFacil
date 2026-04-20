import {
  type EntornoRetroalimentacion,
  type RegistroRetroalimentacion,
  type RespuestaDistribucionesRetroalimentacion,
  type RespuestaPanelRetroalimentacion,
  type RespuestaResumenRetroalimentacion,
  agruparPorClave,
  calcularPromedioPuntajes,
  construirSerieDiaria,
  crearConsultaRetroalimentacion,
  manejarErrorRetroalimentacion,
  obtenerClienteAutorizado,
  obtenerFiltrosRetroalimentacion,
  responderExito
} from '../_retroalimentacion'

type ContextoRetroalimentacion = {
  env: EntornoRetroalimentacion
  request: Request
}

type RegistroPanelRetroalimentacion = Pick<
  RegistroRetroalimentacion,
  'tipo' | 'created_at' | 'modulo' | 'puntaje' | 'estado_animo'
>

export const onRequestGet = async (context: ContextoRetroalimentacion): Promise<Response> => {
  try {
    const cliente = await obtenerClienteAutorizado(context.request, context.env)

    if (cliente instanceof Response) {
      return cliente
    }

    const filtros = obtenerFiltrosRetroalimentacion(context.request)
    const { data, error } = await crearConsultaRetroalimentacion(
      cliente,
      'tipo, created_at, modulo, puntaje, estado_animo',
      filtros
    )

    if (error) {
      return manejarErrorRetroalimentacion(error)
    }

    const registros = (data ?? []) as unknown as RegistroPanelRetroalimentacion[]
    const actualizadoEn = new Date().toISOString()
    const totalesPorTipo: RespuestaResumenRetroalimentacion['totales_por_tipo'] = {
      estado_animo: 0,
      idea: 0,
      calificacion: 0
    }

    for (const registro of registros) {
      totalesPorTipo[registro.tipo] += 1
    }

    const distribucionEstadoAnimo = agruparPorClave(
      registros
        .map((registro) => registro.estado_animo)
        .filter((estado): estado is string => typeof estado === 'string' && estado.length > 0)
    ).map(({ clave, total }) => ({ estado_animo: clave, total }))

    const resumen: RespuestaResumenRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: actualizadoEn,
      filtros_aplicados: filtros,
      total_registros: registros.length,
      totales_por_tipo: totalesPorTipo,
      promedio_calificacion: calcularPromedioPuntajes(
        registros.map((registro) => ({ puntaje: registro.puntaje }))
      ),
      distribucion_estado_animo: distribucionEstadoAnimo,
      cantidad_ideas: totalesPorTipo.idea
    }

    const distribuciones: RespuestaDistribucionesRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: actualizadoEn,
      filtros_aplicados: filtros,
      por_tipo: agruparPorClave(registros.map((registro) => registro.tipo)).map(({ clave, total }) => ({
        tipo: clave,
        total
      })),
      por_modulo: agruparPorClave(registros.map((registro) => registro.modulo)).map(({ clave, total }) => ({
        modulo: clave,
        total
      })),
      puntajes: agruparPorClave(
        registros
          .map((registro) => registro.puntaje)
          .filter((puntaje): puntaje is number => typeof puntaje === 'number')
      ).map(({ clave, total }) => ({ puntaje: clave, total })),
      estados_animo: distribucionEstadoAnimo,
      serie_diaria: construirSerieDiaria(registros as unknown as RegistroRetroalimentacion[])
    }

    const respuesta: RespuestaPanelRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: actualizadoEn,
      filtros_aplicados: filtros,
      resumen,
      distribuciones
    }

    return responderExito(respuesta)
  } catch (error) {
    return manejarErrorRetroalimentacion(error)
  }
}