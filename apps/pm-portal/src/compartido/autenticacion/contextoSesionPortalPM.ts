import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { RolUsuario } from '@/dominio/modelos'

export interface SesionPortalPM {
  usuario: User | null
  accessToken: string | null
  rol: RolUsuario | null
  cargando: boolean
  error: string | null
  iniciarSesionConCorreo: (correo: string, contrasena: string) => Promise<boolean>
  cerrarSesion: () => Promise<void>
}

export const ContextoSesionPortalPM = createContext<SesionPortalPM | undefined>(undefined)

export function useSesionPortalPM() {
  const contexto = useContext(ContextoSesionPortalPM)
  if (!contexto) {
    throw new Error('useSesionPortalPM debe usarse dentro de ProveedorSesionPortalPM')
  }
  return contexto
}
