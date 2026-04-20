import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { type EntornoAuth, validarAutorizacion } from './_autorizacion'

const VISTA_RETROALIMENTACION = 'v_retroalimentacion_unificada'
const TIPOS_RETROALIMENTACION = ['estado_animo', 'idea', 'calificacion'] as const
const CAMPOS_ORDENABLES = ['created_at', 'tipo', 'empresa_nombre', 'usuario_nombre', 'modulo', 'puntaje'] as const
const DIRECCIONES_ORDEN = ['asc', 'desc'] as const
const MAX_TAMANO_PAGINA = 100

export type TipoRetroalimentacion = (typeof TIPOS_RETROALIMENTACION)[number]
type CampoOrdenRetroalimentacion = (typeof CAMPOS_ORDENABLES)[number]
type DireccionOrden = (typeof DIRECCIONES_ORDEN)[number]

interface ErrorApiBody {
  error: {
    codigo: string
    mensaje: string
  }
}

interface ConsultaFiltrable<T> {
  eq(column: string, value: string): T
  ilike(column: string, pattern: string): T
  gte(column: string, value: string): T
  lte(column: string, value: string): T
}

class ErrorParametrosApi extends Error {
  codigo: string
  status: 400

  constructor(codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorParametrosApi'
    this.codigo = codigo
    this.status = 400
  }
}

export interface RegistroRetroalimentacion {
  registro_uid: string
  tipo: TipoRetroalimentacion
  id: string
  created_at: string
  usuario_id: string
  usuario_nombre: string
  usuario_correo: string | null
  empresa_id: string
  empresa_ruc: string | null
  empresa_razon_social: string | null
  empresa_nombre: string
  establecimiento_id: string | null
  establecimiento_nombre: string | null
  modulo: string
  ruta: string
  valor_principal: string
  detalle: string | null
  puntaje: number | null
  estado_animo: string | null
}

export interface FiltrosRetroalimentacion {
  tipo: TipoRetroalimentacion | null
  desde: string | null
  hasta: string | null
  empresa_id: string | null
  empresa: string | null
  usuario_id: string | null
  usuario: string | null
  modulo: string | null
  ruta: string | null
}

export interface PaginacionRetroalimentacion {
  pagina: number
  tamano: number
  ordenar_por: CampoOrdenRetroalimentacion
  direccion: DireccionOrden
}

export interface RespuestaListadoRetroalimentacion {
  fuente: 'supabase'
  actualizado_en: string
  filtros_aplicados: FiltrosRetroalimentacion
  paginacion: {
    pagina: number
    tamano: number
    total: number
    total_paginas: number
    ordenar_por: CampoOrdenRetroalimentacion
    direccion: DireccionOrden
  }
  items: RegistroRetroalimentacion[]
}

export interface RespuestaResumenRetroalimentacion {
  fuente: 'supabase'
  actualizado_en: string
  filtros_aplicados: FiltrosRetroalimentacion
  total_registros: number
  totales_por_tipo: Record<TipoRetroalimentacion, number>
  promedio_calificacion: number | null
  distribucion_estado_animo: Array<{
    estado_animo: string
    total: number
  }>
  cantidad_ideas: number
}

export interface RespuestaDistribucionesRetroalimentacion {
  fuente: 'supabase'
  actualizado_en: string
  filtros_aplicados: FiltrosRetroalimentacion
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

export interface RespuestaPanelRetroalimentacion {
  fuente: 'supabase'
  actualizado_en: string
  filtros_aplicados: FiltrosRetroalimentacion
  resumen: RespuestaResumenRetroalimentacion
  distribuciones: RespuestaDistribucionesRetroalimentacion
}

export interface RespuestaDetalleRetroalimentacion {
  fuente: 'supabase'
  actualizado_en: string
  item: RegistroRetroalimentacion
}

export interface EntornoRetroalimentacion extends EntornoAuth {
  SENCIYO_SUPABASE_URL?: string
  SENCIYO_SUPABASE_SERVICE_ROLE_KEY?: string
}

let clienteSupabaseRetroalimentacionCache: {
  supabaseUrl: string
  serviceRoleKey: string
  cliente: SupabaseClient
} | null = null

function construirDiagnosticoConfiguracionRetroalimentacion(env: EntornoRetroalimentacion) {
  return {
    hasSenciyoSupabaseUrl: Boolean(env.SENCIYO_SUPABASE_URL?.trim()),
    hasSenciyoServiceRoleKey: Boolean(env.SENCIYO_SUPABASE_SERVICE_ROLE_KEY?.trim()),
    hasLegacySupabaseUrl: Boolean(env.SUPABASE_URL?.trim()),
    hasLegacyServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  }
}

function registrarErrorRetroalimentacion(contexto: string, error: unknown, extra?: Record<string, unknown>) {
  if (error instanceof Error) {
    console.error(`[retroalimentacion] ${contexto}`, {
      name: error.name,
      message: error.message,
      ...extra
    })
    return
  }

  if (error && typeof error === 'object') {
    const errorRegistro = error as Record<string, unknown>

    console.error(`[retroalimentacion] ${contexto}`, {
      code: typeof errorRegistro.code === 'string' ? errorRegistro.code : null,
      message: typeof errorRegistro.message === 'string' ? errorRegistro.message : null,
      details: typeof errorRegistro.details === 'string' ? errorRegistro.details : null,
      hint: typeof errorRegistro.hint === 'string' ? errorRegistro.hint : null,
      ...extra
    })
    return
  }

  console.error(`[retroalimentacion] ${contexto}`, {
    error: error === undefined ? null : String(error),
    ...extra
  })
}

function construirRespuestaJson<T>(status: number, cuerpo: T, cache: 'no-store' | 'public, max-age=60' = 'no-store') {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache
    }
  })
}

export function responderError(status: number, codigo: string, mensaje: string) {
  const cuerpo: ErrorApiBody = {
    error: {
      codigo,
      mensaje
    }
  }

  return construirRespuestaJson(status, cuerpo)
}

function obtenerClienteSupabaseRetroalimentacion(env: EntornoRetroalimentacion): SupabaseClient | null {
  const supabaseUrl = env.SENCIYO_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim()
  const serviceRoleKey = env.SENCIYO_SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  if (
    clienteSupabaseRetroalimentacionCache &&
    clienteSupabaseRetroalimentacionCache.supabaseUrl === supabaseUrl &&
    clienteSupabaseRetroalimentacionCache.serviceRoleKey === serviceRoleKey
  ) {
    return clienteSupabaseRetroalimentacionCache.cliente
  }

  const cliente = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  clienteSupabaseRetroalimentacionCache = { supabaseUrl, serviceRoleKey, cliente }
  return cliente
}

export async function obtenerClienteAutorizado(
  request: Request,
  env: EntornoRetroalimentacion
): Promise<SupabaseClient | Response> {
  const autorizacion = await validarAutorizacion(request, env)

  if (!autorizacion.autorizado) {
    return responderError(autorizacion.status, autorizacion.codigoError, autorizacion.motivo)
  }

  const cliente = obtenerClienteSupabaseRetroalimentacion(env)

  if (!cliente) {
    registrarErrorRetroalimentacion(
      'configuracion_supabase_faltante',
      'missing_senciyo_supabase_runtime',
      construirDiagnosticoConfiguracionRetroalimentacion(env)
    )
    return responderError(500, 'configuracion_supabase', 'Falta configuración de Supabase en el servidor.')
  }

  return cliente
}

function leerTexto(searchParams: URLSearchParams, clave: string): string | null {
  const valor = searchParams.get(clave)?.trim()
  return valor ? valor : null
}

function esFechaYmd(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
}

function incluirFinDeDia(fecha: string): string {
  return `${fecha}T23:59:59.999Z`
}

function inicioDeDia(fecha: string): string {
  return `${fecha}T00:00:00.000Z`
}

function normalizarEntero(valor: string | null, valorPorDefecto: number, minimo: number, maximo: number, codigo: string): number {
  if (!valor) {
    return valorPorDefecto
  }

  const numero = Number(valor)

  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    throw new ErrorParametrosApi(codigo, `El parámetro es inválido: ${codigo}.`)
  }

  return numero
}

function normalizarTipo(valor: string | null): TipoRetroalimentacion | null {
  if (!valor) {
    return null
  }

  if (TIPOS_RETROALIMENTACION.includes(valor as TipoRetroalimentacion)) {
    return valor as TipoRetroalimentacion
  }

  throw new ErrorParametrosApi('tipo_invalido', 'El parámetro tipo no es válido.')
}

function normalizarCampoOrden(valor: string | null): CampoOrdenRetroalimentacion {
  if (!valor) {
    return 'created_at'
  }

  if (CAMPOS_ORDENABLES.includes(valor as CampoOrdenRetroalimentacion)) {
    return valor as CampoOrdenRetroalimentacion
  }

  throw new ErrorParametrosApi('orden_invalido', 'El parámetro ordenar_por no es válido.')
}

function normalizarDireccion(valor: string | null): DireccionOrden {
  if (!valor) {
    return 'desc'
  }

  if (DIRECCIONES_ORDEN.includes(valor as DireccionOrden)) {
    return valor as DireccionOrden
  }

  throw new ErrorParametrosApi('direccion_invalida', 'El parámetro direccion no es válido.')
}

export function obtenerFiltrosRetroalimentacion(request: Request): FiltrosRetroalimentacion {
  const url = new URL(request.url)
  const desde = leerTexto(url.searchParams, 'desde')
  const hasta = leerTexto(url.searchParams, 'hasta')

  if (desde && !esFechaYmd(desde)) {
    throw new ErrorParametrosApi('desde_invalido', 'El parámetro desde debe tener formato YYYY-MM-DD.')
  }

  if (hasta && !esFechaYmd(hasta)) {
    throw new ErrorParametrosApi('hasta_invalido', 'El parámetro hasta debe tener formato YYYY-MM-DD.')
  }

  if (desde && hasta && desde > hasta) {
    throw new ErrorParametrosApi('rango_invalido', 'El rango de fechas es inválido.')
  }

  return {
    tipo: normalizarTipo(leerTexto(url.searchParams, 'tipo')),
    desde,
    hasta,
    empresa_id: leerTexto(url.searchParams, 'empresa_id'),
    empresa: leerTexto(url.searchParams, 'empresa'),
    usuario_id: leerTexto(url.searchParams, 'usuario_id'),
    usuario: leerTexto(url.searchParams, 'usuario'),
    modulo: leerTexto(url.searchParams, 'modulo'),
    ruta: leerTexto(url.searchParams, 'ruta')
  }
}

export function obtenerPaginacionRetroalimentacion(request: Request): PaginacionRetroalimentacion {
  const url = new URL(request.url)

  return {
    pagina: normalizarEntero(leerTexto(url.searchParams, 'pagina'), 1, 1, 10_000, 'pagina_invalida'),
    tamano: normalizarEntero(leerTexto(url.searchParams, 'tamano'), 20, 1, MAX_TAMANO_PAGINA, 'tamano_invalido'),
    ordenar_por: normalizarCampoOrden(leerTexto(url.searchParams, 'ordenar_por')),
    direccion: normalizarDireccion(leerTexto(url.searchParams, 'direccion'))
  }
}

export function validarIdentificadorDetalle(tipo: string | undefined, id: string | undefined): asserts tipo is TipoRetroalimentacion {
  normalizarTipo(tipo ?? null)

  if (!id || !esUuid(id)) {
    throw new ErrorParametrosApi('id_invalido', 'El identificador solicitado no es válido.')
  }
}

export function aplicarFiltrosRetroalimentacion<T extends ConsultaFiltrable<T>>(
  consulta: T,
  filtros: FiltrosRetroalimentacion
): T {
  let consultaFiltrada = consulta

  if (filtros.tipo) {
    consultaFiltrada = consultaFiltrada.eq('tipo', filtros.tipo)
  }

  if (filtros.desde) {
    consultaFiltrada = consultaFiltrada.gte('created_at', inicioDeDia(filtros.desde))
  }

  if (filtros.hasta) {
    consultaFiltrada = consultaFiltrada.lte('created_at', incluirFinDeDia(filtros.hasta))
  }

  if (filtros.empresa_id) {
    consultaFiltrada = consultaFiltrada.eq('empresa_id', filtros.empresa_id)
  }

  if (filtros.empresa) {
    consultaFiltrada = consultaFiltrada.ilike('empresa_nombre', `%${filtros.empresa}%`)
  }

  if (filtros.usuario_id) {
    consultaFiltrada = consultaFiltrada.eq('usuario_id', filtros.usuario_id)
  }

  if (filtros.usuario) {
    consultaFiltrada = consultaFiltrada.ilike('usuario_nombre', `%${filtros.usuario}%`)
  }

  if (filtros.modulo) {
    consultaFiltrada = consultaFiltrada.eq('modulo', filtros.modulo)
  }

  if (filtros.ruta) {
    consultaFiltrada = consultaFiltrada.ilike('ruta', `%${filtros.ruta}%`)
  }

  return consultaFiltrada
}

export function crearConsultaRetroalimentacion(
  cliente: SupabaseClient,
  columnas: string,
  filtros: FiltrosRetroalimentacion,
  opciones?: {
    count?: 'exact'
    head?: boolean
  }
) {
  const consulta = cliente.from(VISTA_RETROALIMENTACION).select(columnas, opciones)
  return aplicarFiltrosRetroalimentacion(consulta, filtros)
}

function redondearPromedio(valor: number | null): number | null {
  if (valor === null) {
    return null
  }

  return Number(valor.toFixed(2))
}

export function calcularPromedioPuntajes(registros: Array<Pick<RegistroRetroalimentacion, 'puntaje'>>): number | null {
  const puntajes = registros
    .map((registro) => registro.puntaje)
    .filter((puntaje): puntaje is number => typeof puntaje === 'number')

  if (puntajes.length === 0) {
    return null
  }

  const promedio = puntajes.reduce((acumulado, puntaje) => acumulado + puntaje, 0) / puntajes.length
  return redondearPromedio(promedio)
}

export function agruparPorClave<T extends string | number>(valores: T[]): Array<{ clave: T; total: number }> {
  const acumulado = new Map<T, number>()

  for (const valor of valores) {
    acumulado.set(valor, (acumulado.get(valor) ?? 0) + 1)
  }

  return [...acumulado.entries()]
    .map(([clave, total]) => ({ clave, total }))
    .sort((a, b) => b.total - a.total)
}

export function construirSerieDiaria(registros: RegistroRetroalimentacion[]) {
  const acumulado = new Map<string, { total: number; estado_animo: number; idea: number; calificacion: number }>()

  for (const registro of registros) {
    const fecha = registro.created_at.slice(0, 10)
    const existente = acumulado.get(fecha) ?? {
      total: 0,
      estado_animo: 0,
      idea: 0,
      calificacion: 0
    }

    existente.total += 1
    existente[registro.tipo] += 1
    acumulado.set(fecha, existente)
  }

  return [...acumulado.entries()]
    .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
    .map(([fecha, valores]) => ({
      fecha,
      ...valores
    }))
}

export function responderExito<T>(cuerpo: T, cache: 'no-store' | 'public, max-age=60' = 'no-store') {
  return construirRespuestaJson(200, cuerpo, cache)
}

export function responderErrorDesconocido(mensaje: string) {
  return responderError(500, 'retroalimentacion_error', mensaje)
}

export function manejarErrorRetroalimentacion(error: unknown) {
  if (error instanceof ErrorParametrosApi) {
    return responderError(error.status, error.codigo, error.message)
  }

  registrarErrorRetroalimentacion('error_no_controlado', error)

  return responderErrorDesconocido('No se pudo procesar la lectura de retroalimentación.')
}