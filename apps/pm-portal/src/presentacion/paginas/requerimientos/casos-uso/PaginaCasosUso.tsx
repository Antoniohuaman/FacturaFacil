import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { casoUsoSchema, type CasoUsoEntrada } from '@/compartido/validacion/esquemas'
import type { CasoUsoPm, Entrega, HistoriaUsuarioPm, Iniciativa } from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import {
  crearCasoUso,
  editarCasoUso,
  eliminarCasoUso,
  listarCasosUso,
  listarHistoriasUsuario
} from '@/aplicacion/casos-uso/requerimientos'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
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

export function PaginaCasosUso() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [casosUso, setCasosUso] = useState<CasoUsoPm[]>([])
  const [historias, setHistorias] = useState<HistoriaUsuarioPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>((searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>((searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos')
  const [filtroActor, setFiltroActor] = useState(searchParams.get('actor') ?? '')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todos')
  const [filtroEntrega, setFiltroEntrega] = useState(searchParams.get('entrega') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [casoActivo, setCasoActivo] = useState<CasoUsoPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<CasoUsoEntrada>({
    resolver: zodResolver(casoUsoSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      actor_principal: '',
      actores_secundarios: null,
      precondiciones: '',
      flujo_principal: '',
      flujos_alternos: null,
      postcondiciones: '',
      prioridad: 'media',
      estado: 'pendiente',
      iniciativa_id: null,
      entrega_id: null,
      historia_usuario_id: null,
      owner: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [casosUsoData, historiasData, iniciativasData, entregasData] = await Promise.all([
        listarCasosUso(),
        listarHistoriasUsuario(),
        listarIniciativas(),
        listarEntregas()
      ])
      setCasosUso(casosUsoData)
      setHistorias(historiasData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar los casos de uso')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const casosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const actor = filtroActor.toLowerCase()
    return casosUso.filter((caso) => {
      const coincideBusqueda =
        caso.codigo.toLowerCase().includes(termino) ||
        caso.titulo.toLowerCase().includes(termino) ||
        caso.actor_principal.toLowerCase().includes(termino) ||
        (caso.notas ?? '').toLowerCase().includes(termino)
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : caso.prioridad === filtroPrioridad
      const coincideEstado = filtroEstado === 'todos' ? true : caso.estado === filtroEstado
      const coincideActor = actor ? caso.actor_principal.toLowerCase().includes(actor) : true
      const coincideIniciativa = filtroIniciativa === 'todos' ? true : caso.iniciativa_id === filtroIniciativa
      const coincideEntrega = filtroEntrega === 'todos' ? true : caso.entrega_id === filtroEntrega
      return coincideBusqueda && coincidePrioridad && coincideEstado && coincideActor && coincideIniciativa && coincideEntrega
    })
  }, [casosUso, busqueda, filtroPrioridad, filtroEstado, filtroActor, filtroIniciativa, filtroEntrega])

  const paginacion = usePaginacion({
    items: casosFiltrados,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroPrioridad !== 'todas') parametros.set('prioridad', filtroPrioridad)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroActor) parametros.set('actor', filtroActor)
    if (filtroIniciativa !== 'todos') parametros.set('iniciativa', filtroIniciativa)
    if (filtroEntrega !== 'todos') parametros.set('entrega', filtroEntrega)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroPrioridad, filtroEstado, filtroActor, filtroIniciativa, filtroEntrega, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const iniciativaPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [iniciativas])
  const entregaPorId = useMemo(() => new Map(entregas.map((entrega) => [entrega.id, entrega.nombre])), [entregas])
  const historiaPorId = useMemo(() => new Map(historias.map((historia) => [historia.id, historia.codigo])), [historias])

  const abrirModal = (modo: ModoModal, caso?: CasoUsoPm) => {
    setModoModal(modo)
    setCasoActivo(caso ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: caso?.codigo ?? '',
      titulo: caso?.titulo ?? '',
      actor_principal: caso?.actor_principal ?? '',
      actores_secundarios: caso?.actores_secundarios ?? null,
      precondiciones: caso?.precondiciones ?? '',
      flujo_principal: caso?.flujo_principal ?? '',
      flujos_alternos: caso?.flujos_alternos ?? null,
      postcondiciones: caso?.postcondiciones ?? '',
      prioridad: caso?.prioridad ?? 'media',
      estado: caso?.estado ?? 'pendiente',
      iniciativa_id: caso?.iniciativa_id ?? null,
      entrega_id: caso?.entrega_id ?? null,
      historia_usuario_id: caso?.historia_usuario_id ?? null,
      owner: caso?.owner ?? null,
      notas: caso?.notas ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Casos de uso</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Describe actores, flujos y condiciones manteniendo vínculos opcionales con historias, iniciativas y entregas.</p>
        </div>
        <NavegacionRequerimientos />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar caso de uso" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Prioridad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
        <input type="search" value={filtroActor} onChange={(evento) => { setFiltroActor(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Actor principal" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroIniciativa} onChange={(evento) => { setFiltroIniciativa(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Iniciativa: todas</option>{iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select>
        <select value={filtroEntrega} onChange={(evento) => { setFiltroEntrega(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Entrega: todas</option>{entregas.map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select>
        <button type="button" onClick={() => { setBusqueda(''); setFiltroPrioridad('todas'); setFiltroEstado('todos'); setFiltroActor(''); setFiltroIniciativa('todos'); setFiltroEntrega('todos'); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Limpiar</button>
        <button type="button" onClick={() => { exportarCsv('requerimientos-casos-uso.csv', [
          { encabezado: 'Código', valor: (caso) => caso.codigo },
          { encabezado: 'Título', valor: (caso) => caso.titulo },
          { encabezado: 'Actor principal', valor: (caso) => caso.actor_principal },
          { encabezado: 'Actores secundarios', valor: (caso) => caso.actores_secundarios ?? '' },
          { encabezado: 'Precondiciones', valor: (caso) => caso.precondiciones },
          { encabezado: 'Flujo principal', valor: (caso) => caso.flujo_principal },
          { encabezado: 'Flujos alternos', valor: (caso) => caso.flujos_alternos ?? '' },
          { encabezado: 'Postcondiciones', valor: (caso) => caso.postcondiciones },
          { encabezado: 'Prioridad', valor: (caso) => caso.prioridad },
          { encabezado: 'Estado', valor: (caso) => formatearEstadoLegible(caso.estado) },
          { encabezado: 'Iniciativa', valor: (caso) => iniciativaPorId.get(caso.iniciativa_id ?? '') ?? '' },
          { encabezado: 'Entrega', valor: (caso) => entregaPorId.get(caso.entrega_id ?? '') ?? '' },
          { encabezado: 'Historia', valor: (caso) => historiaPorId.get(caso.historia_usuario_id ?? '') ?? '' }
        ], casosFiltrados) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear caso de uso</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={casosFiltrados.length === 0} mensajeVacio="No hay casos de uso para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm"><thead className="bg-slate-100 text-left dark:bg-slate-800"><tr><th className="px-3 py-2">Caso de uso</th><th className="px-3 py-2">Vínculos</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr></thead><tbody>{paginacion.itemsPaginados.map((caso) => <tr key={caso.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2"><p className="font-medium">{caso.codigo} · {caso.titulo}</p><p className="text-xs text-slate-500 dark:text-slate-400">{caso.actor_principal}</p></td><td className="px-3 py-2"><p>{iniciativaPorId.get(caso.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{entregaPorId.get(caso.entrega_id ?? '') ?? 'Sin entrega'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{historiaPorId.get(caso.historia_usuario_id ?? '') ?? 'Sin historia'}</p></td><td className="px-3 py-2"><p>{caso.estado}</p><p className="text-xs text-slate-500 dark:text-slate-400">{caso.prioridad} · {caso.owner ?? 'Sin owner'}</p></td><td className="px-3 py-2"><div className="flex gap-2"><button type="button" onClick={() => abrirModal('ver', caso)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', caso)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar este caso de uso?')) { void eliminarCasoUso(caso.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar el caso de uso') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button></div></td></tr>)}</tbody></table>
        </div>
        <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} caso de uso`} alCerrar={() => setModalAbierto(false)}>
        <form noValidate className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') return
          try {
            if (modoModal === 'crear') await crearCasoUso(valores)
            if (modoModal === 'editar' && casoActivo) await editarCasoUso(casoActivo.id, valores)
            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar el caso de uso')
          }
        })}>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Código</label><input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Título</label><input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Actor principal</label><input {...formulario.register('actor_principal')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Actores secundarios</label><input {...formulario.register('actores_secundarios')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div><label className="text-sm font-medium">Precondiciones</label><textarea {...formulario.register('precondiciones')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          <div><label className="text-sm font-medium">Flujo principal</label><textarea {...formulario.register('flujo_principal')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Flujos alternos</label><textarea {...formulario.register('flujos_alternos')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Postcondiciones</label><textarea {...formulario.register('postcondiciones')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div className="grid gap-3 md:grid-cols-3"><div><label className="text-sm font-medium">Prioridad</label><select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select></div><div><label className="text-sm font-medium">Estado</label><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></div><div><label className="text-sm font-medium">Owner</label><input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div className="grid gap-3 md:grid-cols-3"><div><label className="text-sm font-medium">Iniciativa</label><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></div><div><label className="text-sm font-medium">Entrega</label><select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin entrega</option>{entregas.map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}</select></div><div><label className="text-sm font-medium">Historia asociada</label><select {...formulario.register('historia_usuario_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin historia</option>{historias.map((historia) => <option key={historia.id} value={historia.id}>{historia.codigo} · {historia.titulo}</option>)}</select></div></div>
          <div><label className="text-sm font-medium">Notas</label><textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}