import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { leccionAprendidaSchema, type LeccionAprendidaEntrada } from '@/compartido/validacion/esquemas'
import type { LeccionAprendidaPm } from '@/dominio/modelos'
import { estadosLeccionAprendidaPm, formatearEstadoLeccionAprendida } from '@/dominio/modelos'
import { crearLeccionAprendidaPm, editarLeccionAprendidaPm, eliminarLeccionAprendidaPm, listarLeccionesAprendidasPm, listarReferenciasOperacion } from '@/aplicacion/casos-uso/operacion'
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

export function PaginaLeccionesAprendidas() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [lecciones, setLecciones] = useState<LeccionAprendidaPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasOperacion | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosLeccionAprendidaPm)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosLeccionAprendidaPm)[number]) ?? 'todos'
  )
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroAuditoria, setFiltroAuditoria] = useState(searchParams.get('auditoria') ?? 'todos')
  const [filtroRelease, setFiltroRelease] = useState(searchParams.get('release') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [leccionActiva, setLeccionActiva] = useState<LeccionAprendidaPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<LeccionAprendidaEntrada>({
    resolver: zodResolver(leccionAprendidaSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      contexto: '',
      aprendizaje: '',
      accion_recomendada: '',
      estado: 'capturada',
      owner: null,
      fecha_leccion: new Date().toISOString().slice(0, 10),
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      release_id: null,
      auditoria_id: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [leccionesData, referenciasData] = await Promise.all([listarLeccionesAprendidasPm(), listarReferenciasOperacion()])
      setLecciones(leccionesData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las lecciones aprendidas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [])

  const leccionesFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return lecciones.filter((leccion) => {
      const coincideBusqueda = leccion.codigo.toLowerCase().includes(termino) || leccion.titulo.toLowerCase().includes(termino) || leccion.aprendizaje.toLowerCase().includes(termino)
      const coincideEstado = filtroEstado === 'todos' ? true : leccion.estado === filtroEstado
      const coincideModulo = filtroModulo === 'todos' ? true : leccion.modulo_codigo === filtroModulo
      const coincideOwner = owner ? (leccion.owner ?? '').toLowerCase().includes(owner) : true
      const coincideAuditoria = filtroAuditoria === 'todos' ? true : leccion.auditoria_id === filtroAuditoria
      const coincideRelease = filtroRelease === 'todos' ? true : leccion.release_id === filtroRelease
      const coincideDesde = fechaDesde ? leccion.fecha_leccion >= fechaDesde : true
      const coincideHasta = fechaHasta ? leccion.fecha_leccion <= fechaHasta : true

      return coincideBusqueda && coincideEstado && coincideModulo && coincideOwner && coincideAuditoria && coincideRelease && coincideDesde && coincideHasta
    })
  }, [lecciones, busqueda, filtroEstado, filtroModulo, filtroOwner, filtroAuditoria, filtroRelease, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({ items: leccionesFiltradas, paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1, tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10 })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (filtroOwner) parametros.set('owner', filtroOwner)
    if (filtroAuditoria !== 'todos') parametros.set('auditoria', filtroAuditoria)
    if (filtroRelease !== 'todos') parametros.set('release', filtroRelease)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroEstado, filtroModulo, filtroOwner, filtroAuditoria, filtroRelease, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const nombresModulo = useMemo(() => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])), [referencias])
  const nombresIniciativa = useMemo(() => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [referencias])
  const nombresEntrega = useMemo(() => new Map((referencias?.entregas ?? []).map((entrega) => [entrega.id, entrega.nombre])), [referencias])
  const nombresRelease = useMemo(() => new Map((referencias?.releases ?? []).map((release) => [release.id, `${release.codigo} · ${release.nombre}`])), [referencias])
  const nombresAuditoria = useMemo(() => new Map((referencias?.auditorias ?? []).map((auditoria) => [auditoria.id, `${auditoria.tipo_auditoria_codigo} · ${formatearFechaCorta(auditoria.fecha_auditoria)}`])), [referencias])

  const abrirModal = (modo: ModoModal, leccion?: LeccionAprendidaPm) => {
    setModoModal(modo)
    setLeccionActiva(leccion ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: leccion?.codigo ?? '',
      titulo: leccion?.titulo ?? '',
      contexto: leccion?.contexto ?? '',
      aprendizaje: leccion?.aprendizaje ?? '',
      accion_recomendada: leccion?.accion_recomendada ?? '',
      estado: leccion?.estado ?? 'capturada',
      owner: leccion?.owner ?? null,
      fecha_leccion: leccion?.fecha_leccion ?? new Date().toISOString().slice(0, 10),
      modulo_codigo: leccion?.modulo_codigo ?? null,
      iniciativa_id: leccion?.iniciativa_id ?? null,
      entrega_id: leccion?.entrega_id ?? null,
      release_id: leccion?.release_id ?? null,
      auditoria_id: leccion?.auditoria_id ?? null,
      notas: leccion?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-lecciones-aprendidas-operacion.csv',
      [
        { encabezado: 'Código', valor: (leccion) => leccion.codigo },
        { encabezado: 'Título', valor: (leccion) => leccion.titulo },
        { encabezado: 'Estado', valor: (leccion) => formatearEstadoLeccionAprendida(leccion.estado) },
        { encabezado: 'Owner', valor: (leccion) => leccion.owner ?? '' },
        { encabezado: 'Fecha lección', valor: (leccion) => leccion.fecha_leccion },
        { encabezado: 'Módulo', valor: (leccion) => nombresModulo.get(leccion.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (leccion) => nombresIniciativa.get(leccion.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Entrega', valor: (leccion) => nombresEntrega.get(leccion.entrega_id ?? '') ?? '' },
        { encabezado: 'Release', valor: (leccion) => nombresRelease.get(leccion.release_id ?? '') ?? '' },
        { encabezado: 'Auditoría', valor: (leccion) => nombresAuditoria.get(leccion.auditoria_id ?? '') ?? '' },
        { encabezado: 'Aprendizaje', valor: (leccion) => leccion.aprendizaje },
        { encabezado: 'Acción recomendada', valor: (leccion) => leccion.accion_recomendada }
      ],
      leccionesFiltradas
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2"><div className="space-y-1"><h1 className="text-2xl font-semibold">Lecciones aprendidas</h1><p className="text-sm text-slate-600 dark:text-slate-400">Captura aprendizaje reusable con contexto, acción recomendada y referencia opcional a auditorías, releases y delivery.</p></div><NavegacionOperacion /></header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar lección" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosLeccionAprendidaPm)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosLeccionAprendidaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoLeccionAprendida(estado)}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <input type="search" value={filtroOwner} onChange={(evento) => { setFiltroOwner(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroAuditoria} onChange={(evento) => { setFiltroAuditoria(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Auditoría: todas</option>{(referencias?.auditorias ?? []).map((auditoria) => <option key={auditoria.id} value={auditoria.id}>{auditoria.tipo_auditoria_codigo} · {formatearFechaCorta(auditoria.fecha_auditoria)}</option>)}</select>
        <select value={filtroRelease} onChange={(evento) => { setFiltroRelease(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Release: todos</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nueva lección</button><button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button></div>

      <EstadoVista cargando={cargando} error={error} vacio={leccionesFiltradas.length === 0} mensajeVacio="No hay lecciones aprendidas para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-50 dark:bg-slate-950/40"><tr><th className="px-4 py-3 text-left font-medium">Lección</th><th className="px-4 py-3 text-left font-medium">Estado</th><th className="px-4 py-3 text-left font-medium">Contexto</th><th className="px-4 py-3 text-left font-medium">Fecha</th><th className="px-4 py-3 text-right font-medium">Acciones</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{paginacion.itemsPaginados.map((leccion) => <tr key={leccion.id}><td className="px-4 py-3 align-top"><div className="space-y-1"><p className="font-medium">{leccion.codigo} · {leccion.titulo}</p><p className="text-slate-600 dark:text-slate-300">{leccion.aprendizaje}</p><p className="text-xs text-slate-500 dark:text-slate-400">{leccion.owner ? `Owner: ${leccion.owner}` : 'Sin owner'}</p></div></td><td className="px-4 py-3 align-top">{formatearEstadoLeccionAprendida(leccion.estado)}</td><td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>{nombresModulo.get(leccion.modulo_codigo ?? '') ?? 'Sin módulo'}</p><p>{nombresAuditoria.get(leccion.auditoria_id ?? '') ?? 'Sin auditoría'}</p><p>{nombresRelease.get(leccion.release_id ?? '') ?? 'Sin release'}</p></div></td><td className="px-4 py-3 align-top">{formatearFechaCorta(leccion.fecha_leccion)}</td><td className="px-4 py-3 align-top"><div className="flex justify-end gap-2"><button type="button" onClick={() => abrirModal('ver', leccion)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" onClick={() => abrirModal('editar', leccion)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${leccion.codigo}?`)) return; try { await eliminarLeccionAprendidaPm(leccion.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la lección aprendida') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button></div></td></tr>)}</tbody></table></div></div>
          <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
        </>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nueva lección aprendida' : modoModal === 'editar' ? `Editar ${leccionActiva?.codigo ?? 'lección'}` : `Ver ${leccionActiva?.codigo ?? 'lección'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => { try { if (modoModal === 'ver') { setModalAbierto(false); return } if (modoModal === 'crear') await crearLeccionAprendidaPm(valores); if (modoModal === 'editar' && leccionActiva) await editarLeccionAprendidaPm(leccionActiva.id, valores); setModalAbierto(false); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la lección aprendida') } })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Título</span><input {...formulario.register('titulo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Contexto</span><textarea {...formulario.register('contexto')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Aprendizaje</span><textarea {...formulario.register('aprendizaje')} disabled={modoModal === 'ver'} rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Acción recomendada</span><textarea {...formulario.register('accion_recomendada')} disabled={modoModal === 'ver'} rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{estadosLeccionAprendidaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoLeccionAprendida(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha lección</span><input type="date" {...formulario.register('fecha_leccion')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Release</span><select {...formulario.register('release_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin release</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Auditoría</span><select {...formulario.register('auditoria_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin auditoría</option>{(referencias?.auditorias ?? []).map((auditoria) => <option key={auditoria.id} value={auditoria.id}>{auditoria.tipo_auditoria_codigo} · {formatearFechaCorta(auditoria.fecha_auditoria)}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios y las fechas antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear lección'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}