import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { mejoraSchema, type MejoraEntrada } from '@/compartido/validacion/esquemas'
import type { MejoraPm } from '@/dominio/modelos'
import { estadosMejoraPm, formatearEstadoMejora, formatearPrioridadRegistro, prioridadesRegistro } from '@/dominio/modelos'
import { crearMejoraPm, editarMejoraPm, eliminarMejoraPm, listarMejorasPm, listarReferenciasOperacion } from '@/aplicacion/casos-uso/operacion'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionOperacion } from '@/presentacion/paginas/operacion/NavegacionOperacion'

type ModoModal = 'crear' | 'editar' | 'ver'
type ReferenciasOperacion = Awaited<ReturnType<typeof listarReferenciasOperacion>>

export function PaginaMejoras() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [mejoras, setMejoras] = useState<MejoraPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasOperacion | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosMejoraPm)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosMejoraPm)[number]) ?? 'todos'
  )
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroInsight, setFiltroInsight] = useState(searchParams.get('insight') ?? 'todos')
  const [filtroHipotesis, setFiltroHipotesis] = useState(searchParams.get('hipotesis') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [mejoraActiva, setMejoraActiva] = useState<MejoraPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<MejoraEntrada>({
    resolver: zodResolver(mejoraSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      descripcion: '',
      estado: 'backlog',
      prioridad: 'media',
      owner: null,
      fecha_solicitud: new Date().toISOString().slice(0, 10),
      fecha_cierre: null,
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      insight_id: null,
      hipotesis_discovery_id: null,
      beneficio_esperado: '',
      criterio_exito: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [mejorasData, referenciasData] = await Promise.all([listarMejorasPm(), listarReferenciasOperacion()])
      setMejoras(mejorasData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las mejoras')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const mejorasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return mejoras.filter((mejora) => {
      const coincideBusqueda =
        mejora.codigo.toLowerCase().includes(termino) ||
        mejora.titulo.toLowerCase().includes(termino) ||
        mejora.descripcion.toLowerCase().includes(termino)
      const coincideEstado = filtroEstado === 'todos' ? true : mejora.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : mejora.prioridad === filtroPrioridad
      const coincideModulo = filtroModulo === 'todos' ? true : mejora.modulo_codigo === filtroModulo
      const coincideOwner = owner ? (mejora.owner ?? '').toLowerCase().includes(owner) : true
      const coincideInsight = filtroInsight === 'todos' ? true : mejora.insight_id === filtroInsight
      const coincideHipotesis = filtroHipotesis === 'todos' ? true : mejora.hipotesis_discovery_id === filtroHipotesis
      const coincideDesde = fechaDesde ? mejora.fecha_solicitud >= fechaDesde : true
      const coincideHasta = fechaHasta ? mejora.fecha_solicitud <= fechaHasta : true

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincidePrioridad &&
        coincideModulo &&
        coincideOwner &&
        coincideInsight &&
        coincideHipotesis &&
        coincideDesde &&
        coincideHasta
      )
    })
  }, [mejoras, busqueda, filtroEstado, filtroPrioridad, filtroModulo, filtroOwner, filtroInsight, filtroHipotesis, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: mejorasFiltradas,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) parametros.set('q', busqueda)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroPrioridad !== 'todas') parametros.set('prioridad', filtroPrioridad)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (filtroOwner) parametros.set('owner', filtroOwner)
    if (filtroInsight !== 'todos') parametros.set('insight', filtroInsight)
    if (filtroHipotesis !== 'todos') parametros.set('hipotesis', filtroHipotesis)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))

    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroEstado, filtroPrioridad, filtroModulo, filtroOwner, filtroInsight, filtroHipotesis, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const nombresModulo = useMemo(
    () => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])),
    [referencias]
  )
  const nombresIniciativa = useMemo(
    () => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])),
    [referencias]
  )
  const nombresEntrega = useMemo(
    () => new Map((referencias?.entregas ?? []).map((entrega) => [entrega.id, entrega.nombre])),
    [referencias]
  )
  const nombresInsight = useMemo(
    () => new Map((referencias?.insights ?? []).map((insight) => [insight.id, insight.titulo])),
    [referencias]
  )
  const nombresHipotesis = useMemo(
    () => new Map((referencias?.hipotesisDiscovery ?? []).map((hipotesis) => [hipotesis.id, hipotesis.titulo])),
    [referencias]
  )

  const abrirModal = (modo: ModoModal, mejora?: MejoraPm) => {
    setModoModal(modo)
    setMejoraActiva(mejora ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: mejora?.codigo ?? '',
      titulo: mejora?.titulo ?? '',
      descripcion: mejora?.descripcion ?? '',
      estado: mejora?.estado ?? 'backlog',
      prioridad: mejora?.prioridad ?? 'media',
      owner: mejora?.owner ?? null,
      fecha_solicitud: mejora?.fecha_solicitud ?? new Date().toISOString().slice(0, 10),
      fecha_cierre: mejora?.fecha_cierre ?? null,
      modulo_codigo: mejora?.modulo_codigo ?? null,
      iniciativa_id: mejora?.iniciativa_id ?? null,
      entrega_id: mejora?.entrega_id ?? null,
      insight_id: mejora?.insight_id ?? null,
      hipotesis_discovery_id: mejora?.hipotesis_discovery_id ?? null,
      beneficio_esperado: mejora?.beneficio_esperado ?? '',
      criterio_exito: mejora?.criterio_exito ?? null,
      notas: mejora?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-mejoras-operacion.csv',
      [
        { encabezado: 'Código', valor: (mejora) => mejora.codigo },
        { encabezado: 'Título', valor: (mejora) => mejora.titulo },
        { encabezado: 'Estado', valor: (mejora) => formatearEstadoMejora(mejora.estado) },
        { encabezado: 'Prioridad', valor: (mejora) => formatearPrioridadRegistro(mejora.prioridad) },
        { encabezado: 'Owner', valor: (mejora) => mejora.owner ?? '' },
        { encabezado: 'Fecha solicitud', valor: (mejora) => mejora.fecha_solicitud },
        { encabezado: 'Fecha cierre', valor: (mejora) => mejora.fecha_cierre ?? '' },
        { encabezado: 'Módulo', valor: (mejora) => nombresModulo.get(mejora.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (mejora) => nombresIniciativa.get(mejora.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Entrega', valor: (mejora) => nombresEntrega.get(mejora.entrega_id ?? '') ?? '' },
        { encabezado: 'Insight', valor: (mejora) => nombresInsight.get(mejora.insight_id ?? '') ?? '' },
        { encabezado: 'Hipótesis discovery', valor: (mejora) => nombresHipotesis.get(mejora.hipotesis_discovery_id ?? '') ?? '' },
        { encabezado: 'Beneficio esperado', valor: (mejora) => mejora.beneficio_esperado }
      ],
      mejorasFiltradas
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Mejoras</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona mejoras operativas con vínculos opcionales a delivery y discovery para capturar origen, beneficio esperado y criterio de éxito.
          </p>
        </div>
        <NavegacionOperacion />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar mejora" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosMejoraPm)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosMejoraPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoMejora(estado)}</option>)}</select>
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Prioridad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{formatearPrioridadRegistro(prioridad)}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <input type="search" value={filtroOwner} onChange={(evento) => { setFiltroOwner(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroInsight} onChange={(evento) => { setFiltroInsight(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Insight: todos</option>{(referencias?.insights ?? []).map((insight) => <option key={insight.id} value={insight.id}>{insight.titulo}</option>)}</select>
        <select value={filtroHipotesis} onChange={(evento) => { setFiltroHipotesis(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Hipótesis: todas</option>{(referencias?.hipotesisDiscovery ?? []).map((hipotesis) => <option key={hipotesis.id} value={hipotesis.id}>{hipotesis.titulo}</option>)}</select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nueva mejora</button>
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={mejorasFiltradas.length === 0} mensajeVacio="No hay mejoras para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/40"><tr><th className="px-4 py-3 text-left font-medium">Mejora</th><th className="px-4 py-3 text-left font-medium">Estado</th><th className="px-4 py-3 text-left font-medium">Prioridad</th><th className="px-4 py-3 text-left font-medium">Origen</th><th className="px-4 py-3 text-left font-medium">Fechas</th><th className="px-4 py-3 text-right font-medium">Acciones</th></tr></thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginacion.itemsPaginados.map((mejora) => (
                    <tr key={mejora.id}>
                      <td className="px-4 py-3 align-top"><div className="space-y-1"><p className="font-medium">{mejora.codigo} · {mejora.titulo}</p><p className="text-slate-600 dark:text-slate-300">{mejora.descripcion}</p><p className="text-xs text-slate-500 dark:text-slate-400">{mejora.owner ? `Owner: ${mejora.owner}` : 'Sin owner'}</p></div></td>
                      <td className="px-4 py-3 align-top">{formatearEstadoMejora(mejora.estado)}</td>
                      <td className="px-4 py-3 align-top">{formatearPrioridadRegistro(mejora.prioridad)}</td>
                      <td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>{nombresModulo.get(mejora.modulo_codigo ?? '') ?? 'Sin módulo'}</p><p>{nombresInsight.get(mejora.insight_id ?? '') ?? 'Sin insight'}</p><p>{nombresHipotesis.get(mejora.hipotesis_discovery_id ?? '') ?? 'Sin hipótesis'}</p></div></td>
                      <td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>Solicitud: {normalizarFechaPortal(mejora.fecha_solicitud)}</p><p>Cierre: {normalizarFechaPortal(mejora.fecha_cierre) || 'Pendiente'}</p></div></td>
                      <td className="px-4 py-3 align-top"><div className="flex justify-end gap-2"><button type="button" onClick={() => abrirModal('ver', mejora)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" onClick={() => abrirModal('editar', mejora)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${mejora.codigo}?`)) return; try { await eliminarMejoraPm(mejora.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la mejora') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
        </>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nueva mejora' : modoModal === 'editar' ? `Editar ${mejoraActiva?.codigo ?? 'mejora'}` : `Detalle ${mejoraActiva?.codigo ?? 'mejora'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          try {
            if (modoModal === 'ver') { setModalAbierto(false); return }
            if (modoModal === 'crear') await crearMejoraPm(valores)
            if (modoModal === 'editar' && mejoraActiva) await editarMejoraPm(mejoraActiva.id, valores)
            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la mejora')
          }
        })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Título</span><input {...formulario.register('titulo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Descripción</span><textarea {...formulario.register('descripcion')} disabled={modoModal === 'ver'} rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{estadosMejoraPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoMejora(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Prioridad</span><select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{formatearPrioridadRegistro(prioridad)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha solicitud</span><input type="date" {...formulario.register('fecha_solicitud')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha cierre</span><input type="date" {...formulario.register('fecha_cierre')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Insight</span><select {...formulario.register('insight_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin insight</option>{(referencias?.insights ?? []).map((insight) => <option key={insight.id} value={insight.id}>{insight.titulo}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Hipótesis discovery</span><select {...formulario.register('hipotesis_discovery_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin hipótesis</option>{(referencias?.hipotesisDiscovery ?? []).map((hipotesis) => <option key={hipotesis.id} value={hipotesis.id}>{hipotesis.titulo}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Beneficio esperado</span><textarea {...formulario.register('beneficio_esperado')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Criterio de éxito</span><textarea {...formulario.register('criterio_exito')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios y las fechas antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear mejora'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}