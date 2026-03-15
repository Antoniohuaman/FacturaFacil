import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  keyResultSchema,
  objetivoEstrategicoSchema,
  type KeyResultEntrada,
  type ObjetivoEstrategicoEntrada
} from '@/compartido/validacion/esquemas'
import type {
  Iniciativa,
  KeyResultPm,
  Objetivo,
  ObjetivoEstrategicoPm,
  PeriodoEstrategicoPm,
  RelIniciativaKrPm,
  RelObjetivoRoadmapKrPm
} from '@/dominio/modelos'
import {
  crearKeyResult,
  crearObjetivoEstrategico,
  editarKeyResult,
  editarObjetivoEstrategico,
  eliminarKeyResult,
  eliminarObjetivoEstrategico,
  listarKeyResults,
  listarObjetivosEstrategicos,
  listarPeriodosEstrategicos,
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
import { estadosRegistro, frecuenciasEstrategicas, prioridadesRegistro } from '@/dominio/modelos'

type ModoModal = 'crear' | 'editar' | 'ver'

export function PaginaOkrs() {
  const { rol } = useSesionPortalPM()
  const [periodos, setPeriodos] = useState<PeriodoEstrategicoPm[]>([])
  const [objetivosEstrategicos, setObjetivosEstrategicos] = useState<ObjetivoEstrategicoPm[]>([])
  const [keyResults, setKeyResults] = useState<KeyResultPm[]>([])
  const [objetivosRoadmap, setObjetivosRoadmap] = useState<Objetivo[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [relObjetivos, setRelObjetivos] = useState<RelObjetivoRoadmapKrPm[]>([])
  const [relIniciativas, setRelIniciativas] = useState<RelIniciativaKrPm[]>([])
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>('todas')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalObjetivoAbierto, setModalObjetivoAbierto] = useState(false)
  const [modoObjetivo, setModoObjetivo] = useState<ModoModal>('crear')
  const [objetivoActivo, setObjetivoActivo] = useState<ObjetivoEstrategicoPm | null>(null)
  const [modalKrAbierto, setModalKrAbierto] = useState(false)
  const [modoKr, setModoKr] = useState<ModoModal>('crear')
  const [krActivo, setKrActivo] = useState<KeyResultPm | null>(null)
  const [objetivosRoadmapSeleccionados, setObjetivosRoadmapSeleccionados] = useState<string[]>([])
  const [iniciativasSeleccionadas, setIniciativasSeleccionadas] = useState<string[]>([])

  const esEdicionPermitida = puedeEditar(rol)
  const hayPeriodos = periodos.length > 0
  const hayObjetivosEstrategicos = objetivosEstrategicos.length > 0

  const formularioObjetivo = useForm<ObjetivoEstrategicoEntrada>({
    resolver: zodResolver(objetivoEstrategicoSchema),
    defaultValues: {
      periodo_id: '',
      codigo: '',
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      estado: 'pendiente',
      owner: null,
      notas: null
    }
  })

  const formularioKr = useForm<KeyResultEntrada>({
    resolver: zodResolver(keyResultSchema),
    defaultValues: {
      objetivo_estrategico_id: '',
      nombre: '',
      metrica: '',
      unidad: '%',
      baseline: 0,
      meta: 100,
      valor_actual: 0,
      frecuencia: 'mensual',
      estado: 'pendiente',
      owner: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [periodosData, objetivosData, keyResultsData, objetivosRoadmapData, iniciativasData, relObjetivosData, relIniciativasData] =
        await Promise.all([
          listarPeriodosEstrategicos(),
          listarObjetivosEstrategicos(),
          listarKeyResults(),
          listarObjetivos(),
          listarIniciativas(),
          listarRelObjetivoRoadmapKr(),
          listarRelIniciativaKr()
        ])

      setPeriodos(periodosData)
      setObjetivosEstrategicos(objetivosData)
      setKeyResults(keyResultsData)
      setObjetivosRoadmap(objetivosRoadmapData)
      setIniciativas(iniciativasData)
      setRelObjetivos(relObjetivosData)
      setRelIniciativas(relIniciativasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar OKRs')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const periodosPorId = useMemo(() => new Map(periodos.map((periodo) => [periodo.id, periodo.nombre])), [periodos])
  const objetivosPorId = useMemo(
    () => new Map(objetivosEstrategicos.map((objetivo) => [objetivo.id, objetivo])),
    [objetivosEstrategicos]
  )

  const objetivosFiltrados = useMemo(() => {
    return objetivosEstrategicos.filter((objetivo) => {
      const coincidePeriodo = filtroPeriodo === 'todos' ? true : objetivo.periodo_id === filtroPeriodo
      const coincideEstado = filtroEstado === 'todos' ? true : objetivo.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : objetivo.prioridad === filtroPrioridad
      return coincidePeriodo && coincideEstado && coincidePrioridad
    })
  }, [objetivosEstrategicos, filtroPeriodo, filtroEstado, filtroPrioridad])

  const idsObjetivosFiltrados = useMemo(() => new Set(objetivosFiltrados.map((objetivo) => objetivo.id)), [objetivosFiltrados])

  const keyResultsFiltrados = useMemo(() => {
    return keyResults.filter((keyResult) => {
      const objetivo = objetivosPorId.get(keyResult.objetivo_estrategico_id)
      if (!objetivo) {
        return false
      }

      const coincidePeriodo = filtroPeriodo === 'todos' ? true : objetivo.periodo_id === filtroPeriodo
      const coincideEstado = filtroEstado === 'todos' ? true : keyResult.estado === filtroEstado
      return coincidePeriodo && coincideEstado && idsObjetivosFiltrados.has(keyResult.objetivo_estrategico_id)
    })
  }, [keyResults, objetivosPorId, filtroPeriodo, filtroEstado, idsObjetivosFiltrados])

  const abrirModalObjetivo = (modo: ModoModal, objetivo?: ObjetivoEstrategicoPm) => {
    setModoObjetivo(modo)
    setObjetivoActivo(objetivo ?? null)
    setModalObjetivoAbierto(true)
    formularioObjetivo.reset({
      periodo_id: objetivo?.periodo_id ?? periodos[0]?.id ?? '',
      codigo: objetivo?.codigo ?? '',
      titulo: objetivo?.titulo ?? '',
      descripcion: objetivo?.descripcion ?? '',
      prioridad: objetivo?.prioridad ?? 'media',
      estado: objetivo?.estado ?? 'pendiente',
      owner: objetivo?.owner ?? null,
      notas: objetivo?.notas ?? null
    })
  }

  const abrirModalKr = (modo: ModoModal, keyResult?: KeyResultPm) => {
    setModoKr(modo)
    setKrActivo(keyResult ?? null)
    setModalKrAbierto(true)
    formularioKr.reset({
      objetivo_estrategico_id: keyResult?.objetivo_estrategico_id ?? objetivosEstrategicos[0]?.id ?? '',
      nombre: keyResult?.nombre ?? '',
      metrica: keyResult?.metrica ?? '',
      unidad: keyResult?.unidad ?? '%',
      baseline: keyResult?.baseline ?? 0,
      meta: keyResult?.meta ?? 100,
      valor_actual: keyResult?.valor_actual ?? 0,
      frecuencia: keyResult?.frecuencia ?? 'mensual',
      estado: keyResult?.estado ?? 'pendiente',
      owner: keyResult?.owner ?? null
    })
    setObjetivosRoadmapSeleccionados(
      keyResult ? relObjetivos.filter((rel) => rel.key_result_id === keyResult.id).map((rel) => rel.objetivo_roadmap_id) : []
    )
    setIniciativasSeleccionadas(
      keyResult ? relIniciativas.filter((rel) => rel.key_result_id === keyResult.id).map((rel) => rel.iniciativa_id) : []
    )
  }

  const contarObjetivosRoadmap = (keyResultId: string) => relObjetivos.filter((rel) => rel.key_result_id === keyResultId).length
  const contarIniciativas = (keyResultId: string) => relIniciativas.filter((rel) => rel.key_result_id === keyResultId).length

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">OKRs</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Administra objetivos estratégicos del módulo Estrategia, sus key results y los vínculos opcionales con objetivos roadmap.
          </p>
        </div>
        <NavegacionEstrategia />
      </header>

      <article className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-100">
        <p className="font-medium">Diferencia semántica clave</p>
        <p className="mt-1">
          El objetivo estratégico vive en Estrategia y define una meta del período con OKRs. No sustituye al objetivo roadmap, que vive en Roadmap y ordena la ejecución del delivery.
        </p>
      </article>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5 dark:border-slate-800 dark:bg-slate-900">
        <select
          value={filtroPeriodo}
          onChange={(evento) => setFiltroPeriodo(evento.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Periodo: todos</option>
          {periodos.map((periodo) => (
            <option key={periodo.id} value={periodo.id}>
              {periodo.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(evento) => setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <select
          value={filtroPrioridad}
          onChange={(evento) => setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              {prioridad}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!esEdicionPermitida || !hayPeriodos}
          onClick={() => abrirModalObjetivo('crear')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
        >
          Crear objetivo estratégico
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida || !hayObjetivosEstrategicos}
          onClick={() => abrirModalKr('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear KR
        </button>
      </div>

      {!hayPeriodos ? (
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Antes de crear OKRs debes definir al menos un período estratégico.</p>
          <p className="mt-1">
            Crea el dato maestro en <Link to="/estrategia/periodos" className="font-medium underline underline-offset-2">Períodos</Link> y luego vuelve aquí para crear objetivos estratégicos.
          </p>
        </article>
      ) : null}

      {hayPeriodos && !hayObjetivosEstrategicos ? (
        <article className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-medium text-slate-900 dark:text-slate-100">Siguiente paso del flujo</p>
          <p className="mt-1">Ya existen períodos. Crea un objetivo estratégico para habilitar el selector de KR.</p>
        </article>
      ) : null}

      <EstadoVista cargando={cargando} error={error} vacio={objetivosFiltrados.length === 0} mensajeVacio="No hay OKRs para los filtros seleccionados.">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Objetivos estratégicos</h2>
            </header>
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">Objetivo</th>
                  <th className="px-3 py-2">Periodo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {objetivosFiltrados.map((objetivo) => (
                  <tr key={objetivo.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="font-medium">{objetivo.codigo} · {objetivo.titulo}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{objetivo.prioridad} · {objetivo.owner ?? 'Sin owner'}</p>
                    </td>
                    <td className="px-3 py-2">{periodosPorId.get(objetivo.periodo_id) ?? 'Sin periodo'}</td>
                    <td className="px-3 py-2">{objetivo.estado}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => abrirModalObjetivo('ver', objetivo)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModalObjetivo('editar', objetivo)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                        <button
                          type="button"
                          disabled={!esEdicionPermitida}
                          onClick={() => {
                            if (window.confirm('¿Eliminar este objetivo estratégico?')) {
                              void eliminarObjetivoEstrategico(objetivo.id).then(cargar).catch((errorInterno) => {
                                setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el objetivo')
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
          </article>

          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-semibold">Key results</h2>
            </header>
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">KR</th>
                  <th className="px-3 py-2">Avance</th>
                  <th className="px-3 py-2">Vínculos</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {keyResultsFiltrados.map((keyResult) => (
                  <tr key={keyResult.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <p className="font-medium">{keyResult.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{objetivosPorId.get(keyResult.objetivo_estrategico_id)?.titulo ?? 'Sin objetivo'} · {keyResult.frecuencia}</p>
                    </td>
                    <td className="px-3 py-2">{calcularAvancePorcentaje(keyResult.valor_actual, keyResult.meta, keyResult.baseline ?? 0) ?? 0}%</td>
                    <td className="px-3 py-2">
                      <p>{contarObjetivosRoadmap(keyResult.id)} objetivos roadmap</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{contarIniciativas(keyResult.id)} iniciativas</p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => abrirModalKr('ver', keyResult)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModalKr('editar', keyResult)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                        <button
                          type="button"
                          disabled={!esEdicionPermitida}
                          onClick={() => {
                            if (window.confirm('¿Eliminar este key result?')) {
                              void eliminarKeyResult(keyResult.id).then(cargar).catch((errorInterno) => {
                                setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el KR')
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
          </article>
        </div>
      </EstadoVista>

      <ModalPortal abierto={modalObjetivoAbierto} titulo={`${modoObjetivo === 'crear' ? 'Crear' : modoObjetivo === 'editar' ? 'Editar' : 'Ver'} objetivo estratégico`} alCerrar={() => setModalObjetivoAbierto(false)}>
        <form
          className="space-y-4"
          onSubmit={formularioObjetivo.handleSubmit(async (valores) => {
            if (modoObjetivo === 'ver') {
              return
            }

            try {
              if (modoObjetivo === 'crear') {
                await crearObjetivoEstrategico(valores)
              }

              if (modoObjetivo === 'editar' && objetivoActivo) {
                await editarObjetivoEstrategico(objetivoActivo.id, valores)
              }

              setModalObjetivoAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el objetivo estratégico')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <select {...formularioObjetivo.register('periodo_id')} disabled={modoObjetivo === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Selecciona periodo</option>
              {periodos.map((periodo) => (
                <option key={periodo.id} value={periodo.id}>{periodo.nombre}</option>
              ))}
            </select>
            <input {...formularioObjetivo.register('codigo')} readOnly={modoObjetivo === 'ver'} placeholder="Código" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <input {...formularioObjetivo.register('titulo')} readOnly={modoObjetivo === 'ver'} placeholder="Título" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <textarea {...formularioObjetivo.register('descripcion')} readOnly={modoObjetivo === 'ver'} placeholder="Descripción" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-3">
            <select {...formularioObjetivo.register('prioridad')} disabled={modoObjetivo === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select>
            <select {...formularioObjetivo.register('estado')} disabled={modoObjetivo === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
            <input {...formularioObjetivo.register('owner')} readOnly={modoObjetivo === 'ver'} placeholder="Owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <textarea {...formularioObjetivo.register('notas')} readOnly={modoObjetivo === 'ver'} placeholder="Notas" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          {modoObjetivo !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>

      <ModalPortal abierto={modalKrAbierto} titulo={`${modoKr === 'crear' ? 'Crear' : modoKr === 'editar' ? 'Editar' : 'Ver'} key result`} alCerrar={() => setModalKrAbierto(false)}>
        <form
          className="space-y-4"
          onSubmit={formularioKr.handleSubmit(async (valores) => {
            if (modoKr === 'ver') {
              return
            }

            try {
              if (modoKr === 'crear') {
                await crearKeyResult(valores, objetivosRoadmapSeleccionados, iniciativasSeleccionadas)
              }

              if (modoKr === 'editar' && krActivo) {
                await editarKeyResult(krActivo.id, valores, objetivosRoadmapSeleccionados, iniciativasSeleccionadas)
              }

              setModalKrAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el key result')
            }
          })}
        >
          <select {...formularioKr.register('objetivo_estrategico_id')} disabled={modoKr === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <option value="">Selecciona objetivo estratégico</option>
            {objetivosEstrategicos.map((objetivo) => <option key={objetivo.id} value={objetivo.id}>{objetivo.codigo} · {objetivo.titulo}</option>)}
          </select>
          <input {...formularioKr.register('nombre')} readOnly={modoKr === 'ver'} placeholder="Nombre del KR" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="grid gap-3 md:grid-cols-3">
            <input {...formularioKr.register('metrica')} readOnly={modoKr === 'ver'} placeholder="Métrica" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input {...formularioKr.register('unidad')} readOnly={modoKr === 'ver'} placeholder="Unidad" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <select {...formularioKr.register('frecuencia')} disabled={modoKr === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{frecuenciasEstrategicas.map((frecuencia) => <option key={frecuencia} value={frecuencia}>{frecuencia}</option>)}</select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" step="0.01" {...formularioKr.register('baseline', { valueAsNumber: true })} readOnly={modoKr === 'ver'} placeholder="Baseline" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formularioKr.register('meta', { valueAsNumber: true })} readOnly={modoKr === 'ver'} placeholder="Meta" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            <input type="number" step="0.01" {...formularioKr.register('valor_actual', { valueAsNumber: true })} readOnly={modoKr === 'ver'} placeholder="Valor actual" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select {...formularioKr.register('estado')} disabled={modoKr === 'ver'} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
            <input {...formularioKr.register('owner')} readOnly={modoKr === 'ver'} placeholder="Owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <h3 className="text-sm font-medium">Vincular con objetivos roadmap</h3>
              <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
                {objetivosRoadmap.map((objetivo) => (
                  <label key={objetivo.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      disabled={modoKr === 'ver'}
                      checked={objetivosRoadmapSeleccionados.includes(objetivo.id)}
                      onChange={(evento) => {
                        setObjetivosRoadmapSeleccionados((actual) =>
                          evento.target.checked ? [...actual, objetivo.id] : actual.filter((id) => id !== objetivo.id)
                        )
                      }}
                    />
                    <span>{objetivo.nombre}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <h3 className="text-sm font-medium">Vincular con iniciativas</h3>
              <div className="mt-3 max-h-40 space-y-2 overflow-auto text-sm">
                {iniciativas.map((iniciativa) => (
                  <label key={iniciativa.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      disabled={modoKr === 'ver'}
                      checked={iniciativasSeleccionadas.includes(iniciativa.id)}
                      onChange={(evento) => {
                        setIniciativasSeleccionadas((actual) =>
                          evento.target.checked ? [...actual, iniciativa.id] : actual.filter((id) => id !== iniciativa.id)
                        )
                      }}
                    />
                    <span>{iniciativa.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {modoKr !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}