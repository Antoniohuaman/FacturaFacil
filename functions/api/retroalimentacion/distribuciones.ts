import {
  type EntornoRetroalimentacion,
  type RegistroRetroalimentacion,
  type RespuestaDistribucionesRetroalimentacion,
  agruparPorClave,
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

export const onRequestGet = async (context: ContextoRetroalimentacion): Promise<Response> => {
  try {
    const cliente = await obtenerClienteAutorizado(context.request, context.env)

    if (cliente instanceof Response) {
      return cliente
    }

    const filtros = obtenerFiltrosRetroalimentacion(context.request)
    const { data, error } = await crearConsultaRetroalimentacion(
      cliente,
      'tipo, created_at, modulo, puntaje, estado_animo, registro_uid, id, usuario_id, usuario_nombre, usuario_correo, empresa_id, empresa_ruc, empresa_razon_social, empresa_nombre, establecimiento_id, establecimiento_nombre, ruta, valor_principal, detalle',
      filtros
    ).order('created_at', { ascending: true })

    if (error) {
      return manejarErrorRetroalimentacion(error)
    }

    const registros = (data ?? []) as unknown as RegistroRetroalimentacion[]
    const porTipo = agruparPorClave(registros.map((registro) => registro.tipo)).map(({ clave, total }) => ({ tipo: clave, total }))
    const porModulo = agruparPorClave(registros.map((registro) => registro.modulo)).map(({ clave, total }) => ({ modulo: clave, total }))
    const puntajes = agruparPorClave(
      registros
        .map((registro) => registro.puntaje)
        .filter((puntaje): puntaje is number => typeof puntaje === 'number')
    ).map(({ clave, total }) => ({ puntaje: clave, total }))
    const estadosAnimo = agruparPorClave(
      registros
        .map((registro) => registro.estado_animo)
        .filter((estado): estado is string => typeof estado === 'string' && estado.length > 0)
    ).map(({ clave, total }) => ({ estado_animo: clave, total }))

    const respuesta: RespuestaDistribucionesRetroalimentacion = {
      fuente: 'supabase',
      actualizado_en: new Date().toISOString(),
      filtros_aplicados: filtros,
      por_tipo: porTipo,
      por_modulo: porModulo,
      puntajes,
      estados_animo: estadosAnimo,
      serie_diaria: construirSerieDiaria(registros)
    }

    return responderExito(respuesta)
  } catch (error) {
    return manejarErrorRetroalimentacion(error)
  }
}