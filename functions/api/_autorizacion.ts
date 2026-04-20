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
}

export type ResultadoAutorizacion =
  | { autorizado: true; usuarioId: string }
  | { autorizado: false; status: 401 | 403 | 500; motivo: string; codigoError: string }

interface ConfiguracionClienteSupabase {
  supabaseUrl: string
  clave: string
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

function extraerTokenBearer(request: Request): string | null {
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
