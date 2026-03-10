import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { insightDiscoverySchema, type InsightDiscoveryEntrada } from '@/compartido/validacion/esquemas'
import type {
  CatalogoModuloPm,
  DecisionPm,
  InsightDiscoveryPm,
  ProblemaOportunidadDiscoveryPm,
  SegmentoDiscoveryPm
} from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import {
  crearInsightDiscovery,
  editarInsightDiscovery,
  eliminarInsightDiscovery,
  listarInsightsDiscovery,
  listarProblemasOportunidadesDiscovery,
  listarRelInsightDecision,
  listarRelInsightProblema,
  listarSegmentosDiscovery
} from '@/aplicacion/casos-uso/discovery'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionDiscovery } from '@/presentacion/paginas/discovery/NavegacionDiscovery'
import { SelectorRelaciones } from '@/presentacion/paginas/discovery/SelectorRelaciones'

type ModoModal = 'crear' | 'editar' | 'ver'

function alternarSeleccion(actual: string[], id: string, seleccionado: boolean) {
  return seleccionado ? [...actual, id] : actual.filter((item) => item !== id)
}

export function PaginaInsights() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [insights, setInsights] = useState<InsightDiscoveryPm[]>([])
  const [segmentos, setSegmentos] = useState<SegmentoDiscoveryPm[]>([])
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [problemas, setProblemas] = useState<ProblemaOportunidadDiscoveryPm[]>([])
  const [decisiones, setDecisiones] = useState<DecisionPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroRelevancia, setFiltroRelevancia] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('relevancia') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroSegmento, setFiltroSegmento] = useState(searchParams.get('segmento') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [insightActivo, setInsightActivo] = useState<InsightDiscoveryPm | null>(null)
  const [problemasSeleccionados, setProblemasSeleccionados] = useState<string[]>([])
  const [decisionesSeleccionadas, setDecisionesSeleccionadas] = useState<string[]>([])

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<InsightDiscoveryEntrada>({
    resolver: zodResolver(insightDiscoverySchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      fuente: '',
      tipo: '',
      relevancia: 'media',
      modulo_codigo: null,
      segmento_id: null,
      evidencia_url: null,
      estado: 'pendiente',
      owner: null,
      fecha_hallazgo: new Date().toISOString().slice(0, 10),
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [insightsData, segmentosData, modulosData, problemasData, decisionesData] = await Promise.all([
        listarInsightsDiscovery(),
        listarSegmentosDiscovery(),
        listarModulosPm(),
        listarProblemasOportunidadesDiscovery(),
        listarDecisionesPm()
      ])

      setInsights(insightsData)
      setSegmentos(segmentosData)
      setModulos(modulosData.filter((modulo) => modulo.activo))
      setProblemas(problemasData)
      setDecisiones(decisionesData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los insights')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const tiposDisponibles = useMemo(
    () => [...new Set(insights.map((insight) => insight.tipo.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [insights]
  )

  const segmentoPorId = useMemo(() => new Map(segmentos.map((segmento) => [segmento.id, segmento.nombre])), [segmentos])
  const moduloPorCodigo = useMemo(() => new Map(modulos.map((modulo) => [modulo.codigo, modulo.nombre])), [modulos])

  const insightsFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()

    return insights.filter((insight) => {
      const coincideBusqueda =
        insight.titulo.toLowerCase().includes(termino) ||
        insight.descripcion.toLowerCase().includes(termino) ||
        insight.fuente.toLowerCase().includes(termino) ||
        (insight.owner ?? '').toLowerCase().includes(termino) ||
        (insight.notas ?? '').toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : insight.tipo === filtroTipo
      const coincideEstado = filtroEstado === 'todos' ? true : insight.estado === filtroEstado
      const coincideRelevancia = filtroRelevancia === 'todas' ? true : insight.relevancia === filtroRelevancia
      const coincideModulo = filtroModulo === 'todos' ? true : insight.modulo_codigo === filtroModulo
      const coincideSegmento = filtroSegmento === 'todos' ? true : insight.segmento_id === filtroSegmento
      const coincideDesde = fechaDesde ? insight.fecha_hallazgo >= fechaDesde : true
      const coincideHasta = fechaHasta ? insight.fecha_hallazgo <= fechaHasta : true

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideEstado &&
        coincideRelevancia &&
        coincideModulo &&
        coincideSegmento &&
        coincideDesde &&
        coincideHasta
      )
    })
  }, [insights, busqueda, filtroTipo, filtroEstado, filtroRelevancia, filtroModulo, filtroSegmento, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: insightsFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroTipo !== 'todos') {
      parametros.set('tipo', filtroTipo)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (filtroRelevancia !== 'todas') {
      parametros.set('relevancia', filtroRelevancia)
    }
    if (filtroModulo !== 'todos') {
      parametros.set('modulo', filtroModulo)
    }
    if (filtroSegmento !== 'todos') {
      parametros.set('segmento', filtroSegmento)
    }
    if (fechaDesde) {
      parametros.set('desde', fechaDesde)
    }
    if (fechaHasta) {
      parametros.set('hasta', fechaHasta)
    }
    if (paginacion.paginaActual > 1) {
      parametros.set('pagina', String(paginacion.paginaActual))
    }
    if (paginacion.tamanoPagina !== 10) {
      parametros.set('tamano', String(paginacion.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [
    busqueda,
    filtroTipo,
    filtroEstado,
    filtroRelevancia,
    filtroModulo,
    filtroSegmento,
    fechaDesde,
    fechaHasta,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const [relacionesProblemas, setRelacionesProblemas] = useState<Map<string, number>>(new Map())
  const [relacionesDecisiones, setRelacionesDecisiones] = useState<Map<string, number>>(new Map())
  const [detalleRelacionesProblemas, setDetalleRelacionesProblemas] = useState<Map<string, string[]>>(new Map())
  const [detalleRelacionesDecisiones, setDetalleRelacionesDecisiones] = useState<Map<string, string[]>>(new Map())

  useEffect(() => {
    let cancelado = false

    const cargarRelaciones = async () => {
      try {
        const [relProblemas, relDecisiones] = await Promise.all([listarRelInsightProblema(), listarRelInsightDecision()])

        if (cancelado) {
          return
        }

        setRelacionesProblemas(
          relProblemas.reduce(
            (mapa, relacion) => mapa.set(relacion.insight_id, (mapa.get(relacion.insight_id) ?? 0) + 1),
            new Map<string, number>()
          )
        )
        setRelacionesDecisiones(
          relDecisiones.reduce(
            (mapa, relacion) => mapa.set(relacion.insight_id, (mapa.get(relacion.insight_id) ?? 0) + 1),
            new Map<string, number>()
          )
        )
        setDetalleRelacionesProblemas(
          relProblemas.reduce((mapa, relacion) => {
            const actual = mapa.get(relacion.insight_id) ?? []
            return mapa.set(relacion.insight_id, [...actual, relacion.problema_oportunidad_id])
          }, new Map<string, string[]>())
        )
        setDetalleRelacionesDecisiones(
          relDecisiones.reduce((mapa, relacion) => {
            const actual = mapa.get(relacion.insight_id) ?? []
            return mapa.set(relacion.insight_id, [...actual, relacion.decision_id])
          }, new Map<string, string[]>())
        )
      } catch (errorInterno) {
        if (!cancelado) {
          setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar relaciones de insights')
        }
      }
    }

    void cargarRelaciones()

    return () => {
      cancelado = true
    }
  }, [insights])

  const abrirModal = (modo: ModoModal, insight?: InsightDiscoveryPm) => {
    setModoModal(modo)
    setInsightActivo(insight ?? null)
    setModalAbierto(true)
    formulario.reset({
      titulo: insight?.titulo ?? '',
      descripcion: insight?.descripcion ?? '',
      fuente: insight?.fuente ?? '',
      tipo: insight?.tipo ?? '',
      relevancia: insight?.relevancia ?? 'media',
      modulo_codigo: insight?.modulo_codigo ?? null,
      segmento_id: insight?.segmento_id ?? null,
      evidencia_url: insight?.evidencia_url ?? null,
      estado: insight?.estado ?? 'pendiente',
      owner: insight?.owner ?? null,
      fecha_hallazgo: insight?.fecha_hallazgo ?? new Date().toISOString().slice(0, 10),
      notas: insight?.notas ?? null
    })
    setProblemasSeleccionados(insight ? detalleRelacionesProblemas.get(insight.id) ?? [] : [])
    setDecisionesSeleccionadas(insight ? detalleRelacionesDecisiones.get(insight.id) ?? [] : [])
  }

  const opcionesProblemas = useMemo(
    () =>
      problemas.map((problema) => ({
        id: problema.id,
        etiqueta: problema.titulo,
        descripcion: `${problema.tipo} · ${problema.estado}`
      })),
    [problemas]
  )

  const opcionesDecisiones = useMemo(
    () =>
      decisiones.map((decision) => ({
        id: decision.id,
        etiqueta: decision.titulo,
        descripcion: `${decision.estado_codigo} · ${normalizarFechaPortal(decision.fecha_decision)}`
      })),
    [decisiones]
  )

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Insights</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Registra señales accionables y enlázalas opcionalmente con problemas y decisiones existentes.
          </p>
        </div>
        <NavegacionDiscovery />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Buscar insight"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroTipo}
          onChange={(evento) => {
            setFiltroTipo(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Tipo: todos</option>
          {tiposDisponibles.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(evento) => {
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <select
          value={filtroRelevancia}
          onChange={(evento) => {
            setFiltroRelevancia(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Relevancia: todas</option>
          {prioridadesRegistro.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              {prioridad}
            </option>
          ))}
        </select>
        <select
          value={filtroModulo}
          onChange={(evento) => {
            setFiltroModulo(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Módulo: todos</option>
          {modulos.map((modulo) => (
            <option key={modulo.id} value={modulo.codigo}>
              {modulo.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroSegmento}
          onChange={(evento) => {
            setFiltroSegmento(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Segmento: todos</option>
          {segmentos.map((segmento) => (
            <option key={segmento.id} value={segmento.id}>
              {segmento.nombre}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fechaDesde}
          onChange={(evento) => {
            setFechaDesde(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="date"
          value={fechaHasta}
          onChange={(evento) => {
            setFechaHasta(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="button"
          onClick={() => {
            setBusqueda('')
            setFiltroTipo('todos')
            setFiltroEstado('todos')
            setFiltroRelevancia('todas')
            setFiltroModulo('todos')
            setFiltroSegmento('todos')
            setFechaDesde('')
            setFechaHasta('')
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => {
            exportarCsv(
              'discovery-insights.csv',
              [
                { encabezado: 'Título', valor: (insight) => insight.titulo },
                { encabezado: 'Descripción', valor: (insight) => insight.descripcion },
                { encabezado: 'Fuente', valor: (insight) => insight.fuente },
                { encabezado: 'Tipo', valor: (insight) => insight.tipo },
                { encabezado: 'Relevancia', valor: (insight) => insight.relevancia },
                { encabezado: 'Módulo', valor: (insight) => moduloPorCodigo.get(insight.modulo_codigo ?? '') ?? '' },
                { encabezado: 'Segmento', valor: (insight) => segmentoPorId.get(insight.segmento_id ?? '') ?? '' },
                { encabezado: 'Estado', valor: (insight) => formatearEstadoLegible(insight.estado) },
                { encabezado: 'Owner', valor: (insight) => insight.owner ?? '' },
                { encabezado: 'Fecha hallazgo', valor: (insight) => normalizarFechaPortal(insight.fecha_hallazgo) },
                { encabezado: 'Problemas vinculados', valor: (insight) => relacionesProblemas.get(insight.id) ?? 0 },
                { encabezado: 'Decisiones vinculadas', valor: (insight) => relacionesDecisiones.get(insight.id) ?? 0 }
              ],
              insightsFiltrados
            )
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModal('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear insight
        </button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={insightsFiltrados.length === 0} mensajeVacio="No hay insights para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Insight</th>
                <th className="px-3 py-2">Contexto</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((insight) => (
                <tr key={insight.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{insight.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{insight.fuente} · {insight.tipo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {relacionesProblemas.get(insight.id) ?? 0} problemas · {relacionesDecisiones.get(insight.id) ?? 0} decisiones
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{segmentoPorId.get(insight.segmento_id ?? '') ?? 'Sin segmento'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{moduloPorCodigo.get(insight.modulo_codigo ?? '') ?? 'Sin módulo'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{insight.estado}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{insight.relevancia}</p>
                  </td>
                  <td className="px-3 py-2">{normalizarFechaPortal(insight.fecha_hallazgo)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', insight)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', insight)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar este insight?')) {
                            void eliminarInsightDiscovery(insight.id).then(cargar).catch((errorInterno) => {
                              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el insight')
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
        <PaginacionTabla
          paginaActual={paginacion.paginaActual}
          totalPaginas={paginacion.totalPaginas}
          totalItems={paginacion.totalItems}
          desde={paginacion.desde}
          hasta={paginacion.hasta}
          tamanoPagina={paginacion.tamanoPagina}
          alCambiarPagina={paginacion.setPaginaActual}
          alCambiarTamanoPagina={paginacion.setTamanoPagina}
        />
      </EstadoVista>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} insight`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              if (modoModal === 'crear') {
                await crearInsightDiscovery(valores, problemasSeleccionados, decisionesSeleccionadas)
              }

              if (modoModal === 'editar' && insightActivo) {
                await editarInsightDiscovery(insightActivo.id, valores, problemasSeleccionados, decisionesSeleccionadas)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el insight')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Título</label>
            <input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Fuente</label>
              <input {...formulario.register('fuente')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <input {...formulario.register('tipo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha hallazgo</label>
              <input type="date" {...formulario.register('fecha_hallazgo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Relevancia</label>
              <select {...formulario.register('relevancia')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {prioridadesRegistro.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {prioridad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {estadosRegistro.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Módulo</label>
              <select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin módulo</option>
                {modulos.map((modulo) => (
                  <option key={modulo.id} value={modulo.codigo}>
                    {modulo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Segmento</label>
              <select {...formulario.register('segmento_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin segmento</option>
                {segmentos.map((segmento) => (
                  <option key={segmento.id} value={segmento.id}>
                    {segmento.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Evidencia URL</label>
              <input {...formulario.register('evidencia_url')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SelectorRelaciones
              titulo="Vincular con problemas y oportunidades"
              opciones={opcionesProblemas}
              seleccionados={problemasSeleccionados}
              deshabilitado={modoModal === 'ver'}
              alAlternar={(id, seleccionado) => setProblemasSeleccionados((actual) => alternarSeleccion(actual, id, seleccionado))}
            />
            <SelectorRelaciones
              titulo="Vincular con decisiones"
              opciones={opcionesDecisiones}
              seleccionados={decisionesSeleccionadas}
              deshabilitado={modoModal === 'ver'}
              alAlternar={(id, seleccionado) => setDecisionesSeleccionadas((actual) => alternarSeleccion(actual, id, seleccionado))}
            />
          </div>

          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}