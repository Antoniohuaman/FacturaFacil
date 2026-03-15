import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { obtenerFuentesResumenAnalitico } from '@/aplicacion/casos-uso/analitica'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'

type FuentesResumenAnalitico = Awaited<ReturnType<typeof obtenerFuentesResumenAnalitico>>

function esReciente(fecha: string | null | undefined, dias: number) {
  if (!fecha) {
    return false
  }

  const fechaBase = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`)
  if (Number.isNaN(fechaBase.getTime())) {
    return false
  }

  const limite = new Date()
  limite.setDate(limite.getDate() - dias)
  return fechaBase >= limite
}

function promedio(valores: number[]) {
  if (valores.length === 0) {
    return null
  }

  return Number((valores.reduce((acumulado, actual) => acumulado + actual, 0) / valores.length).toFixed(1))
}

function obtenerEstadoSenal(valor: number, riesgo: number, atencion: number) {
  if (valor >= riesgo) {
    return 'riesgo'
  }

  if (valor >= atencion) {
    return 'atencion'
  }

  return 'saludable'
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

interface SenalEjecutivaResumen {
  codigo: string
  nombre: string
  valor: number
  estado: 'saludable' | 'atencion' | 'riesgo'
  detalle: string
}

export function PaginaResumenAnalitico() {
  const [fuentes, setFuentes] = useState<FuentesResumenAnalitico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const resultado = await obtenerFuentesResumenAnalitico()
        setFuentes(resultado)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar Analítica')
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

    const bugsAbiertos = fuentes.bugs.filter((bug) => !['resuelto', 'cerrado'].includes(bug.estado))
    const bugsCriticos = bugsAbiertos.filter((bug) => bug.prioridad === 'alta')
    const bloqueosAbiertos = fuentes.bloqueos.filter((bloqueo) => bloqueo.estado !== 'resuelto')
    const bloqueosCriticos = bloqueosAbiertos.filter((bloqueo) => bloqueo.prioridad === 'alta')
    const mejorasPendientes = fuentes.mejoras.filter((mejora) => !['implementada', 'cerrada'].includes(mejora.estado))
    const deudaActiva = fuentes.deudas.filter((deuda) => !['resuelta', 'descartada'].includes(deuda.estado))
    const hallazgosAbiertos = fuentes.hallazgos.filter((hallazgo) => hallazgo.estado_codigo !== 'cerrado')
    const stakeholdersActivos = fuentes.stakeholders.filter((stakeholder) => stakeholder.estado === 'activo')
    const riesgosGobiernoAbiertos = fuentes.riesgosGobierno.filter((riesgo) => riesgo.estado !== 'cerrado')
    const riesgosGobiernoAltos = riesgosGobiernoAbiertos.filter((riesgo) => ['alta', 'critica'].includes(riesgo.criticidad))
    const dependenciasGobiernoAbiertas = fuentes.dependenciasGobierno.filter((dependencia) => dependencia.estado !== 'resuelta')
    const dependenciasGobiernoCriticas = dependenciasGobiernoAbiertas.filter(
      (dependencia) => dependencia.estado === 'bloqueante' || ['alta', 'critica'].includes(dependencia.criticidad)
    )
    const releasesRecientes = [...fuentes.releases]
      .sort((a, b) => (b.fecha_lanzamiento_real ?? b.fecha_programada).localeCompare(a.fecha_lanzamiento_real ?? a.fecha_programada))
      .slice(0, 6)
    const validacionesRecientes = fuentes.ejecuciones.filter((ejecucion) => esReciente(ejecucion.fecha_ejecucion, 30))
    const decisionesRecientes = fuentes.decisiones.filter((decision) => esReciente(decision.fecha_decision, 30))
    const leccionesRecientes = fuentes.lecciones.filter((leccion) => esReciente(leccion.fecha_leccion, 30))
    const objetivosEstrategicosActivos = fuentes.objetivosEstrategicos.filter((objetivo) => objetivo.estado !== 'completado')
    const insightsRecientes = fuentes.insights.filter((insight) => insight.estado !== 'completado')
    const hipotesisDiscoveryActivas = fuentes.hipotesisDiscovery.filter((hipotesis) => hipotesis.estado !== 'completado')
    const backlogFuncional = [
      ...fuentes.historias.filter((historia) => historia.estado !== 'completado'),
      ...fuentes.casosUso.filter((caso) => caso.estado !== 'completado'),
      ...fuentes.requerimientosNoFuncionales.filter((rnf) => rnf.estado !== 'completado')
    ].length

    const distribucionIniciativas = [
      { estado: 'Pendiente', total: fuentes.iniciativas.filter((iniciativa) => iniciativa.estado === 'pendiente').length },
      { estado: 'En progreso', total: fuentes.iniciativas.filter((iniciativa) => iniciativa.estado === 'en_progreso').length },
      { estado: 'Completado', total: fuentes.iniciativas.filter((iniciativa) => iniciativa.estado === 'completado').length }
    ]

    const modulosPorCodigo = new Map(fuentes.modulos.map((modulo) => [modulo.codigo, modulo.nombre]))
    const healthPorModulo = new Map<string, number[]>()

    for (const score of fuentes.healthScores) {
      if (!score.modulo_codigo || score.valor_actual === null) {
        continue
      }

      const existentes = healthPorModulo.get(score.modulo_codigo) ?? []
      existentes.push(score.valor_actual)
      healthPorModulo.set(score.modulo_codigo, existentes)
    }

    const resumenModulos = Array.from(modulosPorCodigo.entries())
      .map(([codigo, nombre]) => ({
        codigo,
        nombre,
        bugsAbiertos: bugsAbiertos.filter((bug) => bug.modulo_codigo === codigo).length,
        bloqueosAbiertos: bloqueosAbiertos.filter((bloqueo) => bloqueo.modulo_codigo === codigo).length,
        mejorasPendientes: mejorasPendientes.filter((mejora) => mejora.modulo_codigo === codigo).length,
        deudaActiva: deudaActiva.filter((deuda) => deuda.modulo_codigo === codigo).length,
        hallazgosAbiertos: hallazgosAbiertos.filter((hallazgo) => hallazgo.modulo_id === null && codigo === 'auditorias').length,
        health: promedio(healthPorModulo.get(codigo) ?? [])
      }))
      .filter((modulo) => modulo.bugsAbiertos + modulo.bloqueosAbiertos + modulo.mejorasPendientes + modulo.deudaActiva + modulo.hallazgosAbiertos > 0 || modulo.health !== null)
      .sort((a, b) => (b.bugsAbiertos + b.bloqueosAbiertos + b.hallazgosAbiertos) - (a.bugsAbiertos + a.bloqueosAbiertos + a.hallazgosAbiertos))
      .slice(0, 6)

    const issuesCriticos = [
      ...bugsCriticos.map((bug) => ({
        id: bug.id,
        tipo: 'Bug crítico',
        titulo: `${bug.codigo} · ${bug.titulo}`,
        detalle: bug.impacto_operativo ?? 'Impacto operativo alto',
        fecha: bug.fecha_reporte,
        ruta: '/operacion/bugs'
      })),
      ...bloqueosCriticos.map((bloqueo) => ({
        id: bloqueo.id,
        tipo: 'Bloqueo crítico',
        titulo: `${bloqueo.codigo} · ${bloqueo.titulo}`,
        detalle: bloqueo.impacto_operativo,
        fecha: bloqueo.fecha_reporte,
        ruta: '/operacion/bloqueos'
      })),
      ...hallazgosAbiertos.map((hallazgo) => ({
        id: hallazgo.id,
        tipo: 'Hallazgo abierto',
        titulo: hallazgo.titulo,
        detalle: `Severidad ${hallazgo.severidad_codigo}`,
        fecha: hallazgo.created_at,
        ruta: '/auditorias'
      }))
    ]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 8)

    const senales: SenalEjecutivaResumen[] = [
      {
        codigo: 'operacion',
        nombre: 'Operación',
        valor: bugsAbiertos.length + bloqueosAbiertos.length + deudaActiva.length,
        estado: obtenerEstadoSenal(bugsCriticos.length + bloqueosCriticos.length + deudaActiva.length, 6, 2),
        detalle: `${bugsAbiertos.length} bugs abiertos, ${bloqueosAbiertos.length} bloqueos y ${deudaActiva.length} deudas activas`
      },
      {
        codigo: 'delivery',
        nombre: 'Delivery',
        valor: fuentes.releases.filter((release) => !['lanzado', 'cerrado'].includes(release.estado)).length,
        estado: obtenerEstadoSenal(
          fuentes.releases.filter((release) => release.estado === 'revertido').length +
            Math.max(fuentes.releases.filter((release) => release.estado === 'planificado').length - validacionesRecientes.length, 0),
          3,
          1
        ),
        detalle: `${validacionesRecientes.length} validaciones recientes frente a ${fuentes.releases.length} releases registrados`
      },
      {
        codigo: 'gobierno',
        nombre: 'Gobierno',
        valor: riesgosGobiernoAbiertos.length + dependenciasGobiernoAbiertas.length,
        estado: obtenerEstadoSenal(riesgosGobiernoAltos.length + dependenciasGobiernoCriticas.length, 6, 2),
        detalle: `${stakeholdersActivos.length} stakeholders activos, ${riesgosGobiernoAbiertos.length} riesgos abiertos y ${dependenciasGobiernoAbiertas.length} dependencias abiertas`
      }
    ]

    return {
      totalObjetivosEstrategicos: fuentes.objetivosEstrategicos.length,
      totalIniciativasActivas: fuentes.iniciativas.filter((iniciativa) => iniciativa.estado !== 'completado').length,
      totalEntregas: fuentes.entregas.length,
      totalReleases: fuentes.releases.length,
      totalBugsAbiertos: bugsAbiertos.length,
      totalBloqueosAbiertos: bloqueosAbiertos.length,
      totalValidacionesRecientes: validacionesRecientes.length,
      totalDecisionesRecientes: decisionesRecientes.length,
      totalHallazgosAbiertos: hallazgosAbiertos.length,
      totalStakeholdersActivos: stakeholdersActivos.length,
      totalRiesgosGobiernoAbiertos: riesgosGobiernoAbiertos.length,
      totalDependenciasGobiernoAbiertas: dependenciasGobiernoAbiertas.length,
      totalMejorasPendientes: mejorasPendientes.length,
      totalDeudaTecnicaActiva: deudaActiva.length,
      totalLeccionesRecientes: leccionesRecientes.length,
      distribucionIniciativas,
      releasesRecientes,
      issuesCriticos,
      resumenModulos,
      senales,
      complementario: {
        estrategia: `${objetivosEstrategicosActivos.length} objetivos activos, ${fuentes.kpisEstrategicos.length} KPIs estratégicos y ${fuentes.periodosEstrategicos.filter((periodo) => periodo.activo).length} períodos activos`,
        discovery: `${insightsRecientes.length} insights activos y ${hipotesisDiscoveryActivas.length} hipótesis discovery abiertas`,
        requerimientos: `${backlogFuncional} piezas funcionales pendientes y ${fuentes.reglasNegocio.length} reglas de negocio registradas`,
        roadmapBase: `${fuentes.objetivos.length} objetivos roadmap base y ${fuentes.entregas.length} entregas consolidadas`,
        auditorias: `${fuentes.auditorias.length} auditorías y ${hallazgosAbiertos.length} hallazgos abiertos`,
        gobierno: `${stakeholdersActivos.length} stakeholders activos, ${riesgosGobiernoAltos.length} riesgos altos y ${dependenciasGobiernoCriticas.length} dependencias críticas`
      }
    }
  }, [fuentes])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen de analítica</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Visión ejecutiva transversal del portal con lectura consolidada de estrategia, delivery, validación, operación, auditoría y gobierno.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={!metricas} mensajeVacio="No hay datos analíticos disponibles.">
        {metricas ? (
          <>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              {[
                ['Objetivos estratégicos', metricas.totalObjetivosEstrategicos],
                ['Iniciativas activas', metricas.totalIniciativasActivas],
                ['Entregas', metricas.totalEntregas],
                ['Releases', metricas.totalReleases],
                ['Bugs abiertos', metricas.totalBugsAbiertos],
                ['Bloqueos abiertos', metricas.totalBloqueosAbiertos],
                ['Validaciones recientes', metricas.totalValidacionesRecientes],
                ['Decisiones recientes', metricas.totalDecisionesRecientes],
                ['Hallazgos abiertos', metricas.totalHallazgosAbiertos],
                ['Stakeholders activos', metricas.totalStakeholdersActivos],
                ['Riesgos abiertos', metricas.totalRiesgosGobiernoAbiertos],
                ['Dependencias abiertas', metricas.totalDependenciasGobiernoAbiertas],
                ['Mejoras pendientes', metricas.totalMejorasPendientes],
                ['Deuda técnica activa', metricas.totalDeudaTecnicaActiva],
                ['Lecciones recientes', metricas.totalLeccionesRecientes]
              ].map(([titulo, valor]) => (
                <article key={titulo} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{titulo}</p>
                  <p className="mt-2 text-2xl font-semibold">{valor}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Señales ejecutivas</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Lectura rápida de riesgo, atención y salud transversal.</p>
                  </div>
                  <Link to="/analitica/health-scores" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                    Ver health scores
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {metricas.senales.map((senal) => (
                    <article key={senal.codigo} className={`rounded-xl border p-4 ${clasesEstado(senal.estado)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{senal.nombre}</p>
                        <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-medium uppercase dark:bg-slate-900/40">
                          {senal.estado}
                        </span>
                      </div>
                      <p className="mt-3 text-2xl font-semibold">{senal.valor}</p>
                      <p className="mt-2 text-sm opacity-90">{senal.detalle}</p>
                    </article>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Distribución de iniciativas</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Estado actual del pipeline roadmap.</p>
                  </div>
                  <Link to="/roadmap/iniciativas" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                    Ver iniciativas
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {metricas.distribucionIniciativas.map((item) => {
                    const totalBase = Math.max(metricas.totalIniciativasActivas, 1)
                    const porcentaje = Math.min(100, Math.round((item.total / totalBase) * 100))

                    return (
                      <div key={item.estado} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span>{item.estado}</span>
                          <span className="font-medium">{item.total}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div className="h-2 rounded-full bg-slate-900 dark:bg-slate-200" style={{ width: `${String(porcentaje)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Releases recientes</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Últimos lanzamientos o programaciones visibles en el portafolio.</p>
                  </div>
                  <Link to="/lanzamientos/releases" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                    Ver releases
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {metricas.releasesRecientes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No hay releases disponibles.
                    </div>
                  ) : (
                    metricas.releasesRecientes.map((release) => (
                      <Link
                        key={release.id}
                        to="/lanzamientos/releases"
                        className="block rounded-lg border border-slate-200 px-3 py-3 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{release.codigo}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{release.nombre}</p>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {normalizarFechaPortal(release.fecha_lanzamiento_real ?? release.fecha_programada)}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Issues operativos críticos</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Bugs, bloqueos y hallazgos que requieren atención ejecutiva.</p>
                  </div>
                  <Link to="/operacion" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                    Ver operación
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {metricas.issuesCriticos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No hay issues críticos abiertos.
                    </div>
                  ) : (
                    metricas.issuesCriticos.map((issue) => (
                      <Link
                        key={`${issue.tipo}-${issue.id}`}
                        to={issue.ruta}
                        className="block rounded-lg border border-slate-200 px-3 py-3 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                      >
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{issue.tipo}</p>
                        <p className="mt-1 font-medium">{issue.titulo}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{issue.detalle}</p>
                      </Link>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Cobertura transversal</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Integración ligera con estrategia, discovery, requerimientos y auditoría.</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Estrategia</p>
                    <p className="mt-1">{metricas.complementario.estrategia}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Discovery</p>
                    <p className="mt-1">{metricas.complementario.discovery}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Requerimientos</p>
                    <p className="mt-1">{metricas.complementario.requerimientos}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Roadmap base</p>
                    <p className="mt-1">{metricas.complementario.roadmapBase}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Auditorías</p>
                    <p className="mt-1">{metricas.complementario.auditorias}</p>
                  </div>
                </div>
              </article>
            </div>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Resumen por módulo</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Concentración de issues operativos y health score disponible por módulo.</p>
                </div>
                <Link to="/analitica/portafolio" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                  Ver portafolio
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {metricas.resumenModulos.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Aún no hay señal operativa agrupable por módulo.
                  </div>
                ) : (
                  metricas.resumenModulos.map((modulo) => (
                    <article key={modulo.codigo} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{modulo.nombre}</p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{modulo.codigo}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <span>Bugs abiertos</span>
                        <span className="text-right font-medium">{modulo.bugsAbiertos}</span>
                        <span>Bloqueos</span>
                        <span className="text-right font-medium">{modulo.bloqueosAbiertos}</span>
                        <span>Mejoras pendientes</span>
                        <span className="text-right font-medium">{modulo.mejorasPendientes}</span>
                        <span>Deuda activa</span>
                        <span className="text-right font-medium">{modulo.deudaActiva}</span>
                        <span>Hallazgos</span>
                        <span className="text-right font-medium">{modulo.hallazgosAbiertos}</span>
                        <span>Health score</span>
                        <span className="text-right font-medium">{modulo.health ?? 'Sin dato'}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </article>
          </>
        ) : null}
      </EstadoVista>
    </section>
  )
}