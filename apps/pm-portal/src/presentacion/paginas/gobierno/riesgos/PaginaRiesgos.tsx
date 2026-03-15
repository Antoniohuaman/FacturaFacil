import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { riesgoSchema, type RiesgoEntrada } from '@/compartido/validacion/esquemas'
import type { RiesgoPm } from '@/dominio/modelos'
import {
  categoriasRiesgoPm,
  criticidadesGobiernoPm,
  estadosRiesgoPm,
  formatearCategoriaRiesgo,
  formatearCriticidadGobierno,
  formatearEstadoRiesgo,
  formatearImpactoRiesgo,
  formatearProbabilidadRiesgo,
  impactosRiesgoPm,
  probabilidadesRiesgoPm
} from '@/dominio/modelos'
import {
  crearRiesgoPm,
  editarRiesgoPm,
  eliminarRiesgoPm,
  listarReferenciasGobierno,
  listarRiesgosPm
} from '@/aplicacion/casos-uso/gobierno'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionGobierno } from '@/presentacion/paginas/gobierno/NavegacionGobierno'

type ModoModal = 'crear' | 'editar' | 'ver'
type ReferenciasGobierno = Awaited<ReturnType<typeof listarReferenciasGobierno>>

const claseCampo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800'

export function PaginaRiesgos() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [riesgos, setRiesgos] = useState<RiesgoPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasGobierno | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroCategoria, setFiltroCategoria] = useState(searchParams.get('categoria') ?? 'todas')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [filtroCriticidad, setFiltroCriticidad] = useState(searchParams.get('criticidad') ?? 'todas')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [riesgoActivo, setRiesgoActivo] = useState<RiesgoPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<RiesgoEntrada>({
    resolver: zodResolver(riesgoSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      descripcion: '',
      categoria: 'operativo',
      probabilidad: 'media',
      impacto: 'medio',
      criticidad: 'media',
      estado: 'identificado',
      owner: null,
      fecha_identificacion: new Date().toISOString().slice(0, 10),
      fecha_objetivo: null,
      trigger_riesgo: null,
      plan_mitigacion: null,
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      release_id: null,
      decision_id: null,
      auditoria_id: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [riesgosData, referenciasData] = await Promise.all([listarRiesgosPm(), listarReferenciasGobierno()])
      setRiesgos(riesgosData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los riesgos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const riesgosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()

    return riesgos.filter((riesgo) => {
      const coincideBusqueda =
        riesgo.codigo.toLowerCase().includes(termino) ||
        riesgo.titulo.toLowerCase().includes(termino) ||
        riesgo.descripcion.toLowerCase().includes(termino)
      const coincideCategoria = filtroCategoria === 'todas' ? true : riesgo.categoria === filtroCategoria
      const coincideEstado = filtroEstado === 'todos' ? true : riesgo.estado === filtroEstado
      const coincideCriticidad = filtroCriticidad === 'todas' ? true : riesgo.criticidad === filtroCriticidad
      const coincideModulo = filtroModulo === 'todos' ? true : riesgo.modulo_codigo === filtroModulo
      const coincideDesde = fechaDesde ? riesgo.fecha_identificacion >= fechaDesde : true
      const coincideHasta = fechaHasta ? riesgo.fecha_identificacion <= fechaHasta : true

      return coincideBusqueda && coincideCategoria && coincideEstado && coincideCriticidad && coincideModulo && coincideDesde && coincideHasta
    })
  }, [riesgos, busqueda, filtroCategoria, filtroEstado, filtroCriticidad, filtroModulo, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: riesgosFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroCategoria !== 'todas') parametros.set('categoria', filtroCategoria)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroCriticidad !== 'todas') parametros.set('criticidad', filtroCriticidad)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroCategoria, filtroEstado, filtroCriticidad, filtroModulo, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const modulosPorCodigo = useMemo(() => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])), [referencias])
  const iniciativasPorId = useMemo(() => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [referencias])
  const entregasPorId = useMemo(() => new Map((referencias?.entregas ?? []).map((entrega) => [entrega.id, entrega.nombre])), [referencias])
  const releasesPorId = useMemo(() => new Map((referencias?.releases ?? []).map((release) => [release.id, `${release.codigo} · ${release.nombre}`])), [referencias])
  const decisionesPorId = useMemo(() => new Map((referencias?.decisiones ?? []).map((decision) => [decision.id, decision.titulo])), [referencias])
  const auditoriasPorId = useMemo(() => new Map((referencias?.auditorias ?? []).map((auditoria) => [auditoria.id, auditoria.fecha_auditoria])), [referencias])

  const abrirModal = (modo: ModoModal, riesgo?: RiesgoPm) => {
    setModoModal(modo)
    setRiesgoActivo(riesgo ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: riesgo?.codigo ?? '',
      titulo: riesgo?.titulo ?? '',
      descripcion: riesgo?.descripcion ?? '',
      categoria: riesgo?.categoria ?? 'operativo',
      probabilidad: riesgo?.probabilidad ?? 'media',
      impacto: riesgo?.impacto ?? 'medio',
      criticidad: riesgo?.criticidad ?? 'media',
      estado: riesgo?.estado ?? 'identificado',
      owner: riesgo?.owner ?? null,
      fecha_identificacion: riesgo?.fecha_identificacion ?? new Date().toISOString().slice(0, 10),
      fecha_objetivo: riesgo?.fecha_objetivo ?? null,
      trigger_riesgo: riesgo?.trigger_riesgo ?? null,
      plan_mitigacion: riesgo?.plan_mitigacion ?? null,
      modulo_codigo: riesgo?.modulo_codigo ?? null,
      iniciativa_id: riesgo?.iniciativa_id ?? null,
      entrega_id: riesgo?.entrega_id ?? null,
      release_id: riesgo?.release_id ?? null,
      decision_id: riesgo?.decision_id ?? null,
      auditoria_id: riesgo?.auditoria_id ?? null,
      notas: riesgo?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-gobierno-riesgos.csv',
      [
        { encabezado: 'Código', valor: (riesgo) => riesgo.codigo },
        { encabezado: 'Título', valor: (riesgo) => riesgo.titulo },
        { encabezado: 'Categoría', valor: (riesgo) => formatearCategoriaRiesgo(riesgo.categoria) },
        { encabezado: 'Probabilidad', valor: (riesgo) => formatearProbabilidadRiesgo(riesgo.probabilidad) },
        { encabezado: 'Impacto', valor: (riesgo) => formatearImpactoRiesgo(riesgo.impacto) },
        { encabezado: 'Criticidad', valor: (riesgo) => formatearCriticidadGobierno(riesgo.criticidad) },
        { encabezado: 'Estado', valor: (riesgo) => formatearEstadoRiesgo(riesgo.estado) },
        { encabezado: 'Owner', valor: (riesgo) => riesgo.owner ?? '' },
        { encabezado: 'Fecha identificación', valor: (riesgo) => riesgo.fecha_identificacion },
        { encabezado: 'Fecha objetivo', valor: (riesgo) => riesgo.fecha_objetivo ?? '' },
        { encabezado: 'Módulo', valor: (riesgo) => modulosPorCodigo.get(riesgo.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (riesgo) => iniciativasPorId.get(riesgo.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Entrega', valor: (riesgo) => entregasPorId.get(riesgo.entrega_id ?? '') ?? '' },
        { encabezado: 'Release', valor: (riesgo) => releasesPorId.get(riesgo.release_id ?? '') ?? '' },
        { encabezado: 'Decisión', valor: (riesgo) => decisionesPorId.get(riesgo.decision_id ?? '') ?? '' },
        { encabezado: 'Auditoría', valor: (riesgo) => auditoriasPorId.get(riesgo.auditoria_id ?? '') ?? '' }
      ],
      riesgosFiltrados
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Riesgos</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona riesgos transversales del producto con criticidad visible, mitigación y vínculos opcionales a módulos existentes.
          </p>
        </div>
        <NavegacionGobierno />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar riesgo" className={claseCampo} />
        <select value={filtroCategoria} onChange={(evento) => { setFiltroCategoria(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todas">Categoría: todas</option>{categoriasRiesgoPm.map((categoria) => <option key={categoria} value={categoria}>{formatearCategoriaRiesgo(categoria)}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Estado: todos</option>{estadosRiesgoPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoRiesgo(estado)}</option>)}</select>
        <select value={filtroCriticidad} onChange={(evento) => { setFiltroCriticidad(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todas">Criticidad: todas</option>{criticidadesGobiernoPm.map((criticidad) => <option key={criticidad} value={criticidad}>{formatearCriticidadGobierno(criticidad)}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo} />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nuevo riesgo</button>
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={riesgosFiltrados.length === 0} mensajeVacio="No hay riesgos para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Riesgo</th>
                    <th className="px-4 py-3 text-left font-medium">Probabilidad / Impacto</th>
                    <th className="px-4 py-3 text-left font-medium">Criticidad / Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Contexto</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginacion.itemsPaginados.map((riesgo) => (
                    <tr key={riesgo.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <p className="font-medium">{riesgo.codigo} · {riesgo.titulo}</p>
                          <p className="text-slate-600 dark:text-slate-300">{riesgo.descripcion}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatearCategoriaRiesgo(riesgo.categoria)} · {riesgo.owner ?? 'Sin owner'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>Probabilidad: {formatearProbabilidadRiesgo(riesgo.probabilidad)}</p>
                          <p>Impacto: {formatearImpactoRiesgo(riesgo.impacto)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>{formatearCriticidadGobierno(riesgo.criticidad)}</p>
                          <p>{formatearEstadoRiesgo(riesgo.estado)}</p>
                          <p>{normalizarFechaPortal(riesgo.fecha_objetivo) || 'Sin fecha objetivo'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>{modulosPorCodigo.get(riesgo.modulo_codigo ?? '') ?? 'Sin módulo'}</p>
                          <p>{releasesPorId.get(riesgo.release_id ?? '') ?? 'Sin release'}</p>
                          <p>{decisionesPorId.get(riesgo.decision_id ?? '') ?? 'Sin decisión'}</p>
                          <p>{auditoriasPorId.get(riesgo.auditoria_id ?? '') ?? 'Sin auditoría'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => abrirModal('ver', riesgo)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                          <button type="button" onClick={() => abrirModal('editar', riesgo)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                          <button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${riesgo.codigo}?`)) return; try { await eliminarRiesgoPm(riesgo.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el riesgo') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
        </>
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nuevo riesgo' : modoModal === 'editar' ? `Editar ${riesgoActivo?.codigo ?? 'riesgo'}` : `Detalle ${riesgoActivo?.codigo ?? 'riesgo'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => { try { if (modoModal === 'ver') { setModalAbierto(false); return } if (modoModal === 'crear') await crearRiesgoPm(valores); if (modoModal === 'editar' && riesgoActivo) await editarRiesgoPm(riesgoActivo.id, valores); setModalAbierto(false); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el riesgo') } })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Título</span><input {...formulario.register('titulo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Descripción</span><textarea {...formulario.register('descripcion')} disabled={modoModal === 'ver'} rows={4} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Categoría</span><select {...formulario.register('categoria')} disabled={modoModal === 'ver'} className={claseCampo}>{categoriasRiesgoPm.map((categoria) => <option key={categoria} value={categoria}>{formatearCategoriaRiesgo(categoria)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Probabilidad</span><select {...formulario.register('probabilidad')} disabled={modoModal === 'ver'} className={claseCampo}>{probabilidadesRiesgoPm.map((probabilidad) => <option key={probabilidad} value={probabilidad}>{formatearProbabilidadRiesgo(probabilidad)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Impacto</span><select {...formulario.register('impacto')} disabled={modoModal === 'ver'} className={claseCampo}>{impactosRiesgoPm.map((impacto) => <option key={impacto} value={impacto}>{formatearImpactoRiesgo(impacto)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Criticidad</span><select {...formulario.register('criticidad')} disabled={modoModal === 'ver'} className={claseCampo}>{criticidadesGobiernoPm.map((criticidad) => <option key={criticidad} value={criticidad}>{formatearCriticidadGobierno(criticidad)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className={claseCampo}>{estadosRiesgoPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoRiesgo(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Fecha identificación</span><input type="date" {...formulario.register('fecha_identificacion')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Fecha objetivo</span><input type="date" {...formulario.register('fecha_objetivo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Trigger del riesgo</span><textarea {...formulario.register('trigger_riesgo')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Plan de mitigación</span><textarea {...formulario.register('plan_mitigacion')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Release</span><select {...formulario.register('release_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin release</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Decisión</span><select {...formulario.register('decision_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin decisión</option>{(referencias?.decisiones ?? []).map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Auditoría</span><select {...formulario.register('auditoria_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin auditoría</option>{(referencias?.auditorias ?? []).map((auditoria) => <option key={auditoria.id} value={auditoria.id}>{auditoria.fecha_auditoria}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios y las fechas antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear riesgo'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}