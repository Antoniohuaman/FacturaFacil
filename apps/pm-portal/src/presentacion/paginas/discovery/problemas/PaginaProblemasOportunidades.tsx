import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { problemaOportunidadDiscoverySchema, type ProblemaOportunidadDiscoveryEntrada } from '@/compartido/validacion/esquemas'
import type {
  CatalogoModuloPm,
  InsightDiscoveryPm,
  ObjetivoEstrategicoPm,
  ProblemaOportunidadDiscoveryPm,
  SegmentoDiscoveryPm
} from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro, tiposProblemaOportunidadDiscovery } from '@/dominio/modelos'
import {
  crearProblemaOportunidadDiscovery,
  editarProblemaOportunidadDiscovery,
  eliminarProblemaOportunidadDiscovery,
  listarInsightsDiscovery,
  listarProblemasOportunidadesDiscovery,
  listarRelInsightProblema,
  listarRelProblemaObjetivoEstrategico,
  listarSegmentosDiscovery
} from '@/aplicacion/casos-uso/discovery'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { listarObjetivosEstrategicos } from '@/aplicacion/casos-uso/estrategia'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionDiscovery } from '@/presentacion/paginas/discovery/NavegacionDiscovery'
import { SelectorRelaciones } from '@/presentacion/paginas/discovery/SelectorRelaciones'

type ModoModal = 'crear' | 'editar' | 'ver'

function alternarSeleccion(actual: string[], id: string, seleccionado: boolean) {
  return seleccionado ? [...actual, id] : actual.filter((item) => item !== id)
}

export function PaginaProblemasOportunidades() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [problemas, setProblemas] = useState<ProblemaOportunidadDiscoveryPm[]>([])
  const [segmentos, setSegmentos] = useState<SegmentoDiscoveryPm[]>([])
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [insights, setInsights] = useState<InsightDiscoveryPm[]>([])
  const [objetivos, setObjetivos] = useState<ObjetivoEstrategicoPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') ?? 'todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroSegmento, setFiltroSegmento] = useState(searchParams.get('segmento') ?? 'todos')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [problemaActivo, setProblemaActivo] = useState<ProblemaOportunidadDiscoveryPm | null>(null)
  const [insightsSeleccionados, setInsightsSeleccionados] = useState<string[]>([])
  const [objetivosSeleccionados, setObjetivosSeleccionados] = useState<string[]>([])
  const [relacionesInsights, setRelacionesInsights] = useState<Map<string, number>>(new Map())
  const [relacionesObjetivos, setRelacionesObjetivos] = useState<Map<string, number>>(new Map())
  const [detalleRelacionesInsights, setDetalleRelacionesInsights] = useState<Map<string, string[]>>(new Map())
  const [detalleRelacionesObjetivos, setDetalleRelacionesObjetivos] = useState<Map<string, string[]>>(new Map())

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<ProblemaOportunidadDiscoveryEntrada>({
    resolver: zodResolver(problemaOportunidadDiscoverySchema),
    defaultValues: {
      tipo: 'problema',
      titulo: '',
      descripcion: '',
      impacto: '',
      prioridad: 'media',
      segmento_id: null,
      modulo_codigo: null,
      estado: 'pendiente',
      owner: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [problemasData, segmentosData, modulosData, insightsData, objetivosData, relInsightsData, relObjetivosData] = await Promise.all([
        listarProblemasOportunidadesDiscovery(),
        listarSegmentosDiscovery(),
        listarModulosPm(),
        listarInsightsDiscovery(),
        listarObjetivosEstrategicos(),
        listarRelInsightProblema(),
        listarRelProblemaObjetivoEstrategico()
      ])

      setProblemas(problemasData)
      setSegmentos(segmentosData)
      setModulos(modulosData.filter((modulo) => modulo.activo))
      setInsights(insightsData)
      setObjetivos(objetivosData)
      setRelacionesInsights(
        relInsightsData.reduce(
          (mapa, relacion) =>
            mapa.set(relacion.problema_oportunidad_id, (mapa.get(relacion.problema_oportunidad_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setRelacionesObjetivos(
        relObjetivosData.reduce(
          (mapa, relacion) =>
            mapa.set(relacion.problema_oportunidad_id, (mapa.get(relacion.problema_oportunidad_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setDetalleRelacionesInsights(
        relInsightsData.reduce((mapa, relacion) => {
          const actual = mapa.get(relacion.problema_oportunidad_id) ?? []
          return mapa.set(relacion.problema_oportunidad_id, [...actual, relacion.insight_id])
        }, new Map<string, string[]>())
      )
      setDetalleRelacionesObjetivos(
        relObjetivosData.reduce((mapa, relacion) => {
          const actual = mapa.get(relacion.problema_oportunidad_id) ?? []
          return mapa.set(relacion.problema_oportunidad_id, [...actual, relacion.objetivo_estrategico_id])
        }, new Map<string, string[]>())
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los problemas y oportunidades')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const segmentoPorId = useMemo(() => new Map(segmentos.map((segmento) => [segmento.id, segmento.nombre])), [segmentos])
  const moduloPorCodigo = useMemo(() => new Map(modulos.map((modulo) => [modulo.codigo, modulo.nombre])), [modulos])

  const problemasFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()

    return problemas.filter((problema) => {
      const coincideBusqueda =
        problema.titulo.toLowerCase().includes(termino) ||
        problema.descripcion.toLowerCase().includes(termino) ||
        problema.impacto.toLowerCase().includes(termino) ||
        (problema.owner ?? '').toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : problema.tipo === filtroTipo
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : problema.prioridad === filtroPrioridad
      const coincideEstado = filtroEstado === 'todos' ? true : problema.estado === filtroEstado
      const coincideSegmento = filtroSegmento === 'todos' ? true : problema.segmento_id === filtroSegmento
      const coincideModulo = filtroModulo === 'todos' ? true : problema.modulo_codigo === filtroModulo

      return coincideBusqueda && coincideTipo && coincidePrioridad && coincideEstado && coincideSegmento && coincideModulo
    })
  }, [problemas, busqueda, filtroTipo, filtroPrioridad, filtroEstado, filtroSegmento, filtroModulo])

  const paginacion = usePaginacion({
    items: problemasFiltrados,
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
    if (filtroPrioridad !== 'todas') {
      parametros.set('prioridad', filtroPrioridad)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (filtroSegmento !== 'todos') {
      parametros.set('segmento', filtroSegmento)
    }
    if (filtroModulo !== 'todos') {
      parametros.set('modulo', filtroModulo)
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
    filtroPrioridad,
    filtroEstado,
    filtroSegmento,
    filtroModulo,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const abrirModal = (modo: ModoModal, problema?: ProblemaOportunidadDiscoveryPm) => {
    setModoModal(modo)
    setProblemaActivo(problema ?? null)
    setModalAbierto(true)
    formulario.reset({
      tipo: problema?.tipo ?? 'problema',
      titulo: problema?.titulo ?? '',
      descripcion: problema?.descripcion ?? '',
      impacto: problema?.impacto ?? '',
      prioridad: problema?.prioridad ?? 'media',
      segmento_id: problema?.segmento_id ?? null,
      modulo_codigo: problema?.modulo_codigo ?? null,
      estado: problema?.estado ?? 'pendiente',
      owner: problema?.owner ?? null
    })
    setInsightsSeleccionados(problema ? detalleRelacionesInsights.get(problema.id) ?? [] : [])
    setObjetivosSeleccionados(problema ? detalleRelacionesObjetivos.get(problema.id) ?? [] : [])
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

  const opcionesObjetivos = useMemo(
    () =>
      objetivos.map((objetivo) => ({
        id: objetivo.id,
        etiqueta: `${objetivo.codigo} · ${objetivo.titulo}`,
        descripcion: `${objetivo.estado} · ${objetivo.prioridad}`
      })),
    [objetivos]
  )

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Problemas y oportunidades</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Mantén priorizado el backlog de problemas y oportunidades sin volver Discovery un paso obligatorio.
          </p>
        </div>
        <NavegacionDiscovery />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar problema u oportunidad" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroTipo} onChange={(evento) => { setFiltroTipo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Tipo: todos</option>
          {tiposProblemaOportunidadDiscovery.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}
        </select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
        </select>
        <select value={filtroSegmento} onChange={(evento) => { setFiltroSegmento(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Segmento: todos</option>
          {segmentos.map((segmento) => <option key={segmento.id} value={segmento.id}>{segmento.nombre}</option>)}
        </select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Módulo: todos</option>
          {modulos.map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}
        </select>
        <button type="button" onClick={() => { setBusqueda(''); setFiltroTipo('todos'); setFiltroPrioridad('todas'); setFiltroEstado('todos'); setFiltroSegmento('todos'); setFiltroModulo('todos'); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Limpiar</button>
        <button type="button" onClick={() => { exportarCsv('discovery-problemas-oportunidades.csv', [
          { encabezado: 'Tipo', valor: (problema) => problema.tipo },
          { encabezado: 'Título', valor: (problema) => problema.titulo },
          { encabezado: 'Descripción', valor: (problema) => problema.descripcion },
          { encabezado: 'Impacto', valor: (problema) => problema.impacto },
          { encabezado: 'Prioridad', valor: (problema) => problema.prioridad },
          { encabezado: 'Segmento', valor: (problema) => segmentoPorId.get(problema.segmento_id ?? '') ?? '' },
          { encabezado: 'Módulo', valor: (problema) => moduloPorCodigo.get(problema.modulo_codigo ?? '') ?? '' },
          { encabezado: 'Estado', valor: (problema) => formatearEstadoLegible(problema.estado) },
          { encabezado: 'Owner', valor: (problema) => problema.owner ?? '' },
          { encabezado: 'Insights vinculados', valor: (problema) => relacionesInsights.get(problema.id) ?? 0 },
          { encabezado: 'Objetivos estratégicos vinculados', valor: (problema) => relacionesObjetivos.get(problema.id) ?? 0 }
        ], problemasFiltrados) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear registro</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={problemasFiltrados.length === 0} mensajeVacio="No hay problemas u oportunidades para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Registro</th>
                <th className="px-3 py-2">Contexto</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((problema) => (
                <tr key={problema.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{problema.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{problema.tipo} · {problema.prioridad}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{relacionesInsights.get(problema.id) ?? 0} insights · {relacionesObjetivos.get(problema.id) ?? 0} objetivos</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{segmentoPorId.get(problema.segmento_id ?? '') ?? 'Sin segmento'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{moduloPorCodigo.get(problema.modulo_codigo ?? '') ?? 'Sin módulo'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{problema.estado}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{problema.owner ?? 'Sin owner'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', problema)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', problema)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar este registro?')) { void eliminarProblemaOportunidadDiscovery(problema.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el registro') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} problema u oportunidad`} alCerrar={() => setModalAbierto(false)}>
        <form noValidate className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearProblemaOportunidadDiscovery(valores, insightsSeleccionados, objetivosSeleccionados)
            }

            if (modoModal === 'editar' && problemaActivo) {
              await editarProblemaOportunidadDiscovery(problemaActivo.id, valores, insightsSeleccionados, objetivosSeleccionados)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el registro')
          }
        })}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select {...formulario.register('tipo')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {tiposProblemaOportunidadDiscovery.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Título</label>
            <input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="text-sm font-medium">Impacto</label>
            <textarea {...formulario.register('impacto')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Segmento</label>
              <select {...formulario.register('segmento_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin segmento</option>
                {segmentos.map((segmento) => <option key={segmento.id} value={segmento.id}>{segmento.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Módulo</label>
              <select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin módulo</option>
                {modulos.map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectorRelaciones titulo="Vincular con insights" opciones={opcionesInsights} seleccionados={insightsSeleccionados} deshabilitado={modoModal === 'ver'} alAlternar={(id, seleccionado) => setInsightsSeleccionados((actual) => alternarSeleccion(actual, id, seleccionado))} />
            <SelectorRelaciones titulo="Vincular con objetivos estratégicos" opciones={opcionesObjetivos} seleccionados={objetivosSeleccionados} deshabilitado={modoModal === 'ver'} alAlternar={(id, seleccionado) => setObjetivosSeleccionados((actual) => alternarSeleccion(actual, id, seleccionado))} />
          </div>
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}