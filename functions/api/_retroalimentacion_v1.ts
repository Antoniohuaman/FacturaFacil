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
const FEATURE_FLAG_PANEL_RETROALIMENTACION_V1 = 'FEEDBACK_API_V1_PANEL_ENABLED'
const TIPOS_RETROALIMENTACION = ['estado_animo', 'idea', 'calificacion'] as const
const CAMPOS_ORDENABLES_V1 = ['created_at', 'tipo', 'empresa_nombre', 'modulo', 'puntaje', 'estado_animo'] as const
const DIRECCIONES_ORDEN_V1 = ['asc', 'desc'] as const
const MAX_TAMANO_PAGINA_V1 = 100
const TAMANO_PAGINA_POR_DEFECTO_V1 = 20
const VISTA_RETROALIMENTACION_V1 = 'v_retroalimentacion_unificada'

export const SCOPE_RESUMEN_RETROALIMENTACION_V1 = 'feedback:read:summary'
export const SCOPE_PANEL_RETROALIMENTACION_V1 = 'feedback:read:panel'
export const SCOPE_REGISTROS_RETROALIMENTACION_V1 = 'feedback:read:records'
export const SCOPE_DETALLE_RETROALIMENTACION_V1 = 'feedback:read:record-detail'
export const SCOPE_SENSIBLES_RETROALIMENTACION_V1 = 'feedback:read:sensitive'
export const SCOPE_FILTRO_USUARIO_RETROALIMENTACION_V1 = 'feedback:filter:user'

type ScopeProfileV1 =
  | 'application_summary'
  | 'application_panel'
  | 'application_records'
  | 'application_record_detail'

type CampoOrdenRetroalimentacionV1 = (typeof CAMPOS_ORDENABLES_V1)[number]
type DireccionOrdenV1 = (typeof DIRECCIONES_ORDEN_V1)[number]

type CodigoErrorV1 =
  | 'unauthorized'
  | 'invalid_token'
  | 'forbidden'
  | 'insufficient_scope'
  | 'invalid_filter'
  | 'invalid_pagination'
  | 'tenant_not_authorized'
  | 'tenant_scope_empty'
  | 'tenant_selection_required'
  | 'not_found'
  | 'operational_read_not_enabled'
  | 'service_unavailable'
  | 'internal_error'

type ResultadoAutorizacionAplicacionFallida = Exclude<ResultadoAutorizacionAplicacion, { autorizado: true }>

type RegistroRetroalimentacionConsultaV1 = Pick<
  RegistroRetroalimentacion,
  'registro_uid' | 'tipo' | 'created_at' | 'empresa_id' | 'establecimiento_id' | 'modulo' | 'puntaje' | 'estado_animo'
> &
  Partial<
    Pick<
      RegistroRetroalimentacion,
      | 'usuario_id'
      | 'usuario_nombre'
      | 'usuario_correo'
      | 'empresa_ruc'
      | 'empresa_razon_social'
      | 'empresa_nombre'
      | 'establecimiento_nombre'
      | 'ruta'
      | 'valor_principal'
      | 'detalle'
    >
  >

type RegistroRetroalimentacionAgregadoV1 = Pick<
  RegistroRetroalimentacion,
  'tipo' | 'created_at' | 'modulo' | 'puntaje' | 'estado_animo'
>

class ErrorApiV1 extends Error {
  status: 400 | 401 | 403 | 404 | 500 | 501 | 503
  code: CodigoErrorV1
  details?: Record<string, unknown>

  constructor(
    status: 400 | 401 | 403 | 404 | 500 | 501 | 503,
    code: CodigoErrorV1,
    message: string,
    details?: Record<string, unknown>
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
  puntaje: number | null
  estado_animo: string | null
  usuario_id: string | null
  incluir_sensibles: boolean
}

export interface MetaRespuestaV1 {
  api_version: 'v1'
  generated_at: string
  request_id: string
  scope_profile: ScopeProfileV1
}

export interface PaginacionRetroalimentacionV1 {
  pagina: number
  tamano: number
  ordenar_por: CampoOrdenRetroalimentacionV1
  direccion: DireccionOrdenV1
}

export interface RegistroRetroalimentacionV1 {
  registro_uid: string
  tipo: TipoRetroalimentacion
  created_at: string
  empresa_id: string
  establecimiento_id: string | null
  modulo: string
  puntaje: number | null
  estado_animo: string | null
  usuario_id?: string
  usuario_nombre?: string
  usuario_correo?: string | null
  empresa_ruc?: string | null
  empresa_razon_social?: string | null
  empresa_nombre?: string
  establecimiento_nombre?: string | null
  ruta?: string
  valor_principal?: string
  detalle?: string | null
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
      por_modulo: Array<{
        modulo: string
        total: number
      }>
      puntajes: Array<{
        puntaje: number
        total: number
      }>
      estados_animo: Array<{
        estado_animo: string
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
  meta: MetaRespuestaV1
  filters: FiltrosRetroalimentacionV1
}

export interface RespuestaListadoRetroalimentacionV1 {
  data: RegistroRetroalimentacionV1[]
  meta: MetaRespuestaV1
  filters: FiltrosRetroalimentacionV1
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
  filters: FiltrosRetroalimentacionV1
}

export interface AlcanceEmpresaConsultaV1 {
  empresaIdsConsulta: string[]
  empresaIdRespuesta: string | null
}

export interface AlcanceEmpresaUnidadV1 {
  empresaIdConsulta: string | null
  empresaIdRespuesta: string | null
}

const PARAMETROS_AGREGADOS_V1 = new Set([
  'tipo',
  'empresa_id',
  'establecimiento_id',
  'modulo',
  'desde',
  'hasta',
  'puntaje',
  'estado_animo',
  'usuario_id'
])

const PARAMETROS_REGISTROS_V1 = new Set([
  ...PARAMETROS_AGREGADOS_V1,
  'incluir_sensibles',
  'pagina',
  'tamano',
  'ordenar_por',
  'direccion'
])

const PARAMETROS_DETALLE_V1 = new Set(['empresa_id', 'incluir_sensibles'])

const COLUMNAS_RESUMEN_RETROALIMENTACION_V1 = 'tipo, created_at, puntaje, estado_animo'
const COLUMNAS_PANEL_RETROALIMENTACION_V1 = 'tipo, created_at, modulo, puntaje, estado_animo'
const COLUMNAS_REGISTROS_BASE_RETROALIMENTACION_V1 =
  'registro_uid, tipo, created_at, empresa_id, establecimiento_id, modulo, puntaje, estado_animo'
const COLUMNAS_REGISTROS_SENSIBLES_RETROALIMENTACION_V1 = `${COLUMNAS_REGISTROS_BASE_RETROALIMENTACION_V1}, usuario_id, usuario_nombre, usuario_correo, empresa_ruc, empresa_razon_social, empresa_nombre, establecimiento_nombre, ruta, valor_principal, detalle`

function construirRespuestaJson(status: number, body: unknown, cache = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache
    }
  })
}

function construirMetaV1(requestId: string, scopeProfile: ScopeProfileV1): MetaRespuestaV1 {
  return {
    api_version: API_VERSION,
    generated_at: new Date().toISOString(),
    request_id: requestId,
    scope_profile: scopeProfile
  }
}

function leerTexto(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim()
  return value ? value : null
}

function normalizarTextoNoVacio(value: string | null): string | null {
  if (!value) {
    return null
  }

  const normalizado = value.trim()
  return normalizado.length > 0 ? normalizado : null
}

function esFechaIsoCorta(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const fecha = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === value
}

function esUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function inicioDeDia(value: string): string {
  return `${value}T00:00:00.000Z`
}

function incluirFinDeDia(value: string): string {
  return `${value}T23:59:59.999Z`
}

function consumidorTieneScope(consumidor: ConsumidorAplicacionAutorizado, scope: string): boolean {
  return consumidor.scopes.includes(scope)
}

function normalizarTipo(value: string | null): TipoRetroalimentacion | null {
  if (!value) {
    return null
  }

  if ((TIPOS_RETROALIMENTACION as readonly string[]).includes(value)) {
    return value as TipoRetroalimentacion
  }

  throw new ErrorApiV1(400, 'invalid_filter', 'El parametro tipo no es valido.', { parametro: 'tipo' })
}

function normalizarBooleanoQuery(value: string | null, defaultValue = false): boolean {
  if (value === null) {
    return defaultValue
  }

  const normalizado = value.trim().toLowerCase()

  if (normalizado === 'true' || normalizado === '1') {
    return true
  }

  if (normalizado === 'false' || normalizado === '0') {
    return false
  }

  throw new ErrorApiV1(400, 'invalid_filter', 'El parametro incluir_sensibles no es valido.', {
    parametro: 'incluir_sensibles'
  })
}

function normalizarPuntaje(value: string | null): number | null {
  if (!value) {
    return null
  }

  const puntaje = Number(value)

  if (!Number.isFinite(puntaje)) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El parametro puntaje no es valido.', { parametro: 'puntaje' })
  }

  return puntaje
}

function normalizarCampoOrden(value: string | null): CampoOrdenRetroalimentacionV1 {
  if (!value) {
    return 'created_at'
  }

  if ((CAMPOS_ORDENABLES_V1 as readonly string[]).includes(value)) {
    return value as CampoOrdenRetroalimentacionV1
  }

  throw new ErrorApiV1(400, 'invalid_pagination', 'El parametro ordenar_por no es valido.', {
    parametro: 'ordenar_por'
  })
}

function normalizarDireccion(value: string | null): DireccionOrdenV1 {
  if (!value) {
    return 'desc'
  }

  if ((DIRECCIONES_ORDEN_V1 as readonly string[]).includes(value)) {
    return value as DireccionOrdenV1
  }

  throw new ErrorApiV1(400, 'invalid_pagination', 'El parametro direccion no es valido.', {
    parametro: 'direccion'
  })
}

function normalizarEntero(
  value: string | null,
  defaultValue: number,
  minimo: number,
  maximo: number,
  parametro: 'pagina' | 'tamano'
): number {
  if (!value) {
    return defaultValue
  }

  if (!/^\d+$/.test(value)) {
    throw new ErrorApiV1(400, 'invalid_pagination', `El parametro ${parametro} no es valido.`, { parametro })
  }

  const numero = Number(value)

  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new ErrorApiV1(400, 'invalid_pagination', `El parametro ${parametro} no es valido.`, { parametro })
  }

  return numero
}

function responderErrorAutorizacionAplicacion(
  autorizacion: ResultadoAutorizacionAplicacionFallida,
  requestId: string
) {
  const codigo: CodigoErrorV1 = (() => {
    switch (autorizacion.codigoError) {
      case 'no_autorizado':
        return 'unauthorized'
      case 'token_invalido':
        return 'invalid_token'
      case 'consumer_inactivo':
        return 'forbidden'
      case 'configuracion_auth_aplicacion':
        return 'service_unavailable'
      default:
        return 'internal_error'
    }
  })()

  return responderErrorV1(autorizacion.status, codigo, autorizacion.motivo, requestId)
}

function asegurarParametrosPermitidos(request: Request, allowedParams: ReadonlySet<string>) {
  const url = new URL(request.url)

  for (const parametro of new Set(url.searchParams.keys())) {
    if (!allowedParams.has(parametro)) {
      throw new ErrorApiV1(400, 'invalid_filter', `El parametro ${parametro} no esta permitido en esta ruta.`, {
        parametro
      })
    }
  }

  return url
}

function normalizarEmpresasAutorizadas(consumidor: ConsumidorAplicacionAutorizado): string[] {
  return [...new Set(consumidor.allowedEmpresaIds.map((item) => item.trim()).filter((item) => item.length > 0))]
}

function consumidorTieneAccesoGlobal(consumidor: ConsumidorAplicacionAutorizado): boolean {
  return consumidor.tenantAccess === 'all'
}

function resolverAlcanceEmpresaAgregadoV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado,
  allowMultiTenant: boolean
): AlcanceEmpresaConsultaV1 {
  if (consumidorTieneAccesoGlobal(consumidor)) {
    if (filtros.empresa_id) {
      return {
        empresaIdsConsulta: [filtros.empresa_id],
        empresaIdRespuesta: filtros.empresa_id
      }
    }

    return {
      empresaIdsConsulta: [],
      empresaIdRespuesta: null
    }
  }

  const empresasAutorizadas = normalizarEmpresasAutorizadas(consumidor)

  if (empresasAutorizadas.length === 0) {
    throw new ErrorApiV1(403, 'tenant_scope_empty', 'El consumidor no tiene empresas autorizadas para esta API.')
  }

  if (filtros.empresa_id) {
    if (!empresasAutorizadas.includes(filtros.empresa_id)) {
      throw new ErrorApiV1(
        403,
        'tenant_not_authorized',
        'La empresa solicitada no esta autorizada para este consumidor.',
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

function construirTotalesPorTipo(registros: Array<Pick<RegistroRetroalimentacion, 'tipo'>>): Record<TipoRetroalimentacion, number> {
  const totalesPorTipo: Record<TipoRetroalimentacion, number> = {
    estado_animo: 0,
    idea: 0,
    calificacion: 0
  }

  for (const registro of registros) {
    totalesPorTipo[registro.tipo] += 1
  }

  return totalesPorTipo
}

function construirDistribucionEstadoAnimo(registros: Array<Pick<RegistroRetroalimentacion, 'estado_animo'>>) {
  return agruparPorClave(
    registros
      .map((registro) => registro.estado_animo)
      .filter((estado): estado is string => typeof estado === 'string' && estado.length > 0)
  )
    .map(({ clave, total }) => ({ estado_animo: clave, total }))
    .sort((a, b) => b.total - a.total || a.estado_animo.localeCompare(b.estado_animo))
}

function mapearRegistroRetroalimentacionV1(
  registro: RegistroRetroalimentacionConsultaV1,
  incluirSensibles: boolean
): RegistroRetroalimentacionV1 {
  const base: RegistroRetroalimentacionV1 = {
    registro_uid: registro.registro_uid,
    tipo: registro.tipo,
    created_at: registro.created_at,
    empresa_id: registro.empresa_id,
    establecimiento_id: registro.establecimiento_id,
    modulo: registro.modulo,
    puntaje: registro.puntaje,
    estado_animo: registro.estado_animo
  }

  if (!incluirSensibles) {
    return base
  }

  return {
    ...base,
    ...(registro.usuario_id !== undefined ? { usuario_id: registro.usuario_id } : {}),
    ...(registro.usuario_nombre !== undefined ? { usuario_nombre: registro.usuario_nombre } : {}),
    ...(registro.usuario_correo !== undefined ? { usuario_correo: registro.usuario_correo } : {}),
    ...(registro.empresa_ruc !== undefined ? { empresa_ruc: registro.empresa_ruc } : {}),
    ...(registro.empresa_razon_social !== undefined ? { empresa_razon_social: registro.empresa_razon_social } : {}),
    ...(registro.empresa_nombre !== undefined ? { empresa_nombre: registro.empresa_nombre } : {}),
    ...(registro.establecimiento_nombre !== undefined
      ? { establecimiento_nombre: registro.establecimiento_nombre }
      : {}),
    ...(registro.ruta !== undefined ? { ruta: registro.ruta } : {}),
    ...(registro.valor_principal !== undefined ? { valor_principal: registro.valor_principal } : {}),
    ...(registro.detalle !== undefined ? { detalle: registro.detalle } : {})
  }
}

async function autorizarRutaRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string,
  requiredScope: string,
  insufficientScopeMessage: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  const autorizacion = await validarAutorizacionAplicacion(request, env)

  if (!autorizacion.autorizado) {
    return responderErrorAutorizacionAplicacion(autorizacion, requestId)
  }

  if (!consumidorTieneScope(autorizacion.consumer, requiredScope)) {
    return responderErrorV1(403, 'insufficient_scope', insufficientScopeMessage, requestId, {
      required_scope: requiredScope
    })
  }

  return autorizacion.consumer
}

export function responderErrorV1(
  status: 400 | 401 | 403 | 404 | 500 | 501 | 503,
  code: CodigoErrorV1,
  message: string,
  requestId: string,
  details?: Record<string, unknown>
) {
  return construirRespuestaJson(status, {
    error: {
      code,
      message,
      request_id: requestId,
      ...(details ? { details } : {})
    }
  })
}

export function responderExitoV1<T>(body: T, cache: 'no-store' | 'public, max-age=60' = 'no-store') {
  return construirRespuestaJson(200, body, cache)
}

export function obtenerRequestIdV1(request: Request): string {
  return request.headers.get('x-request-id') || request.headers.get('cf-ray') || crypto.randomUUID()
}

export async function autorizarResumenRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  return autorizarRutaRetroalimentacionV1(
    request,
    env,
    requestId,
    SCOPE_RESUMEN_RETROALIMENTACION_V1,
    'El consumidor no cuenta con alcance para leer el resumen de retroalimentacion.'
  )
}

export async function autorizarPanelRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  return autorizarRutaRetroalimentacionV1(
    request,
    env,
    requestId,
    SCOPE_PANEL_RETROALIMENTACION_V1,
    'El consumidor no cuenta con alcance para leer el panel de retroalimentacion.'
  )
}

export async function autorizarRegistrosRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  return autorizarRutaRetroalimentacionV1(
    request,
    env,
    requestId,
    SCOPE_REGISTROS_RETROALIMENTACION_V1,
    'El consumidor no cuenta con alcance para listar registros de retroalimentacion.'
  )
}

export async function autorizarDetalleRetroalimentacionV1(
  request: Request,
  env: EntornoRetroalimentacion,
  requestId: string
): Promise<ConsumidorAplicacionAutorizado | Response> {
  return autorizarRutaRetroalimentacionV1(
    request,
    env,
    requestId,
    SCOPE_DETALLE_RETROALIMENTACION_V1,
    'El consumidor no cuenta con alcance para leer el detalle de retroalimentacion.'
  )
}

export function obtenerFiltrosRetroalimentacionV1(
  request: Request,
  allowedParams: ReadonlySet<string> = PARAMETROS_AGREGADOS_V1
): FiltrosRetroalimentacionV1 {
  const url = asegurarParametrosPermitidos(request, allowedParams)
  const desde = leerTexto(url.searchParams, 'desde')
  const hasta = leerTexto(url.searchParams, 'hasta')

  if (desde && !esFechaIsoCorta(desde)) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El parametro desde debe usar formato YYYY-MM-DD.', {
      parametro: 'desde'
    })
  }

  if (hasta && !esFechaIsoCorta(hasta)) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El parametro hasta debe usar formato YYYY-MM-DD.', {
      parametro: 'hasta'
    })
  }

  if (desde && hasta && desde > hasta) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El rango de fechas es invalido.', {
      parametro: 'desde,hasta'
    })
  }

  return {
    tipo: normalizarTipo(leerTexto(url.searchParams, 'tipo')),
    empresa_id: normalizarTextoNoVacio(leerTexto(url.searchParams, 'empresa_id')),
    establecimiento_id: normalizarTextoNoVacio(leerTexto(url.searchParams, 'establecimiento_id')),
    modulo: normalizarTextoNoVacio(leerTexto(url.searchParams, 'modulo')),
    desde,
    hasta,
    puntaje: normalizarPuntaje(leerTexto(url.searchParams, 'puntaje')),
    estado_animo: normalizarTextoNoVacio(leerTexto(url.searchParams, 'estado_animo')),
    usuario_id: normalizarTextoNoVacio(leerTexto(url.searchParams, 'usuario_id')),
    incluir_sensibles: normalizarBooleanoQuery(leerTexto(url.searchParams, 'incluir_sensibles'))
  }
}

export function obtenerPaginacionRetroalimentacionV1(request: Request): PaginacionRetroalimentacionV1 {
  const url = new URL(request.url)

  return {
    pagina: normalizarEntero(leerTexto(url.searchParams, 'pagina'), 1, 1, 10_000, 'pagina'),
    tamano: normalizarEntero(
      leerTexto(url.searchParams, 'tamano'),
      TAMANO_PAGINA_POR_DEFECTO_V1,
      1,
      MAX_TAMANO_PAGINA_V1,
      'tamano'
    ),
    ordenar_por: normalizarCampoOrden(leerTexto(url.searchParams, 'ordenar_por')),
    direccion: normalizarDireccion(leerTexto(url.searchParams, 'direccion'))
  }
}

export function validarPermisosFiltrosRetroalimentacionV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado,
  opciones: {
    permiteSensibles: boolean
    permiteFiltroUsuario: boolean
  }
) {
  if (filtros.incluir_sensibles && !opciones.permiteSensibles) {
    throw new ErrorApiV1(
      400,
      'invalid_filter',
      'El parametro incluir_sensibles no esta permitido en esta ruta.',
      { parametro: 'incluir_sensibles' }
    )
  }

  if (filtros.incluir_sensibles && !consumidorTieneScope(consumidor, SCOPE_SENSIBLES_RETROALIMENTACION_V1)) {
    throw new ErrorApiV1(
      403,
      'insufficient_scope',
      'El consumidor no cuenta con alcance para incluir campos sensibles.',
      {
        required_scope: SCOPE_SENSIBLES_RETROALIMENTACION_V1,
        parametro: 'incluir_sensibles'
      }
    )
  }

  if (filtros.usuario_id && !opciones.permiteFiltroUsuario) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El parametro usuario_id no esta permitido en esta ruta.', {
      parametro: 'usuario_id'
    })
  }

  if (filtros.usuario_id && !consumidorTieneScope(consumidor, SCOPE_FILTRO_USUARIO_RETROALIMENTACION_V1)) {
    throw new ErrorApiV1(
      403,
      'insufficient_scope',
      'El consumidor no cuenta con alcance para filtrar por usuario.',
      {
        required_scope: SCOPE_FILTRO_USUARIO_RETROALIMENTACION_V1,
        parametro: 'usuario_id'
      }
    )
  }
}

export function obtenerClienteLecturaV1(env: EntornoRetroalimentacion): SupabaseClient {
  const cliente = obtenerClienteSupabaseRetroalimentacion(env)

  if (!cliente) {
    throw new ErrorApiV1(
      503,
      'service_unavailable',
      'La lectura de retroalimentacion no esta disponible en este entorno.'
    )
  }

  return cliente
}

export function validarHabilitacionPanelRetroalimentacionV1(
  env: EntornoRetroalimentacion,
  requestId: string
): Response | null {
  const habilitado = env.FEEDBACK_API_V1_PANEL_ENABLED?.trim().toLowerCase() === 'true'

  if (habilitado) {
    return null
  }

  return responderErrorV1(
    501,
    'operational_read_not_enabled',
    'La lectura operativa del panel oficial no se encuentra habilitada.',
    requestId,
    {
      feature_flag: FEATURE_FLAG_PANEL_RETROALIMENTACION_V1,
      route: '/api/v1/retroalimentacion/panel'
    }
  )
}

export function resolverAlcanceEmpresaResumenV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado
): AlcanceEmpresaConsultaV1 {
  return resolverAlcanceEmpresaAgregadoV1(filtros, consumidor, consumidor.allowMultiTenantSummary)
}

export function resolverAlcanceEmpresaPanelV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado
): AlcanceEmpresaConsultaV1 {
  return resolverAlcanceEmpresaAgregadoV1(filtros, consumidor, consumidor.allowMultiTenantPanel)
}

export function resolverAlcanceEmpresaRegistrosV1(
  filtros: FiltrosRetroalimentacionV1,
  consumidor: ConsumidorAplicacionAutorizado
): AlcanceEmpresaUnidadV1 {
  if (consumidorTieneAccesoGlobal(consumidor)) {
    return {
      empresaIdConsulta: filtros.empresa_id,
      empresaIdRespuesta: filtros.empresa_id
    }
  }

  const empresasAutorizadas = normalizarEmpresasAutorizadas(consumidor)

  if (empresasAutorizadas.length === 0) {
    throw new ErrorApiV1(403, 'tenant_scope_empty', 'El consumidor no tiene empresas autorizadas para esta API.')
  }

  if (filtros.empresa_id) {
    if (!empresasAutorizadas.includes(filtros.empresa_id)) {
      throw new ErrorApiV1(
        403,
        'tenant_not_authorized',
        'La empresa solicitada no esta autorizada para este consumidor.',
        { parametro: 'empresa_id' }
      )
    }

    return {
      empresaIdConsulta: filtros.empresa_id,
      empresaIdRespuesta: filtros.empresa_id
    }
  }

  if (empresasAutorizadas.length === 1) {
    return {
      empresaIdConsulta: empresasAutorizadas[0],
      empresaIdRespuesta: empresasAutorizadas[0]
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
    eq(column: string, value: string): TConsulta
    in(column: string, values: readonly string[]): TConsulta
  }
>(consulta: TConsulta, alcance: AlcanceEmpresaConsultaV1): TConsulta {
  if (alcance.empresaIdsConsulta.length === 0) {
    return consulta
  }

  if (alcance.empresaIdsConsulta.length === 1) {
    return consulta.eq('empresa_id', alcance.empresaIdsConsulta[0])
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
  let consulta = cliente.from(VISTA_RETROALIMENTACION_V1).select(columnas, opciones)

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

  if (filtros.puntaje !== null) {
    consulta = consulta.eq('puntaje', filtros.puntaje)
  }

  if (filtros.estado_animo) {
    consulta = consulta.eq('estado_animo', filtros.estado_animo)
  }

  if (filtros.usuario_id) {
    consulta = consulta.eq('usuario_id', filtros.usuario_id)
  }

  return consulta
}

export function aplicarPaginacionRetroalimentacionV1<
  TConsulta extends {
    order(column: string, options?: { ascending?: boolean }): TConsulta
    range(from: number, to: number): TConsulta
  }
>(consulta: TConsulta, paginacion: PaginacionRetroalimentacionV1): TConsulta {
  const ascendente = paginacion.direccion === 'asc'
  const desde = (paginacion.pagina - 1) * paginacion.tamano
  const hasta = desde + paginacion.tamano - 1

  let consultaPaginada = consulta.order(paginacion.ordenar_por, { ascending: ascendente })

  if (paginacion.ordenar_por !== 'created_at') {
    consultaPaginada = consultaPaginada.order('created_at', { ascending: false })
  }

  return consultaPaginada.order('registro_uid', { ascending: true }).range(desde, hasta)
}

export function obtenerColumnasRegistrosRetroalimentacionV1(incluirSensibles: boolean): string {
  return incluirSensibles
    ? COLUMNAS_REGISTROS_SENSIBLES_RETROALIMENTACION_V1
    : COLUMNAS_REGISTROS_BASE_RETROALIMENTACION_V1
}

export function validarRegistroUidRetroalimentacionV1(registroUid: string | undefined): string {
  const normalizado = normalizarTextoNoVacio(registroUid ?? null)

  if (!normalizado) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El registro_uid solicitado no es valido.', {
      parametro: 'registro_uid'
    })
  }

  const partes = normalizado.split(':')

  if (partes.length !== 2 || !esUuid(partes[1])) {
    throw new ErrorApiV1(400, 'invalid_filter', 'El registro_uid solicitado no es valido.', {
      parametro: 'registro_uid'
    })
  }

  normalizarTipo(partes[0])
  return normalizado
}

export function construirFiltrosRespuestaV1(
  filtros: FiltrosRetroalimentacionV1,
  empresaIdRespuesta: string | null
): FiltrosRetroalimentacionV1 {
  return {
    ...filtros,
    empresa_id: empresaIdRespuesta
  }
}

export function construirRespuestaResumenV1(
  registros: RegistroRetroalimentacionAgregadoV1[],
  filtros: FiltrosRetroalimentacionV1,
  requestId: string
): RespuestaResumenRetroalimentacionV1 {
  const totalesPorTipo = construirTotalesPorTipo(registros)

  return {
    data: {
      total_registros: registros.length,
      totales_por_tipo: totalesPorTipo,
      promedio_calificacion: calcularPromedioPuntajes(registros.map((registro) => ({ puntaje: registro.puntaje }))),
      distribucion_estado_animo: construirDistribucionEstadoAnimo(registros),
      cantidad_ideas: totalesPorTipo.idea,
      serie_diaria: construirSerieDiaria(registros as RegistroRetroalimentacion[])
    },
    meta: construirMetaV1(requestId, 'application_summary'),
    filters: filtros
  }
}

export function construirRespuestaPanelV1(
  registros: RegistroRetroalimentacionAgregadoV1[],
  filtros: FiltrosRetroalimentacionV1,
  requestId: string
): RespuestaPanelRetroalimentacionV1 {
  const totalesPorTipo = construirTotalesPorTipo(registros)

  const porModulo = agruparPorClave(
    registros
      .map((registro) => registro.modulo)
      .filter((modulo): modulo is string => typeof modulo === 'string' && modulo.length > 0)
  )
    .map(({ clave, total }) => ({ modulo: clave, total }))
    .sort((a, b) => b.total - a.total || a.modulo.localeCompare(b.modulo))

  const puntajes = agruparPorClave(
    registros
      .map((registro) => registro.puntaje)
      .filter((puntaje): puntaje is number => typeof puntaje === 'number')
  )
    .map(({ clave, total }) => ({ puntaje: clave, total }))
    .sort((a, b) => a.puntaje - b.puntaje)

  const distribucionEstadoAnimo = construirDistribucionEstadoAnimo(registros)

  return {
    data: {
      resumen: {
        total_registros: registros.length,
        totales_por_tipo: totalesPorTipo,
        promedio_calificacion: calcularPromedioPuntajes(registros.map((registro) => ({ puntaje: registro.puntaje }))),
        distribucion_estado_animo: distribucionEstadoAnimo,
        cantidad_ideas: totalesPorTipo.idea
      },
      distribuciones: {
        por_tipo: TIPOS_RETROALIMENTACION.map((tipo) => ({
          tipo,
          total: totalesPorTipo[tipo]
        })),
        por_modulo: porModulo,
        puntajes,
        estados_animo: distribucionEstadoAnimo,
        serie_diaria: construirSerieDiaria(registros as RegistroRetroalimentacion[])
      }
    },
    meta: construirMetaV1(requestId, 'application_panel'),
    filters: filtros
  }
}

export function construirRespuestaListadoRetroalimentacionV1(
  registros: RegistroRetroalimentacionConsultaV1[],
  filtros: FiltrosRetroalimentacionV1,
  paginacion: PaginacionRetroalimentacionV1,
  total: number,
  requestId: string,
  incluirSensibles: boolean
): RespuestaListadoRetroalimentacionV1 {
  return {
    data: registros.map((registro) => mapearRegistroRetroalimentacionV1(registro, incluirSensibles)),
    meta: construirMetaV1(requestId, 'application_records'),
    filters: filtros,
    pagination: {
      pagina: paginacion.pagina,
      tamano: paginacion.tamano,
      total,
      total_paginas: total > 0 ? Math.ceil(total / paginacion.tamano) : 0,
      ordenar_por: paginacion.ordenar_por,
      direccion: paginacion.direccion
    }
  }
}

export function construirRespuestaDetalleRetroalimentacionV1(
  registro: RegistroRetroalimentacionConsultaV1,
  filtros: FiltrosRetroalimentacionV1,
  requestId: string,
  incluirSensibles: boolean
): RespuestaDetalleRetroalimentacionV1 {
  return {
    data: mapearRegistroRetroalimentacionV1(registro, incluirSensibles),
    meta: construirMetaV1(requestId, 'application_record_detail'),
    filters: filtros
  }
}

export function manejarErrorRetroalimentacionV1(error: unknown, requestId: string) {
  if (error instanceof ErrorApiV1) {
    return responderErrorV1(error.status, error.code, error.message, requestId, error.details)
  }

  console.error('[retroalimentacion:v1] error_no_controlado', error)
  return responderErrorV1(500, 'internal_error', 'No se pudo procesar la lectura de retroalimentacion.', requestId)
}

export const PARAMS_RESUMEN_RETROALIMENTACION_V1 = PARAMETROS_AGREGADOS_V1
export const PARAMS_PANEL_RETROALIMENTACION_V1 = PARAMETROS_AGREGADOS_V1
export const PARAMS_REGISTROS_RETROALIMENTACION_V1 = PARAMETROS_REGISTROS_V1
export const PARAMS_DETALLE_RETROALIMENTACION_V1 = PARAMETROS_DETALLE_V1
export const COLUMNAS_RESUMEN_V1 = COLUMNAS_RESUMEN_RETROALIMENTACION_V1
export const COLUMNAS_PANEL_V1 = COLUMNAS_PANEL_RETROALIMENTACION_V1