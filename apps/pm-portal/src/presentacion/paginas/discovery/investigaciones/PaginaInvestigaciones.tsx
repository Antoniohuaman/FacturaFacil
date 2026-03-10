import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { investigacionDiscoverySchema, type InvestigacionDiscoveryEntrada } from '@/compartido/validacion/esquemas'
import type { InsightDiscoveryPm, InvestigacionDiscoveryPm, SegmentoDiscoveryPm } from '@/dominio/modelos'
import { estadosRegistro } from '@/dominio/modelos'
import {
  crearInvestigacionDiscovery,
  editarInvestigacionDiscovery,
  eliminarInvestigacionDiscovery,
  listarInsightsDiscovery,
  listarInvestigacionesDiscovery,
  listarRelInvestigacionInsight,
  listarSegmentosDiscovery
} from '@/aplicacion/casos-uso/discovery'
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

export function PaginaInvestigaciones() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [investigaciones, setInvestigaciones] = useState<InvestigacionDiscoveryPm[]>([])
  const [segmentos, setSegmentos] = useState<SegmentoDiscoveryPm[]>([])
  const [insights, setInsights] = useState<InsightDiscoveryPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroSegmento, setFiltroSegmento] = useState(searchParams.get('segmento') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [investigacionActiva, setInvestigacionActiva] = useState<InvestigacionDiscoveryPm | null>(null)
  const [insightsSeleccionados, setInsightsSeleccionados] = useState<string[]>([])
  const [relacionesInsights, setRelacionesInsights] = useState<Map<string, number>>(new Map())
  const [detalleRelacionesInsights, setDetalleRelacionesInsights] = useState<Map<string, string[]>>(new Map())

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<InvestigacionDiscoveryEntrada>({
    resolver: zodResolver(investigacionDiscoverySchema),
    defaultValues: {
      titulo: '',
      tipo_investigacion: '',
      fecha_investigacion: new Date().toISOString().slice(0, 10),
      segmento_id: null,
      participantes_resumen: '',
      resumen: '',
      hallazgos: '',
      conclusion: '',
      evidencia_url: null,
      estado: 'pendiente',
      owner: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [investigacionesData, segmentosData, insightsData, relInsightsData] = await Promise.all([
        listarInvestigacionesDiscovery(),
        listarSegmentosDiscovery(),
        listarInsightsDiscovery(),
        listarRelInvestigacionInsight()
      ])

      setInvestigaciones(investigacionesData)
      setSegmentos(segmentosData)
      setInsights(insightsData)
      setRelacionesInsights(
        relInsightsData.reduce(
          (mapa, relacion) => mapa.set(relacion.investigacion_id, (mapa.get(relacion.investigacion_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setDetalleRelacionesInsights(
        relInsightsData.reduce((mapa, relacion) => {
          const actual = mapa.get(relacion.investigacion_id) ?? []
          return mapa.set(relacion.investigacion_id, [...actual, relacion.insight_id])
        }, new Map<string, string[]>())
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las investigaciones')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const tiposDisponibles = useMemo(
    () => [...new Set(investigaciones.map((investigacion) => investigacion.tipo_investigacion.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [investigaciones]
  )

  const segmentoPorId = useMemo(() => new Map(segmentos.map((segmento) => [segmento.id, segmento.nombre])), [segmentos])

  const investigacionesFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()

    return investigaciones.filter((investigacion) => {
      const coincideBusqueda =
        investigacion.titulo.toLowerCase().includes(termino) ||
        investigacion.resumen.toLowerCase().includes(termino) ||
        investigacion.hallazgos.toLowerCase().includes(termino) ||
        (investigacion.owner ?? '').toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : investigacion.tipo_investigacion === filtroTipo
      const coincideEstado = filtroEstado === 'todos' ? true : investigacion.estado === filtroEstado
      const coincideSegmento = filtroSegmento === 'todos' ? true : investigacion.segmento_id === filtroSegmento
      const coincideDesde = fechaDesde ? investigacion.fecha_investigacion >= fechaDesde : true
      const coincideHasta = fechaHasta ? investigacion.fecha_investigacion <= fechaHasta : true

      return coincideBusqueda && coincideTipo && coincideEstado && coincideSegmento && coincideDesde && coincideHasta
    })
  }, [investigaciones, busqueda, filtroTipo, filtroEstado, filtroSegmento, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: investigacionesFiltradas,
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
  }, [busqueda, filtroTipo, filtroEstado, filtroSegmento, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const abrirModal = (modo: ModoModal, investigacion?: InvestigacionDiscoveryPm) => {
    setModoModal(modo)
    setInvestigacionActiva(investigacion ?? null)
    setModalAbierto(true)
    formulario.reset({
      titulo: investigacion?.titulo ?? '',
      tipo_investigacion: investigacion?.tipo_investigacion ?? '',
      fecha_investigacion: investigacion?.fecha_investigacion ?? new Date().toISOString().slice(0, 10),
      segmento_id: investigacion?.segmento_id ?? null,
      participantes_resumen: investigacion?.participantes_resumen ?? '',
      resumen: investigacion?.resumen ?? '',
      hallazgos: investigacion?.hallazgos ?? '',
      conclusion: investigacion?.conclusion ?? '',
      evidencia_url: investigacion?.evidencia_url ?? null,
      estado: investigacion?.estado ?? 'pendiente',
      owner: investigacion?.owner ?? null
    })
    setInsightsSeleccionados(investigacion ? detalleRelacionesInsights.get(investigacion.id) ?? [] : [])
  }

  const opcionesInsights = useMemo(
    () =>
      insights.map((insight) => ({
        id: insight.id,
        etiqueta: insight.titulo,
        descripcion: `${insight.tipo} · ${insight.estado}`
      })),
    [insights]
  )

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Investigaciones</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Registra investigaciones cualitativas y cuantitativas, y conecta hallazgos con insights de discovery.
          </p>
        </div>
        <NavegacionDiscovery />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar investigación" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroTipo} onChange={(evento) => { setFiltroTipo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Tipo: todos</option>
          {tiposDisponibles.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
        </select>
        <select value={filtroSegmento} onChange={(evento) => { setFiltroSegmento(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Segmento: todos</option>
          {segmentos.map((segmento) => <option key={segmento.id} value={segmento.id}>{segmento.nombre}</option>)}
        </select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <button type="button" onClick={() => { setBusqueda(''); setFiltroTipo('todos'); setFiltroEstado('todos'); setFiltroSegmento('todos'); setFechaDesde(''); setFechaHasta(''); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Limpiar</button>
        <button type="button" onClick={() => { exportarCsv('discovery-investigaciones.csv', [
          { encabezado: 'Título', valor: (investigacion) => investigacion.titulo },
          { encabezado: 'Tipo', valor: (investigacion) => investigacion.tipo_investigacion },
          { encabezado: 'Fecha', valor: (investigacion) => normalizarFechaPortal(investigacion.fecha_investigacion) },
          { encabezado: 'Segmento', valor: (investigacion) => segmentoPorId.get(investigacion.segmento_id ?? '') ?? '' },
          { encabezado: 'Participantes', valor: (investigacion) => investigacion.participantes_resumen },
          { encabezado: 'Estado', valor: (investigacion) => formatearEstadoLegible(investigacion.estado) },
          { encabezado: 'Owner', valor: (investigacion) => investigacion.owner ?? '' },
          { encabezado: 'Insights vinculados', valor: (investigacion) => relacionesInsights.get(investigacion.id) ?? 0 }
        ], investigacionesFiltradas) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear investigación</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={investigacionesFiltradas.length === 0} mensajeVacio="No hay investigaciones para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Investigación</th>
                <th className="px-3 py-2">Segmento</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((investigacion) => (
                <tr key={investigacion.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{investigacion.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{investigacion.tipo_investigacion} · {normalizarFechaPortal(investigacion.fecha_investigacion)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{relacionesInsights.get(investigacion.id) ?? 0} insights vinculados</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{segmentoPorId.get(investigacion.segmento_id ?? '') ?? 'Sin segmento'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{investigacion.participantes_resumen}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{investigacion.estado}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{investigacion.owner ?? 'Sin owner'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', investigacion)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', investigacion)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar esta investigación?')) { void eliminarInvestigacionDiscovery(investigacion.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la investigación') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} investigación`} alCerrar={() => setModalAbierto(false)}>
        <form noValidate className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearInvestigacionDiscovery(valores, insightsSeleccionados)
            }

            if (modoModal === 'editar' && investigacionActiva) {
              await editarInvestigacionDiscovery(investigacionActiva.id, valores, insightsSeleccionados)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la investigación')
          }
        })}>
          <div>
            <label className="text-sm font-medium">Título</label>
            <input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Tipo investigación</label>
              <input {...formulario.register('tipo_investigacion')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <input type="date" {...formulario.register('fecha_investigacion')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Segmento</label>
              <select {...formulario.register('segmento_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin segmento</option>
                {segmentos.map((segmento) => <option key={segmento.id} value={segmento.id}>{segmento.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Participantes resumen</label>
            <textarea {...formulario.register('participantes_resumen')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="text-sm font-medium">Resumen</label>
            <textarea {...formulario.register('resumen')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Hallazgos</label>
              <textarea {...formulario.register('hallazgos')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Conclusión</label>
              <textarea {...formulario.register('conclusion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Evidencia URL</label>
              <input {...formulario.register('evidencia_url')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <SelectorRelaciones titulo="Vincular con insights" opciones={opcionesInsights} seleccionados={insightsSeleccionados} deshabilitado={modoModal === 'ver'} alAlternar={(id, seleccionado) => setInsightsSeleccionados((actual) => alternarSeleccion(actual, id, seleccionado))} />
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}