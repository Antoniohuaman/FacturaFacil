import type { SupabaseClient } from '@supabase/supabase-js'
import { validarAutorizacion } from './_autorizacion'
import {
  agruparPorClave,
  calcularPromedioPuntajes,
  construirSerieDiaria,
  obtenerClienteSupabaseRetroalimentacion,
  type EntornoRetroalimentacion,
  type RegistroRetroalimentacion,
  type TipoRetroalimentacion
} from './_retroalimentacion'

const API_VERSION = 'v1'
const TAMANO_PAGINA_POR_DEFECTO = 20
const MAX_TAMANO_PAGINA_V1 = 100
const TIPOS_RETROALIMENTACION = ['estado_animo', 'idea', 'calificacion'] as const
const CAMPOS_ORDENABLES_V1 = [
  'created_at',
  'tipo',
  'empresa_nombre',
  'establecimiento_nombre',
  'modulo',
  'puntaje'
] as const
const DIRECCIONES_ORDEN = ['asc', 'desc'] as const

type CampoOrdenRetroalimentacionV1 = (typeof CAMPOS_ORDENABLES_V1)[number]
type DireccionOrdenV1 = (typeof DIRECCIONES_ORDEN)[number]
type ScopeProfileV1 = 'authenticated_sanitized' | 'authenticated_summary'
type CodigoErrorV1 =
  | 'operational_read_not_enabled'
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_scope'
  | 'invalid_filter'
  | 'invalid_pagination'
  | 'not_found'
  | 'rate_limited'
  | 'internal_error'
  | 'service_unavailable'

type DetallesErrorV1 = Record<string, string | number | boolean | null>

class ErrorApiV1 extends Error {
  code: CodigoErrorV1
  status: 400 | 401 | 403 | 404 | 429 | 500 | 501 | 503
  details?: DetallesErrorV1

  constructor(
    status: 400 | 401 | 403 | 404 | 429 | 500 | 501 | 503,
    code: CodigoErrorV1,
    message: string,
    details?: DetallesErrorV1
  ) {
    super(message)
    this.name = 'ErrorApiV1'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface RegistroRetroalimentacionV1 {
  registro_uid: string
  tipo: TipoRetroalimentacion
  created_at: string
  empresa_id: string
  empresa_nombre: string
  establecimiento_id: string | null
  establecimiento_nombre: string | null
  modulo: string
  valor_principal: string
  puntaje: number | null
  estado_animo: string | null
}

export interface FiltrosRetroalimentacionV1 {
  tipo: TipoRetroalimentacion | null
  empresa_id: string | null
  establecimiento_id: string | null
  modulo: string | null
  desde: string | null
  hasta: string | null
  usuario_id: string | null
  incluir_sensibles: boolean
}

export interface PaginacionRetroalimentacionV1 {
  pagina: number
  tamano: number
  ordenar_por: CampoOrdenRetroalimentacionV1
  direccion: DireccionOrdenV1
}

export interface MetaRespuestaV1 {
  api_version: 'v1'
  generated_at: string
  request_id: string
  scope_profile: ScopeProfileV1
}

export interface RespuestaListadoRetroalimentacionV1 {
  data: RegistroRetroalimentacionV1[]
  meta: MetaRespuestaV1
  filters: {
    tipo: TipoRetroalimentacion | null
    empresa_id: string | null
    establecimiento_id: string | null
    modulo: string | null
    desde: string | null
    hasta: string | null
    usuario_id: string | null
    incluir_sensibles: boolean
    ordenar_por: CampoOrdenRetroalimentacionV1
    direccion: DireccionOrdenV1
  }
  pagination: {
    pagina: number
    tamano: number
    total: number
    total_paginas: number
    ordenar_por: CampoOrdenRetroalimentacionV1
    direccion: DireccionOrdenV1
  }
}

export interface RespuestaDetalleRetroalimentacionV1 {
  data: RegistroRetroalimentacionV1
  meta: MetaRespuestaV1
}

export type RegistroRetroalimentacionResumenV1 = Pick<
  RegistroRetroalimentacion,
  'tipo' | 'created_at' | 'puntaje' | 'estado_animo'
>

export interface RespuestaResumenRetroalimentacionV1 {
  data: {
    total_registros: number
    totales_por_tipo: Record<TipoRetroalimentacion, number>
    promedio_calificacion: number | null
    distribucion_estado_animo: Array<{
      estado_animo: string
      total: number
    }>
    cantidad_ideas: number
    serie_diaria: Array<{
      fecha: string
      total: number
      estado_animo: number
      idea: number
      calificacion: number
    }>
  }
  meta: MetaRespuestaV1
  filters: {
    tipo: TipoRetroalimentacion | null
    empresa_id: string | null
    establecimiento_id: string | null
    modulo: string | null
    desde: string | null
    hasta: string | null
    usuario_id: string | null
    incluir_sensibles: boolean
  }
}

interface RespuestaErrorV1 {
  error: {
    code: CodigoErrorV1
    message: string
    details?: DetallesErrorV1
  }
  request_id: string
}

const PARAMETROS_LISTADO_V1 = new Set([
  'tipo',
  'empresa_id',
  'establecimiento_id',
  'modulo',
  'desde',
  'hasta',
  'usuario_id',
  'incluir_sensibles',
  'pagina',
  'tamano',
  'ordenar_por',
  'direccion'
])

const PARAMETROS_RESUMEN_V1 = new Set([
  'tipo',
  'empresa_id',
  'establecimiento_id',
  'modulo',
  'desde',
  'hasta',
  'usuario_id',
  'incluir_sensibles'
])

const PARAMETROS_DETALLE_V1 = new Set<string>()

function crearRequestId(request: Request): string {
  const requestId = request.headers.get('x-request-id')?.trim()
  return requestId || crypto.randomUUID()
}

function construirMetaV1(requestId: string, scopeProfile: ScopeProfileV1): MetaRespuestaV1 {
  return {
    api_version: API_VERSION,
    generated_at: new Date().toISOString(),
    request_id: requestId,
    scope_profile: scopeProfile
  }
}

function construirRespuestaJsonV1<T>(status: number, cuerpo: T, requestId: string) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-request-id': requestId
    }
  })
}

export function responderErrorV1(
  status: 400 | 401 | 403 | 404 | 429 | 500 | 501 | 503,
  code: CodigoErrorV1,
  message: string,
  requestId: string,
  details?: DetallesErrorV1
) {
  const body: RespuestaErrorV1 = {
    error: {
      code,
      message,
      ...(details ? { details } : {})
    },
    request_id: requestId
  }

  return construirRespuestaJsonV1(status, body, requestId)
}

export function responderExitoV1<T>(status: 200 | 201, body: T, requestId: string) {
  return construirRespuestaJsonV1(status, body, requestId)
}

function asegurarParametrosPermitidos(searchParams: URLSearchParams, parametrosPermitidos: Set<string>) {
  const parametrosInvalidos = [...new Set([...searchParams.keys()].filter((key) => !parametrosPermitidos.has(key)))]

  if (parametrosInvalidos.length > 0) {
    throw new ErrorApiV1(400, 'invalid_filter', 'La solicitud incluye parámetros no soportados.', {
      parametros: parametrosInvalidos.join(', ')
    })
  }
}

function leerTexto(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key)?.trim()
  return value ? value : null
}

function esFechaYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizarBooleano(value: string | null, key: string): boolean {
  if (value === null) {
    return false
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  throw new ErrorApiV1(400, 'invalid_filter', `El parámetro ${key} es inválido.`, {
    parametro: key
  })
}

function normalizarTipo(value: string | null): TipoRetroalimentacion | null {
  if (!value) {
    return null
  }

  if (TIPOS_RETROALIMENTACION.includes(value as TipoRetroalimentacion)) {
    return value as TipoRetroalimentacion
  }

  throw new ErrorApiV1(400, 'invalid_filter', 'El parámetro tipo no es válido.', {
    parametro: 'tipo'
  })
}

function normalizarCampoOrden(value: string | null): CampoOrdenRetroalimentacionV1 {
  if (!value) {
    return 'created_at'
  }

  if (CAMPOS_ORDENABLES_V1.includes(value as CampoOrdenRetroalimentacionV1)) {
    return value as CampoOrdenRetroalimentacionV1
  }

  throw new ErrorApiV1(400, 'invalid_pagination', 'El parámetro ordenar_por no es válido.', {
    parametro: 'ordenar_por'
  })
}

function normalizarDireccion(value: string | null): DireccionOrdenV1 {
  if (!value) {
    return 'desc'
  }

  if (DIRECCIONES_ORDEN.includes(value as DireccionOrdenV1)) {
    return value as DireccionOrdenV1
  }

  throw new ErrorApiV1(400, 'invalid_pagination', 'El parámetro direccion no es válido.', {
    parametro: 'direccion'
  })
}

function normalizarEntero(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number,
  code: 'invalid_filter' | 'invalid_pagination',
  key: string
): number {
  if (!value) {
    return defaultValue
  }

  const numberValue = Number(value)

  if (!Number.isInteger(numberValue) || numberValue < min || numberValue > max) {
    throw new ErrorApiV1(400, code, `El parámetro ${key} es inválido.`, {
      parametro: key
    })
  }

  return numberValue
}

function inicioDeDia(fecha: string): string {
  return `${fecha}T00:00:00.000Z`
}

function incluirFinDeDia(fecha: string): string {
  return `${fecha}T23:59:59.999Z`
}

function validarRestriccionesSensibles(filtros: Pick<FiltrosRetroalimentacionV1, 'usuario_id' | 'incluir_sensibles'>) {
  if (filtros.usuario_id) {
    throw new ErrorApiV1(
      403,
      'invalid_scope',
      'El filtro usuario_id requiere permisos adicionales de datos sensibles.',
      { parametro: 'usuario_id' }
    )
  }

  if (filtros.incluir_sensibles) {
    throw new ErrorApiV1(
      403,
      'invalid_scope',
      'La exposición de campos sensibles requiere permisos adicionales.',
      { parametro: 'incluir_sensibles' }
    )
  }
}

export function obtenerRequestIdV1(request: Request): string {
  return crearRequestId(request)
}

export async function validarAccesoBaseV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<Response | null> {
  const autorizacion = await validarAutorizacion(request, env)

  if (!autorizacion.autorizado) {
    if (autorizacion.status === 500) {
      return responderErrorV1(
        500,
        'internal_error',
        'No se pudo validar la autorización de la solicitud.',
        requestId
      )
    }

    return responderErrorV1(401, 'unauthorized', 'No autorizado.', requestId)
  }

  return null
}

export function obtenerBloqueoLecturaOperativaV1(requestId: string): Response | null {
  return responderErrorV1(
    501,
    'operational_read_not_enabled',
    'La superficie versionada de retroalimentación requiere integración de autorización por alcance y ámbito autorizado antes de habilitar la lectura operativa.',
    requestId,
    {
      surface: '/api/v1/retroalimentacion',
      pending_integration: 'authorization_scope_and_authorized_scope'
    }
  )
}

export function obtenerFiltrosRetroalimentacionV1(
  request: Request,
  parametrosPermitidos: Set<string>
): FiltrosRetroalimentacionV1 {
  const url = new URL(request.url)
  asegurarParametrosPermitidos(url.searchParams, parametrosPermitidos)

  const desde = leerTexto(url.searchParams, 'desde')
  const hasta = leerTexto(url.searchParams, 'hasta')

  if (desde && !esFechaYmd(desde)) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El parámetro desde debe tener formato YYYY-MM-DD.', {
      parametro: 'desde'
    })
  }

  if (hasta && !esFechaYmd(hasta)) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El parámetro hasta debe tener formato YYYY-MM-DD.', {
      parametro: 'hasta'
    })
  }

  if (desde && hasta && desde > hasta) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El rango de fechas es inválido.', {
      parametro: 'desde,hasta'
    })
  }

  const filtros: FiltrosRetroalimentacionV1 = {
    tipo: normalizarTipo(leerTexto(url.searchParams, 'tipo')),
    empresa_id: leerTexto(url.searchParams, 'empresa_id'),
    establecimiento_id: leerTexto(url.searchParams, 'establecimiento_id'),
    modulo: leerTexto(url.searchParams, 'modulo'),
    desde,
    hasta,
    usuario_id: leerTexto(url.searchParams, 'usuario_id'),
    incluir_sensibles: normalizarBooleano(leerTexto(url.searchParams, 'incluir_sensibles'), 'incluir_sensibles')
  }

  validarRestriccionesSensibles(filtros)

  return filtros
}

export function obtenerPaginacionRetroalimentacionV1(request: Request): PaginacionRetroalimentacionV1 {
  const url = new URL(request.url)

  return {
    pagina: normalizarEntero(leerTexto(url.searchParams, 'pagina'), 1, 1, 10_000, 'invalid_pagination', 'pagina'),
    tamano: normalizarEntero(
      leerTexto(url.searchParams, 'tamano'),
      TAMANO_PAGINA_POR_DEFECTO,
      1,
      MAX_TAMANO_PAGINA_V1,
      'invalid_pagination',
      'tamano'
    ),
    ordenar_por: normalizarCampoOrden(leerTexto(url.searchParams, 'ordenar_por')),
    direccion: normalizarDireccion(leerTexto(url.searchParams, 'direccion'))
  }
}

export function validarRegistroUidV1(registroUid: string | undefined): string {
  const normalizado = registroUid?.trim()

  if (!normalizado) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El identificador solicitado no es válido.', {
      parametro: 'registro_uid'
    })
  }

  const coincide = normalizado.match(/^(estado_animo|idea|calificacion):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)

  if (!coincide) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El identificador solicitado no es válido.', {
      parametro: 'registro_uid'
    })
  }

  return normalizado
}

export function obtenerClienteLecturaV1(
  env: EntornoRetroalimentacion,
  requestId: string
): SupabaseClient | Response {
  const cliente = obtenerClienteSupabaseRetroalimentacion(env)

  if (!cliente) {
    console.error('[retroalimentacion:v1] configuracion_supabase_faltante')
    return responderErrorV1(
      500,
      'internal_error',
      'No se pudo inicializar el servicio de retroalimentación.',
      requestId
    )
  }

  return cliente
}

export function crearConsultaRetroalimentacionV1(
  cliente: SupabaseClient,
  columnas: string,
  filtros: FiltrosRetroalimentacionV1,
  opciones?: {
    count?: 'exact'
    head?: boolean
  }
) {
  let consulta = cliente.from('v_retroalimentacion_unificada').select(columnas, opciones)

  if (filtros.tipo) {
    consulta = consulta.eq('tipo', filtros.tipo)
  }

  if (filtros.desde) {
    consulta = consulta.gte('created_at', inicioDeDia(filtros.desde))
  }

  if (filtros.hasta) {
    consulta = consulta.lte('created_at', incluirFinDeDia(filtros.hasta))
  }

  if (filtros.empresa_id) {
    consulta = consulta.eq('empresa_id', filtros.empresa_id)
  }

  if (filtros.establecimiento_id) {
    consulta = consulta.eq('establecimiento_id', filtros.establecimiento_id)
  }

  if (filtros.modulo) {
    consulta = consulta.eq('modulo', filtros.modulo)
  }

  return consulta
}

export function mapearRegistroRetroalimentacionV1(registro: RegistroRetroalimentacion): RegistroRetroalimentacionV1 {
  return {
    registro_uid: registro.registro_uid,
    tipo: registro.tipo,
    created_at: registro.created_at,
    empresa_id: registro.empresa_id,
    empresa_nombre: registro.empresa_nombre,
    establecimiento_id: registro.establecimiento_id,
    establecimiento_nombre: registro.establecimiento_nombre,
    modulo: registro.modulo,
    valor_principal: registro.valor_principal,
    puntaje: registro.puntaje,
    estado_animo: registro.estado_animo
  }
}

export function construirRespuestaListadoV1(
  registros: RegistroRetroalimentacion[],
  filtros: FiltrosRetroalimentacionV1,
  paginacion: PaginacionRetroalimentacionV1,
  total: number,
  requestId: string
): RespuestaListadoRetroalimentacionV1 {
  return {
    data: registros.map(mapearRegistroRetroalimentacionV1),
    meta: construirMetaV1(requestId, 'authenticated_sanitized'),
    filters: {
      tipo: filtros.tipo,
      empresa_id: filtros.empresa_id,
      establecimiento_id: filtros.establecimiento_id,
      modulo: filtros.modulo,
      desde: filtros.desde,
      hasta: filtros.hasta,
      usuario_id: filtros.usuario_id,
      incluir_sensibles: filtros.incluir_sensibles,
      ordenar_por: paginacion.ordenar_por,
      direccion: paginacion.direccion
    },
    pagination: {
      pagina: paginacion.pagina,
      tamano: paginacion.tamano,
      total,
      total_paginas: Math.max(1, Math.ceil(total / paginacion.tamano)),
      ordenar_por: paginacion.ordenar_por,
      direccion: paginacion.direccion
    }
  }
}

export function construirRespuestaDetalleV1(
  registro: RegistroRetroalimentacion,
  requestId: string
): RespuestaDetalleRetroalimentacionV1 {
  return {
    data: mapearRegistroRetroalimentacionV1(registro),
    meta: construirMetaV1(requestId, 'authenticated_sanitized')
  }
}

export function construirRespuestaResumenV1(
  registros: RegistroRetroalimentacionResumenV1[],
  filtros: FiltrosRetroalimentacionV1,
  requestId: string
): RespuestaResumenRetroalimentacionV1 {
  const totalesPorTipo: Record<TipoRetroalimentacion, number> = {
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

  return {
    data: {
      total_registros: registros.length,
      totales_por_tipo: totalesPorTipo,
      promedio_calificacion: calcularPromedioPuntajes(
        registros.map((registro) => ({ puntaje: registro.puntaje }))
      ),
      distribucion_estado_animo: distribucionEstadoAnimo,
      cantidad_ideas: totalesPorTipo.idea,
      serie_diaria: construirSerieDiaria(registros as RegistroRetroalimentacion[])
    },
    meta: construirMetaV1(requestId, 'authenticated_summary'),
    filters: {
      tipo: filtros.tipo,
      empresa_id: filtros.empresa_id,
      establecimiento_id: filtros.establecimiento_id,
      modulo: filtros.modulo,
      desde: filtros.desde,
      hasta: filtros.hasta,
      usuario_id: filtros.usuario_id,
      incluir_sensibles: filtros.incluir_sensibles
    }
  }
}

export function manejarErrorRetroalimentacionV1(error: unknown, requestId: string) {
  if (error instanceof ErrorApiV1) {
    return responderErrorV1(error.status, error.code, error.message, requestId, error.details)
  }

  console.error('[retroalimentacion:v1] error_no_controlado', error)
  return responderErrorV1(500, 'internal_error', 'No se pudo procesar la lectura de retroalimentación.', requestId)
}

export const PARAMS_LISTADO_RETROALIMENTACION_V1 = PARAMETROS_LISTADO_V1
export const PARAMS_RESUMEN_RETROALIMENTACION_V1 = PARAMETROS_RESUMEN_V1
export const PARAMS_DETALLE_RETROALIMENTACION_V1 = PARAMETROS_DETALLE_V1