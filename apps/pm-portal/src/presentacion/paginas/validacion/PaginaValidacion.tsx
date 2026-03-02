import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { obtenerResumenValidacion } from '@/aplicacion/casos-uso/validaciones'
import { listarEjecucionesValidacion } from '@/aplicacion/casos-uso/ejecucionesValidacion'
import type { EjecucionValidacion } from '@/dominio/modelos'

interface ResumenValidacionVista {
  totalPlanes: number
  planesActivos: number
  totalPlantillas: number
}

export function PaginaValidacion() {
  const [resumen, setResumen] = useState<ResumenValidacionVista | null>(null)
  const [ejecucionesRecientes, setEjecucionesRecientes] = useState<EjecucionValidacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const [resumenRespuesta, ejecuciones] = await Promise.all([
          obtenerResumenValidacion(),
          listarEjecucionesValidacion()
        ])

        if (!activo) {
          return
        }

        setResumen(resumenRespuesta)
        setEjecucionesRecientes(ejecuciones.slice(0, 5))
      } catch (errorInterno) {
        if (!activo) {
          return
        }
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar validación')
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    void cargar()

    return () => {
      activo = false
    }
  }, [])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Validación</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Control central de planes, plantillas y ejecuciones de validación por módulo.
        </p>
      </header>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={!resumen}
        mensajeVacio="No hay información de validación disponible."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Planes</p>
            <p className="mt-1 text-2xl font-semibold">{resumen?.totalPlanes ?? 0}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Planes registrados</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Activos</p>
            <p className="mt-1 text-2xl font-semibold">{resumen?.planesActivos ?? 0}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Planes en curso</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Plantillas</p>
            <p className="mt-1 text-2xl font-semibold">{resumen?.totalPlantillas ?? 0}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Criterios base configurados</p>
          </article>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Accesos</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/validacion/por-modulo"
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900"
              >
                Ir a Por módulo
              </Link>
              <Link
                to="/validacion/ejecuciones"
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium dark:border-slate-700"
              >
                Ir a Ejecuciones
              </Link>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Últimas ejecuciones</h2>
            {ejecucionesRecientes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sin ejecuciones registradas.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {ejecucionesRecientes.map((ejecucion) => (
                  <li key={ejecucion.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <p className="font-medium">{ejecucion.fecha_ejecucion}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Estado: {ejecucion.estado_codigo}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </EstadoVista>
    </section>
  )
}
