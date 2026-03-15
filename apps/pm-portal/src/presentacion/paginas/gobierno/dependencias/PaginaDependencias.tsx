import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { dependenciaSchema, type DependenciaEntrada } from '@/compartido/validacion/esquemas'
import type { DependenciaPm } from '@/dominio/modelos'
import {
  criticidadesGobiernoPm,
  estadosDependenciaPm,
  formatearCriticidadGobierno,
  formatearEstadoDependencia,
  formatearTipoDependencia,
  tiposDependenciaPm
} from '@/dominio/modelos'
import {
  crearDependenciaPm,
  editarDependenciaPm,
  eliminarDependenciaPm,
  listarDependenciasPm,
  listarReferenciasGobierno
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

export function PaginaDependencias() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [dependencias, setDependencias] = useState<DependenciaPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasGobierno | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [filtroCriticidad, setFiltroCriticidad] = useState(searchParams.get('criticidad') ?? 'todas')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [dependenciaActiva, setDependenciaActiva] = useState<DependenciaPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<DependenciaEntrada>({
    resolver: zodResolver(dependenciaSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      descripcion: '',
      tipo_dependencia: 'equipo',
      estado: 'abierta',
      criticidad: 'media',
      owner: null,
      responsable_externo: null,
      fecha_identificacion: new Date().toISOString().slice(0, 10),
      fecha_objetivo: null,
      impacto_si_falla: '',
      proximo_paso: null,
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      release_id: null,
      decision_id: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [dependenciasData, referenciasData] = await Promise.all([
        listarDependenciasPm(),
        listarReferenciasGobierno()
      ])
      setDependencias(dependenciasData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las dependencias')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const dependenciasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()

    return dependencias.filter((dependencia) => {
      const coincideBusqueda =
        dependencia.codigo.toLowerCase().includes(termino) ||
        dependencia.titulo.toLowerCase().includes(termino) ||
        dependencia.descripcion.toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : dependencia.tipo_dependencia === filtroTipo
      const coincideEstado = filtroEstado === 'todos' ? true : dependencia.estado === filtroEstado
      const coincideCriticidad = filtroCriticidad === 'todas' ? true : dependencia.criticidad === filtroCriticidad
      const coincideModulo = filtroModulo === 'todos' ? true : dependencia.modulo_codigo === filtroModulo
      const coincideDesde = fechaDesde ? dependencia.fecha_identificacion >= fechaDesde : true
      const coincideHasta = fechaHasta ? dependencia.fecha_identificacion <= fechaHasta : true

      return coincideBusqueda && coincideTipo && coincideEstado && coincideCriticidad && coincideModulo && coincideDesde && coincideHasta
    })
  }, [dependencias, busqueda, filtroTipo, filtroEstado, filtroCriticidad, filtroModulo, fechaDesde, fechaHasta])

  const paginacion = usePaginacion({
    items: dependenciasFiltradas,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroTipo !== 'todos') parametros.set('tipo', filtroTipo)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroCriticidad !== 'todas') parametros.set('criticidad', filtroCriticidad)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (fechaDesde) parametros.set('desde', fechaDesde)
    if (fechaHasta) parametros.set('hasta', fechaHasta)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroTipo, filtroEstado, filtroCriticidad, filtroModulo, fechaDesde, fechaHasta, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const modulosPorCodigo = useMemo(() => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])), [referencias])
  const iniciativasPorId = useMemo(() => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [referencias])
  const entregasPorId = useMemo(() => new Map((referencias?.entregas ?? []).map((entrega) => [entrega.id, entrega.nombre])), [referencias])
  const releasesPorId = useMemo(() => new Map((referencias?.releases ?? []).map((release) => [release.id, `${release.codigo} · ${release.nombre}`])), [referencias])
  const decisionesPorId = useMemo(() => new Map((referencias?.decisiones ?? []).map((decision) => [decision.id, decision.titulo])), [referencias])

  const abrirModal = (modo: ModoModal, dependencia?: DependenciaPm) => {
    setModoModal(modo)
    setDependenciaActiva(dependencia ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: dependencia?.codigo ?? '',
      titulo: dependencia?.titulo ?? '',
      descripcion: dependencia?.descripcion ?? '',
      tipo_dependencia: dependencia?.tipo_dependencia ?? 'equipo',
      estado: dependencia?.estado ?? 'abierta',
      criticidad: dependencia?.criticidad ?? 'media',
      owner: dependencia?.owner ?? null,
      responsable_externo: dependencia?.responsable_externo ?? null,
      fecha_identificacion: dependencia?.fecha_identificacion ?? new Date().toISOString().slice(0, 10),
      fecha_objetivo: dependencia?.fecha_objetivo ?? null,
      impacto_si_falla: dependencia?.impacto_si_falla ?? '',
      proximo_paso: dependencia?.proximo_paso ?? null,
      modulo_codigo: dependencia?.modulo_codigo ?? null,
      iniciativa_id: dependencia?.iniciativa_id ?? null,
      entrega_id: dependencia?.entrega_id ?? null,
      release_id: dependencia?.release_id ?? null,
      decision_id: dependencia?.decision_id ?? null,
      notas: dependencia?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-gobierno-dependencias.csv',
      [
        { encabezado: 'Código', valor: (dependencia) => dependencia.codigo },
        { encabezado: 'Título', valor: (dependencia) => dependencia.titulo },
        { encabezado: 'Tipo', valor: (dependencia) => formatearTipoDependencia(dependencia.tipo_dependencia) },
        { encabezado: 'Estado', valor: (dependencia) => formatearEstadoDependencia(dependencia.estado) },
        { encabezado: 'Criticidad', valor: (dependencia) => formatearCriticidadGobierno(dependencia.criticidad) },
        { encabezado: 'Owner', valor: (dependencia) => dependencia.owner ?? '' },
        { encabezado: 'Responsable externo', valor: (dependencia) => dependencia.responsable_externo ?? '' },
        { encabezado: 'Fecha identificación', valor: (dependencia) => dependencia.fecha_identificacion },
        { encabezado: 'Fecha objetivo', valor: (dependencia) => dependencia.fecha_objetivo ?? '' },
        { encabezado: 'Módulo', valor: (dependencia) => modulosPorCodigo.get(dependencia.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (dependencia) => iniciativasPorId.get(dependencia.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Entrega', valor: (dependencia) => entregasPorId.get(dependencia.entrega_id ?? '') ?? '' },
        { encabezado: 'Release', valor: (dependencia) => releasesPorId.get(dependencia.release_id ?? '') ?? '' },
        { encabezado: 'Decisión', valor: (dependencia) => decisionesPorId.get(dependencia.decision_id ?? '') ?? '' }
      ],
      dependenciasFiltradas
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Dependencias</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona dependencias transversales con estado visible, responsable externo y vínculos opcionales a iniciativas, entregas, releases o decisiones.
          </p>
        </div>
        <NavegacionGobierno />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar dependencia" className={claseCampo} />
        <select value={filtroTipo} onChange={(evento) => { setFiltroTipo(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Tipo: todos</option>{tiposDependenciaPm.map((tipo) => <option key={tipo} value={tipo}>{formatearTipoDependencia(tipo)}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Estado: todos</option>{estadosDependenciaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoDependencia(estado)}</option>)}</select>
        <select value={filtroCriticidad} onChange={(evento) => { setFiltroCriticidad(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todas">Criticidad: todas</option>{criticidadesGobiernoPm.map((criticidad) => <option key={criticidad} value={criticidad}>{formatearCriticidadGobierno(criticidad)}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <input type="date" value={fechaDesde} onChange={(evento) => { setFechaDesde(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo} />
        <input type="date" value={fechaHasta} onChange={(evento) => { setFechaHasta(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nueva dependencia</button>
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={dependenciasFiltradas.length === 0} mensajeVacio="No hay dependencias para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Dependencia</th>
                    <th className="px-4 py-3 text-left font-medium">Estado / Criticidad</th>
                    <th className="px-4 py-3 text-left font-medium">Contexto</th>
                    <th className="px-4 py-3 text-left font-medium">Fechas</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginacion.itemsPaginados.map((dependencia) => (
                    <tr key={dependencia.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <p className="font-medium">{dependencia.codigo} · {dependencia.titulo}</p>
                          <p className="text-slate-600 dark:text-slate-300">{dependencia.descripcion}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatearTipoDependencia(dependencia.tipo_dependencia)} · {dependencia.owner ?? 'Sin owner'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>{formatearEstadoDependencia(dependencia.estado)}</p>
                          <p>{formatearCriticidadGobierno(dependencia.criticidad)}</p>
                          <p>{dependencia.responsable_externo ?? 'Sin responsable externo'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>{modulosPorCodigo.get(dependencia.modulo_codigo ?? '') ?? 'Sin módulo'}</p>
                          <p>{releasesPorId.get(dependencia.release_id ?? '') ?? 'Sin release'}</p>
                          <p>{decisionesPorId.get(dependencia.decision_id ?? '') ?? 'Sin decisión'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>Identificada: {normalizarFechaPortal(dependencia.fecha_identificacion)}</p>
                          <p>Objetivo: {normalizarFechaPortal(dependencia.fecha_objetivo) || 'Sin fecha objetivo'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => abrirModal('ver', dependencia)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                          <button type="button" onClick={() => abrirModal('editar', dependencia)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                          <button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${dependencia.codigo}?`)) return; try { await eliminarDependenciaPm(dependencia.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la dependencia') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button>
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

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nueva dependencia' : modoModal === 'editar' ? `Editar ${dependenciaActiva?.codigo ?? 'dependencia'}` : `Detalle ${dependenciaActiva?.codigo ?? 'dependencia'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => { try { if (modoModal === 'ver') { setModalAbierto(false); return } if (modoModal === 'crear') await crearDependenciaPm(valores); if (modoModal === 'editar' && dependenciaActiva) await editarDependenciaPm(dependenciaActiva.id, valores); setModalAbierto(false); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la dependencia') } })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Título</span><input {...formulario.register('titulo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Descripción</span><textarea {...formulario.register('descripcion')} disabled={modoModal === 'ver'} rows={4} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Tipo de dependencia</span><select {...formulario.register('tipo_dependencia')} disabled={modoModal === 'ver'} className={claseCampo}>{tiposDependenciaPm.map((tipo) => <option key={tipo} value={tipo}>{formatearTipoDependencia(tipo)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className={claseCampo}>{estadosDependenciaPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoDependencia(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Criticidad</span><select {...formulario.register('criticidad')} disabled={modoModal === 'ver'} className={claseCampo}>{criticidadesGobiernoPm.map((criticidad) => <option key={criticidad} value={criticidad}>{formatearCriticidadGobierno(criticidad)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Responsable externo</span><input {...formulario.register('responsable_externo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Fecha identificación</span><input type="date" {...formulario.register('fecha_identificacion')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Fecha objetivo</span><input type="date" {...formulario.register('fecha_objetivo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Impacto si falla</span><textarea {...formulario.register('impacto_si_falla')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Próximo paso</span><textarea {...formulario.register('proximo_paso')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Release</span><select {...formulario.register('release_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin release</option>{(referencias?.releases ?? []).map((release) => <option key={release.id} value={release.id}>{release.codigo} · {release.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Decisión</span><select {...formulario.register('decision_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin decisión</option>{(referencias?.decisiones ?? []).map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios y las fechas antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear dependencia'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}