/**
 * Módulo compartido de autorización para Cloudflare Pages Functions.
 * Usado por: metricas-posthog (tiene su propio inline), resumen-repo.
 * El prefijo _ evita que Cloudflare lo exponga como endpoint.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface EntornoAuth {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

export type ResultadoAutorizacion =
  | { autorizado: true; usuarioId: string }
  | { autorizado: false; status: 401 | 403 | 500; motivo: string; codigoError: string }

let clienteSupabaseAdminCache: {
  supabaseUrl: string
  serviceRoleKey: string
  cliente: SupabaseClient
} | null = null

export function obtenerClienteSupabaseAdmin(env: EntornoAuth): SupabaseClient | null {
  const supabaseUrl = env.SUPABASE_URL?.trim()
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  if (
    clienteSupabaseAdminCache &&
    clienteSupabaseAdminCache.supabaseUrl === supabaseUrl &&
    clienteSupabaseAdminCache.serviceRoleKey === serviceRoleKey
  ) {
    return clienteSupabaseAdminCache.cliente
  }

  const cliente = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  clienteSupabaseAdminCache = { supabaseUrl, serviceRoleKey, cliente }
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
  const clienteAdmin = obtenerClienteSupabaseAdmin(env)

  if (!clienteAdmin) {
    return {
      autorizado: false,
      status: 500,
      motivo: 'Falta configuración de seguridad en el servidor.',
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
    const { data, error } = await clienteAdmin.auth.getUser(token)

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
