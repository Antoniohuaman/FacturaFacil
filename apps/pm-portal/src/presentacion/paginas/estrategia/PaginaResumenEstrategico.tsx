import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { periodoEstrategicoSchema, type PeriodoEstrategicoEntrada } from '@/compartido/validacion/esquemas'
import type { KeyResultPm, KpiEstrategicoPm, ObjetivoEstrategicoPm, PeriodoEstrategicoPm, HipotesisPm } from '@/dominio/modelos'
import {
  crearPeriodoEstrategico,
  editarPeriodoEstrategico,
  eliminarPeriodoEstrategico,
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
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { NavegacionEstrategia } from '@/presentacion/paginas/estrategia/NavegacionEstrategia'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { calcularAvancePorcentaje } from '@/compartido/utilidades/formatoPortal'

type ModoModal = 'crear' | 'editar'

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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [periodoActivoModal, setPeriodoActivoModal] = useState<PeriodoEstrategicoPm | null>(null)

  const formulario = useForm<PeriodoEstrategicoEntrada>({
    resolver: zodResolver(periodoEstrategicoSchema),
    defaultValues: {
      nombre: '',
      descripcion: null,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: new Date().toISOString().slice(0, 10),
      activo: true
    }
  })

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
        relHipotesisData
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
        listarRelIniciativaHipotesis()
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

  const abrirModal = (modo: ModoModal, periodo?: PeriodoEstrategicoPm) => {
    setModoModal(modo)
    setPeriodoActivoModal(periodo ?? null)
    setModalAbierto(true)
    formulario.reset({
      nombre: periodo?.nombre ?? '',
      descripcion: periodo?.descripcion ?? null,
      fecha_inicio: periodo?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
      fecha_fin: periodo?.fecha_fin ?? new Date().toISOString().slice(0, 10),
      activo: periodo?.activo ?? true
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Resumen estratégico</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Consolida el periodo activo, el avance de OKRs/KPIs y la relación con el roadmap existente.
          </p>
        </div>
        <NavegacionEstrategia />
      </header>

      <EstadoVista cargando={cargando} error={error} vacio={!periodoActivo} mensajeVacio="Crea un periodo estratégico para empezar.">
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
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hipótesis</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.hipotesis}</p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Avance general</p>
                <p className="mt-2 text-2xl font-semibold">{resumen.avanceGeneral ?? 0}%</p>
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Periodos estratégicos</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Define la ventana activa para OKRs, KPIs e hipótesis.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!esEdicionPermitida}
                    onClick={() => abrirModal('crear')}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
                  >
                    Crear periodo
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-left dark:bg-slate-800">
                      <tr>
                        <th className="px-3 py-2">Periodo</th>
                        <th className="px-3 py-2">Fechas</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periodos.map((periodo) => (
                        <tr key={periodo.id} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="px-3 py-2">
                            <p className="font-medium">{periodo.nombre}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{periodo.descripcion ?? 'Sin descripción'}</p>
                          </td>
                          <td className="px-3 py-2">{periodo.fecha_inicio} → {periodo.fecha_fin}</td>
                          <td className="px-3 py-2">{periodo.activo ? 'Activo' : 'Inactivo'}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={!esEdicionPermitida}
                                onClick={() => abrirModal('editar', periodo)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={!esEdicionPermitida}
                                onClick={() => {
                                  if (window.confirm('¿Eliminar este periodo estratégico?')) {
                                    void eliminarPeriodoEstrategico(periodo.id).then(cargar).catch((errorInterno) => {
                                      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el periodo')
                                    })
                                  }
                                }}
                                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-semibold">Relación con roadmap</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Objetivos roadmap vinculados</p>
                    <p className="mt-1 text-2xl font-semibold">{relObjetivos}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">sobre {totalObjetivosRoadmap} objetivos disponibles</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Iniciativas vinculadas a KR</p>
                    <p className="mt-1 text-2xl font-semibold">{relKrIniciativas}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">sobre {totalIniciativas} iniciativas del roadmap</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <p className="font-medium">Iniciativas vinculadas a hipótesis</p>
                    <p className="mt-1 text-2xl font-semibold">{relHipotesisIniciativas}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">hipótesis conectadas con ejecución del roadmap</p>
                  </div>
                </div>
              </article>
            </div>
          </>
        ) : null}
      </EstadoVista>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : 'Editar'} periodo estratégico`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            try {
              if (modoModal === 'crear') {
                await crearPeriodoEstrategico(valores)
              }

              if (modoModal === 'editar' && periodoActivoModal) {
                await editarPeriodoEstrategico(periodoActivoModal.id, valores)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el periodo')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...formulario.register('nombre')}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...formulario.register('descripcion')}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Fecha inicio</label>
              <input
                type="date"
                {...formulario.register('fecha_inicio')}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha fin</label>
              <input
                type="date"
                {...formulario.register('fecha_fin')}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...formulario.register('activo')} />
            Periodo activo
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900"
          >
            Guardar
          </button>
        </form>
      </ModalPortal>
    </section>
  )
}