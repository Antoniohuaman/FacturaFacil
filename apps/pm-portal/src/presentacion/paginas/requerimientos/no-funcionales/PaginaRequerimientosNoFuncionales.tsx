import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { requerimientoNoFuncionalSchema, type RequerimientoNoFuncionalEntrada } from '@/compartido/validacion/esquemas'
import type { Entrega, Iniciativa, RequerimientoNoFuncionalPm, TipoRequerimientoNoFuncionalPm } from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro, tiposRequerimientoNoFuncionalPm } from '@/dominio/modelos'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import {
  crearRequerimientoNoFuncional,
  editarRequerimientoNoFuncional,
  eliminarRequerimientoNoFuncional,
  listarRequerimientosNoFuncionales
} from '@/aplicacion/casos-uso/requerimientos'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionRequerimientos } from '@/presentacion/paginas/requerimientos/NavegacionRequerimientos'

type ModoModal = 'crear' | 'editar' | 'ver'

export function PaginaRequerimientosNoFuncionales() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [requerimientos, setRequerimientos] = useState<RequerimientoNoFuncionalPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoRequerimientoNoFuncionalPm>((searchParams.get('tipo') as 'todos' | TipoRequerimientoNoFuncionalPm) ?? 'todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>((searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>((searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todos')
  const [filtroEntrega, setFiltroEntrega] = useState(searchParams.get('entrega') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [requerimientoActivo, setRequerimientoActivo] = useState<RequerimientoNoFuncionalPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<RequerimientoNoFuncionalEntrada>({
    resolver: zodResolver(requerimientoNoFuncionalSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      tipo: 'seguridad',
      descripcion: '',
      criterio_medicion: '',
      prioridad: 'media',
      estado: 'pendiente',
      iniciativa_id: null,
      entrega_id: null,
      owner: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [requerimientosData, iniciativasData, entregasData] = await Promise.all([
        listarRequerimientosNoFuncionales(),
        listarIniciativas(),
        listarEntregas()
      ])
      setRequerimientos(requerimientosData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los requerimientos no funcionales')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [])

  const requerimientosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return requerimientos.filter((requerimiento) => {
      const coincideBusqueda = requerimiento.codigo.toLowerCase().includes(termino) || requerimiento.nombre.toLowerCase().includes(termino) || requerimiento.descripcion.toLowerCase().includes(termino)
      const coincideTipo = filtroTipo === 'todos' ? true : requerimiento.tipo === filtroTipo
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : requerimiento.prioridad === filtroPrioridad
      const coincideEstado = filtroEstado === 'todos' ? true : requerimiento.estado === filtroEstado
      const coincideIniciativa = filtroIniciativa === 'todos' ? true : requerimiento.iniciativa_id === filtroIniciativa
      const coincideEntrega = filtroEntrega === 'todos' ? true : requerimiento.entrega_id === filtroEntrega
      return coincideBusqueda && coincideTipo && coincidePrioridad && coincideEstado && coincideIniciativa && coincideEntrega
    })
  }, [requerimientos, busqueda, filtroTipo, filtroPrioridad, filtroEstado, filtroIniciativa, filtroEntrega])

  const paginacion = usePaginacion({ items: requerimientosFiltrados, paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1, tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10 })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroTipo !== 'todos') parametros.set('tipo', filtroTipo)
    if (filtroPrioridad !== 'todas') parametros.set('prioridad', filtroPrioridad)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroIniciativa !== 'todos') parametros.set('iniciativa', filtroIniciativa)
    if (filtroEntrega !== 'todos') parametros.set('entrega', filtroEntrega)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroTipo, filtroPrioridad, filtroEstado, filtroIniciativa, filtroEntrega, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const iniciativaPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [iniciativas])
  const entregaPorId = useMemo(() => new Map(entregas.map((entrega) => [entrega.id, entrega.nombre])), [entregas])

  const abrirModal = (modo: ModoModal, requerimiento?: RequerimientoNoFuncionalPm) => {
    setModoModal(modo)
    setRequerimientoActivo(requerimiento ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: requerimiento?.codigo ?? '',
      nombre: requerimiento?.nombre ?? '',
      tipo: requerimiento?.tipo ?? 'seguridad',
      descripcion: requerimiento?.descripcion ?? '',
      criterio_medicion: requerimiento?.criterio_medicion ?? '',
      prioridad: requerimiento?.prioridad ?? 'media',
      estado: requerimiento?.estado ?? 'pendiente',
      iniciativa_id: requerimiento?.iniciativa_id ?? null,
      entrega_id: requerimiento?.entrega_id ?? null,
      owner: requerimiento?.owner ?? null,
      notas: requerimiento?.notas ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2"><div className="space-y-1"><h1 className="text-2xl font-semibold">Requerimientos no funcionales</h1><p className="text-sm text-slate-600 dark:text-slate-400">Controla necesidades de seguridad, rendimiento, disponibilidad, accesibilidad y mantenibilidad sin bloquear roadmap ni entregas.</p></div><NavegacionRequerimientos /></header>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar RNF" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroTipo} onChange={(evento) => { setFiltroTipo(evento.target.value as 'todos' | TipoRequerimientoNoFuncionalPm); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Tipo: todos</option>{tiposRequerimientoNoFuncionalPm.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select>
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Prioridad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
        <select value={filtroIniciativa} onChange={(evento) => { setFiltroIniciativa(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Iniciativa: todas</option>{iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select>
        <select value={filtroEntrega} onChange={(evento) => { setFiltroEntrega(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Entrega: todas</option>{entregas.map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select>
        <button type="button" onClick={() => { setBusqueda(''); setFiltroTipo('todos'); setFiltroPrioridad('todas'); setFiltroEstado('todos'); setFiltroIniciativa('todos'); setFiltroEntrega('todos'); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Limpiar</button>
        <button type="button" onClick={() => { exportarCsv('requerimientos-no-funcionales.csv', [
          { encabezado: 'Código', valor: (requerimiento) => requerimiento.codigo },
          { encabezado: 'Nombre', valor: (requerimiento) => requerimiento.nombre },
          { encabezado: 'Tipo', valor: (requerimiento) => requerimiento.tipo },
          { encabezado: 'Descripción', valor: (requerimiento) => requerimiento.descripcion },
          { encabezado: 'Criterio medición', valor: (requerimiento) => requerimiento.criterio_medicion },
          { encabezado: 'Prioridad', valor: (requerimiento) => requerimiento.prioridad },
          { encabezado: 'Estado', valor: (requerimiento) => formatearEstadoLegible(requerimiento.estado) },
          { encabezado: 'Iniciativa', valor: (requerimiento) => iniciativaPorId.get(requerimiento.iniciativa_id ?? '') ?? '' },
          { encabezado: 'Entrega', valor: (requerimiento) => entregaPorId.get(requerimiento.entrega_id ?? '') ?? '' }
        ], requerimientosFiltrados) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear RNF</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={requerimientosFiltrados.length === 0} mensajeVacio="No hay requerimientos no funcionales para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-sm"><thead className="bg-slate-100 text-left dark:bg-slate-800"><tr><th className="px-3 py-2">RNF</th><th className="px-3 py-2">Vínculos</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr></thead><tbody>{paginacion.itemsPaginados.map((requerimiento) => <tr key={requerimiento.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2"><p className="font-medium">{requerimiento.codigo} · {requerimiento.nombre}</p><p className="text-xs text-slate-500 dark:text-slate-400">{requerimiento.tipo}</p></td><td className="px-3 py-2"><p>{iniciativaPorId.get(requerimiento.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{entregaPorId.get(requerimiento.entrega_id ?? '') ?? 'Sin entrega'}</p></td><td className="px-3 py-2"><p>{requerimiento.estado}</p><p className="text-xs text-slate-500 dark:text-slate-400">{requerimiento.prioridad} · {requerimiento.owner ?? 'Sin owner'}</p></td><td className="px-3 py-2"><div className="flex gap-2"><button type="button" onClick={() => abrirModal('ver', requerimiento)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', requerimiento)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar este requerimiento no funcional?')) { void eliminarRequerimientoNoFuncional(requerimiento.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el RNF') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button></div></td></tr>)}</tbody></table></div>
        <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} requerimiento no funcional`} alCerrar={() => setModalAbierto(false)}>
        <form noValidate className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') return
          try {
            if (modoModal === 'crear') await crearRequerimientoNoFuncional(valores)
            if (modoModal === 'editar' && requerimientoActivo) await editarRequerimientoNoFuncional(requerimientoActivo.id, valores)
            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el requerimiento no funcional')
          }
        })}>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Código</label><input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Nombre</label><input {...formulario.register('nombre')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div className="grid gap-3 md:grid-cols-3"><div><label className="text-sm font-medium">Tipo</label><select {...formulario.register('tipo')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{tiposRequerimientoNoFuncionalPm.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div><div><label className="text-sm font-medium">Prioridad</label><select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select></div><div><label className="text-sm font-medium">Estado</label><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></div></div>
          <div><label className="text-sm font-medium">Descripción</label><textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          <div><label className="text-sm font-medium">Criterio de medición</label><textarea {...formulario.register('criterio_medicion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          <div className="grid gap-3 md:grid-cols-3"><div><label className="text-sm font-medium">Iniciativa</label><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></div><div><label className="text-sm font-medium">Entrega</label><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin entrega</option>{entregas.map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></div><div><label className="text-sm font-medium">Owner</label><input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div><label className="text-sm font-medium">Notas</label><textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}