import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type ConsumidorAplicacionAutorizado,
  type ResultadoAutorizacionAplicacion,
  validarAutorizacionAplicacion
} from './_autorizacion'
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
const TIPOS_RETROALIMENTACION = ['estado_animo', 'idea', 'calificacion'] as const
const SCOPE_RESUMEN_RETROALIMENTACION_V1 = 'feedback:read:summary'
const SCOPE_PANEL_RETROALIMENTACION_V1 = 'feedback:read:panel'
const FEATURE_FLAG_PANEL_RETROALIMENTACION_V1 = 'FEEDBACK_API_V1_PANEL_ENABLED'
const PARAMETROS_AGREGADOS_V1 = ['tipo', 'empresa_id', 'establecimiento_id', 'modulo', 'desde', 'hasta'] as const

type ScopeProfileV1 = 'application_summary' | 'application_panel'
type CodigoErrorV1 =
  | 'operational_read_not_enabled'
  | 'unauthorized'
  | 'invalid_token'
  | 'forbidden'
  | 'insufficient_scope'
  | 'invalid_filter'
  | 'tenant_not_authorized'
  | 'tenant_scope_empty'
  | 'tenant_selection_required'
  | 'internal_error'
  | 'service_unavailable'

type DetallesErrorV1 = Record<string, string | number | boolean | null>

class ErrorApiV1 extends Error {
  code: CodigoErrorV1
  status: 400 | 401 | 403 | 500 | 501 | 503
  details?: DetallesErrorV1

  constructor(
    status: 400 | 401 | 403 | 500 | 501 | 503,
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

export interface FiltrosRetroalimentacionV1 {
  tipo: TipoRetroalimentacion | null
  empresa_id: string | null
  establecimiento_id: string | null
  modulo: string | null
  desde: string | null
  hasta: string | null
}

export interface MetaRespuestaV1 {
  api_version: 'v1'
  generated_at: string
  request_id: string
  scope_profile: ScopeProfileV1
}

interface MetaRespuestaPanelV1 extends MetaRespuestaV1 {
  source: 'supabase'
  scope_profile: 'application_panel'
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
  filters: FiltrosRetroalimentacionV1
}

export interface RespuestaPanelRetroalimentacionV1 {
  data: {
    resumen: {
      total_registros: number
      totales_por_tipo: Record<TipoRetroalimentacion, number>
      promedio_calificacion: number | null
      distribucion_estado_animo: Array<{
        estado_animo: string
        total: number
      }>
      cantidad_ideas: number
    }
    distribuciones: {
      por_tipo: Array<{
        tipo: TipoRetroalimentacion
        total: number
      }>
      estados_animo: Array<{
        estado_animo: string
        total: number
      }>
      puntajes: Array<{
        puntaje: number
        total: number
      }>
      serie_diaria: Array<{
        fecha: string
        total: number
        estado_animo: number
        idea: number
        calificacion: number
      }>
    }
  }
  meta: MetaRespuestaPanelV1
  filters: FiltrosRetroalimentacionV1
}

interface AlcanceEmpresaAgregadoV1 {
  empresaIdsConsulta: string[]
  empresaIdRespuesta: string | null
}

interface AgregadosResumenBaseV1 {
  totalRegistros: number
  totalesPorTipo: Record<TipoRetroalimentacion, number>
  promedioCalificacion: number | null
  distribucionEstadoAnimo: Array<{
    estado_animo: string
    total: number
  }>
  cantidadIdeas: number
  serieDiaria: Array<{
    fecha: string
    total: number
    estado_animo: number
    idea: number
    calificacion: number
  }>
}

interface RespuestaErrorV1 {
  error: {
    code: CodigoErrorV1
    message: string
    details?: DetallesErrorV1
  }
  request_id: string
}

const PARAMETROS_RESUMEN_V1 = new Set<string>(PARAMETROS_AGREGADOS_V1)
const PARAMETROS_PANEL_V1 = new Set<string>(PARAMETROS_AGREGADOS_V1)

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

function construirMetaPanelV1(requestId: string): MetaRespuestaPanelV1 {
  return {
    api_version: API_VERSION,
    generated_at: new Date().toISOString(),
    request_id: requestId,
    scope_profile: 'application_panel',
    source: 'supabase'
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
  status: 400 | 401 | 403 | 500 | 501 | 503,
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

function inicioDeDia(fecha: string): string {
  return `${fecha}T00:00:00.000Z`
}

function incluirFinDeDia(fecha: string): string {
  return `${fecha}T23:59:59.999Z`
}

function banderaEntornoActiva(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}

function responderErrorAutorizacionAplicacionV1(
  resultado: Exclude<ResultadoAutorizacionAplicacion, { autorizado: true }>,
  requestId: string
) {
  if (resultado.status === 503) {
    return responderErrorV1(503, 'service_unavailable', resultado.motivo, requestId)
  }

  if (resultado.status === 500) {
    return responderErrorV1(500, 'internal_error', resultado.motivo, requestId)
  }

  if (resultado.codigoError === 'token_invalido') {
    return responderErrorV1(401, 'invalid_token', resultado.motivo, requestId)
  }

  if (resultado.status === 403) {
    return responderErrorV1(403, 'forbidden', resultado.motivo, requestId)
  }

  return responderErrorV1(401, 'unauthorized', resultado.motivo, requestId)
}

export async function obtenerConsumidorAplicacionAutorizadoV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  const autorizacion = await validarAutorizacionAplicacion(request, env)

  if (!autorizacion.autorizado) {
    return responderErrorAutorizacionAplicacionV1(autorizacion, requestId)
  }

  return autorizacion.consumer
}

function validarScopeConsumidorV1(
  consumidor: ConsumidorAplicacionAutorizado,
  requestId: string,
  requiredScope: string,
  surfaceLabel: 'resumen' | 'panel'
): ConsumidorAplicacionAutorizado | Response {
  if (consumidor.scopes.includes(requiredScope)) {
    return consumidor
  }

  return responderErrorV1(
    403,
    'insufficient_scope',
    `El consumidor autenticado no tiene el alcance requerido para acceder al ${surfaceLabel} de retroalimentación.`,
    requestId,
    {
      required_scope: requiredScope
    }
  )
}

export function obtenerRequestIdV1(request: Request): string {
  return crearRequestId(request)
}

export async function autorizarResumenRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  const consumidor = await obtenerConsumidorAplicacionAutorizadoV1(request, env, requestId)

  if (consumidor instanceof Response) {
    return consumidor
  }

  return validarScopeConsumidorV1(consumidor, requestId, SCOPE_RESUMEN_RETROALIMENTACION_V1, 'resumen')
}

export async function autorizarPanelRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  const consumidor = await obtenerConsumidorAplicacionAutorizadoV1(request, env, requestId)

  if (consumidor instanceof Response) {
    return consumidor
  }

  return validarScopeConsumidorV1(consumidor, requestId, SCOPE_PANEL_RETROALIMENTACION_V1, 'panel')
}

export function validarHabilitacionPanelRetroalimentacionV1(
  env: EntornoRetroalimentacion,
  requestId: string
): Response | null {
  if (banderaEntornoActiva(env.FEEDBACK_API_V1_PANEL_ENABLED)) {
    return null
  }

  return responderErrorV1(
    501,
    'operational_read_not_enabled',
    'La ruta versionada solicitada permanece pendiente de habilitación operativa.',
    requestId,
    {
      surface: '/api/v1/retroalimentacion/panel',
      feature_flag: FEATURE_FLAG_PANEL_RETROALIMENTACION_V1
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

  return {
    tipo: normalizarTipo(leerTexto(url.searchParams, 'tipo')),
    empresa_id: leerTexto(url.searchParams, 'empresa_id'),
    establecimiento_id: leerTexto(url.searchParams, 'establecimiento_id'),
    modulo: leerTexto(url.searchParams, 'modulo'),
    desde,
    hasta
  }
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

export function resolverAlcanceEmpresaResumenV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado
): AlcanceEmpresaAgregadoV1 {
  return resolverAlcanceEmpresaAgregadoV1(filtros, consumidor.allowedEmpresaIds, consumidor.allowMultiTenantSummary)
}

export function resolverAlcanceEmpresaPanelV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado
): AlcanceEmpresaAgregadoV1 {
  return resolverAlcanceEmpresaAgregadoV1(filtros, consumidor.allowedEmpresaIds, consumidor.allowMultiTenantPanel)
}

function resolverAlcanceEmpresaAgregadoV1(
  filtros: FiltrosRetroalimentacionV1,
  allowedEmpresaIds: readonly string[],
  allowMultiTenant: boolean
): AlcanceEmpresaAgregadoV1 {
  const empresasAutorizadas = [...new Set(allowedEmpresaIds)]

  if (empresasAutorizadas.length === 0) {
    throw new ErrorApiV1(
      403,
      'tenant_scope_empty',
      'El consumidor autenticado no tiene empresas autorizadas configuradas.'
    )
  }

  if (filtros.empresa_id) {
    if (!empresasAutorizadas.includes(filtros.empresa_id)) {
      throw new ErrorApiV1(
        403,
        'tenant_not_authorized',
        'La empresa solicitada no pertenece al ámbito autorizado del consumidor.',
        { parametro: 'empresa_id' }
      )
    }

    return {
      empresaIdsConsulta: [filtros.empresa_id],
      empresaIdRespuesta: filtros.empresa_id
    }
  }

  if (empresasAutorizadas.length === 1) {
    return {
      empresaIdsConsulta: empresasAutorizadas,
      empresaIdRespuesta: empresasAutorizadas[0]
    }
  }

  if (allowMultiTenant) {
    return {
      empresaIdsConsulta: empresasAutorizadas,
      empresaIdRespuesta: null
    }
  }

  throw new ErrorApiV1(
    403,
    'tenant_selection_required',
    'La solicitud debe indicar una empresa autorizada para este consumidor.',
    { parametro: 'empresa_id' }
  )
}

export function aplicarAlcanceEmpresaAutorizadoV1<
  TConsulta extends {
    in(column: string, values: readonly string[]): TConsulta
  }
>(consulta: TConsulta, alcance: AlcanceEmpresaAgregadoV1): TConsulta {
  if (alcance.empresaIdsConsulta.length <= 1) {
    return consulta
  }

  return consulta.in('empresa_id', alcance.empresaIdsConsulta)
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

export function construirRespuestaResumenV1(
  registros: RegistroRetroalimentacionResumenV1[],
  filtros: FiltrosRetroalimentacionV1,
  requestId: string
): RespuestaResumenRetroalimentacionV1 {
  const agregados = construirAgregadosResumenBaseV1(registros)

  return {
    data: {
      total_registros: agregados.totalRegistros,
      totales_por_tipo: agregados.totalesPorTipo,
      promedio_calificacion: agregados.promedioCalificacion,
      distribucion_estado_animo: agregados.distribucionEstadoAnimo,
      cantidad_ideas: agregados.cantidadIdeas,
      serie_diaria: agregados.serieDiaria
    },
    meta: construirMetaV1(requestId, 'application_summary'),
    filters: {
      tipo: filtros.tipo,
      empresa_id: filtros.empresa_id,
      establecimiento_id: filtros.establecimiento_id,
      modulo: filtros.modulo,
      desde: filtros.desde,
      hasta: filtros.hasta
    }
  }
}

export function construirRespuestaPanelV1(
  registros: RegistroRetroalimentacionResumenV1[],
  filtros: FiltrosRetroalimentacionV1,
  requestId: string
): RespuestaPanelRetroalimentacionV1 {
  const agregados = construirAgregadosResumenBaseV1(registros)

  return {
    data: {
      resumen: {
        total_registros: agregados.totalRegistros,
        totales_por_tipo: agregados.totalesPorTipo,
        promedio_calificacion: agregados.promedioCalificacion,
        distribucion_estado_animo: agregados.distribucionEstadoAnimo,
        cantidad_ideas: agregados.cantidadIdeas
      },
      distribuciones: {
        por_tipo: agruparPorClave(registros.map((registro) => registro.tipo)).map(({ clave, total }) => ({
          tipo: clave,
          total
        })),
        estados_animo: agregados.distribucionEstadoAnimo,
        puntajes: agruparPorClave(
          registros
            .map((registro) => registro.puntaje)
            .filter((puntaje): puntaje is number => typeof puntaje === 'number')
        ).map(({ clave, total }) => ({ puntaje: clave, total })),
        serie_diaria: agregados.serieDiaria
      }
    },
    meta: construirMetaPanelV1(requestId),
    filters: {
      tipo: filtros.tipo,
      empresa_id: filtros.empresa_id,
      establecimiento_id: filtros.establecimiento_id,
      modulo: filtros.modulo,
      desde: filtros.desde,
      hasta: filtros.hasta
    }
  }
}

function construirAgregadosResumenBaseV1(registros: RegistroRetroalimentacionResumenV1[]): AgregadosResumenBaseV1 {
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
    totalRegistros: registros.length,
    totalesPorTipo,
    promedioCalificacion: calcularPromedioPuntajes(
      registros.map((registro) => ({ puntaje: registro.puntaje }))
    ),
    distribucionEstadoAnimo,
    cantidadIdeas: totalesPorTipo.idea,
    serieDiaria: construirSerieDiaria(registros as RegistroRetroalimentacion[])
  }
}

export function manejarErrorRetroalimentacionV1(error: unknown, requestId: string) {
  if (error instanceof ErrorApiV1) {
    return responderErrorV1(error.status, error.code, error.message, requestId, error.details)
  }

  console.error('[retroalimentacion:v1] error_no_controlado', error)
  return responderErrorV1(500, 'internal_error', 'No se pudo procesar la lectura de retroalimentación.', requestId)
}

export const PARAMS_RESUMEN_RETROALIMENTACION_V1 = PARAMETROS_RESUMEN_V1
export const PARAMS_PANEL_RETROALIMENTACION_V1 = PARAMETROS_PANEL_V1