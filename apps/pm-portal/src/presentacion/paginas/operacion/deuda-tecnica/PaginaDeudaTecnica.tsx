import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { deudaTecnicaSchema, type DeudaTecnicaEntrada } from '@/compartido/validacion/esquemas'
import type { DeudaTecnicaPm } from '@/dominio/modelos'
import { estadosDeudaTecnicaPm, formatearEstadoDeudaTecnica, formatearPrioridadRegistro, prioridadesRegistro } from '@/dominio/modelos'
import { crearDeudaTecnicaPm, editarDeudaTecnicaPm, eliminarDeudaTecnicaPm, listarDeudaTecnicaPm, listarReferenciasOperacion } from '@/aplicacion/casos-uso/operacion'
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

export function PaginaDeudaTecnica() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [deudas, setDeudas] = useState<DeudaTecnicaPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasOperacion | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosDeudaTecnicaPm)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosDeudaTecnicaPm)[number]) ?? 'todos'
  )
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroRelease, setFiltroRelease] = useState(searchParams.get('release') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [deudaActiva, setDeudaActiva] = useState<DeudaTecnicaPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<DeudaTecnicaEntrada>({
    resolver: zodResolver(deudaTecnicaSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      descripcion: '',
      estado: 'identificada',
      prioridad: 'media',
      owner: null,
      fecha_identificacion: new Date().toISOString().slice(0, 10),
      fecha_objetivo: null,
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      release_id: null,
      impacto_tecnico: '',
      plan_remediacion: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [deudasData, referenciasData] = await Promise.all([listarDeudaTecnicaPm(), listarReferenciasOperacion()])
      setDeudas(deudasData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar deuda técnica')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const deudasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return deudas.filter((deuda) => {
      const coincideBusqueda =
        deuda.codigo.toLowerCase().includes(termino) ||
        deuda.titulo.toLowerCase().includes(termino) ||
        deuda.descripcion.toLowerCase().includes(termino)
      const coincideEstado = filtroEstado === 'todos' ? true : deuda.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : deuda.prioridad === filtroPrioridad
      const coincideModulo = filtroModulo === 'todos' ? true : deuda.modulo_codigo === filtroModulo
      const coincideOwner = owner ? (deuda.owner ?? '').toLowerCase().includes(owner) : true
      const coincideRelease = filtroRelease === 'todos' ? true : deuda.release_id === filtroRelease
      const coincideDesde = fechaDesde ? deuda.fecha_identificacion >= fechaDesde : true
      const coincideHasta = fechaHasta ? deuda.fecha_identificacion <= fechaHasta : true

      return coincideBusqueda && coincideEstado && coincidePrioridad && coincideModulo && coincideOwner && coincideRelease && coincideDesde && coincideHasta
    })
  }, [deudas, busqueda, filtroEstado, filtroPrioridad, filtroModulo, filtroOwner, filtroRelease, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: deudasFiltradas,
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
    if (filtroRelease !== 'todos') parametros.set('release', filtroRelease)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))

    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroEstado, filtroPrioridad, filtroModulo, filtroOwner, filtroRelease, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const nombresModulo = useMemo(() => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])), [referencias])
  const nombresIniciativa = useMemo(() => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [referencias])
  const nombresEntrega = useMemo(() => new Map((referencias?.entregas ?? []).map((entrega) => [entrega.id, entrega.nombre])), [referencias])
  const nombresRelease = useMemo(() => new Map((referencias?.releases ?? []).map((release) => [release.id, `${release.codigo} · ${release.nombre}`])), [referencias])

  const abrirModal = (modo: ModoModal, deuda?: DeudaTecnicaPm) => {
    setModoModal(modo)
    setDeudaActiva(deuda ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: deuda?.codigo ?? '',
      titulo: deuda?.titulo ?? '',
      descripcion: deuda?.descripcion ?? '',
      estado: deuda?.estado ?? 'identificada',
      prioridad: deuda?.prioridad ?? 'media',
      owner: deuda?.owner ?? null,
      fecha_identificacion: deuda?.fecha_identificacion ?? new Date().toISOString().slice(0, 10),
      fecha_objetivo: deuda?.fecha_objetivo ?? null,
      modulo_codigo: deuda?.modulo_codigo ?? null,
      iniciativa_id: deuda?.iniciativa_id ?? null,
      entrega_id: deuda?.entrega_id ?? null,
      release_id: deuda?.release_id ?? null,
      impacto_tecnico: deuda?.impacto_tecnico ?? '',
      plan_remediacion: deuda?.plan_remediacion ?? null,
      notas: deuda?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-deuda-tecnica-operacion.csv',
      [
        { encabezado: 'Código', valor: (deuda) => deuda.codigo },
        { encabezado: 'Título', valor: (deuda) => deuda.titulo },
        { encabezado: 'Estado', valor: (deuda) => formatearEstadoDeudaTecnica(deuda.estado) },
        { encabezado: 'Prioridad', valor: (deuda) => formatearPrioridadRegistro(deuda.prioridad) },
        { encabezado: 'Owner', valor: (deuda) => deuda.owner ?? '' },
        { encabezado: 'Fecha identificación', valor: (deuda) => deuda.fecha_identificacion },
        { encabezado: 'Fecha objetivo', valor: (deuda) => deuda.fecha_objetivo ?? '' },
        { encabezado: 'Módulo', valor: (deuda) => nombresModulo.get(deuda.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (deuda) => nombresIniciativa.get(deuda.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Entrega', valor: (deuda) => nombresEntrega.get(deuda.entrega_id ?? '') ?? '' },
        { encabezado: 'Release', valor: (deuda) => nombresRelease.get(deuda.release_id ?? '') ?? '' },
        { encabezado: 'Impacto técnico', valor: (deuda) => deuda.impacto_tecnico }
      ],
      deudasFiltradas
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2"><div className="space-y-1"><h1 className="text-2xl font-semibold">Deuda técnica</h1><p className="text-sm text-slate-600 dark:text-slate-400">Visibiliza deuda técnica con fecha objetivo, impacto técnico, plan de remediación y vínculo opcional a release, iniciativa o entrega.</p></div><NavegacionOperacion /></header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar deuda técnica" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosDeudaTecnicaPm)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosDeudaTecnicaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoDeudaTecnica(estado)}</option>)}</select>
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Prioridad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{formatearPrioridadRegistro(prioridad)}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <input type="search" value={filtroOwner} onChange={(evento) => { setFiltroOwner(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroRelease} onChange={(evento) => { setFiltroRelease(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Release: todos</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nueva deuda técnica</button><button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button></div>

      <EstadoVista cargando={cargando} error={error} vacio={deudasFiltradas.length === 0} mensajeVacio="No hay registros de deuda técnica para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-50 dark:bg-slate-950/40"><tr><th className="px-4 py-3 text-left font-medium">Deuda</th><th className="px-4 py-3 text-left font-medium">Estado</th><th className="px-4 py-3 text-left font-medium">Prioridad</th><th className="px-4 py-3 text-left font-medium">Contexto</th><th className="px-4 py-3 text-left font-medium">Fechas</th><th className="px-4 py-3 text-right font-medium">Acciones</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{paginacion.itemsPaginados.map((deuda) => <tr key={deuda.id}><td className="px-4 py-3 align-top"><div className="space-y-1"><p className="font-medium">{deuda.codigo} · {deuda.titulo}</p><p className="text-slate-600 dark:text-slate-300">{deuda.descripcion}</p><p className="text-xs text-slate-500 dark:text-slate-400">{deuda.owner ? `Owner: ${deuda.owner}` : 'Sin owner'}</p></div></td><td className="px-4 py-3 align-top">{formatearEstadoDeudaTecnica(deuda.estado)}</td><td className="px-4 py-3 align-top">{formatearPrioridadRegistro(deuda.prioridad)}</td><td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>{nombresModulo.get(deuda.modulo_codigo ?? '') ?? 'Sin módulo'}</p><p>{nombresRelease.get(deuda.release_id ?? '') ?? 'Sin release'}</p><p>{nombresIniciativa.get(deuda.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p></div></td><td className="px-4 py-3 align-top"><div className="space-y-1 text-xs text-slate-500 dark:text-slate-400"><p>Identificación: {normalizarFechaPortal(deuda.fecha_identificacion)}</p><p>Objetivo: {normalizarFechaPortal(deuda.fecha_objetivo) || 'Sin fecha objetivo'}</p></div></td><td className="px-4 py-3 align-top"><div className="flex justify-end gap-2"><button type="button" onClick={() => abrirModal('ver', deuda)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" onClick={() => abrirModal('editar', deuda)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${deuda.codigo}?`)) return; try { await eliminarDeudaTecnicaPm(deuda.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el registro de deuda técnica') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button></div></td></tr>)}</tbody></table></div></div>
          <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
        </>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nueva deuda técnica' : modoModal === 'editar' ? `Editar ${deudaActiva?.codigo ?? 'deuda técnica'}` : `Detalle ${deudaActiva?.codigo ?? 'deuda técnica'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => { try { if (modoModal === 'ver') { setModalAbierto(false); return } if (modoModal === 'crear') await crearDeudaTecnicaPm(valores); if (modoModal === 'editar' && deudaActiva) await editarDeudaTecnicaPm(deudaActiva.id, valores); setModalAbierto(false); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la deuda técnica') } })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Título</span><input {...formulario.register('titulo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Descripción</span><textarea {...formulario.register('descripcion')} disabled={modoModal === 'ver'} rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{estadosDeudaTecnicaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoDeudaTecnica(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Prioridad</span><select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{formatearPrioridadRegistro(prioridad)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha identificación</span><input type="date" {...formulario.register('fecha_identificacion')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Fecha objetivo</span><input type="date" {...formulario.register('fecha_objetivo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Release</span><select {...formulario.register('release_id')} disabled={modoModal === 'ver'} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"><option value="">Sin release</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Impacto técnico</span><textarea {...formulario.register('impacto_tecnico')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Plan de remediación</span><textarea {...formulario.register('plan_remediacion')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800" /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios y las fechas antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear deuda técnica'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}