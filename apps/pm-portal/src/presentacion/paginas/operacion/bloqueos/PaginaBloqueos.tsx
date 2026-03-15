import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { bloqueoSchema, type BloqueoEntrada } from '@/compartido/validacion/esquemas'
import type { BloqueoPm } from '@/dominio/modelos'
import { estadosBloqueoPm, formatearEstadoBloqueo, formatearPrioridadRegistro, prioridadesRegistro } from '@/dominio/modelos'
import { crearBloqueoPm, editarBloqueoPm, eliminarBloqueoPm, listarBloqueosPm, listarReferenciasOperacion } from '@/aplicacion/casos-uso/operacion'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionOperacion } from '@/presentacion/paginas/operacion/NavegacionOperacion'

type ModoModal = 'crear' | 'editar' | 'ver'
type ReferenciasOperacion = Awaited<ReturnType<typeof listarReferenciasOperacion>>

export function PaginaBloqueos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [bloqueos, setBloqueos] = useState<BloqueoPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasOperacion | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosBloqueoPm)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosBloqueoPm)[number]) ?? 'todos'
  )
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroDecision, setFiltroDecision] = useState(searchParams.get('decision') ?? 'todos')
  const [filtroRelease, setFiltroRelease] = useState(searchParams.get('release') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [bloqueoActivo, setBloqueoActivo] = useState<BloqueoPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<BloqueoEntrada>({
    resolver: zodResolver(bloqueoSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      descripcion: '',
      estado: 'abierto',
      prioridad: 'media',
      owner: null,
      responsable_desbloqueo: null,
      fecha_reporte: new Date().toISOString().slice(0, 10),
      fecha_resolucion: null,
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      release_id: null,
      decision_id: null,
      impacto_operativo: '',
      proximo_paso: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [bloqueosData, referenciasData] = await Promise.all([listarBloqueosPm(), listarReferenciasOperacion()])
      setBloqueos(bloqueosData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los bloqueos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [])

  const bloqueosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return bloqueos.filter((bloqueo) => {
      const coincideBusqueda = bloqueo.codigo.toLowerCase().includes(termino) || bloqueo.titulo.toLowerCase().includes(termino) || bloqueo.descripcion.toLowerCase().includes(termino)
      const coincideEstado = filtroEstado === 'todos' ? true : bloqueo.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : bloqueo.prioridad === filtroPrioridad
      const coincideModulo = filtroModulo === 'todos' ? true : bloqueo.modulo_codigo === filtroModulo
      const coincideOwner = owner ? (bloqueo.owner ?? '').toLowerCase().includes(owner) : true
      const coincideDecision = filtroDecision === 'todos' ? true : bloqueo.decision_id === filtroDecision
      const coincideRelease = filtroRelease === 'todos' ? true : bloqueo.release_id === filtroRelease
      const coincideDesde = fechaDesde ? bloqueo.fecha_reporte >= fechaDesde : true
      const coincideHasta = fechaHasta ? bloqueo.fecha_reporte <= fechaHasta : true

      return coincideBusqueda && coincideEstado && coincidePrioridad && coincideModulo && coincideOwner && coincideDecision && coincideRelease && coincideDesde && coincideHasta
    })
  }, [bloqueos, busqueda, filtroEstado, filtroPrioridad, filtroModulo, filtroOwner, filtroDecision, filtroRelease, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({ items: bloqueosFiltrados, paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1, tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10 })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroPrioridad !== 'todas') parametros.set('prioridad', filtroPrioridad)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (filtroOwner) parametros.set('owner', filtroOwner)
    if (filtroDecision !== 'todos') parametros.set('decision', filtroDecision)
    if (filtroRelease !== 'todos') parametros.set('release', filtroRelease)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))

    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroEstado, filtroPrioridad, filtroModulo, filtroOwner, filtroDecision, filtroRelease, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const nombresModulo = useMemo(() => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])), [referencias])
  const nombresIniciativa = useMemo(() => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [referencias])
  const nombresRelease = useMemo(() => new Map((referencias?.releases ?? []).map((release) => [release.id, `${release.codigo} · ${release.nombre}`])), [referencias])
  const nombresDecision = useMemo(() => new Map((referencias?.decisiones ?? []).map((decision) => [decision.id, decision.titulo])), [referencias])

  const abrirModal = (modo: ModoModal, bloqueo?: BloqueoPm) => {
    setModoModal(modo)
    setBloqueoActivo(bloqueo ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: bloqueo?.codigo ?? '',
      titulo: bloqueo?.titulo ?? '',
      descripcion: bloqueo?.descripcion ?? '',
      estado: bloqueo?.estado ?? 'abierto',
      prioridad: bloqueo?.prioridad ?? 'media',
      owner: bloqueo?.owner ?? null,
      responsable_desbloqueo: bloqueo?.responsable_desbloqueo ?? null,
      fecha_reporte: bloqueo?.fecha_reporte ?? new Date().toISOString().slice(0, 10),
      fecha_resolucion: bloqueo?.fecha_resolucion ?? null,
      modulo_codigo: bloqueo?.modulo_codigo ?? null,
      iniciativa_id: bloqueo?.iniciativa_id ?? null,
      entrega_id: bloqueo?.entrega_id ?? null,
      release_id: bloqueo?.release_id ?? null,
      decision_id: bloqueo?.decision_id ?? null,
      impacto_operativo: bloqueo?.impacto_operativo ?? '',
      proximo_paso: bloqueo?.proximo_paso ?? null,
      notas: bloqueo?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-bloqueos-operacion.csv',
      [
        { encabezado: 'Código', valor: (bloqueo) => bloqueo.codigo },
        { encabezado: 'Título', valor: (bloqueo) => bloqueo.titulo },
        { encabezado: 'Estado', valor: (bloqueo) => formatearEstadoBloqueo(bloqueo.estado) },
        { encabezado: 'Prioridad', valor: (bloqueo) => formatearPrioridadRegistro(bloqueo.prioridad) },
        { encabezado: 'Owner', valor: (bloqueo) => bloqueo.owner ?? '' },
        { encabezado: 'Responsable desbloqueo', valor: (bloqueo) => bloqueo.responsable_desbloqueo ?? '' },
        { encabezado: 'Fecha reporte', valor: (bloqueo) => bloqueo.fecha_reporte },
        { encabezado: 'Fecha resolución', valor: (bloqueo) => bloqueo.fecha_resolucion ?? '' },
        { encabezado: 'Módulo', valor: (bloqueo) => nombresModulo.get(bloqueo.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (bloqueo) => nombresIniciativa.get(bloqueo.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Release', valor: (bloqueo) => nombresRelease.get(bloqueo.release_id ?? '') ?? '' },
        { encabezado: 'Decisión', valor: (bloqueo) => nombresDecision.get(bloqueo.decision_id ?? '') ?? '' },
        { encabezado: 'Impacto operativo', valor: (bloqueo) => bloqueo.impacto_operativo }
      ],
      bloqueosFiltrados
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2"><div className="space-y-1"><h1 className="text-2xl font-semibold">Bloqueos</h1><p className="text-sm text-slate-600 dark:text-slate-400">Centraliza bloqueos operativos con responsable de desbloqueo, impacto operativo, siguiente paso y referencia opcional a decisión o release.</p></div><NavegacionOperacion /></header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar bloqueo" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosBloqueoPm)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosBloqueoPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoBloqueo(estado)}</option>)}</select>
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Prioridad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{formatearPrioridadRegistro(prioridad)}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <input type="search" value={filtroOwner} onChange={(evento) => { setFiltroOwner(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroDecision} onChange={(evento) => { setFiltroDecision(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Decisión: todas</option>{(referencias?.decisiones ?? []).map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}</select>
        <select value={filtroRelease} onChange={(evento) => { setFiltroRelease(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Release: todos</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nuevo bloqueo</button><button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button></div>

      <EstadoVista cargando={cargando} error={error} vacio={bloqueosFiltrados.length === 0} mensajeVacio="No hay bloqueos para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-50 dark:bg-slate-950/40"><tr><th className="px-4 py-3 text-left font-medium">Bloqueo</th><th className="px-4 py-3 text-left font-medium">Estado</th><th className="px-4 py-3 text-left font-medium">Prioridad</th><th className="px-4 py-3 text-left font-medium">Contexto</th><th className="px-4 py-3 text-left font-medium">Fechas</th><th className="px-4 py-3 text-right font-medium">Acciones</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{paginacion.itemsPaginados.map((bloqueo) => <tr key={bloqueo.id}><td className="px-4 py-3 align-top"><div className="space-y-1"><p className="font-medium">{bloqueo.codigo} · {bloqueo.titulo}</p><p className="text-slate-600 dark:text-slate-300">{bloqueo.descripcion}</p><p className="text-xs text-slate-500 dark:text-slate-400">{bloqueo.responsable_desbloqueo ? `Responsable: ${bloqueo.responsable_desbloqueo}` : 'Sin responsable de desbloqueo'}</p></div></td><td className="px-4 py-3 align-top">{formatearEstadoBloqueo(bloqueo.estado)}</td><td className="px-4 py-3 align-top">{formatearPrioridadRegistro(bloqueo.prioridad)}</td><td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>{nombresModulo.get(bloqueo.modulo_codigo ?? '') ?? 'Sin módulo'}</p><p>{nombresDecision.get(bloqueo.decision_id ?? '') ?? 'Sin decisión'}</p><p>{nombresRelease.get(bloqueo.release_id ?? '') ?? 'Sin release'}</p></div></td><td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>Reporte: {formatearFechaCorta(bloqueo.fecha_reporte)}</p><p>Resolución: {formatearFechaCorta(bloqueo.fecha_resolucion) || 'Pendiente'}</p></div></td><td className="px-4 py-3 align-top"><div className="flex justify-end gap-2"><button type="button" onClick={() => abrirModal('ver', bloqueo)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" onClick={() => abrirModal('editar', bloqueo)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${bloqueo.codigo}?`)) return; try { await eliminarBloqueoPm(bloqueo.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el bloqueo') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button></div></td></tr>)}</tbody></table></div></div>
          <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
        </>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nuevo bloqueo' : modoModal === 'editar' ? `Editar ${bloqueoActivo?.codigo ?? 'bloqueo'}` : `Ver ${bloqueoActivo?.codigo ?? 'bloqueo'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => { try { if (modoModal === 'ver') { setModalAbierto(false); return } if (modoModal === 'crear') await crearBloqueoPm(valores); if (modoModal === 'editar' && bloqueoActivo) await editarBloqueoPm(bloqueoActivo.id, valores); setModalAbierto(false); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el bloqueo') } })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Título</span><input {...formulario.register('titulo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Descripción</span><textarea {...formulario.register('descripcion')} disabled={modoModal === 'ver'} rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{estadosBloqueoPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoBloqueo(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Prioridad</span><select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{formatearPrioridadRegistro(prioridad)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Responsable desbloqueo</span><input {...formulario.register('responsable_desbloqueo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha reporte</span><input type="date" {...formulario.register('fecha_reporte')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha resolución</span><input type="date" {...formulario.register('fecha_resolucion')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Release</span><select {...formulario.register('release_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin release</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Decisión</span><select {...formulario.register('decision_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin decisión</option>{(referencias?.decisiones ?? []).map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Impacto operativo</span><textarea {...formulario.register('impacto_operativo')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Próximo paso</span><textarea {...formulario.register('proximo_paso')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios y las fechas antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear bloqueo'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}