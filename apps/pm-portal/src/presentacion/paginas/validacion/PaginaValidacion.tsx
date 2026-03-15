import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { NavegacionValidacion } from '@/presentacion/paginas/validacion/NavegacionValidacion'
import { formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { listarPlanesValidacion, listarPlantillasValidacion } from '@/aplicacion/casos-uso/validaciones'
import { listarEjecucionesValidacion } from '@/aplicacion/casos-uso/ejecucionesValidacion'
import type { EjecucionValidacion, PlanValidacion, PlantillaValidacion } from '@/dominio/modelos'

export function PaginaValidacion() {
  const [planes, setPlanes] = useState<PlanValidacion[]>([])
  const [plantillas, setPlantillas] = useState<PlantillaValidacion[]>([])
  const [ejecuciones, setEjecuciones] = useState<EjecucionValidacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const [planesData, plantillasData, ejecucionesData] = await Promise.all([
          listarPlanesValidacion(),
          listarPlantillasValidacion(),
          listarEjecucionesValidacion()
        ])

        if (!activo) {
          return
        }

        setPlanes(planesData)
        setPlantillas(plantillasData)
        setEjecuciones(ejecucionesData)
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

  const señales = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10)
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    return {
      totalPlanes: planes.length,
      planesActivos: planes.filter((plan) => plan.estado_codigo !== 'completado').length,
      planesVencidos: planes.filter(
        (plan) => plan.fecha_fin !== null && plan.fecha_fin < hoy && plan.estado_codigo !== 'completado'
      ).length,
      totalPlantillas: plantillas.length,
      plantillasActivas: plantillas.filter((plantilla) => plantilla.activo).length,
      totalEjecuciones: ejecuciones.length,
      ejecucionesUltimos30Dias: ejecuciones.filter((ejecucion) => ejecucion.fecha_ejecucion >= hace30Dias).length,
      ejecucionesRecientes: [...ejecuciones]
        .sort((a, b) => b.fecha_ejecucion.localeCompare(a.fecha_ejecucion))
        .slice(0, 5)
    }
  }, [planes, plantillas, ejecuciones])

  const hayDatos = planes.length > 0 || plantillas.length > 0 || ejecuciones.length > 0

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Validación</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Control central de planes, plantillas y ejecuciones de validación por módulo.
          </p>
        </div>
        <NavegacionValidacion />
      </header>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={!hayDatos}
        mensajeVacio="No hay información de validación disponible."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Planes</p>
            <p className="mt-1 text-2xl font-semibold">{señales.totalPlanes}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{señales.planesActivos} activos</p>
          </article>

          <article className={`rounded-xl border p-4 ${
            señales.planesVencidos > 0
              ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
          }`}>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Planes vencidos</p>
            <p className={`mt-1 text-2xl font-semibold ${
              señales.planesVencidos > 0 ? 'text-amber-700 dark:text-amber-400' : ''
            }`}>
              {señales.planesVencidos}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {señales.planesVencidos === 0 ? 'Sin planes vencidos' : 'Activos con fecha fin superada'}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Plantillas</p>
            <p className="mt-1 text-2xl font-semibold">{señales.totalPlantillas}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{señales.plantillasActivas} activas</p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Ejecuciones</p>
            <p className="mt-1 text-2xl font-semibold">{señales.totalEjecuciones}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{señales.ejecucionesUltimos30Dias} en los últimos 30 días</p>
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
            {señales.ejecucionesRecientes.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sin ejecuciones registradas.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {señales.ejecucionesRecientes.map((ejecucion) => (
                  <li key={ejecucion.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <p className="font-medium">{formatearFechaCorta(ejecucion.fecha_ejecucion)}</p>
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
