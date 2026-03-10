import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { hipotesisDiscoverySchema, type HipotesisDiscoveryEntrada } from '@/compartido/validacion/esquemas'
import type { HipotesisDiscoveryPm, Iniciativa, ProblemaOportunidadDiscoveryPm } from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import {
  crearHipotesisDiscovery,
  editarHipotesisDiscovery,
  eliminarHipotesisDiscovery,
  listarHipotesisDiscovery,
  listarProblemasOportunidadesDiscovery,
  listarRelHipotesisDiscoveryIniciativa
} from '@/aplicacion/casos-uso/discovery'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarHistoriasUsuario } from '@/aplicacion/casos-uso/requerimientos'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '@/compartido/utilidades/usePaginacion'
import { NavegacionDiscovery } from '@/presentacion/paginas/discovery/NavegacionDiscovery'
import { SelectorRelaciones } from '@/presentacion/paginas/discovery/SelectorRelaciones'

type ModoModal = 'crear' | 'editar' | 'ver'

function alternarSeleccion(actual: string[], id: string, seleccionado: boolean) {
  return seleccionado ? [...actual, id] : actual.filter((item) => item !== id)
}

export function PaginaHipotesisDiscovery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [hipotesis, setHipotesis] = useState<HipotesisDiscoveryPm[]>([])
  const [problemas, setProblemas] = useState<ProblemaOportunidadDiscoveryPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroProblema, setFiltroProblema] = useState(searchParams.get('problema') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [hipotesisActiva, setHipotesisActiva] = useState<HipotesisDiscoveryPm | null>(null)
  const [iniciativasSeleccionadas, setIniciativasSeleccionadas] = useState<string[]>([])
  const [relacionesIniciativas, setRelacionesIniciativas] = useState<Map<string, number>>(new Map())
  const [detalleRelacionesIniciativas, setDetalleRelacionesIniciativas] = useState<Map<string, string[]>>(new Map())
  const [historiasDerivadasPorHipotesis, setHistoriasDerivadasPorHipotesis] = useState<Map<string, number>>(new Map())

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<HipotesisDiscoveryEntrada>({
    resolver: zodResolver(hipotesisDiscoverySchema),
    defaultValues: {
      titulo: '',
      problema_id: null,
      hipotesis: '',
      cambio_propuesto: '',
      resultado_esperado: '',
      criterio_exito: '',
      prioridad: 'media',
      estado: 'pendiente',
      owner: null,
      evidencia_url: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [hipotesisData, problemasData, iniciativasData, relIniciativasData, historiasData] = await Promise.all([
        listarHipotesisDiscovery(),
        listarProblemasOportunidadesDiscovery(),
        listarIniciativas(),
        listarRelHipotesisDiscoveryIniciativa(),
        listarHistoriasUsuario()
      ])

      setHipotesis(hipotesisData)
      setProblemas(problemasData)
      setIniciativas(iniciativasData)
      setRelacionesIniciativas(
        relIniciativasData.reduce(
          (mapa, relacion) =>
            mapa.set(relacion.hipotesis_discovery_id, (mapa.get(relacion.hipotesis_discovery_id) ?? 0) + 1),
          new Map<string, number>()
        )
      )
      setDetalleRelacionesIniciativas(
        relIniciativasData.reduce((mapa, relacion) => {
          const actual = mapa.get(relacion.hipotesis_discovery_id) ?? []
          return mapa.set(relacion.hipotesis_discovery_id, [...actual, relacion.iniciativa_id])
        }, new Map<string, string[]>())
      )
      setHistoriasDerivadasPorHipotesis(
        historiasData.reduce((mapa, historia) => {
          if (!historia.hipotesis_discovery_id) {
            return mapa
          }

          return mapa.set(historia.hipotesis_discovery_id, (mapa.get(historia.hipotesis_discovery_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las hipótesis discovery')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const problemaPorId = useMemo(() => new Map(problemas.map((problema) => [problema.id, problema.titulo])), [problemas])

  const hipotesisFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return hipotesis.filter((hipotesisItem) => {
      const coincideBusqueda =
        hipotesisItem.titulo.toLowerCase().includes(termino) ||
        hipotesisItem.hipotesis.toLowerCase().includes(termino) ||
        hipotesisItem.resultado_esperado.toLowerCase().includes(termino) ||
        (hipotesisItem.notas ?? '').toLowerCase().includes(termino)
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : hipotesisItem.prioridad === filtroPrioridad
      const coincideEstado = filtroEstado === 'todos' ? true : hipotesisItem.estado === filtroEstado
      const coincideOwner = owner ? (hipotesisItem.owner ?? '').toLowerCase().includes(owner) : true
      const coincideProblema = filtroProblema === 'todos' ? true : hipotesisItem.problema_id === filtroProblema

      return coincideBusqueda && coincidePrioridad && coincideEstado && coincideOwner && coincideProblema
    })
  }, [hipotesis, busqueda, filtroPrioridad, filtroEstado, filtroOwner, filtroProblema])

  const paginacion = usePaginacion({
    items: hipotesisFiltradas,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroPrioridad !== 'todas') {
      parametros.set('prioridad', filtroPrioridad)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (filtroOwner) {
      parametros.set('owner', filtroOwner)
    }
    if (filtroProblema !== 'todos') {
      parametros.set('problema', filtroProblema)
    }
    if (paginacion.paginaActual > 1) {
      parametros.set('pagina', String(paginacion.paginaActual))
    }
    if (paginacion.tamanoPagina !== 10) {
      parametros.set('tamano', String(paginacion.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [busqueda, filtroPrioridad, filtroEstado, filtroOwner, filtroProblema, paginacion.paginaActual, paginacion.tamanoPagina, setSearchParams])

  const abrirModal = (modo: ModoModal, hipotesisItem?: HipotesisDiscoveryPm) => {
    setModoModal(modo)
    setHipotesisActiva(hipotesisItem ?? null)
    setModalAbierto(true)
    formulario.reset({
      titulo: hipotesisItem?.titulo ?? '',
      problema_id: hipotesisItem?.problema_id ?? null,
      hipotesis: hipotesisItem?.hipotesis ?? '',
      cambio_propuesto: hipotesisItem?.cambio_propuesto ?? '',
      resultado_esperado: hipotesisItem?.resultado_esperado ?? '',
      criterio_exito: hipotesisItem?.criterio_exito ?? '',
      prioridad: hipotesisItem?.prioridad ?? 'media',
      estado: hipotesisItem?.estado ?? 'pendiente',
      owner: hipotesisItem?.owner ?? null,
      evidencia_url: hipotesisItem?.evidencia_url ?? null,
      notas: hipotesisItem?.notas ?? null
    })
    setIniciativasSeleccionadas(hipotesisItem ? detalleRelacionesIniciativas.get(hipotesisItem.id) ?? [] : [])
  }

  const opcionesIniciativas = useMemo(
    () =>
      iniciativas.map((iniciativa) => ({
        id: iniciativa.id,
        etiqueta: iniciativa.nombre,
        descripcion: `${iniciativa.estado} · ${iniciativa.prioridad}`
      })),
    [iniciativas]
  )

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Hipótesis discovery</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Formula hipótesis de discovery separadas de Estrategia y con vínculo opcional hacia iniciativas del roadmap.
          </p>
        </div>
        <NavegacionDiscovery />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input type="search" value={busqueda} onChange={(evento) => { setBusqueda(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Buscar hipótesis discovery" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroPrioridad} onChange={(evento) => { setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}
        </select>
        <select value={filtroEstado} onChange={(evento) => { setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number]); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
        </select>
        <input type="search" value={filtroOwner} onChange={(evento) => { setFiltroOwner(evento.target.value); paginacion.setPaginaActual(1) }} placeholder="Filtrar por owner" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800" />
        <select value={filtroProblema} onChange={(evento) => { setFiltroProblema(evento.target.value); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800">
          <option value="todos">Problema: todos</option>
          {problemas.map((problema) => <option key={problema.id} value={problema.id}>{problema.titulo}</option>)}
        </select>
        <button type="button" onClick={() => { setBusqueda(''); setFiltroPrioridad('todas'); setFiltroEstado('todos'); setFiltroOwner(''); setFiltroProblema('todos'); paginacion.setPaginaActual(1) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Limpiar</button>
        <button type="button" onClick={() => { exportarCsv('discovery-hipotesis.csv', [
          { encabezado: 'Título', valor: (hipotesisItem) => hipotesisItem.titulo },
          { encabezado: 'Problema', valor: (hipotesisItem) => problemaPorId.get(hipotesisItem.problema_id ?? '') ?? '' },
          { encabezado: 'Hipótesis', valor: (hipotesisItem) => hipotesisItem.hipotesis },
          { encabezado: 'Cambio propuesto', valor: (hipotesisItem) => hipotesisItem.cambio_propuesto },
          { encabezado: 'Resultado esperado', valor: (hipotesisItem) => hipotesisItem.resultado_esperado },
          { encabezado: 'Criterio éxito', valor: (hipotesisItem) => hipotesisItem.criterio_exito },
          { encabezado: 'Prioridad', valor: (hipotesisItem) => hipotesisItem.prioridad },
          { encabezado: 'Estado', valor: (hipotesisItem) => formatearEstadoLegible(hipotesisItem.estado) },
          { encabezado: 'Owner', valor: (hipotesisItem) => hipotesisItem.owner ?? '' },
          { encabezado: 'Iniciativas vinculadas', valor: (hipotesisItem) => relacionesIniciativas.get(hipotesisItem.id) ?? 0 },
          { encabezado: 'Historias derivadas', valor: (hipotesisItem) => historiasDerivadasPorHipotesis.get(hipotesisItem.id) ?? 0 }
        ], hipotesisFiltradas) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Exportar CSV</button>
        <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('crear')} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">Crear hipótesis discovery</button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={hipotesisFiltradas.length === 0} mensajeVacio="No hay hipótesis discovery para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Hipótesis</th>
                <th className="px-3 py-2">Problema</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((hipotesisItem) => (
                <tr key={hipotesisItem.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{hipotesisItem.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{hipotesisItem.prioridad} · {hipotesisItem.owner ?? 'Sin owner'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{relacionesIniciativas.get(hipotesisItem.id) ?? 0} iniciativas vinculadas · {historiasDerivadasPorHipotesis.get(hipotesisItem.id) ?? 0} historias derivadas</p>
                  </td>
                  <td className="px-3 py-2">{problemaPorId.get(hipotesisItem.problema_id ?? '') ?? 'Sin problema asociado'}</td>
                  <td className="px-3 py-2">{hipotesisItem.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', hipotesisItem)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', hipotesisItem)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => { if (window.confirm('¿Eliminar esta hipótesis discovery?')) { void eliminarHipotesisDiscovery(hipotesisItem.id).then(cargar).catch((errorInterno) => { setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la hipótesis discovery') }) } }} className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacionTabla paginaActual={paginacion.paginaActual} totalPaginas={paginacion.totalPaginas} totalItems={paginacion.totalItems} desde={paginacion.desde} hasta={paginacion.hasta} tamanoPagina={paginacion.tamanoPagina} alCambiarPagina={paginacion.setPaginaActual} alCambiarTamanoPagina={paginacion.setTamanoPagina} />
      </EstadoVista>

      <ModalPortal abierto={modalAbierto} titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} hipótesis discovery`} alCerrar={() => setModalAbierto(false)}>
        <form noValidate className="space-y-4" onSubmit={formulario.handleSubmit(async (valores) => {
          if (modoModal === 'ver') {
            return
          }

          try {
            if (modoModal === 'crear') {
              await crearHipotesisDiscovery(valores, iniciativasSeleccionadas)
            }

            if (modoModal === 'editar' && hipotesisActiva) {
              await editarHipotesisDiscovery(hipotesisActiva.id, valores, iniciativasSeleccionadas)
            }

            setModalAbierto(false)
            await cargar()
          } catch (errorInterno) {
            setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la hipótesis discovery')
          }
        })}>
          <div>
            <label className="text-sm font-medium">Título</label>
            <input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="text-sm font-medium">Problema asociado</label>
            <select {...formulario.register('problema_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">Sin problema asociado</option>
              {problemas.map((problema) => <option key={problema.id} value={problema.id}>{problema.titulo}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Hipótesis</label>
            <textarea {...formulario.register('hipotesis')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Cambio propuesto</label>
              <textarea {...formulario.register('cambio_propuesto')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Resultado esperado</label>
              <textarea {...formulario.register('resultado_esperado')} readOnly={modoModal === 'ver'} className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Criterio de éxito</label>
            <textarea {...formulario.register('criterio_exito')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <select {...formulario.register('prioridad')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {prioridadesRegistro.map((prioridad) => <option key={prioridad} value={prioridad}>{prioridad}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select {...formulario.register('estado')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                {estadosRegistro.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Owner</label>
              <input {...formulario.register('owner')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Evidencia URL</label>
              <input {...formulario.register('evidencia_url')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <SelectorRelaciones titulo="Vincular con iniciativas" opciones={opcionesIniciativas} seleccionados={iniciativasSeleccionadas} deshabilitado={modoModal === 'ver'} alAlternar={(id, seleccionado) => setIniciativasSeleccionadas((actual) => alternarSeleccion(actual, id, seleccionado))} />
          {modoModal !== 'ver' ? <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">Guardar</button> : null}
        </form>
      </ModalPortal>
    </section>
  )
}