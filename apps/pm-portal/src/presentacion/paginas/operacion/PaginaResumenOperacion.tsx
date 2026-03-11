import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  estadosBloqueoPm,
  estadosBugPm,
  estadosDeudaTecnicaPm,
  estadosLeccionAprendidaPm,
  estadosMejoraPm,
  formatearEstadoBloqueo,
  formatearEstadoBug,
  formatearEstadoDeudaTecnica,
  formatearEstadoLeccionAprendida,
  formatearEstadoMejora,
  type BloqueoPm,
  type BugPm,
  type DeudaTecnicaPm,
  type LeccionAprendidaPm,
  type MejoraPm
} from '@/dominio/modelos'
import { obtenerResumenOperacion } from '@/aplicacion/casos-uso/operacion'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { NavegacionOperacion } from '@/presentacion/paginas/operacion/NavegacionOperacion'

export function PaginaResumenOperacion() {
  const [bugs, setBugs] = useState<BugPm[]>([])
  const [mejoras, setMejoras] = useState<MejoraPm[]>([])
  const [deudas, setDeudas] = useState<DeudaTecnicaPm[]>([])
  const [bloqueos, setBloqueos] = useState<BloqueoPm[]>([])
  const [lecciones, setLecciones] = useState<LeccionAprendidaPm[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const resultado = await obtenerResumenOperacion()
        setBugs(resultado.bugs)
        setMejoras(resultado.mejoras)
        setDeudas(resultado.deudas)
        setBloqueos(resultado.bloqueos)
        setLecciones(resultado.lecciones)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar operación')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [])

  const bugsAbiertos = useMemo(
    () => bugs.filter((bug) => !['resuelto', 'cerrado'].includes(bug.estado)).length,
    [bugs]
  )
  const bloqueosActivos = useMemo(
    () => bloqueos.filter((bloqueo) => bloqueo.estado !== 'resuelto').length,
    [bloqueos]
  )
  const deudaActiva = useMemo(
    () => deudas.filter((deuda) => !['resuelta', 'descartada'].includes(deuda.estado)).length,
    [deudas]
  )
  const mejorasEnCurso = useMemo(
    () => mejoras.filter((mejora) => ['priorizada', 'en_progreso'].includes(mejora.estado)).length,
    [mejoras]
  )
  const leccionesAplicables = useMemo(
    () => lecciones.filter((leccion) => ['capturada', 'validada'].includes(leccion.estado)).length,
    [lecciones]
  )

  const recientes = useMemo(() => {
    return [
      ...bugs.map((item) => ({ tipo: 'Bug', titulo: item.titulo, fecha: item.updated_at, ruta: '/operacion/bugs' })),
      ...mejoras.map((item) => ({ tipo: 'Mejora', titulo: item.titulo, fecha: item.updated_at, ruta: '/operacion/mejoras' })),
      ...deudas.map((item) => ({ tipo: 'Deuda técnica', titulo: item.titulo, fecha: item.updated_at, ruta: '/operacion/deuda-tecnica' })),
      ...bloqueos.map((item) => ({ tipo: 'Bloqueo', titulo: item.titulo, fecha: item.updated_at, ruta: '/operacion/bloqueos' })),
      ...lecciones.map((item) => ({ tipo: 'Lección', titulo: item.titulo, fecha: item.updated_at, ruta: '/operacion/lecciones-aprendidas' }))
    ]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 8)
  }, [bugs, mejoras, deudas, bloqueos, lecciones])

  const distribucion = useMemo(
    () => ({
      bugs: estadosBugPm.map((estado) => ({ etiqueta: formatearEstadoBug(estado), total: bugs.filter((item) => item.estado === estado).length })),
      mejoras: estadosMejoraPm.map((estado) => ({ etiqueta: formatearEstadoMejora(estado), total: mejoras.filter((item) => item.estado === estado).length })),
      deudas: estadosDeudaTecnicaPm.map((estado) => ({ etiqueta: formatearEstadoDeudaTecnica(estado), total: deudas.filter((item) => item.estado === estado).length })),
      bloqueos: estadosBloqueoPm.map((estado) => ({ etiqueta: formatearEstadoBloqueo(estado), total: bloqueos.filter((item) => item.estado === estado).length })),
      lecciones: estadosLeccionAprendidaPm.map((estado) => ({ etiqueta: formatearEstadoLeccionAprendida(estado), total: lecciones.filter((item) => item.estado === estado).length }))
    }),
    [bugs, mejoras, deudas, bloqueos, lecciones]
  )

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen operativo</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consolida bugs, mejoras, deuda técnica, bloqueos y lecciones aprendidas con trazabilidad opcional hacia delivery, auditoría, discovery y lanzamientos.
          </p>
        </div>
        <NavegacionOperacion />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="">
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bugs abiertos</p>
              <p className="mt-2 text-2xl font-semibold">{bugsAbiertos}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Mejoras en curso</p>
              <p className="mt-2 text-2xl font-semibold">{mejorasEnCurso}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Deuda activa</p>
              <p className="mt-2 text-2xl font-semibold">{deudaActiva}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bloqueos activos</p>
              <p className="mt-2 text-2xl font-semibold">{bloqueosActivos}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Lecciones aplicables</p>
              <p className="mt-2 text-2xl font-semibold">{leccionesAplicables}</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Distribución operativa</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Estados por entidad para lectura rápida del módulo.</p>
                </div>
                <Link to="/trazabilidad" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                  Ver trazabilidad
                </Link>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {[
                  { titulo: 'Bugs', items: distribucion.bugs },
                  { titulo: 'Mejoras', items: distribucion.mejoras },
                  { titulo: 'Deuda técnica', items: distribucion.deudas },
                  { titulo: 'Bloqueos', items: distribucion.bloqueos },
                  { titulo: 'Lecciones aprendidas', items: distribucion.lecciones }
                ].map((bloque) => (
                  <div key={bloque.titulo} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium">{bloque.titulo}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {bloque.items.map((item) => (
                        <div key={`${bloque.titulo}-${item.etiqueta}`} className="flex items-center justify-between gap-3">
                          <span>{item.etiqueta}</span>
                          <span className="font-medium">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Movimientos recientes</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Últimos cambios en los cinco frentes de Operación.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {recientes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Operación todavía no tiene registros.
                  </div>
                ) : (
                  recientes.map((item, indice) => (
                    <Link
                      key={`${item.tipo}-${indice}-${item.fecha}`}
                      to={item.ruta}
                      className="block rounded-lg border border-slate-200 px-3 py-3 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.tipo}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{item.titulo}</p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{normalizarFechaPortal(item.fecha)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </article>
          </div>
        </>
      </EstadoVista>
    </section>
  )
}