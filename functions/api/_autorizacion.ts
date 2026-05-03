/**
 * Módulo compartido de autorización para Cloudflare Pages Functions.
 * Usado por: metricas-posthog, resumen-repo.
 * El prefijo _ evita que Cloudflare lo exponga como endpoint.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface EntornoAuth {
  PM_PORTAL_SUPABASE_URL?: string
  PM_PORTAL_SUPABASE_ANON_KEY?: string
  PM_PORTAL_SUPABASE_SERVICE_ROLE_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  FEEDBACK_API_CONSUMERS_JSON?: string
  FEEDBACK_API_KEY_HASH_PEPPER?: string
}

export type ResultadoAutorizacion =
  | { autorizado: true; usuarioId: string }
  | { autorizado: false; status: 401 | 403 | 500; motivo: string; codigoError: string }

export interface ConsumidorAplicacionAutorizado {
  consumerId: string
  name: string
  scopes: string[]
  allowedEmpresaIds: string[]
  allowMultiTenantSummary: boolean
  allowSensitive: boolean
  rateLimitProfile: string | null
}

export type ResultadoAutorizacionAplicacion =
  | { autorizado: true; consumer: ConsumidorAplicacionAutorizado }
  | {
      autorizado: false
      status: 401 | 403 | 500 | 503
      motivo: string
      codigoError: string
    }

interface ConfiguracionClienteSupabase {
  supabaseUrl: string
  clave: string
}

interface ConsumidorAplicacionConfigurado {
  consumerId: string
  name: string
  status: 'active' | 'inactive'
  tokenHash: string
  scopes: string[]
  allowedEmpresaIds: string[]
  allowMultiTenantSummary: boolean
  allowSensitive: boolean
  rateLimitProfile: string | null
}

interface ConfiguracionConsumidoresAplicacion {
  consumers: ConsumidorAplicacionConfigurado[]
}

function leerVariableEntorno(valor?: string): string | null {
  const normalizado = valor?.trim()
  return normalizado ? normalizado : null
}

function construirDiagnosticoConfiguracionAuth(env: EntornoAuth) {
  return {
    hasPmPortalSupabaseUrl: Boolean(leerVariableEntorno(env.PM_PORTAL_SUPABASE_URL)),
    hasPmPortalSupabaseAnonKey: Boolean(leerVariableEntorno(env.PM_PORTAL_SUPABASE_ANON_KEY)),
    hasPmPortalSupabaseServiceRoleKey: Boolean(leerVariableEntorno(env.PM_PORTAL_SUPABASE_SERVICE_ROLE_KEY)),
    hasLegacySupabaseUrl: Boolean(leerVariableEntorno(env.SUPABASE_URL)),
    hasLegacySupabaseAnonKey: Boolean(leerVariableEntorno(env.SUPABASE_ANON_KEY)),
    hasLegacySupabaseServiceRoleKey: Boolean(leerVariableEntorno(env.SUPABASE_SERVICE_ROLE_KEY)),
    hasViteSupabaseUrl: Boolean(leerVariableEntorno(env.VITE_SUPABASE_URL)),
    hasViteSupabaseAnonKey: Boolean(leerVariableEntorno(env.VITE_SUPABASE_ANON_KEY))
  }
}

let clienteSupabaseAuthCache: {
  supabaseUrl: string
  clave: string
  cliente: SupabaseClient
} | null = null

let configuracionConsumidoresAplicacionCache: {
  raw: string
  config: ConfiguracionConsumidoresAplicacion
} | null = null

let clienteSupabaseAdminCache: {
  supabaseUrl: string
  clave: string
  cliente: SupabaseClient
} | null = null

function crearClienteSupabase(configuracion: ConfiguracionClienteSupabase): SupabaseClient {
  return createClient(configuracion.supabaseUrl, configuracion.clave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

function normalizarTextoNoVacio(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalizado = value.trim()
  return normalizado.length > 0 ? normalizado : null
}

function normalizarListaTexto(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map((item) => normalizarTextoNoVacio(item)).filter((item): item is string => item !== null))]
}

function normalizarBooleanoConfig(value: unknown, defaultValue: boolean): boolean {
  return typeof value === 'boolean' ? value : defaultValue
}

function esHashSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value)
}

function compararCadenasTiempoConstante(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const aBytes = encoder.encode(a)
  const bBytes = encoder.encode(b)
  const longitud = Math.max(aBytes.length, bBytes.length)

  let diferencia = aBytes.length ^ bBytes.length

  for (let indice = 0; indice < longitud; indice += 1) {
    diferencia |= (aBytes[indice] ?? 0) ^ (bBytes[indice] ?? 0)
  }

  return diferencia === 0
}

async function calcularHashSha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function leerPepperAutorizacionAplicacion(env: EntornoAuth): string {
  const pepper = leerVariableEntorno(env.FEEDBACK_API_KEY_HASH_PEPPER)

  if (!pepper) {
    throw new Error('Falta FEEDBACK_API_KEY_HASH_PEPPER.')
  }

  return pepper
}

function normalizarConsumidorAplicacion(value: unknown): ConsumidorAplicacionConfigurado {
  if (!value || typeof value !== 'object') {
    throw new Error('Cada consumidor debe ser un objeto JSON.')
  }

  const consumer = value as Record<string, unknown>
  const consumerId = normalizarTextoNoVacio(consumer.consumer_id)
  const name = normalizarTextoNoVacio(consumer.name)
  const status = normalizarTextoNoVacio(consumer.status)?.toLowerCase()
  const tokenHash = normalizarTextoNoVacio(consumer.token_hash)?.toLowerCase()

  if (!consumerId) {
    throw new Error('Cada consumidor debe incluir consumer_id.')
  }

  if (!name) {
    throw new Error(`El consumidor ${consumerId} debe incluir name.`)
  }

  if (status !== 'active' && status !== 'inactive') {
    throw new Error(`El consumidor ${consumerId} debe incluir status válido.`)
  }

  if (!tokenHash || !esHashSha256Hex(tokenHash)) {
    throw new Error(`El consumidor ${consumerId} debe incluir token_hash SHA-256 hexadecimal.`)
  }

  return {
    consumerId,
    name,
    status,
    tokenHash,
    scopes: normalizarListaTexto(consumer.scopes),
    allowedEmpresaIds: normalizarListaTexto(consumer.allowed_empresa_ids),
    allowMultiTenantSummary: normalizarBooleanoConfig(consumer.allow_multi_tenant_summary, false),
    allowSensitive: normalizarBooleanoConfig(consumer.allow_sensitive, false),
    rateLimitProfile: normalizarTextoNoVacio(consumer.rate_limit_profile)
  }
}

function obtenerConfiguracionConsumidoresAplicacion(env: EntornoAuth): ConfiguracionConsumidoresAplicacion {
  const raw = leerVariableEntorno(env.FEEDBACK_API_CONSUMERS_JSON)

  if (!raw) {
    throw new Error('Falta FEEDBACK_API_CONSUMERS_JSON.')
  }

  if (configuracionConsumidoresAplicacionCache?.raw === raw) {
    return configuracionConsumidoresAplicacionCache.config
  }

  const parsed = JSON.parse(raw) as unknown

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('FEEDBACK_API_CONSUMERS_JSON debe ser un objeto JSON.')
  }

  const parsedRecord = parsed as Record<string, unknown>

  if (!Array.isArray(parsedRecord.consumers)) {
    throw new Error('FEEDBACK_API_CONSUMERS_JSON debe incluir un arreglo consumers.')
  }

  const config: ConfiguracionConsumidoresAplicacion = {
    consumers: parsedRecord.consumers.map((consumer) => normalizarConsumidorAplicacion(consumer))
  }

  configuracionConsumidoresAplicacionCache = { raw, config }
  return config
}

function obtenerConfiguracionSupabaseAuth(env: EntornoAuth): ConfiguracionClienteSupabase | null {
  const pmPortalSupabaseUrl = leerVariableEntorno(env.PM_PORTAL_SUPABASE_URL)
  const pmPortalSupabaseAnonKey = leerVariableEntorno(env.PM_PORTAL_SUPABASE_ANON_KEY)
  const pmPortalSupabaseServiceRoleKey = leerVariableEntorno(env.PM_PORTAL_SUPABASE_SERVICE_ROLE_KEY)
  const legacySupabaseUrl = leerVariableEntorno(env.SUPABASE_URL)
  const legacySupabaseAnonKey = leerVariableEntorno(env.SUPABASE_ANON_KEY)
  const legacySupabaseServiceRoleKey = leerVariableEntorno(env.SUPABASE_SERVICE_ROLE_KEY)
  const viteSupabaseUrl = leerVariableEntorno(env.VITE_SUPABASE_URL)
  const viteSupabaseAnonKey = leerVariableEntorno(env.VITE_SUPABASE_ANON_KEY)

  if (pmPortalSupabaseUrl && pmPortalSupabaseAnonKey) {
    return {
      supabaseUrl: pmPortalSupabaseUrl,
      clave: pmPortalSupabaseAnonKey
    }
  }

  if (pmPortalSupabaseUrl && pmPortalSupabaseServiceRoleKey) {
    return {
      supabaseUrl: pmPortalSupabaseUrl,
      clave: pmPortalSupabaseServiceRoleKey
    }
  }

  if (legacySupabaseUrl && legacySupabaseAnonKey) {
    return {
      supabaseUrl: legacySupabaseUrl,
      clave: legacySupabaseAnonKey
    }
  }

  if (viteSupabaseUrl && viteSupabaseAnonKey) {
    return {
      supabaseUrl: viteSupabaseUrl,
      clave: viteSupabaseAnonKey
    }
  }

  if (legacySupabaseUrl && legacySupabaseServiceRoleKey) {
    return {
      supabaseUrl: legacySupabaseUrl,
      clave: legacySupabaseServiceRoleKey
    }
  }

  return null
}

function obtenerConfiguracionSupabaseAdmin(env: EntornoAuth): ConfiguracionClienteSupabase | null {
  const supabaseUrl = leerVariableEntorno(env.PM_PORTAL_SUPABASE_URL) || leerVariableEntorno(env.SUPABASE_URL)
  const clave =
    leerVariableEntorno(env.PM_PORTAL_SUPABASE_SERVICE_ROLE_KEY) ||
    leerVariableEntorno(env.SUPABASE_SERVICE_ROLE_KEY)

  if (!supabaseUrl || !clave) {
    return null
  }

  return {
    supabaseUrl,
    clave
  }
}

export function obtenerClienteSupabaseAuth(env: EntornoAuth): SupabaseClient | null {
  const configuracion = obtenerConfiguracionSupabaseAuth(env)

  if (!configuracion) {
    return null
  }

  if (
    clienteSupabaseAuthCache &&
    clienteSupabaseAuthCache.supabaseUrl === configuracion.supabaseUrl &&
    clienteSupabaseAuthCache.clave === configuracion.clave
  ) {
    return clienteSupabaseAuthCache.cliente
  }

  const cliente = crearClienteSupabase(configuracion)
  clienteSupabaseAuthCache = { ...configuracion, cliente }
  return cliente
}

export function obtenerClienteSupabaseAdmin(env: EntornoAuth): SupabaseClient | null {
  const configuracion = obtenerConfiguracionSupabaseAdmin(env)

  if (!configuracion) {
    return null
  }

  if (
    clienteSupabaseAdminCache &&
    clienteSupabaseAdminCache.supabaseUrl === configuracion.supabaseUrl &&
    clienteSupabaseAdminCache.clave === configuracion.clave
  ) {
    return clienteSupabaseAdminCache.cliente
  }

  const cliente = crearClienteSupabase(configuracion)
  clienteSupabaseAdminCache = { ...configuracion, cliente }
  return cliente
}

export function extraerTokenBearer(request: Request): string | null {
  const headerAuthorization = request.headers.get('authorization')
  if (!headerAuthorization) {
    return null
  }

  const coincide = headerAuthorization.match(/^Bearer\s+(.+)$/i)
  return coincide?.[1]?.trim() ?? null
}

export async function validarAutorizacion(
  request: Request,
  env: EntornoAuth
): Promise<ResultadoAutorizacion> {
  const clienteAuth = obtenerClienteSupabaseAuth(env)

  if (!clienteAuth) {
    console.error('[auth] configuracion_auth_faltante', construirDiagnosticoConfiguracionAuth(env))
    return {
      autorizado: false,
      status: 500,
      motivo: 'Falta configuración de auth de Supabase en el servidor.',
      codigoError: 'configuracion_auth'
    }
  }

  const token = extraerTokenBearer(request)

  if (!token) {
    return {
      autorizado: false,
      status: 401,
      motivo: 'No autorizado. Inicia sesión nuevamente.',
      codigoError: 'no_autorizado'
    }
  }

  try {
    const { data, error } = await clienteAuth.auth.getUser(token)

    if (error || !data.user) {
      return {
        autorizado: false,
        status: 403,
        motivo: 'No autorizado. Inicia sesión nuevamente.',
        codigoError: 'token_invalido'
      }
    }

    return { autorizado: true, usuarioId: data.user.id }
  } catch {
    return {
      autorizado: false,
      status: 500,
      motivo: 'No se pudo validar la sesión.',
      codigoError: 'auth_error'
    }
  }
}

export async function validarAutorizacionAplicacion(
  request: Request,
  env: EntornoAuth
): Promise<ResultadoAutorizacionAplicacion> {
  const token = extraerTokenBearer(request)

  if (!token) {
    return {
      autorizado: false,
      status: 401,
      motivo: 'No autorizado.',
      codigoError: 'no_autorizado'
    }
  }

  let configuracion: ConfiguracionConsumidoresAplicacion
  let pepper: string

  try {
    configuracion = obtenerConfiguracionConsumidoresAplicacion(env)
    pepper = leerPepperAutorizacionAplicacion(env)
  } catch (error) {
    console.error('[feedback-api-auth] configuracion_invalida', {
      reason: error instanceof Error ? error.message : 'unknown_error'
    })

    return {
      autorizado: false,
      status: 503,
      motivo: 'La autorización de aplicación de la API versionada no está configurada.',
      codigoError: 'configuracion_auth_aplicacion'
    }
  }

  try {
    const tokenHash = await calcularHashSha256Hex(`${pepper}:${token}`)
    const consumer = configuracion.consumers.find((item) => compararCadenasTiempoConstante(item.tokenHash, tokenHash))

    if (!consumer) {
      return {
        autorizado: false,
        status: 401,
        motivo: 'No autorizado.',
        codigoError: 'token_invalido'
      }
    }

    if (consumer.status !== 'active') {
      return {
        autorizado: false,
        status: 403,
        motivo: 'El consumidor autenticado no se encuentra habilitado.',
        codigoError: 'consumer_inactivo'
      }
    }

    return {
      autorizado: true,
      consumer: {
        consumerId: consumer.consumerId,
        name: consumer.name,
        scopes: consumer.scopes,
        allowedEmpresaIds: consumer.allowedEmpresaIds,
        allowMultiTenantSummary: consumer.allowMultiTenantSummary,
        allowSensitive: consumer.allowSensitive,
        rateLimitProfile: consumer.rateLimitProfile
      }
    }
  } catch {
    return {
      autorizado: false,
      status: 500,
      motivo: 'No se pudo validar la autorización de aplicación.',
      codigoError: 'auth_app_error'
    }
  }
}
