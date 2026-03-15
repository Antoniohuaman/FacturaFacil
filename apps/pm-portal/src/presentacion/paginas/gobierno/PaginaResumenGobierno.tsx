import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  criticidadesGobiernoPm,
  estadosDependenciaPm,
  estadosRiesgoPm,
  formatearCriticidadGobierno,
  formatearEstadoDependencia,
  formatearEstadoRiesgo,
  formatearInfluenciaStakeholder,
  formatearTipoStakeholder,
  influenciasStakeholderPm,
  tiposStakeholderPm,
  type DependenciaPm,
  type RiesgoPm
} from '@/dominio/modelos'
import { obtenerResumenGobierno } from '@/aplicacion/casos-uso/gobierno'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import { NavegacionGobierno } from '@/presentacion/paginas/gobierno/NavegacionGobierno'

type ResumenGobierno = Awaited<ReturnType<typeof obtenerResumenGobierno>>

function inicioDia(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}

function topRegistros<T extends string>(items: T[]) {
  return Array.from(
    items.reduce((mapa, item) => mapa.set(item, (mapa.get(item) ?? 0) + 1), new Map<T, number>()).entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
}

function clasesEstado(estado: 'saludable' | 'atencion' | 'riesgo') {
  if (estado === 'saludable') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
  }

  if (estado === 'riesgo') {
    return 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
  }

  return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
}

function estadoSenal(valor: number, umbralRiesgo: number, umbralAtencion: number) {
  if (valor >= umbralRiesgo) {
    return 'riesgo' as const
  }

  if (valor >= umbralAtencion) {
    return 'atencion' as const
  }

  return 'saludable' as const
}

function contarProximosVencimientos(riesgos: RiesgoPm[], dependencias: DependenciaPm[], desde: string, hasta: string) {
  const riesgosProximos = riesgos.filter(
    (riesgo) => riesgo.estado !== 'cerrado' && riesgo.fecha_objetivo && riesgo.fecha_objetivo >= desde && riesgo.fecha_objetivo <= hasta
  )
  const dependenciasProximas = dependencias.filter(
    (dependencia) => dependencia.estado !== 'resuelta' && dependencia.fecha_objetivo && dependencia.fecha_objetivo >= desde && dependencia.fecha_objetivo <= hasta
  )

  return [...riesgosProximos, ...dependenciasProximas].length
}

export function PaginaResumenGobierno() {
  const [fuentes, setFuentes] = useState<ResumenGobierno | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const resultado = await obtenerResumenGobierno()
        setFuentes(resultado)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar Gobierno')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [])

  const metricas = useMemo(() => {
    if (!fuentes) {
      return null
    }

    const hoy = new Date()
    const desde = inicioDia(hoy)
    hoy.setDate(hoy.getDate() + 14)
    const hasta = inicioDia(hoy)

    const stakeholdersActivos = fuentes.stakeholders.filter((stakeholder) => stakeholder.estado === 'activo')
    const stakeholdersCriticos = fuentes.stakeholders.filter(
      (stakeholder) => stakeholder.estado !== 'inactivo' && stakeholder.influencia === 'alta'
    )
    const riesgosAbiertos = fuentes.riesgos.filter((riesgo) => riesgo.estado !== 'cerrado')
    const riesgosAltos = riesgosAbiertos.filter((riesgo) => ['alta', 'critica'].includes(riesgo.criticidad))
    const dependenciasAbiertas = fuentes.dependencias.filter((dependencia) => dependencia.estado !== 'resuelta')
    const dependenciasCriticas = dependenciasAbiertas.filter(
      (dependencia) => dependencia.estado === 'bloqueante' || ['alta', 'critica'].includes(dependencia.criticidad)
    )
    const proximosVencimientos = contarProximosVencimientos(fuentes.riesgos, fuentes.dependencias, desde, hasta)

    const alertas: Array<{ titulo: string; detalle: string; estado: 'saludable' | 'atencion' | 'riesgo' }> = []

    if (riesgosAltos.length > 0) {
      alertas.push({
        titulo: 'Riesgos altos o críticos abiertos',
        detalle: `${riesgosAltos.length} riesgos requieren seguimiento prioritario o mitigación activa.`,
        estado: estadoSenal(riesgosAltos.length, 4, 1)
      })
    }

    if (dependenciasCriticas.length > 0) {
      alertas.push({
        titulo: 'Dependencias bloqueantes o críticas',
        detalle: `${dependenciasCriticas.length} dependencias pueden frenar iniciativas, entregas o releases.`,
        estado: estadoSenal(dependenciasCriticas.length, 3, 1)
      })
    }

    if (proximosVencimientos > 0) {
      alertas.push({
        titulo: 'Próximos vencimientos de gobierno',
        detalle: `${proximosVencimientos} riesgos o dependencias vencen en los próximos 14 días.`,
        estado: estadoSenal(proximosVencimientos, 6, 2)
      })
    }

    if (stakeholdersCriticos.length > 0) {
      alertas.push({
        titulo: 'Stakeholders de alta influencia',
        detalle: `${stakeholdersCriticos.length} stakeholders de alta influencia se mantienen activos o en seguimiento.`,
        estado: estadoSenal(stakeholdersCriticos.length, 6, 2)
      })
    }

    return {
      stakeholdersActivos: stakeholdersActivos.length,
      stakeholdersCriticos: stakeholdersCriticos.length,
      riesgosAbiertos: riesgosAbiertos.length,
      riesgosAltos: riesgosAltos.length,
      dependenciasAbiertas: dependenciasAbiertas.length,
      dependenciasCriticas: dependenciasCriticas.length,
      proximosVencimientos,
      distribucionRiesgosEstado: estadosRiesgoPm.map((estado) => ({
        etiqueta: formatearEstadoRiesgo(estado),
        total: fuentes.riesgos.filter((riesgo) => riesgo.estado === estado).length
      })),
      distribucionRiesgosCriticidad: criticidadesGobiernoPm.map((criticidad) => ({
        etiqueta: formatearCriticidadGobierno(criticidad),
        total: fuentes.riesgos.filter((riesgo) => riesgo.criticidad === criticidad).length
      })),
      distribucionDependenciasEstado: estadosDependenciaPm.map((estado) => ({
        etiqueta: formatearEstadoDependencia(estado),
        total: fuentes.dependencias.filter((dependencia) => dependencia.estado === estado).length
      })),
      stakeholdersPorTipo: tiposStakeholderPm.map((tipo) => ({
        etiqueta: formatearTipoStakeholder(tipo),
        total: fuentes.stakeholders.filter((stakeholder) => stakeholder.tipo === tipo).length
      })),
      stakeholdersPorInfluencia: influenciasStakeholderPm.map((influencia) => ({
        etiqueta: formatearInfluenciaStakeholder(influencia),
        total: fuentes.stakeholders.filter((stakeholder) => stakeholder.influencia === influencia).length
      })),
      stakeholdersPorArea: topRegistros(
        fuentes.stakeholders.map((stakeholder) => stakeholder.area.trim()).filter(Boolean)
      ),
      vencimientos: [
        ...fuentes.riesgos
          .filter((riesgo) => riesgo.estado !== 'cerrado' && riesgo.fecha_objetivo)
          .map((riesgo) => ({
            id: riesgo.id,
            tipo: 'Riesgo',
            titulo: `${riesgo.codigo} · ${riesgo.titulo}`,
            fecha: riesgo.fecha_objetivo as string,
            ruta: '/gobierno/riesgos'
          })),
        ...fuentes.dependencias
          .filter((dependencia) => dependencia.estado !== 'resuelta' && dependencia.fecha_objetivo)
          .map((dependencia) => ({
            id: dependencia.id,
            tipo: 'Dependencia',
            titulo: `${dependencia.codigo} · ${dependencia.titulo}`,
            fecha: dependencia.fecha_objetivo as string,
            ruta: '/gobierno/dependencias'
          }))
      ]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 8),
      alertas
    }
  }, [fuentes])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen de gobierno</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Lectura ejecutiva de stakeholders, riesgos y dependencias con foco en atención temprana, vencimientos y señales organizacionales transversales.
          </p>
        </div>
        <NavegacionGobierno />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={!metricas} mensajeVacio="Gobierno todavía no tiene datos disponibles.">
        {metricas ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Stakeholders activos</p>
                <p className="mt-2 text-2xl font-semibold">{metricas.stakeholdersActivos}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metricas.stakeholdersCriticos} de alta influencia</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Riesgos abiertos</p>
                <p className="mt-2 text-2xl font-semibold">{metricas.riesgosAbiertos}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metricas.riesgosAltos} altos o críticos</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Dependencias abiertas</p>
                <p className="mt-2 text-2xl font-semibold">{metricas.dependenciasAbiertas}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metricas.dependenciasCriticas} bloqueantes o críticas</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Próximos vencimientos</p>
                <p className="mt-2 text-2xl font-semibold">{metricas.proximosVencimientos}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Próximos 14 días</p>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Alertas ejecutivas de gobierno</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Señales priorizadas para seguimiento directivo.</p>
                  </div>
                  <Link to="/gobierno/riesgos" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                    Ver Riesgos
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {metricas.alertas.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400 md:col-span-2">
                      No hay alertas activas; Gobierno está estable con la información actual.
                    </div>
                  ) : (
                    metricas.alertas.map((alerta, indice) => (
                      <article key={`${alerta.titulo}-${indice}`} className={`rounded-xl border p-4 ${clasesEstado(alerta.estado)}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{alerta.titulo}</p>
                          <span className="rounded-full bg-white/70 px-2 py-1 text-xs uppercase dark:bg-slate-900/40">
                            {alerta.estado}
                          </span>
                        </div>
                        <p className="mt-2 text-sm opacity-90">{alerta.detalle}</p>
                      </article>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Próximos vencimientos</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Riesgos y dependencias ordenados por fecha objetivo.</p>
                  </div>
                  <Link to="/gobierno/dependencias" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                    Ver Dependencias
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {metricas.vencimientos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No hay vencimientos próximos registrados.
                    </div>
                  ) : (
                    metricas.vencimientos.map((item) => (
                      <Link
                        key={item.id}
                        to={item.ruta}
                        className="block rounded-lg border border-slate-200 px-3 py-3 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.tipo}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{item.titulo}</p>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatearFechaCorta(item.fecha)}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold">Distribución de riesgos</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium">Por estado</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {metricas.distribucionRiesgosEstado.map((item) => (
                        <div key={item.etiqueta} className="flex items-center justify-between gap-3">
                          <span>{item.etiqueta}</span>
                          <span className="font-medium">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium">Por criticidad</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {metricas.distribucionRiesgosCriticidad.map((item) => (
                        <div key={item.etiqueta} className="flex items-center justify-between gap-3">
                          <span>{item.etiqueta}</span>
                          <span className="font-medium">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold">Dependencias y stakeholders</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium">Dependencias por estado</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {metricas.distribucionDependenciasEstado.map((item) => (
                        <div key={item.etiqueta} className="flex items-center justify-between gap-3">
                          <span>{item.etiqueta}</span>
                          <span className="font-medium">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium">Stakeholders por tipo</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {metricas.stakeholdersPorTipo.map((item) => (
                        <div key={item.etiqueta} className="flex items-center justify-between gap-3">
                          <span>{item.etiqueta}</span>
                          <span className="font-medium">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold">Stakeholders por influencia</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {metricas.stakeholdersPorInfluencia.map((item) => (
                    <div key={item.etiqueta} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.etiqueta}</p>
                      <p className="mt-2 text-2xl font-semibold">{item.total}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold">Stakeholders por área</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {metricas.stakeholdersPorArea.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Todavía no hay áreas registradas.
                    </div>
                  ) : (
                    metricas.stakeholdersPorArea.map(([area, total]) => (
                      <div key={area} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                        <span>{area}</span>
                        <span className="font-medium">{total}</span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </div>
          </>
        ) : null}
      </EstadoVista>
    </section>
  )
}