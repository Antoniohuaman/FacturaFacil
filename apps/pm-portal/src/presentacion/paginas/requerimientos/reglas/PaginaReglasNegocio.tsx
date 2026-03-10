import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { reglaNegocioSchema, type ReglaNegocioEntrada } from '@/compartido/validacion/esquemas'
import type { CatalogoModuloPm, DecisionPm, HistoriaUsuarioPm, Iniciativa, ReglaNegocioPm } from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import { listarDecisionesPm } from '@/aplicacion/casos-uso/decisiones'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import {
  crearReglaNegocio,
  editarReglaNegocio,
  eliminarReglaNegocio,
  listarHistoriasUsuario,
  listarReglasNegocio
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

export function PaginaReglasNegocio() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [reglas, setReglas] = useState<ReglaNegocioPm[]>([])
  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [historias, setHistorias] = useState<HistoriaUsuarioPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [decisiones, setDecisiones] = useState<DecisionPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroCategoria, setFiltroCategoria] = useState(searchParams.get('categoria') ?? 'todas')
  const [filtroCriticidad, setFiltroCriticidad] = useState<'todas' | (typeof prioridadesRegistro)[number]>((searchParams.get('criticidad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>((searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos')
  const [filtroModulo, setFiltroModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [reglaActiva, setReglaActiva] = useState<ReglaNegocioPm | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<ReglaNegocioEntrada>({
    resolver: zodResolver(reglaNegocioSchema),
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      criticidad: 'media',
      modulo_codigo: null,
      estado: 'pendiente',
      iniciativa_id: null,
      historia_usuario_id: null,
      decision_id: null,
      owner: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const [reglasData, modulosData, historiasData, iniciativasData, decisionesData] = await Promise.all([
        listarReglasNegocio(),
        listarModulosPm(),
        listarHistoriasUsuario(),
        listarIniciativas(),
        listarDecisionesPm()
      ])
      setReglas(reglasData)
      setModulos(modulosData.filter((modulo) => modulo.activo))
      setHistorias(historiasData)
      setIniciativas(iniciativasData)
      setDecisiones(decisionesData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las reglas de negocio')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { void cargar() }, [])

  const categoriasDisponibles = useMemo(() => [...new Set(reglas.map((regla) => regla.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [reglas])

  const reglasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    return reglas.filter((regla) => {
      const coincideBusqueda = regla.codigo.toLowerCase().includes(termino) || regla.nombre.toLowerCase().includes(termino) || regla.descripcion.toLowerCase().includes(termino)
      const coincideCategoria = filtroCategoria === 'todas' ? true : regla.categoria === filtroCategoria
      const coincideCriticidad = filtroCriticidad === 'todas' ? true : regla.criticidad === filtroCriticidad
      const coincideEstado = filtroEstado === 'todos' ? true : regla.estado === filtroEstado
      const coincideModulo = filtroModulo === 'todos' ? true : regla.modulo_codigo === filtroModulo
      const coincideIniciativa = filtroIniciativa === 'todos' ? true : regla.iniciativa_id === filtroIniciativa
      return coincideBusqueda && coincideCategoria && coincideCriticidad && coincideEstado && coincideModulo && coincideIniciativa
    })
  }, [reglas, busqueda, filtroCategoria, filtroCriticidad, filtroEstado, filtroModulo, filtroIniciativa])

  const paginacion = usePaginacion({ items: reglasFiltradas, paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1, tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10 })

  useEffect(() => {
    const parametros = new URLSearchParams()
    if (busqueda) parametros.set('q', busqueda)
    if (filtroCategoria !== 'todas') parametros.set('categoria', filtroCategoria)
    if (filtroCriticidad !== 'todas') parametros.set('criticidad', filtroCriticidad)
    if (filtroEstado !== 'todos') parametros.set('estado', filtroEstado)
    if (filtroModulo !== 'todos') parametros.set('modulo', filtroModulo)
    if (filtroIniciativa !== 'todos') parametros.set('iniciativa', filtroIniciativa)
    if (paginacion.paginaActual > 1) parametros.set('pagina', String(paginacion.paginaActual))
    if (paginacion.tamanoPagina !== 10) parametros.set('tamano', String(paginacion.tamanoPagina))
    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroCategoria, filtroCriticidad, filtroEstado, filtroModulo, filtroIniciativa, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const moduloPorCodigo = useMemo(() => new Map(modulos.map((modulo) => [modulo.codigo, modulo.nombre])), [modulos])
  const historiaPorId = useMemo(() => new Map(historias.map((historia) => [historia.id, `${historia.codigo} · ${historia.titulo}`])), [historias])
  const iniciativaPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [iniciativas])
  const decisionPorId = useMemo(() => new Map(decisiones.map((decision) => [decision.id, decision.titulo])), [decisiones])

  const abrirModal = (modo: ModoModal, regla?: ReglaNegocioPm) => {
    setModoModal(modo)
    setReglaActiva(regla ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: regla?.codigo ?? '',
      nombre: regla?.nombre ?? '',
      descripcion: regla?.descripcion ?? '',
      categoria: regla?.categoria ?? '',
      criticidad: regla?.criticidad ?? 'media',
      modulo_codigo: regla?.modulo_codigo ?? null,
      estado: regla?.estado ?? 'pendiente',
      iniciativa_id: regla?.iniciativa_id ?? null,
      historia_usuario_id: regla?.historia_usuario_id ?? null,
      decision_id: regla?.decision_id ?? null,
      owner: regla?.owner ?? null,
      notas: regla?.notas ?? null
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2"><div className="space-y-1"><h1 className="text-2xl font-semibold">Reglas de negocio</h1><p className="text-sm text-slate-600 dark:text-slate-400">Centraliza políticas funcionales y conéctalas opcionalmente con módulos, historias, iniciativas o decisiones.</p></div><NavegacionRequerimientos /></header>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar regla" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroCategoria} onChange={(evento) => { setFiltroCategoria(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Categoría: todas</option>{categoriasDisponibles.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</select>
        <select value={filtroCriticidad} onChange={(evento) => { setFiltroCriticidad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todas">Criticidad: todas</option>{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Estado: todos</option>{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select>
        <select value={filtroModulo} onChange={(evento) => { setFiltroModulo(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Módulo: todos</option>{modulos.map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select>
        <select value={filtroIniciativa} onChange={(evento) => { setFiltroIniciativa(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"><option value="todos">Iniciativa: todas</option>{iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select>
        <button type="button" onClick={() => { setBusqueda(''); setFiltroCategoria('todas'); setFiltroCriticidad('todas'); setFiltroEstado('todos'); setFiltroModulo('todos'); setFiltroIniciativa('todos'); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Limpiar</button>
        <button type="button" onClick={() => { exportarCsv('requerimientos-reglas-negocio.csv', [
          { encabezado: 'Código', valor: (regla) => regla.codigo },
          { encabezado: 'Nombre', valor: (regla) => regla.nombre },
          { encabezado: 'Descripción', valor: (regla) => regla.descripcion },
          { encabezado: 'Categoría', valor: (regla) => regla.categoria },
          { encabezado: 'Criticidad', valor: (regla) => regla.criticidad },
          { encabezado: 'Módulo', valor: (regla) => moduloPorCodigo.get(regla.modulo_codigo ?? '') ?? '' },
          { encabezado: 'Estado', valor: (regla) => formatearEstadoLegible(regla.estado) },
          { encabezado: 'Iniciativa', valor: (regla) => iniciativaPorId.get(regla.iniciativa_id ?? '') ?? '' },
          { encabezado: 'Historia', valor: (regla) => historiaPorId.get(regla.historia_usuario_id ?? '') ?? '' },
          { encabezado: 'Decisión', valor: (regla) => decisionPorId.get(regla.decision_id ?? '') ?? '' }
        ], reglasFiltradas) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear regla</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={reglasFiltradas.length === 0} mensajeVacio="No hay reglas de negocio para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-sm"><thead className="bg-slate-100 text-left dark:bg-slate-800"><tr><th className="px-3 py-2">Regla</th><th className="px-3 py-2">Contexto</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Acciones</th></tr></thead><tbody>{paginacion.itemsPaginados.map((regla) => <tr key={regla.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2"><p className="font-medium">{regla.codigo} · {regla.nombre}</p><p className="text-xs text-slate-500 dark:text-slate-400">{regla.categoria} · {regla.criticidad}</p></td><td className="px-3 py-2"><p>{moduloPorCodigo.get(regla.modulo_codigo ?? '') ?? 'Sin módulo'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{iniciativaPorId.get(regla.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p><p className="text-xs text-slate-500 dark:text-slate-400">{decisionPorId.get(regla.decision_id ?? '') ?? 'Sin decisión'}</p></td><td className="px-3 py-2"><p>{regla.estado}</p><p className="text-xs text-slate-500 dark:text-slate-400">{regla.owner ?? 'Sin owner'}</p></td><td className="px-3 py-2"><div className="flex gap-2"><button type="button" onClick={() => abrirModal('ver', regla)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button><button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', regla)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button><button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar esta regla de negocio?')) { void eliminarReglaNegocio(regla.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la regla') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button></div></td></tr>)}</tbody></table></div>
        <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} regla de negocio`} alCerrar={() => setModalAbierto(false)}>
        <form noValidate className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') return
          try {
            if (modoModal === 'crear') await crearReglaNegocio(valores)
            if (modoModal === 'editar' && reglaActiva) await editarReglaNegocio(reglaActiva.id, valores)
            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la regla de negocio')
          }
        })}>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Código</label><input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Nombre</label><input {...formulario.register('nombre')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          <div><label className="text-sm font-medium">Descripción</label><textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div>
          <div className="grid gap-3 md:grid-cols-3"><div><label className="text-sm font-medium">Categoría</label><input {...formulario.register('categoria')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Criticidad</label><select {...formulario.register('criticidad')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}</select></div><div><label className="text-sm font-medium">Estado</label><select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}</select></div></div>
          <div className="grid gap-3 md:grid-cols-4"><div><label className="text-sm font-medium">Módulo</label><select {...formulario.register('modulo_codigo')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin módulo</option>{modulos.map((modulo) => <option key={modulo.id} value={modulo.codigo}>{modulo.nombre}</option>)}</select></div><div><label className="text-sm font-medium">Iniciativa</label><select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin iniciativa</option>{iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}</select></div><div><label className="text-sm font-medium">Historia</label><select {...formulario.register('historia_usuario_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin historia</option>{historias.map((historia) => <option key={historia.id} value={historia.id}>{historia.codigo} · {historia.titulo}</option>)}</select></div><div><label className="text-sm font-medium">Decisión</label><select {...formulario.register('decision_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Sin decisión</option>{decisiones.map((decision) => <option key={decision.id} value={decision.id}>{decision.titulo}</option>)}</select></div></div>
          <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium">Owner</label><input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div><div><label className="text-sm font-medium">Notas</label><input {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></div></div>
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}