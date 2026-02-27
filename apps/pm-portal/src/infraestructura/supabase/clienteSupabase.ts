import { createClient } from '@supabase/supabase-js'

const urlSupabase = import.meta.env.VITE_SUPABASE_URL?.trim()
const clavePublicaSupabase = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const mensajeErrorConfiguracionSupabase =
  !urlSupabase || !clavePublicaSupabase
    ? 'Faltan variables de entorno de Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en apps/pm-portal/.env.'
    : null

if (mensajeErrorConfiguracionSupabase) {
  console.warn(mensajeErrorConfiguracionSupabase)
}

const URL_RESPALDO_SUPABASE = 'https://placeholder.supabase.co'
const CLAVE_RESPALDO_SUPABASE = 'public-anon-key-placeholder'

export const clienteSupabase = createClient(
  urlSupabase ?? URL_RESPALDO_SUPABASE,
  clavePublicaSupabase ?? CLAVE_RESPALDO_SUPABASE,
  {
    auth: {
      persistSession: !mensajeErrorConfiguracionSupabase,
      autoRefreshToken: !mensajeErrorConfiguracionSupabase,
      detectSessionInUrl: !mensajeErrorConfiguracionSupabase
    }
  }
)
