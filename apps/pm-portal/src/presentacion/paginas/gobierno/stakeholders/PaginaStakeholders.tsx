import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { stakeholderSchema, type StakeholderEntrada } from '@/compartido/validacion/esquemas'
import type { StakeholderPm } from '@/dominio/modelos'
import {
  estadosStakeholderPm,
  formatearEstadoStakeholder,
  formatearInfluenciaStakeholder,
  formatearInteresStakeholder,
  formatearTipoStakeholder,
  influenciasStakeholderPm,
  interesesStakeholderPm,
  tiposStakeholderPm
} from '@/dominio/modelos'
import {
  crearStakeholderPm,
  editarStakeholderPm,
  eliminarStakeholderPm,
  listarReferenciasGobierno,
  listarStakeholdersPm
} from '@/aplicacion/casos-uso/gobierno'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionGobierno } from '@/presentacion/paginas/gobierno/NavegacionGobierno'

type ModoModal = 'crear' | 'editar' | 'ver'
type ReferenciasGobierno = Awaited<ReturnType<typeof listarReferenciasGobierno>>

const claseCampo = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800'

export function PaginaStakeholders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [stakeholders, setStakeholders] = useState<StakeholderPm[]>([])
  const [referencias, setReferencias] = useState<ReferenciasGobierno | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState(searchParams.get('tipo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState(searchParams.get('estado') ?? 'todos')
  const [filtroInfluencia, setFiltroInfluencia] = useState(searchParams.get('influencia') ?? 'todas')
  const [filtroInteres, setFiltroInteres] = useState(searchParams.get('interes') ?? 'todos')
  const [filtroArea, setFiltroArea] = useState(searchParams.get('area') ?? '')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [stakeholderActivo, setStakeholderActivo] = useState<StakeholderPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<StakeholderEntrada>({
    resolver: zodResolver(stakeholderSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      tipo: 'interno',
      area: '',
      organizacion: null,
      cargo: null,
      influencia: 'media',
      interes: 'medio',
      estado: 'activo',
      owner: null,
      correo: null,
      contacto_referencia: null,
      modulo_codigo: null,
      iniciativa_id: null,
      entrega_id: null,
      decision_id: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [stakeholdersData, referenciasData] = await Promise.all([
        listarStakeholdersPm(),
        listarReferenciasGobierno()
      ])
      setStakeholders(stakeholdersData)
      setReferencias(referenciasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los stakeholders')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const stakeholdersFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const area = filtroArea.toLowerCase()

    return stakeholders.filter((stakeholder) => {
      const coincideBusqueda =
        stakeholder.codigo.toLowerCase().includes(termino) ||
        stakeholder.nombre.toLowerCase().includes(termino) ||
        stakeholder.area.toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : stakeholder.tipo === filtroTipo
      const coincideEstado = filtroEstado === 'todos' ? true : stakeholder.estado === filtroEstado
      const coincideInfluencia = filtroInfluencia === 'todas' ? true : stakeholder.influencia === filtroInfluencia
      const coincideInteres = filtroInteres === 'todos' ? true : stakeholder.interes === filtroInteres
      const coincideArea = area ? stakeholder.area.toLowerCase().includes(area) : true
      const coincideModulo = filtroModulo === 'todos' ? true : stakeholder.modulo_codigo === filtroModulo

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideEstado &&
        coincideInfluencia &&
        coincideInteres &&
        coincideArea &&
        coincideModulo
      )
    })
  }, [stakeholders, busqueda, filtroTipo, filtroEstado, filtroInfluencia, filtroInteres, filtroArea, filtroModulo])

  const paginacion = usePaginacion({
    items: stakeholdersFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroTipo !== 'todos') parametros.set('tipo', filtroTipo)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroInfluencia !== 'todas') parametros.set('influencia', filtroInfluencia)
    if (filtroInteres !== 'todos') parametros.set('interes', filtroInteres)
    if (filtroArea) parametros.set('area', filtroArea)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [
    busqueda,
    filtroTipo,
    filtroEstado,
    filtroInfluencia,
    filtroInteres,
    filtroArea,
    filtroModulo,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const modulosPorCodigo = useMemo(
    () => new Map((referencias?.modulos ?? []).map((modulo) => [modulo.codigo, modulo.nombre])),
    [referencias]
  )
  const iniciativasPorId = useMemo(
    () => new Map((referencias?.iniciativas ?? []).map((iniciativa) => [iniciativa.id, iniciativa.nombre])),
    [referencias]
  )
  const entregasPorId = useMemo(
    () => new Map((referencias?.entregas ?? []).map((entrega) => [entrega.id, entrega.nombre])),
    [referencias]
  )
  const decisionesPorId = useMemo(
    () => new Map((referencias?.decisiones ?? []).map((decision) => [decision.id, decision.titulo])),
    [referencias]
  )

  const abrirModal = (modo: ModoModal, stakeholder?: StakeholderPm) => {
    setModoModal(modo)
    setStakeholderActivo(stakeholder ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: stakeholder?.codigo ?? '',
      nombre: stakeholder?.nombre ?? '',
      tipo: stakeholder?.tipo ?? 'interno',
      area: stakeholder?.area ?? '',
      organizacion: stakeholder?.organizacion ?? null,
      cargo: stakeholder?.cargo ?? null,
      influencia: stakeholder?.influencia ?? 'media',
      interes: stakeholder?.interes ?? 'medio',
      estado: stakeholder?.estado ?? 'activo',
      owner: stakeholder?.owner ?? null,
      correo: stakeholder?.correo ?? null,
      contacto_referencia: stakeholder?.contacto_referencia ?? null,
      modulo_codigo: stakeholder?.modulo_codigo ?? null,
      iniciativa_id: stakeholder?.iniciativa_id ?? null,
      entrega_id: stakeholder?.entrega_id ?? null,
      decision_id: stakeholder?.decision_id ?? null,
      notas: stakeholder?.notas ?? null
    })
  }

  const exportar = () => {
    exportarCsv(
      'pm-portal-gobierno-stakeholders.csv',
      [
        { encabezado: 'Código', valor: (stakeholder) => stakeholder.codigo },
        { encabezado: 'Nombre', valor: (stakeholder) => stakeholder.nombre },
        { encabezado: 'Tipo', valor: (stakeholder) => formatearTipoStakeholder(stakeholder.tipo) },
        { encabezado: 'Área', valor: (stakeholder) => stakeholder.area },
        { encabezado: 'Organización', valor: (stakeholder) => stakeholder.organizacion ?? '' },
        { encabezado: 'Cargo', valor: (stakeholder) => stakeholder.cargo ?? '' },
        { encabezado: 'Influencia', valor: (stakeholder) => formatearInfluenciaStakeholder(stakeholder.influencia) },
        { encabezado: 'Interés', valor: (stakeholder) => formatearInteresStakeholder(stakeholder.interes) },
        { encabezado: 'Estado', valor: (stakeholder) => formatearEstadoStakeholder(stakeholder.estado) },
        { encabezado: 'Módulo', valor: (stakeholder) => modulosPorCodigo.get(stakeholder.modulo_codigo ?? '') ?? '' },
        { encabezado: 'Iniciativa', valor: (stakeholder) => iniciativasPorId.get(stakeholder.iniciativa_id ?? '') ?? '' },
        { encabezado: 'Entrega', valor: (stakeholder) => entregasPorId.get(stakeholder.entrega_id ?? '') ?? '' },
        { encabezado: 'Decisión', valor: (stakeholder) => decisionesPorId.get(stakeholder.decision_id ?? '') ?? '' },
        { encabezado: 'Owner', valor: (stakeholder) => stakeholder.owner ?? '' },
        { encabezado: 'Correo', valor: (stakeholder) => stakeholder.correo ?? '' }
      ],
      stakeholdersFiltrados
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Stakeholders</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona stakeholders del producto con influencia, interés y vínculos opcionales hacia módulos existentes.
          </p>
        </div>
        <NavegacionGobierno />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar stakeholder" className={claseCampo} />
        <select value={filtroTipo} onChange={(evento) => { setFiltroTipo(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Tipo: todos</option>{tiposStakeholderPm.map((tipo) => <option key={tipo} value={tipo}>{formatearTipoStakeholder(tipo)}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Estado: todos</option>{estadosStakeholderPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoStakeholder(estado)}</option>)}</select>
        <select value={filtroInfluencia} onChange={(evento) => { setFiltroInfluencia(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todas">Influencia: todas</option>{influenciasStakeholderPm.map((influencia) => <option key={influencia} value={influencia}>{formatearInfluenciaStakeholder(influencia)}</option>)}</select>
        <select value={filtroInteres} onChange={(evento) => { setFiltroInteres(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Interés: todos</option>{interesesStakeholderPm.map((interes) => <option key={interes} value={interes}>{formatearInteresStakeholder(interes)}</option>)}</select>
        <input type="search" value={filtroArea} onChange={(evento) => { setFiltroArea(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Filtrar por área" className={claseCampo} />
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className={claseCampo}><option value="todos">Módulo: todos</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => abrirModal('crear')} disabled={!esEdicionPermitida} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">Nuevo stakeholder</button>
        <button type="button" onClick={exportar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={stakeholdersFiltrados.length === 0} mensajeVacio="No hay stakeholders para los filtros seleccionados.">
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Stakeholder</th>
                    <th className="px-4 py-3 text-left font-medium">Influencia / Interés</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Relaciones</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginacion.itemsPaginados.map((stakeholder) => (
                    <tr key={stakeholder.id}>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1">
                          <p className="font-medium">{stakeholder.codigo} · {stakeholder.nombre}</p>
                          <p className="text-slate-600 dark:text-slate-300">{formatearTipoStakeholder(stakeholder.tipo)} · {stakeholder.area}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{stakeholder.cargo ?? 'Sin cargo'}{stakeholder.organizacion ? ` · ${stakeholder.organizacion}` : ''}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>Influencia: {formatearInfluenciaStakeholder(stakeholder.influencia)}</p>
                          <p>Interés: {formatearInteresStakeholder(stakeholder.interes)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">{formatearEstadoStakeholder(stakeholder.estado)}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <p>{modulosPorCodigo.get(stakeholder.modulo_codigo ?? '') ?? 'Sin módulo'}</p>
                          <p>{iniciativasPorId.get(stakeholder.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p>
                          <p>{entregasPorId.get(stakeholder.entrega_id ?? '') ?? 'Sin entrega'}</p>
                          <p>{decisionesPorId.get(stakeholder.decision_id ?? '') ?? 'Sin decisión'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => abrirModal('ver', stakeholder)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                          <button type="button" onClick={() => abrirModal('editar', stakeholder)} disabled={!esEdicionPermitida} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                          <button type="button" onClick={async () => { if (!esEdicionPermitida || !window.confirm(`Eliminar ${stakeholder.codigo}?`)) return; try { await eliminarStakeholderPm(stakeholder.id); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el stakeholder') } }} disabled={!esEdicionPermitida} className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300">Eliminar</button>
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

      <ModalPortal abierto={modalAbierto} titulo={modoModal === 'crear' ? 'Nuevo stakeholder' : modoModal === 'editar' ? `Editar ${stakeholderActivo?.codigo ?? 'stakeholder'}` : `Detalle ${stakeholderActivo?.codigo ?? 'stakeholder'}`} alCerrar={() => setModalAbierto(false)}>
        <form className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => { try { if (modoModal === 'ver') { setModalAbierto(false); return } if (modoModal === 'crear') await crearStakeholderPm(valores); if (modoModal === 'editar' && stakeholderActivo) await editarStakeholderPm(stakeholderActivo.id, valores); setModalAbierto(false); await cargar() } catch (errorInterno) { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el stakeholder') } })}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm"><span>Código</span><input {...formulario.register('codigo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Nombre</span><input {...formulario.register('nombre')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Tipo</span><select {...formulario.register('tipo')} disabled={modoModal === 'ver'} className={claseCampo}>{tiposStakeholderPm.map((tipo) => <option key={tipo} value={tipo}>{formatearTipoStakeholder(tipo)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Área</span><input {...formulario.register('area')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Organización</span><input {...formulario.register('organizacion')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Cargo</span><input {...formulario.register('cargo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Influencia</span><select {...formulario.register('influencia')} disabled={modoModal === 'ver'} className={claseCampo}>{influenciasStakeholderPm.map((influencia) => <option key={influencia} value={influencia}>{formatearInfluenciaStakeholder(influencia)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Interés</span><select {...formulario.register('interes')} disabled={modoModal === 'ver'} className={claseCampo}>{interesesStakeholderPm.map((interes) => <option key={interes} value={interes}>{formatearInteresStakeholder(interes)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Estado</span><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className={claseCampo}>{estadosStakeholderPm.map((estado) => <option key={estado} value={estado}>{formatearEstadoStakeholder(estado)}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Owner</span><input {...formulario.register('owner')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Correo</span><input type="email" {...formulario.register('correo')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Contacto de referencia</span><input {...formulario.register('contacto_referencia')} disabled={modoModal === 'ver'} className={claseCampo} /></label>
            <label className="space-y-1 text-sm"><span>Módulo</span><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin módulo</option>{(referencias?.modulos ?? []).map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Iniciativa</span><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin iniciativa</option>{(referencias?.iniciativas ?? []).map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Entrega</span><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin entrega</option>{(referencias?.entregas ?? []).map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span>Decisión</span><select {...formulario.register('decision_id')} disabled={modoModal === 'ver'} className={claseCampo}><option value="">Sin decisión</option>{(referencias?.decisiones ?? []).map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}</select></label>
            <label className="space-y-1 text-sm md:col-span-2"><span>Notas</span><textarea {...formulario.register('notas')} disabled={modoModal === 'ver'} rows={3} className={claseCampo} /></label>
          </div>
          {Object.keys(formulario.formState.errors).length > 0 && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">Revisa los campos obligatorios antes de guardar.</div>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancelar</button><button type="submit" disabled={modoModal === 'ver' || formulario.formState.isSubmitting} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">{modoModal === 'editar' ? 'Guardar cambios' : 'Crear stakeholder'}</button></div>
        </form>
      </ModalPortal>
    </section>
  )
}