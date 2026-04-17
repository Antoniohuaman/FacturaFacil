import {
  type EntornoRetroalimentacion,
  type RespuestaListadoRetroalimentacion,
  type RegistroRetroalimentacion,
  crearConsultaRetroalimentacion,
  manejarErrorRetroalimentacion,
  obtenerClienteAutorizado,
  obtenerFiltrosRetroalimentacion,
  obtenerPaginacionRetroalimentacion,
  responderExito
} from '../_retroalimentacion'

type ContextoRetroalimentacion = {
  env: EntornoRetroalimentacion
  request: Request
}

export const onRequestGet = async (context: ContextoRetroalimentacion): Promise<Response> => {
  try {
    const cliente = await obtenerClienteAutorizado(context.request, context.env)

    if (cliente instanceof Response) {
      return cliente
    }

    const filtros = obtenerFiltrosRetroalimentacion(context.request)
    const paginacion = obtenerPaginacionRetroalimentacion(context.request)
    const desde = (paginacion.pagina - 1) * paginacion.tamano
    const hasta = desde + paginacion.tamano - 1

    let consulta = crearConsultaRetroalimentacion(cliente, '*', filtros, { count: 'exact' })
      .order(paginacion.ordenar_por, { ascending: paginacion.direccion === 'asc' })
      .order('created_at', { ascending: false })
      .range(desde, hasta)

    const { data, error, count } = await consulta

    if (error) {
      return manejarErrorRetroalimentacion(error)
    }

    const total = count ?? 0
    const respuesta: RespuestaListadoRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: new Date().toISOString(),
      filtros_aplicados: filtros,
      paginacion: {
        pagina: paginacion.pagina,
        tamano: paginacion.tamano,
        total,
        total_paginas: Math.max(1, Math.ceil(total / paginacion.tamano)),
        ordenar_por: paginacion.ordenar_por,
        direccion: paginacion.direccion
      },
      items: (data ?? []) as unknown as RegistroRetroalimentacion[]
    }

    return responderExito(respuesta)
  } catch (error) {
    return manejarErrorRetroalimentacion(error)
  }
}