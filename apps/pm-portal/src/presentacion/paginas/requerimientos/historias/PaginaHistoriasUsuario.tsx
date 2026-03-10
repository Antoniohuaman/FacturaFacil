import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { historiaUsuarioSchema, type CriterioAceptacionEntrada, type HistoriaUsuarioEntrada } from '@/compartido/validacion/esquemas'
import type { CriterioAceptacionPm, Entrega, HistoriaUsuarioPm, HipotesisDiscoveryPm, Iniciativa } from '@/dominio/modelos'
import { estadosRegistro, prioridadesRegistro } from '@/dominio/modelos'
import {
  crearHistoriaUsuario,
  editarHistoriaUsuario,
  eliminarHistoriaUsuario,
  listarCriteriosAceptacion,
  listarHistoriasUsuario
} from '@/aplicacion/casos-uso/requerimientos'
import { listarHipotesisDiscovery } from '@/aplicacion/casos-uso/discovery'
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
import { GestionCriteriosAceptacion } from '@/presentacion/paginas/requerimientos/historias/GestionCriteriosAceptacion'

type ModoModal = 'crear' | 'editar' | 'ver'

export function PaginaHistoriasUsuario() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [historias, setHistorias] = useState<HistoriaUsuarioPm[]>([])
  const [criterios, setCriterios] = useState<CriterioAceptacionPm[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [hipotesisDiscovery, setHipotesisDiscovery] = useState<HipotesisDiscoveryPm[]>([])
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroOwner, setFiltroOwner] = useState(searchParams.get('owner') ?? '')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todos')
  const [filtroEntrega, setFiltroEntrega] = useState(searchParams.get('entrega') ?? 'todos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [historiaActiva, setHistoriaActiva] = useState<HistoriaUsuarioPm | null>(null)
  const [criteriosEdicion, setCriteriosEdicion] = useState<CriterioAceptacionEntrada[]>([])

  const esEdicionPermitida = puedeEditar(rol)

  const formulario = useForm<HistoriaUsuarioEntrada>({
    resolver: zodResolver(historiaUsuarioSchema),
    defaultValues: {
      codigo: '',
      titulo: '',
      como_usuario: '',
      quiero: '',
      para: '',
      descripcion: null,
      prioridad: 'media',
      estado: 'pendiente',
      owner: null,
      iniciativa_id: null,
      entrega_id: null,
      hipotesis_discovery_id: null,
      notas: null
    }
  })

  const cargar = async () => {
    setCargando(true)
    setError(null)

    try {
      const [historiasData, criteriosData, iniciativasData, entregasData, hipotesisData] = await Promise.all([
        listarHistoriasUsuario(),
        listarCriteriosAceptacion(),
        listarIniciativas(),
        listarEntregas(),
        listarHipotesisDiscovery()
      ])

      setHistorias(historiasData)
      setCriterios(criteriosData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)
      setHipotesisDiscovery(hipotesisData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar las historias de usuario')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [])

  const criteriosPorHistoria = useMemo(() => {
    return criterios.reduce((mapa, criterio) => {
      const actual = mapa.get(criterio.historia_usuario_id) ?? []
      return mapa.set(criterio.historia_usuario_id, [...actual, criterio])
    }, new Map<string, CriterioAceptacionPm[]>())
  }, [criterios])

  const historiasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase()
    const owner = filtroOwner.toLowerCase()

    return historias.filter((historia) => {
      const coincideBusqueda =
        historia.codigo.toLowerCase().includes(termino) ||
        historia.titulo.toLowerCase().includes(termino) ||
        historia.como_usuario.toLowerCase().includes(termino) ||
        historia.quiero.toLowerCase().includes(termino) ||
        historia.para.toLowerCase().includes(termino)
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : historia.prioridad === filtroPrioridad
      const coincideEstado = filtroEstado === 'todos' ? true : historia.estado === filtroEstado
      const coincideOwner = owner ? (historia.owner ?? '').toLowerCase().includes(owner) : true
      const coincideIniciativa = filtroIniciativa === 'todos' ? true : historia.iniciativa_id === filtroIniciativa
      const coincideEntrega = filtroEntrega === 'todos' ? true : historia.entrega_id === filtroEntrega

      return coincideBusqueda && coincidePrioridad && coincideEstado && coincideOwner && coincideIniciativa && coincideEntrega
    })
  }, [historias, busqueda, filtroPrioridad, filtroEstado, filtroOwner, filtroIniciativa, filtroEntrega])

  const paginacion = usePaginacion({
    items: historiasFiltradas,
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
    if (filtroIniciativa !== 'todos') {
      parametros.set('iniciativa', filtroIniciativa)
    }
    if (filtroEntrega !== 'todos') {
      parametros.set('entrega', filtroEntrega)
    }
    if (paginacion.paginaActual > 1) {
      parametros.set('pagina', String(paginacion.paginaActual))
    }
    if (paginacion.tamanoPagina !== 10) {
      parametros.set('tamano', String(paginacion.tamanoPagina))
    }

    setSearchParams(parametros, { replace: true })
  }, [
    busqueda,
    filtroPrioridad,
    filtroEstado,
    filtroOwner,
    filtroIniciativa,
    filtroEntrega,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const iniciativaPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre])), [iniciativas])
  const entregaPorId = useMemo(() => new Map(entregas.map((entrega) => [entrega.id, entrega.nombre])), [entregas])
  const hipotesisPorId = useMemo(() => new Map(hipotesisDiscovery.map((hipotesis) => [hipotesis.id, hipotesis.titulo])), [hipotesisDiscovery])

  const abrirModal = (modo: ModoModal, historia?: HistoriaUsuarioPm) => {
    setModoModal(modo)
    setHistoriaActiva(historia ?? null)
    setModalAbierto(true)
    formulario.reset({
      codigo: historia?.codigo ?? '',
      titulo: historia?.titulo ?? '',
      como_usuario: historia?.como_usuario ?? '',
      quiero: historia?.quiero ?? '',
      para: historia?.para ?? '',
      descripcion: historia?.descripcion ?? null,
      prioridad: historia?.prioridad ?? 'media',
      estado: historia?.estado ?? 'pendiente',
      owner: historia?.owner ?? null,
      iniciativa_id: historia?.iniciativa_id ?? null,
      entrega_id: historia?.entrega_id ?? null,
      hipotesis_discovery_id: historia?.hipotesis_discovery_id ?? null,
      notas: historia?.notas ?? null
    })
    setCriteriosEdicion(
      (historia ? criteriosPorHistoria.get(historia.id) ?? [] : []).map((criterio) => ({
        id: criterio.id,
        historia_usuario_id: criterio.historia_usuario_id,
        descripcion: criterio.descripcion,
        orden: criterio.orden,
        obligatorio: criterio.obligatorio,
        estado_validacion: criterio.estado_validacion ?? '',
        notas: criterio.notas ?? ''
      }))
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Historias de usuario</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona historias con sus criterios de aceptación y vínculos opcionales a iniciativa, entrega e hipótesis discovery.
          </p>
        </div>
        <NavegacionRequerimientos />
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Buscar historia"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroPrioridad}
          onChange={(evento) => {
            setFiltroPrioridad(evento.target.value as 'todas' | (typeof prioridadesRegistro)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todas">Prioridad: todas</option>
          {prioridadesRegistro.map((prioridad) => (
            <option key={prioridad} value={prioridad}>
              {prioridad}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(evento) => {
            setFiltroEstado(evento.target.value as 'todos' | (typeof estadosRegistro)[number])
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Estado: todos</option>
          {estadosRegistro.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={filtroOwner}
          onChange={(evento) => {
            setFiltroOwner(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          placeholder="Filtrar por owner"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={filtroIniciativa}
          onChange={(evento) => {
            setFiltroIniciativa(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Iniciativa: todas</option>
          {iniciativas.map((iniciativa) => (
            <option key={iniciativa.id} value={iniciativa.id}>
              {iniciativa.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEntrega}
          onChange={(evento) => {
            setFiltroEntrega(evento.target.value)
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="todos">Entrega: todas</option>
          {entregas.map((entrega) => (
            <option key={entrega.id} value={entrega.id}>
              {entrega.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setBusqueda('')
            setFiltroPrioridad('todas')
            setFiltroEstado('todos')
            setFiltroOwner('')
            setFiltroIniciativa('todos')
            setFiltroEntrega('todos')
            paginacion.setPaginaActual(1)
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => {
            exportarCsv(
              'requerimientos-historias.csv',
              [
                { encabezado: 'Código', valor: (historia) => historia.codigo },
                { encabezado: 'Título', valor: (historia) => historia.titulo },
                { encabezado: 'Como usuario', valor: (historia) => historia.como_usuario },
                { encabezado: 'Quiero', valor: (historia) => historia.quiero },
                { encabezado: 'Para', valor: (historia) => historia.para },
                { encabezado: 'Prioridad', valor: (historia) => historia.prioridad },
                { encabezado: 'Estado', valor: (historia) => formatearEstadoLegible(historia.estado) },
                { encabezado: 'Owner', valor: (historia) => historia.owner ?? '' },
                { encabezado: 'Iniciativa', valor: (historia) => iniciativaPorId.get(historia.iniciativa_id ?? '') ?? '' },
                { encabezado: 'Entrega', valor: (historia) => entregaPorId.get(historia.entrega_id ?? '') ?? '' },
                { encabezado: 'Hipótesis discovery', valor: (historia) => hipotesisPorId.get(historia.hipotesis_discovery_id ?? '') ?? '' },
                { encabezado: 'Criterios', valor: (historia) => (criteriosPorHistoria.get(historia.id) ?? []).map((criterio) => criterio.descripcion).join(' | ') }
              ],
              historiasFiltradas
            )
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          disabled={!esEdicionPermitida}
          onClick={() => abrirModal('crear')}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
        >
          Crear historia
        </button>
      </div>

      <EstadoVista cargando={cargando} error={error} vacio={historiasFiltradas.length === 0} mensajeVacio="No hay historias de usuario para los filtros seleccionados.">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Historia</th>
                <th className="px-3 py-2">Vínculos</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((historia) => (
                <tr key={historia.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{historia.codigo} · {historia.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Como {historia.como_usuario}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(criteriosPorHistoria.get(historia.id) ?? []).length} criterios de aceptación
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{iniciativaPorId.get(historia.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{entregaPorId.get(historia.entrega_id ?? '') ?? 'Sin entrega'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{hipotesisPorId.get(historia.hipotesis_discovery_id ?? '') ?? 'Sin hipótesis discovery'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{historia.estado}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{historia.prioridad} · {historia.owner ?? 'Sin owner'}</p>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => abrirModal('ver', historia)} className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Ver</button>
                      <button type="button" disabled={!esEdicionPermitida} onClick={() => abrirModal('editar', historia)} className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700">Editar</button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta historia de usuario?')) {
                            void eliminarHistoriaUsuario(historia.id).then(cargar).catch((errorInterno) => {
                              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la historia')
                            })
                          }
                        }}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginacionTabla
          paginaActual={paginacion.paginaActual}
          totalPaginas={paginacion.totalPaginas}
          totalItems={paginacion.totalItems}
          desde={paginacion.desde}
          hasta={paginacion.hasta}
          tamanoPagina={paginacion.tamanoPagina}
          alCambiarPagina={paginacion.setPaginaActual}
          alCambiarTamanoPagina={paginacion.setTamanoPagina}
        />
      </EstadoVista>

      <ModalPortal
        abierto={modalAbierto}
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} historia de usuario`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={formulario.handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              if (modoModal === 'crear') {
                await crearHistoriaUsuario(valores, criteriosEdicion)
              }

              if (modoModal === 'editar' && historiaActiva) {
                await editarHistoriaUsuario(historiaActiva.id, valores, criteriosEdicion)
              }

              setModalAbierto(false)
              await cargar()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la historia')
            }
          })}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Código</label>
              <input {...formulario.register('codigo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Título</label>
              <input {...formulario.register('titulo')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Como usuario</label>
              <input {...formulario.register('como_usuario')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Quiero</label>
              <input {...formulario.register('quiero')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="text-sm font-medium">Para</label>
              <input {...formulario.register('para')} readOnly={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea {...formulario.register('descripcion')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
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
              <label className="text-sm font-medium">Hipótesis discovery</label>
              <select {...formulario.register('hipotesis_discovery_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin hipótesis discovery</option>
                {hipotesisDiscovery.map((hipotesis) => <option key={hipotesis.id} value={hipotesis.id}>{hipotesis.titulo}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Iniciativa</label>
              <select {...formulario.register('iniciativa_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin iniciativa</option>
                {iniciativas.map((iniciativa) => <option key={iniciativa.id} value={iniciativa.id}>{iniciativa.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Entrega</label>
              <select {...formulario.register('entrega_id')} disabled={modoModal === 'ver'} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option value="">Sin entrega</option>
                {entregas.map((entrega) => <option key={entrega.id} value={entrega.id}>{entrega.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea {...formulario.register('notas')} readOnly={modoModal === 'ver'} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>

          <GestionCriteriosAceptacion criterios={criteriosEdicion} soloLectura={modoModal === 'ver'} onChange={setCriteriosEdicion} />

          {modoModal !== 'ver' ? (
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900">
              Guardar
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}