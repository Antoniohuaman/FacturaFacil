import { Navigate, useLocation } from 'react-router-dom'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import type { PropsWithChildren } from 'react'

export function GuardSesionPortalPM({ children }: PropsWithChildren) {
  const { usuario, rol, cargando } = useSesionPortalPM()
  const ubicacion = useLocation()

  if (cargando || (usuario !== null && rol === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Cargando sesión...
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname }} />
  }

  return <>{children}</>
}
