import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { estadosRegistro, type HipotesisDiscoveryPm, type InsightDiscoveryPm, type InvestigacionDiscoveryPm, type ProblemaOportunidadDiscoveryPm, type SegmentoDiscoveryPm } from '@/dominio/modelos'
import {
  listarHipotesisDiscovery,
  listarInsightsDiscovery,
  listarInvestigacionesDiscovery,
  listarProblemasOportunidadesDiscovery,
  listarRelHipotesisDiscoveryIniciativa,
  listarRelInsightDecision,
  listarRelInsightProblema,
  listarRelProblemaObjetivoEstrategico,
  listarSegmentosDiscovery
} from '@/aplicacion/casos-uso/discovery'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivosEstrategicos } from '@/aplicacion/casos-uso/estrategia'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { formatearEstadoLegible, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { NavegacionDiscovery } from '@/presentacion/paginas/discovery/NavegacionDiscovery'

interface RegistroReciente {
  id: string
  entidad: string
  ruta: string
  titulo: string
  descripcion: string
  estado: string | null
  fecha: string
  vinculacion: string | null
}

function construirRecientes(
  segmentos: SegmentoDiscoveryPm[],
  insights: InsightDiscoveryPm[],
  problemas: ProblemaOportunidadDiscoveryPm[],
  investigaciones: InvestigacionDiscoveryPm[],
  hipotesis: HipotesisDiscoveryPm[],
  problemasPorInsight: Map<string, number>,
  decisionesPorInsight: Map<string, number>,
  objetivosPorProblema: Map<string, number>,
  iniciativasPorHipotesis: Map<string, number>
) {
  const registros: RegistroReciente[] = [
    ...segmentos.map((segmento) => ({
      id: segmento.id,
      entidad: 'Segmento',
      ruta: '/discovery/segmentos',
      titulo: segmento.nombre,
      descripcion: segmento.descripcion ?? segmento.contexto ?? 'Segmento de discovery',
      estado: segmento.activo ? 'activo' : 'inactivo',
      fecha: segmento.updated_at,
      vinculacion: null
    })),
    ...insights.map((insight) => ({
      id: insight.id,
      entidad: 'Insight',
      ruta: '/discovery/insights',
      titulo: insight.titulo,
      descripcion: insight.fuente,
      estado: insight.estado,
      fecha: insight.updated_at,
      vinculacion: `${problemasPorInsight.get(insight.id) ?? 0} problemas · ${decisionesPorInsight.get(insight.id) ?? 0} decisiones`
    })),
    ...problemas.map((problema) => ({
      id: problema.id,
      entidad: problema.tipo === 'problema' ? 'Problema' : 'Oportunidad',
      ruta: '/discovery/problemas',
      titulo: problema.titulo,
      descripcion: problema.impacto,
      estado: problema.estado,
      fecha: problema.updated_at,
      vinculacion: `${objetivosPorProblema.get(problema.id) ?? 0} objetivos estratégicos`
    })),
    ...investigaciones.map((investigacion) => ({
      id: investigacion.id,
      entidad: 'Investigación',
      ruta: '/discovery/investigaciones',
      titulo: investigacion.titulo,
      descripcion: investigacion.tipo_investigacion,
      estado: investigacion.estado,
      fecha: investigacion.updated_at,
      vinculacion: null
    })),
    ...hipotesis.map((hipotesisItem) => ({
      id: hipotesisItem.id,
      entidad: 'Hipótesis discovery',
      ruta: '/discovery/hipotesis',
      titulo: hipotesisItem.titulo,
      descripcion: hipotesisItem.resultado_esperado,
      estado: hipotesisItem.estado,
      fecha: hipotesisItem.updated_at,
      vinculacion: `${iniciativasPorHipotesis.get(hipotesisItem.id) ?? 0} iniciativas`
    }))
  ]

  return registros.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8)
}

export function PaginaResumenDiscovery() {
  const [segmentos, setSegmentos] = useState<SegmentoDiscoveryPm[]>([])
  const [insights, setInsights] = useState<InsightDiscoveryPm[]>([])
  const [problemas, setProblemas] = useState<ProblemaOportunidadDiscoveryPm[]>([])
  const [investigaciones, setInvestigaciones] = useState<InvestigacionDiscoveryPm[]>([])
  const [hipotesis, setHipotesis] = useState<HipotesisDiscoveryPm[]>([])
  const [totalObjetivosEstrategicos, setTotalObjetivosEstrategicos] = useState(0)
  const [totalIniciativas, setTotalIniciativas] = useState(0)
  const [totalDecisiones, setTotalDecisiones] = useState(0)
  const [relProblemaObjetivo, setRelProblemaObjetivo] = useState(0)
  const [relHipotesisIniciativa, setRelHipotesisIniciativa] = useState(0)
  const [relInsightDecision, setRelInsightDecisionCount] = useState(0)
  const [problemasPorInsight, setProblemasPorInsight] = useState<Map<string, number>>(new Map())
  const [decisionesPorInsight, setDecisionesPorInsight] = useState<Map<string, number>>(new Map())
  const [objetivosPorProblema, setObjetivosPorProblema] = useState<Map<string, number>>(new Map())
  const [iniciativasPorHipotesis, setIniciativasPorHipotesis] = useState<Map<string, number>>(new Map())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [
        segmentosData,
        insightsData,
        problemasData,
        investigacionesData,
        hipotesisData,
        relProblemasInsightsData,
        relProblemasObjetivosData,
        relHipotesisIniciativasData,
        relInsightsDecisionesData,
        objetivosData,
        iniciativasData,
        decisionesData
      ] = await Promise.all([
        listarSegmentosDiscovery(),
        listarInsightsDiscovery(),
        listarProblemasOportunidadesDiscovery(),
        listarInvestigacionesDiscovery(),
        listarHipotesisDiscovery(),
        listarRelInsightProblema(),
        listarRelProblemaObjetivoEstrategico(),
        listarRelHipotesisDiscoveryIniciativa(),
        listarRelInsightDecision(),
        listarObjetivosEstrategicos(),
        listarIniciativas(),
        listarDecisionesPm()
      ])

      setSegmentos(segmentosData)
      setInsights(insightsData)
      setProblemas(problemasData)
      setInvestigaciones(investigacionesData)
      setHipotesis(hipotesisData)
      setTotalObjetivosEstrategicos(objetivosData.length)
      setTotalIniciativas(iniciativasData.length)
      setTotalDecisiones(decisionesData.length)
      setRelProblemaObjetivo(relProblemasObjetivosData.length)
      setRelHipotesisIniciativa(relHipotesisIniciativasData.length)
      setRelInsightDecisionCount(relInsightsDecisionesData.length)

      setProblemasPorInsight(
        relProblemasInsightsData.reduce(
          (mapa, relacion) => mapa.set(relacion.insight_id, (mapa.get(relacion.insight_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setDecisionesPorInsight(
        relInsightsDecisionesData.reduce(
          (mapa, relacion) => mapa.set(relacion.insight_id, (mapa.get(relacion.insight_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setObjetivosPorProblema(
        relProblemasObjetivosData.reduce(
          (mapa, relacion) =>
            mapa.set(relacion.problema_oportunidad_id, (mapa.get(relacion.problema_oportunidad_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setIniciativasPorHipotesis(
        relHipotesisIniciativasData.reduce(
          (mapa, relacion) =>
            mapa.set(relacion.hipotesis_discovery_id, (mapa.get(relacion.hipotesis_discovery_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar discovery')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const distribucionEstado = useMemo(() => {
    const registrosConEstado = [...insights, ...problemas, ...investigaciones, ...hipotesis]

    return estadosRegistro.map((estado) => ({
      estado,
      total: registrosConEstado.filter((registro) => registro.estado === estado).length
    }))
  }, [insights, problemas, investigaciones, hipotesis])

  const recientes = useMemo(
    () =>
      construirRecientes(
        segmentos,
        insights,
        problemas,
        investigaciones,
        hipotesis,
        problemasPorInsight,
        decisionesPorInsight,
        objetivosPorProblema,
        iniciativasPorHipotesis
      ),
    [
      segmentos,
      insights,
      problemas,
      investigaciones,
      hipotesis,
      problemasPorInsight,
      decisionesPorInsight,
      objetivosPorProblema,
      iniciativasPorHipotesis
    ]
  )

  const totalSegmentosActivos = useMemo(() => segmentos.filter((segmento) => segmento.activo).length, [segmentos])
  const totalProblemasVinculados = useMemo(
    () => new Set([...objetivosPorProblema.keys()]).size,
    [objetivosPorProblema]
  )
  const totalHipotesisVinculadas = useMemo(
    () => new Set([...iniciativasPorHipotesis.keys()]).size,
    [iniciativasPorHipotesis]
  )
  const totalInsightsVinculados = useMemo(
    () => new Set([...decisionesPorInsight.keys()]).size,
    [decisionesPorInsight]
  )

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen de discovery</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consolida señales, problemas, investigación y las conexiones opcionales con objetivos estratégicos, iniciativas roadmap y decisiones.
          </p>
        </div>
        <NavegacionDiscovery />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="">
        <>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Insights</p>
              <p className="mt-2 text-2xl font-semibold">{insights.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Problemas y oportunidades</p>
              <p className="mt-2 text-2xl font-semibold">{problemas.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Investigaciones</p>
              <p className="mt-2 text-2xl font-semibold">{investigaciones.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Segmentos activos</p>
              <p className="mt-2 text-2xl font-semibold">{totalSegmentosActivos}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hipótesis discovery</p>
              <p className="mt-2 text-2xl font-semibold">{hipotesis.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Segmentos totales</p>
              <p className="mt-2 text-2xl font-semibold">{segmentos.length}</p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Distribución por estado</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Insights, problemas, investigaciones e hipótesis discovery.</p>
                </div>
                <Link to="/discovery/insights" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                  Ir a insights
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {distribucionEstado.map((item) => (
                  <div key={item.estado} className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {formatearEstadoLegible(item.estado)}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{item.total}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-semibold">Vínculos opcionales</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Problemas vinculados a estrategia</p>
                  <p className="mt-1 text-2xl font-semibold">{relProblemaObjetivo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalProblemasVinculados} problemas vinculados sobre {totalObjetivosEstrategicos} objetivos estratégicos
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Hipótesis discovery vinculadas a iniciativas roadmap</p>
                  <p className="mt-1 text-2xl font-semibold">{relHipotesisIniciativa}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalHipotesisVinculadas} hipótesis vinculadas sobre {totalIniciativas} iniciativas roadmap
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <p className="font-medium">Insights vinculados a decisiones</p>
                  <p className="mt-1 text-2xl font-semibold">{relInsightDecision}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totalInsightsVinculados} insights vinculados sobre {totalDecisiones} decisiones registradas
                  </p>
                </div>
              </div>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Recientes</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Últimos movimientos del módulo discovery.</p>
              </div>
              <Link to="/trazabilidad" className="text-sm font-medium text-slate-700 underline underline-offset-2 dark:text-slate-200">
                Ver trazabilidad
              </Link>
            </div>

            {recientes.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Discovery todavía no tiene registros. Empieza por <Link to="/discovery/segmentos" className="font-medium underline underline-offset-2">Segmentos</Link> o <Link to="/discovery/insights" className="font-medium underline underline-offset-2">Insights</Link>.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {recientes.map((registro) => (
                  <Link
                    key={`${registro.entidad}-${registro.id}`}
                    to={registro.ruta}
                    className="rounded-lg border border-slate-200 px-3 py-3 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{registro.entidad}</p>
                        <p className="mt-1 font-medium">{registro.titulo}</p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{normalizarFechaPortal(registro.fecha)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{registro.descripcion}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {registro.estado ? formatearEstadoLegible(registro.estado) : 'Sin estado'}
                      {registro.vinculacion ? ` · ${registro.vinculacion}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </article>
        </>
      </EstadoVista>
    </section>
  )
}