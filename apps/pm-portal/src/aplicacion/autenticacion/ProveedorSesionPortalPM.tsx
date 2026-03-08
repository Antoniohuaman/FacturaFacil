import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  clienteSupabase,
  mensajeErrorConfiguracionSupabase
} from '@/infraestructura/supabase/clienteSupabase'
import { ContextoSesionPortalPM, type SesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import type { RolUsuario } from '@/dominio/modelos'

async function obtenerRolUsuario(idUsuario: string): Promise<RolUsuario | null> {
  if (!clienteSupabase) {
    return null
  }

  const { data, error } = await clienteSupabase
    .from('perfiles')
    .select('rol')
    .eq('id', idUsuario)
    .maybeSingle()

  if (error || !data?.rol) {
    return null
  }

  return data.rol as RolUsuario
}

export function ProveedorSesionPortalPM({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [rol, setRol] = useState<RolUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mensajeErrorConfiguracionSupabase || !clienteSupabase) {
      setError(mensajeErrorConfiguracionSupabase)
      setCargando(false)
      return
    }

    let activo = true

    const inicializarSesion = async () => {
      try {
        const { data, error: errorSesion } = await clienteSupabase.auth.getSession()
        if (errorSesion) {
          throw errorSesion
        }

        const usuarioActual = data.session?.user ?? null
        const tokenSesion = data.session?.access_token ?? null
        if (!activo) {
          return
        }

        setUsuario(usuarioActual)
        setAccessToken(tokenSesion)
        setRol(usuarioActual ? await obtenerRolUsuario(usuarioActual.id) : null)
      } catch (errorInterno) {
        if (activo) {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar la sesión')
        }
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    void inicializarSesion()

    const { data: subscripcion } = clienteSupabase.auth.onAuthStateChange((_evento, sesion) => {
      setUsuario(sesion?.user ?? null)
      setAccessToken(sesion?.access_token ?? null)
      if (sesion?.user) {
        void obtenerRolUsuario(sesion.user.id).then((rolUsuario) => setRol(rolUsuario))
      } else {
        setRol(null)
      }
    })

    return () => {
      activo = false
      subscripcion.subscription.unsubscribe()
    }
  }, [])

  const valor = useMemo<SesionPortalPM>(
    () => ({
      usuario,
      accessToken,
      rol,
      cargando,
      error,
      iniciarSesionConCorreo: async (correo: string, contrasena: string) => {
        setError(null)

        if (mensajeErrorConfiguracionSupabase || !clienteSupabase) {
          setError(mensajeErrorConfiguracionSupabase)
          return false
        }

        const { data, error: errorInicio } = await clienteSupabase.auth.signInWithPassword({
          email: correo,
          password: contrasena
        })

        if (errorInicio || !data.user) {
          setError(errorInicio?.message ?? 'No se pudo iniciar sesión')
          return false
        }

        setUsuario(data.user)
        setAccessToken(data.session?.access_token ?? null)
        setRol(await obtenerRolUsuario(data.user.id))
        return true
      },
      cerrarSesion: async () => {
        setError(null)

        if (mensajeErrorConfiguracionSupabase || !clienteSupabase) {
          setUsuario(null)
          setAccessToken(null)
          setRol(null)
          return
        }

        const { error: errorSalida } = await clienteSupabase.auth.signOut()
        if (errorSalida) {
          setError(errorSalida.message)
          return
        }

        setUsuario(null)
        setAccessToken(null)
        setRol(null)
      }
    }),
    [usuario, accessToken, rol, cargando, error]
  )

  return <ContextoSesionPortalPM.Provider value={valor}>{children}</ContextoSesionPortalPM.Provider>
}
