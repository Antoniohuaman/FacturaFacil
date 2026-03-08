import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const crearClienteSupabase = (urlSupabase: string, anonKeySupabase: string) =>
  createClient(urlSupabase, anonKeySupabase, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })

type ClienteSupabase = ReturnType<typeof crearClienteSupabase>

export const supabaseConfigMissing = !url || !anon

export const mensajeErrorConfiguracionSupabase = supabaseConfigMissing
  ? 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Cloudflare Pages (Variables and Secrets).'
  : null

export const clienteSupabase = (
  supabaseConfigMissing
    ? null
    : crearClienteSupabase(url, anon)
) as unknown as ClienteSupabase
