import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  estadosReleasePm,
  formatearEstadoRelease,
  type ReleaseChecklistItemPm,
  type ReleasePm
} from '@/dominio/modelos'
import { listarDependenciasPm, listarRiesgosPm } from '@/aplicacion/casos-uso/gobierno'
import { obtenerContadoresLanzamientos } from '@/aplicacion/casos-uso/lanzamientos'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { NavegacionLanzamientos } from '@/presentacion/paginas/lanzamientos/NavegacionLanzamientos'

function inicioDia(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

function construirChecklistPorRelease(checklist: ReleaseChecklistItemPm[]) {
  return checklist.reduce((mapa, item) => {
    const actual = mapa.get(item.release_id) ?? []
    return mapa.set(item.release_id, [...actual, item])
  }, new Map<string, ReleaseChecklistItemPm[]>())
}

export function PaginaResumenLanzamientos() {
  const [releases, setReleases] = useState<ReleasePm[]>([])
  const [checklist, setChecklist] = useState<ReleaseChecklistItemPm[]>([])
  const [riesgosGobierno, setRiesgosGobierno] = useState<Array<{ release_id: string | null; estado: string; criticidad: string }>>([])
  const [dependenciasGobierno, setDependenciasGobierno] = useState<Array<{ release_id: string | null; estado: string; criticidad: string }>>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const [resultado, riesgosData, dependenciasData] = await Promise.all([
          obtenerContadoresLanzamientos(),
          listarRiesgosPm(),
          listarDependenciasPm()
        ])
        setReleases(resultado.releases)
        setChecklist(resultado.checklist)
        setRiesgosGobierno(riesgosData)
        setDependenciasGobierno(dependenciasData)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar lanzamientos')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [])

  const checklistPorRelease = useMemo(() => construirChecklistPorRelease(checklist), [checklist])
  const hoy = useMemo(() => inicioDia(new Date()), [])
  const hace30Dias = useMemo(() => {
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - 30)
    return inicioDia(fecha)
  }, [])

  const distribucionEstado = useMemo(
    () =>
      estadosReleasePm.map((estado) => ({
        estado,
        total: releases.filter((release) => release.estado === estado).length
      })),
    [releases]
  )

  const proximos = useMemo(
    () =>
      releases
        .filter((release) => release.fecha_programada >= hoy && release.estado !== 'cerrado')
        .sort((a, b) => a.fecha_programada.localeCompare(b.fecha_programada))
        .slice(0, 6),
    [releases, hoy]
  )

  const recientes = useMemo(
    () => [...releases].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6),
    [releases]
  )

  const releasesChecklistIncompleto = useMemo(
    () =>
      releases.filter((release) =>
        (checklistPorRelease.get(release.id) ?? []).some((item) => !item.completado)
      ),
    [releases, checklistPorRelease]
  )

  const releasesRollback = useMemo(
    () => releases.filter((release) => release.rollback_preparado),
    [releases]
  )

  const releasesComunicacion = useMemo(
    () => releases.filter((release) => release.comunicacion_requerida),
    [releases]
  )

  const releasesCerradosRecientemente = useMemo(
    () =>
      releases
        .filter((release) => release.estado === 'cerrado' && normalizarFechaPortal(release.updated_at) >= hace30Dias)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 6),
    [releases, hace30Dias]
  )

  const resumenGobierno = useMemo(() => {
    const releaseIds = new Set(releases.map((release) => release.id))
    const riesgosRelacionados = riesgosGobierno.filter((riesgo) => releaseIds.has(riesgo.release_id ?? ''))
    const dependenciasRelacionadas = dependenciasGobierno.filter((dependencia) => releaseIds.has(dependencia.release_id ?? ''))

    return {
      riesgosAbiertos: riesgosRelacionados.filter((riesgo) => riesgo.estado !== 'cerrado').length,
      riesgosAltos: riesgosRelacionados.filter((riesgo) => riesgo.estado !== 'cerrado' && ['alta', 'critica'].includes(riesgo.criticidad)).length,
      dependenciasAbiertas: dependenciasRelacionadas.filter((dependencia) => dependencia.estado !== 'resuelta').length,
      dependenciasBloqueantes: dependenciasRelacionadas.filter((dependencia) => dependencia.estado === 'bloqueante').length
    }
  }, [releases, riesgosGobierno, dependenciasGobierno])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen de lanzamientos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consolida releases, checklist de salida y señales operativas para seguimiento post-lanzamiento sin volverlo obligatorio para otros módulos.
          </p>
        </div>
        <NavegacionLanzamientos />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="">
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total releases</p>
              <p className="mt-2 text-2xl font-semibold">{releases.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Próximos</p>
              <p className="mt-2 text-2xl font-semibold">{proximos.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Checklist incompleto</p>
              <p className="mt-2 text-2xl font-semibold">{releasesChecklistIncompleto.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rollback preparado</p>
              <p className="mt-2 text-2xl font-semibold">{releasesRollback.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Requieren comunicación</p>
              <p className="mt-2 text-2xl font-semibold">{releasesComunicacion.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Riesgos abiertos</p>
              <p className="mt-2 text-2xl font-semibold">{resumenGobierno.riesgosAbiertos}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Dependencias bloqueantes</p>
              <p className="mt-2 text-2xl font-semibold">{resumenGobierno.dependenciasBloqueantes}</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Total releases por estado</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Distribución operativa del módulo Lanzamientos.</p>
                </div>
                <Link to="/lanzamientos/releases" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                  Ir a Releases
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {distribucionEstado.map((item) => (
                  <div key={item.estado} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {formatearEstadoRelease(item.estado)}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{item.total}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-semibold">Cierres recientes</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Releases cerrados recientemente durante los últimos 30 días.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Total cerrados recientemente</p>
                  <p className="mt-1 text-2xl font-semibold">{releasesCerradosRecientemente.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Gobierno ligado a releases</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {resumenGobierno.riesgosAltos} riesgos altos y {resumenGobierno.dependenciasAbiertas} dependencias abiertas.
                  </p>
                </div>
                <Link to="/lanzamientos/seguimiento" className="block rounded-lg border border-slate-200 px-3 py-3 text-sm transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600">
                  Ver Seguimiento post-lanzamiento
                </Link>
                <Link to="/gobierno" className="block rounded-lg border border-slate-200 px-3 py-3 text-sm transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600">
                  Ver Resumen de gobierno
                </Link>
              </div>
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Releases próximos por fecha programada</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Próximos releases ordenados por fecha programada.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {proximos.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    No hay releases próximos.
                  </div>
                ) : (
                  proximos.map((release) => (
                    <div key={release.id} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{release.codigo} · {release.nombre}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatearEstadoRelease(release.estado)}</p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{normalizarFechaPortal(release.fecha_programada)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Releases recientes</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Últimos movimientos del módulo Lanzamientos.</p>
                </div>
                <Link to="/trazabilidad" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                  Ver trazabilidad
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {recientes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Lanzamientos todavía no tiene registros.
                  </div>
                ) : (
                  recientes.map((release) => {
                    const items = checklistPorRelease.get(release.id) ?? []
                    const incompletos = items.filter((item) => !item.completado).length

                    return (
                      <div key={release.id} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{release.codigo} · {release.nombre}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {formatearEstadoRelease(release.estado)}
                              {incompletos > 0 ? ` · ${incompletos} items pendientes` : ' · Checklist al día'}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{normalizarFechaPortal(release.updated_at)}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </article>
          </div>
        </>
      </EstadoVista>
    </section>
  )
}