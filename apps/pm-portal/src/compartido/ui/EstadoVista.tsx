import type { ReactNode } from 'react'

interface PropiedadesEstadoVista {
  cargando: boolean
  error: string | null
  vacio: boolean
  mensajeVacio: string
  children: ReactNode
}

export function EstadoVista({ cargando, error, vacio, mensajeVacio, children }: PropiedadesEstadoVista) {
  if (cargando) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Cargando información...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </div>
    )
  }

  if (vacio) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {mensajeVacio}
      </div>
    )
  }

  return <>{children}</>
}
