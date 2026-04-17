import {
  type EntornoRetroalimentacion,
  type RespuestaDetalleRetroalimentacion,
  type RegistroRetroalimentacion,
  manejarErrorRetroalimentacion,
  obtenerClienteAutorizado,
  responderError,
  responderExito,
  validarIdentificadorDetalle
} from '../../_retroalimentacion'

type ContextoRetroalimentacion = {
  env: EntornoRetroalimentacion
  request: Request
  params: {
    tipo?: string
    id?: string
  }
}

export const onRequestGet = async (context: ContextoRetroalimentacion): Promise<Response> => {
  try {
    const cliente = await obtenerClienteAutorizado(context.request, context.env)

    if (cliente instanceof Response) {
      return cliente
    }

    validarIdentificadorDetalle(context.params.tipo, context.params.id)

    const { data, error } = await cliente
      .from('v_retroalimentacion_unificada')
      .select('*')
      .eq('tipo', context.params.tipo)
      .eq('id', context.params.id)
      .maybeSingle()

    if (error) {
      return manejarErrorRetroalimentacion(error)
    }

    if (!data) {
      return responderError(404, 'retroalimentacion_no_encontrada', 'No se encontró el registro solicitado.')
    }

    const respuesta: RespuestaDetalleRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: new Date().toISOString(),
      item: data as RegistroRetroalimentacion
    }

    return responderExito(respuesta)
  } catch (error) {
    return manejarErrorRetroalimentacion(error)
  }
}