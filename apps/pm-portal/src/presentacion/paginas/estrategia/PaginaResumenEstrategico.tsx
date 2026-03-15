import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { KeyResultPm, KpiEstrategicoPm, ObjetivoEstrategicoPm, PeriodoEstrategicoPm, HipotesisPm } from '@/dominio/modelos'
import {
  listarHipotesisPm,
  listarKeyResults,
  listarKpisEstrategicos,
  listarObjetivosEstrategicos,
  listarPeriodosEstrategicos,
  listarRelIniciativaHipotesis,
  listarRelIniciativaKr,
  listarRelObjetivoRoadmapKr
} from '@/aplicacion/casos-uso/estrategia'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { listarProblemasOportunidadesDiscovery, listarRelProblemaObjetivoEstrategico } from '@/aplicacion/casos-uso/discovery'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { NavegacionEstrategia } from '@/presentacion/paginas/estrategia/NavegacionEstrategia'
import { GestionPeriodosEstrategicos } from '@/presentacion/paginas/estrategia/GestionPeriodosEstrategicos'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { calcularAvancePorcentaje } from '@/compartido/utilidades/formatoPortal'

function calcularAvanceGeneral(keyResults: KeyResultPm[], kpis: KpiEstrategicoPm[]) {
  const avancesKr = keyResults
    .map((keyResult) => calcularAvancePorcentaje(keyResult.valor_actual, keyResult.meta, keyResult.baseline ?? 0))
    .filter((valor): valor is number => valor !== null)
  const avancesKpi = kpis
    .map((kpi) => calcularAvancePorcentaje(kpi.valor_actual, kpi.meta, 0))
    .filter((valor): valor is number => valor !== null)
  const todos = [...avancesKr, ...avancesKpi]

  if (todos.length === 0) {
    return null
  }

  return Number((todos.reduce((acumulado, valor) => acumulado + valor, 0) / todos.length).toFixed(1))
}

export function PaginaResumenEstrategico() {
  const { rol } = useSesionPortalPM()
  const [periodos, setPeriodos] = useState<PeriodoEstrategicoPm[]>([])
  const [objetivos, setObjetivos] = useState<ObjetivoEstrategicoPm[]>([])
  const [keyResults, setKeyResults] = useState<KeyResultPm[]>([])
  const [kpis, setKpis] = useState<KpiEstrategicoPm[]>([])
  const [hipotesis, setHipotesis] = useState<HipotesisPm[]>([])
  const [totalObjetivosRoadmap, setTotalObjetivosRoadmap] = useState(0)
  const [totalIniciativas, setTotalIniciativas] = useState(0)
  const [relObjetivos, setRelObjetivos] = useState(0)
  const [relKrIniciativas, setRelKrIniciativas] = useState(0)
  const [relHipotesisIniciativas, setRelHipotesisIniciativas] = useState(0)
  const [relProblemasObjetivos, setRelProblemasObjetivos] = useState(0)
  const [problemasDiscoveryVinculados, setProblemasDiscoveryVinculados] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [
        periodosData,
        objetivosData,
        keyResultsData,
        kpisData,
        hipotesisData,
        objetivosRoadmapData,
        iniciativasData,
        relObjetivosData,
        relKrData,
        relHipotesisData,
        problemasDiscoveryData,
        relProblemasObjetivosData
      ] = await Promise.all([
        listarPeriodosEstrategicos(),
        listarObjetivosEstrategicos(),
        listarKeyResults(),
        listarKpisEstrategicos(),
        listarHipotesisPm(),
        listarObjetivos(),
        listarIniciativas(),
        listarRelObjetivoRoadmapKr(),
        listarRelIniciativaKr(),
        listarRelIniciativaHipotesis(),
        listarProblemasOportunidadesDiscovery(),
        listarRelProblemaObjetivoEstrategico()
      ])

      setPeriodos(periodosData)
      setObjetivos(objetivosData)
      setKeyResults(keyResultsData)
      setKpis(kpisData)
      setHipotesis(hipotesisData)
      setTotalObjetivosRoadmap(objetivosRoadmapData.length)
      setTotalIniciativas(iniciativasData.length)
      setRelObjetivos(relObjetivosData.length)
      setRelKrIniciativas(relKrData.length)
      setRelHipotesisIniciativas(relHipotesisData.length)
      setRelProblemasObjetivos(relProblemasObjetivosData.length)
      setProblemasDiscoveryVinculados(
        problemasDiscoveryData.filter((problema) =>
          relProblemasObjetivosData.some((relacion) => relacion.problema_oportunidad_id === problema.id)
        ).length
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar estrategia')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const periodoActivo = useMemo(() => {
    return periodos.find((periodo) => periodo.activo) ?? periodos[0] ?? null
  }, [periodos])

  const resumen = useMemo(() => {
    if (!periodoActivo) {
      return null
    }

    const objetivosPeriodo = objetivos.filter((objetivo) => objetivo.periodo_id === periodoActivo.id)
    const objetivoIds = new Set(objetivosPeriodo.map((objetivo) => objetivo.id))
    const keyResultsPeriodo = keyResults.filter((keyResult) => objetivoIds.has(keyResult.objetivo_estrategico_id))
    const kpisPeriodo = kpis.filter((kpi) => kpi.periodo_id === periodoActivo.id)
    const hipotesisPeriodo = hipotesis.filter((item) => item.periodo_id === periodoActivo.id)

    return {
      objetivos: objetivosPeriodo.length,
      keyResults: keyResultsPeriodo.length,
      kpis: kpisPeriodo.length,
      hipotesis: hipotesisPeriodo.length,
      avanceGeneral: calcularAvanceGeneral(keyResultsPeriodo, kpisPeriodo)
    }
  }, [periodoActivo, objetivos, keyResults, kpis, hipotesis])

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen estratégico</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consolida el periodo activo, el avance de OKRs/KPIs y la relación entre objetivos estratégicos, hipótesis estrategia y artefactos de roadmap.
          </p>
        </div>
        <NavegacionEstrategia />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="">
        {periodoActivo && resumen ? (
          <>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Periodo activo</p>
                <p className="mt-2 text-base font-semibold">{periodoActivo.nombre}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{periodoActivo.fecha_inicio} → {periodoActivo.fecha_fin}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Objetivos estratégicos</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.objetivos}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Key results</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.keyResults}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">KPIs</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.kpis}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hipótesis estrategia</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.hipotesis}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Avance general</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.avanceGeneral ?? 0}%</p>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <GestionPeriodosEstrategicos periodos={periodos} esEdicionPermitida={esEdicionPermitida} onRecargar={cargar} />
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold">Relaciones cruzadas</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Problemas discovery conectados a objetivos</p>
                    <p className="mt-1 text-2xl font-semibold">{relProblemasObjetivos}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{problemasDiscoveryVinculados} problemas discovery con vínculo estratégico</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Objetivos roadmap vinculados</p>
                    <p className="mt-1 text-2xl font-semibold">{relObjetivos}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">sobre {totalObjetivosRoadmap} objetivos roadmap disponibles</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Iniciativas vinculadas a KR</p>
                    <p className="mt-1 text-2xl font-semibold">{relKrIniciativas}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">sobre {totalIniciativas} iniciativas del roadmap</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Iniciativas vinculadas a hipótesis estrategia</p>
                    <p className="mt-1 text-2xl font-semibold">{relHipotesisIniciativas}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">hipótesis estrategia conectadas con ejecución del roadmap</p>
                  </div>
                </div>
              </article>
            </div>
          </>
        ) : (
          <>
            <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Falta el dato maestro inicial</p>
              <p className="mt-1">
                Sin períodos estratégicos no se pueden crear objetivos estratégicos, KR, KPIs ni hipótesis. Crea el primer período desde esta misma vista o entra a <Link to="/estrategia/periodos" className="font-medium underline underline-offset-2">Períodos</Link>.
              </p>
            </article>
            <GestionPeriodosEstrategicos periodos={periodos} esEdicionPermitida={esEdicionPermitida} onRecargar={cargar} />
          </>
        )}
      </EstadoVista>
    </section>
  )
}