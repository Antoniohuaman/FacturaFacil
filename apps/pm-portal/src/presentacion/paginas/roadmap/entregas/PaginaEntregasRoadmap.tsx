import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { entregaSchema, type EntregaEntrada } from '@/compartido/validacion/esquemas'
import {
  construirLimitesFechasJerarquicas,
  validarCampoFechaEnJerarquia,
  validarJerarquiaFechas
} from '@/compartido/validacion/roadmapJerarquiaFechas'
import {
  estadosRegistro,
  prioridadesRegistro,
  type CatalogoVentanaPm,
  type Entrega,
  type Iniciativa,
  type Objetivo,
  type ReleasePm
} from '@/dominio/modelos'
import { crearEntrega, editarEntrega, eliminarEntrega, listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { listarHistoriasUsuario, listarRequerimientosNoFuncionales } from '@/aplicacion/casos-uso/requerimientos'
import { listarReleases } from '@/aplicacion/casos-uso/lanzamientos'
import {
  listarBloqueosPm,
  listarBugsPm,
  listarDeudaTecnicaPm,
  listarLeccionesAprendidasPm,
  listarMejorasPm
} from '@/aplicacion/casos-uso/operacion'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '../../../../compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible, formatearFechaCorta, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import { formatearEstadoRelease } from '@/dominio/modelos'
import { NavegacionRoadmap } from '@/presentacion/paginas/roadmap/NavegacionRoadmap'

type ModoModal = 'crear' | 'ver' | 'editar'

export function PaginaEntregasRoadmap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [historiasPorEntrega, setHistoriasPorEntrega] = useState<Map<string, number>>(new Map())
  const [requerimientosNoFuncionalesPorEntrega, setRequerimientosNoFuncionalesPorEntrega] = useState<Map<string, number>>(new Map())
  const [releasesPorEntrega, setReleasesPorEntrega] = useState<Map<string, number>>(new Map())
  const [operacionPorEntrega, setOperacionPorEntrega] = useState<Map<string, number>>(new Map())
  const [bugsAbiertosPorEntrega, setBugsAbiertosPorEntrega] = useState<Map<string, number>>(new Map())
  const [bloqueosActivosPorEntrega, setBloqueosActivosPorEntrega] = useState<Map<string, number>>(new Map())
  const [estadoReleaseRecientePorEntrega, setEstadoReleaseRecientePorEntrega] = useState<
    Map<string, { referencia: string; estado: ReleasePm['estado'] }>
  >(new Map())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState(searchParams.get('q') ?? '')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | (typeof estadosRegistro)[number]>(
    (searchParams.get('estado') as 'todos' | (typeof estadosRegistro)[number]) ?? 'todos'
  )
  const [filtroPrioridad, setFiltroPrioridad] = useState<'todas' | (typeof prioridadesRegistro)[number]>(
    (searchParams.get('prioridad') as 'todas' | (typeof prioridadesRegistro)[number]) ?? 'todas'
  )
  const [filtroObjetivo, setFiltroObjetivo] = useState(searchParams.get('objetivo') ?? 'todos')
  const [filtroIniciativa, setFiltroIniciativa] = useState(searchParams.get('iniciativa') ?? 'todas')
  const [filtroVentanaPlan, setFiltroVentanaPlan] = useState(searchParams.get('ventana_plan') ?? 'todas')
  const [filtroVentanaReal, setFiltroVentanaReal] = useState(searchParams.get('ventana_real') ?? 'todas')
  const [filtroFecha, setFiltroFecha] = useState<'todas' | 'con' | 'sin'>(
    (searchParams.get('fecha') as 'todas' | 'con' | 'sin') ?? 'todas'
  )
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [entregaActiva, setEntregaActiva] = useState<Entrega | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError: setErrorFormulario,
    trigger,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<EntregaEntrada>({
    resolver: zodResolver(entregaSchema),
    defaultValues: {
      iniciativa_id: null,
      ventana_planificada_id: null,
      ventana_real_id: null,
      nombre: '',
      descripcion: '',
      fecha_inicio: null,
      fecha_fin: null,
      fecha_objetivo: null,
      fecha_completado: null,
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)
  const iniciativaSeleccionadaId = watch('iniciativa_id')
  const fechaInicioSeleccionada = watch('fecha_inicio')
  const fechaFinSeleccionada = watch('fecha_fin')

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [
        listaEntregas,
        listaIniciativas,
        listaObjetivos,
        listaVentanas,
        historiasData,
        requerimientosNoFuncionalesData,
        releasesData,
        bugsData,
        mejorasData,
        deudasData,
        bloqueosData,
        leccionesData
      ] = await Promise.all([
        listarEntregas(),
        listarIniciativas(),
        listarObjetivos(),
        listarVentanasPm(),
        listarHistoriasUsuario(),
        listarRequerimientosNoFuncionales(),
        listarReleases(),
        listarBugsPm(),
        listarMejorasPm(),
        listarDeudaTecnicaPm(),
        listarBloqueosPm(),
        listarLeccionesAprendidasPm()
      ])
      setEntregas(listaEntregas)
      setIniciativas(listaIniciativas)
      setObjetivos(listaObjetivos)
      setVentanas(listaVentanas)
      setHistoriasPorEntrega(
        historiasData.reduce((mapa, historia) => {
          if (!historia.entrega_id) {
            return mapa
          }

          return mapa.set(historia.entrega_id, (mapa.get(historia.entrega_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setRequerimientosNoFuncionalesPorEntrega(
        requerimientosNoFuncionalesData.reduce((mapa, requerimiento) => {
          if (!requerimiento.entrega_id) {
            return mapa
          }

          return mapa.set(requerimiento.entrega_id, (mapa.get(requerimiento.entrega_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setReleasesPorEntrega(
        releasesData.reduce((mapa, release) => {
          if (!release.entrega_id) {
            return mapa
          }

          return mapa.set(release.entrega_id, (mapa.get(release.entrega_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setEstadoReleaseRecientePorEntrega(
        releasesData.reduce((mapa, release) => {
          if (!release.entrega_id) {
            return mapa
          }

          const actual = mapa.get(release.entrega_id)

          if (!actual || `${release.fecha_programada}|${release.updated_at}` > actual.referencia) {
            mapa.set(release.entrega_id, {
              referencia: `${release.fecha_programada}|${release.updated_at}`,
              estado: release.estado
            })
          }

          return mapa
        }, new Map<string, { referencia: string; estado: ReleasePm['estado'] }>())
      )
      const operacion = new Map<string, number>()
      const bugsAbiertos = new Map<string, number>()
      const bloqueosActivos = new Map<string, number>()

      for (const bug of bugsData) {
        if (!bug.entrega_id) {
          continue
        }

        operacion.set(bug.entrega_id, (operacion.get(bug.entrega_id) ?? 0) + 1)
        if (!['resuelto', 'cerrado'].includes(bug.estado)) {
          bugsAbiertos.set(bug.entrega_id, (bugsAbiertos.get(bug.entrega_id) ?? 0) + 1)
        }
      }

      for (const mejora of mejorasData) {
        if (!mejora.entrega_id) {
          continue
        }

        operacion.set(mejora.entrega_id, (operacion.get(mejora.entrega_id) ?? 0) + 1)
      }

      for (const deuda of deudasData) {
        if (!deuda.entrega_id) {
          continue
        }

        operacion.set(deuda.entrega_id, (operacion.get(deuda.entrega_id) ?? 0) + 1)
      }

      for (const bloqueo of bloqueosData) {
        if (!bloqueo.entrega_id) {
          continue
        }

        operacion.set(bloqueo.entrega_id, (operacion.get(bloqueo.entrega_id) ?? 0) + 1)
        if (bloqueo.estado !== 'resuelto') {
          bloqueosActivos.set(bloqueo.entrega_id, (bloqueosActivos.get(bloqueo.entrega_id) ?? 0) + 1)
        }
      }

      for (const leccion of leccionesData) {
        if (!leccion.entrega_id) {
          continue
        }

        operacion.set(leccion.entrega_id, (operacion.get(leccion.entrega_id) ?? 0) + 1)
      }

      setOperacionPorEntrega(operacion)
      setBugsAbiertosPorEntrega(bugsAbiertos)
      setBloqueosActivosPorEntrega(bloqueosActivos)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar entregas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInformacion()
  }, [])

  const entregasFiltradas = useMemo(() => {
    const objetivoPorIniciativa = new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.objetivo_id]))

    return entregas.filter((entrega) => {
      const fechaObjetivo = entrega.fecha_objetivo ?? ''
      const coincideBusqueda =
        entrega.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        entrega.descripcion.toLowerCase().includes(busqueda.toLowerCase())

      const coincideEstado = filtroEstado === 'todos' ? true : entrega.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : entrega.prioridad === filtroPrioridad
      const coincideObjetivo =
        filtroObjetivo === 'todos'
          ? true
          : objetivoPorIniciativa.get(entrega.iniciativa_id ?? '') === filtroObjetivo
      const coincideIniciativa =
        filtroIniciativa === 'todas' ? true : entrega.iniciativa_id === filtroIniciativa
      const coincideVentanaPlan =
        filtroVentanaPlan === 'todas'
          ? true
          : filtroVentanaPlan === 'sin_asignar'
            ? !entrega.ventana_planificada_id
            : entrega.ventana_planificada_id === filtroVentanaPlan
      const coincideVentanaReal =
        filtroVentanaReal === 'todas'
          ? true
          : filtroVentanaReal === 'sin_asignar'
            ? !entrega.ventana_real_id
            : entrega.ventana_real_id === filtroVentanaReal
      const coincideFecha =
        filtroFecha === 'todas'
          ? true
          : filtroFecha === 'con'
            ? Boolean(entrega.fecha_objetivo)
            : !entrega.fecha_objetivo
      const coincideDesde = fechaDesde
        ? Boolean(fechaObjetivo) && fechaObjetivo >= fechaDesde
        : true
      const coincideHasta = fechaHasta
        ? Boolean(fechaObjetivo) && fechaObjetivo <= fechaHasta
        : true

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincidePrioridad &&
        coincideObjetivo &&
        coincideIniciativa &&
        coincideVentanaPlan &&
        coincideVentanaReal &&
        coincideFecha &&
        coincideDesde &&
        coincideHasta
      )
    })
  }, [
    entregas,
    iniciativas,
    busqueda,
    filtroEstado,
    filtroPrioridad,
    filtroObjetivo,
    filtroIniciativa,
    filtroVentanaPlan,
    filtroVentanaReal,
    filtroFecha,
    fechaDesde,
    fechaHasta
  ])

  const iniciativasDisponibles = useMemo(() => {
    if (filtroObjetivo === 'todos') {
      return iniciativas
    }

    return iniciativas.filter((iniciativa) => iniciativa.objetivo_id === filtroObjetivo)
  }, [iniciativas, filtroObjetivo])

  const paginacion = usePaginacion({
    items: entregasFiltradas,
    paginaInicial: Number.isFinite(paginaInicial) && paginaInicial > 0 ? paginaInicial : 1,
    tamanoInicial: [10, 25, 50].includes(tamanoInicial) ? tamanoInicial : 10
  })

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (busqueda) {
      parametros.set('q', busqueda)
    }
    if (filtroEstado !== 'todos') {
      parametros.set('estado', filtroEstado)
    }
    if (filtroPrioridad !== 'todas') {
      parametros.set('prioridad', filtroPrioridad)
    }
    if (filtroObjetivo !== 'todos') {
      parametros.set('objetivo', filtroObjetivo)
    }
    if (filtroIniciativa !== 'todas') {
      parametros.set('iniciativa', filtroIniciativa)
    }
    if (filtroVentanaPlan !== 'todas') {
      parametros.set('ventana_plan', filtroVentanaPlan)
    }
    if (filtroVentanaReal !== 'todas') {
      parametros.set('ventana_real', filtroVentanaReal)
    }
    if (filtroFecha !== 'todas') {
      parametros.set('fecha', filtroFecha)
    }
    if (fechaDesde) {
      parametros.set('desde', fechaDesde)
    }
    if (fechaHasta) {
      parametros.set('hasta', fechaHasta)
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
    filtroEstado,
    filtroPrioridad,
    filtroObjetivo,
    filtroIniciativa,
    filtroVentanaPlan,
    filtroVentanaReal,
    filtroFecha,
    fechaDesde,
    fechaHasta,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const iniciativaPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa.nombre]))
  }, [iniciativas])

  const iniciativaEntidadPorId = useMemo(() => {
    return new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa]))
  }, [iniciativas])

  const iniciativaSeleccionada = iniciativaSeleccionadaId ? iniciativaEntidadPorId.get(iniciativaSeleccionadaId) ?? null : null

  const limitesFechasIniciativa = useMemo(() => {
    return construirLimitesFechasJerarquicas(
      {
        fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
        fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
      },
      fechaInicioSeleccionada
    )
  }, [iniciativaSeleccionada, fechaInicioSeleccionada])

  useEffect(() => {
    if (!modalAbierto || modoModal === 'ver') {
      return
    }

    void trigger(['fecha_inicio', 'fecha_fin'])
  }, [modalAbierto, modoModal, iniciativaSeleccionadaId, fechaInicioSeleccionada, fechaFinSeleccionada, trigger])

  const ventanaPorId = useMemo(() => {
    return new Map(ventanas.map((ventana) => [ventana.id, ventana.etiqueta_visible]))
  }, [ventanas])

  const abrirModal = (modo: ModoModal, entrega?: Entrega) => {
    setModoModal(modo)
    setEntregaActiva(entrega ?? null)
    setModalAbierto(true)
    reset({
      iniciativa_id: entrega?.iniciativa_id ?? null,
      ventana_planificada_id: entrega?.ventana_planificada_id ?? null,
      ventana_real_id: entrega?.ventana_real_id ?? null,
      nombre: entrega?.nombre ?? '',
      descripcion: entrega?.descripcion ?? '',
      fecha_inicio: entrega?.fecha_inicio ?? null,
      fecha_fin: entrega?.fecha_fin ?? null,
      fecha_objetivo: entrega?.fecha_objetivo ?? null,
      fecha_completado: entrega?.fecha_completado ?? null,
      estado: entrega?.estado ?? 'pendiente',
      prioridad: entrega?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Roadmap de entregas</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Administra entregas, fechas objetivo y su estado operativo.
          </p>
        </div>
        <NavegacionRoadmap />
      </header>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto_auto_auto]">
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar entrega"
            aria-label="Buscar entregas"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <select
            value={filtroObjetivo}
            onChange={(evento) => {
              setFiltroObjetivo(evento.target.value)
              setFiltroIniciativa('todas')
              paginacion.setPaginaActual(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            aria-label="Filtrar por objetivo"
          >
            <option value="todos">Objetivo: todos</option>
            {objetivos.map((objetivo) => (
              <option key={objetivo.id} value={objetivo.id}>
                {objetivo.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtroIniciativa}
            onChange={(evento) => {
              setFiltroIniciativa(evento.target.value)
              paginacion.setPaginaActual(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            aria-label="Filtrar por iniciativa"
          >
            <option value="todas">Iniciativa: todas</option>
            {iniciativasDisponibles.map((iniciativa) => (
              <option key={iniciativa.id} value={iniciativa.id}>
                {iniciativa.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setBusqueda('')
              setFiltroEstado('todos')
              setFiltroPrioridad('todas')
              setFiltroObjetivo('todos')
              setFiltroIniciativa('todas')
              setFiltroVentanaPlan('todas')
              setFiltroVentanaReal('todas')
              setFiltroFecha('todas')
              setFechaDesde('')
              setFechaHasta('')
              paginacion.setPaginaActual(1)
            }}
            aria-label="Limpiar filtros de entregas"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => {
              exportarCsv('roadmap-entregas.csv', [
                { encabezado: 'Entrega', valor: (entrega) => entrega.nombre },
                { encabezado: 'Descripción', valor: (entrega) => entrega.descripcion },
                { encabezado: 'Iniciativa', valor: (entrega) => iniciativaPorId.get(entrega.iniciativa_id ?? '') ?? 'Sin iniciativa' },
                { encabezado: 'Ventana planificada', valor: (entrega) => ventanaPorId.get(entrega.ventana_planificada_id ?? '') ?? 'Sin asignar' },
                { encabezado: 'Ventana real', valor: (entrega) => ventanaPorId.get(entrega.ventana_real_id ?? '') ?? 'Sin asignar' },
                { encabezado: 'Fecha inicio', valor: (entrega) => normalizarFechaPortal(entrega.fecha_inicio ?? null) },
                { encabezado: 'Fecha fin', valor: (entrega) => normalizarFechaPortal(entrega.fecha_fin ?? null) },
                { encabezado: 'Fecha objetivo', valor: (entrega) => normalizarFechaPortal(entrega.fecha_objetivo) },
                { encabezado: 'Fecha completado', valor: (entrega) => normalizarFechaPortal(entrega.fecha_completado) },
                { encabezado: 'Estado', valor: (entrega) => formatearEstadoLegible(entrega.estado) },
                { encabezado: 'Prioridad', valor: (entrega) => entrega.prioridad },
                { encabezado: 'Historias vinculadas', valor: (entrega) => historiasPorEntrega.get(entrega.id) ?? 0 },
                { encabezado: 'RNF vinculados', valor: (entrega) => requerimientosNoFuncionalesPorEntrega.get(entrega.id) ?? 0 },
                { encabezado: 'Releases vinculados', valor: (entrega) => releasesPorEntrega.get(entrega.id) ?? 0 },
                { encabezado: 'Operación vinculada', valor: (entrega) => operacionPorEntrega.get(entrega.id) ?? 0 },
                { encabezado: 'Bugs abiertos', valor: (entrega) => bugsAbiertosPorEntrega.get(entrega.id) ?? 0 },
                { encabezado: 'Bloqueos activos', valor: (entrega) => bloqueosActivosPorEntrega.get(entrega.id) ?? 0 },
                {
                  encabezado: 'Estado release más reciente',
                  valor: (entrega) => {
                    const registro = estadoReleaseRecientePorEntrega.get(entrega.id)
                    return registro ? formatearEstadoRelease(registro.estado) : ''
                  }
                }
              ], entregasFiltradas)
            }}
            aria-label="Exportar entregas a CSV"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            disabled={!esEdicionPermitida}
            onClick={() => abrirModal('crear')}
            aria-label="Crear entrega"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            Crear entrega
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroEstado('todos')}
              aria-label="Filtrar entregas por todos los estados"
              className={`rounded-full px-3 py-1 text-xs ${
                filtroEstado === 'todos'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Todos
            </button>
            {estadosRegistro.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(estado)}
                aria-label={`Filtrar entregas por estado ${estado}`}
                className={`rounded-full px-3 py-1 text-xs ${
                  filtroEstado === estado
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {estado}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prioridad</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroPrioridad('todas')}
              aria-label="Filtrar entregas por todas las prioridades"
              className={`rounded-full px-3 py-1 text-xs ${
                filtroPrioridad === 'todas'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              Todas
            </button>
            {prioridadesRegistro.map((prioridad) => (
              <button
                key={prioridad}
                type="button"
                onClick={() => setFiltroPrioridad(prioridad)}
                aria-label={`Filtrar entregas por prioridad ${prioridad}`}
                className={`rounded-full px-3 py-1 text-xs ${
                  filtroPrioridad === prioridad
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {prioridad}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ventana planificada</label>
            <select
              value={filtroVentanaPlan}
              onChange={(evento) => {
                setFiltroVentanaPlan(evento.target.value)
                paginacion.setPaginaActual(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              aria-label="Filtrar por ventana planificada"
            >
              <option value="todas">Todas</option>
              <option value="sin_asignar">Sin asignar</option>
              {ventanas.map((ventana) => (
                <option key={ventana.id} value={ventana.id}>
                  {ventana.etiqueta_visible}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Ventana real</label>
            <select
              value={filtroVentanaReal}
              onChange={(evento) => {
                setFiltroVentanaReal(evento.target.value)
                paginacion.setPaginaActual(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              aria-label="Filtrar por ventana real"
            >
              <option value="todas">Todas</option>
              <option value="sin_asignar">Sin asignar</option>
              {ventanas.map((ventana) => (
                <option key={ventana.id} value={ventana.id}>
                  {ventana.etiqueta_visible}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Disponibilidad de fecha</label>
            <select
              value={filtroFecha}
              onChange={(evento) => {
                setFiltroFecha(evento.target.value as 'todas' | 'con' | 'sin')
                paginacion.setPaginaActual(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              aria-label="Filtrar por disponibilidad de fecha"
            >
              <option value="todas">Fecha objetivo: todas</option>
              <option value="con">Con fecha</option>
              <option value="sin">Sin fecha</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(evento) => {
                setFechaDesde(evento.target.value)
                paginacion.setPaginaActual(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              aria-label="Fecha objetivo desde"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(evento) => {
                setFechaHasta(evento.target.value)
                paginacion.setPaginaActual(1)
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              aria-label="Fecha objetivo hasta"
            />
          </div>
        </div>
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={entregasFiltradas.length === 0}
        mensajeVacio="No hay entregas para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2">Iniciativa</th>
                <th className="px-3 py-2">Ventanas</th>
                <th className="px-3 py-2">Fecha objetivo</th>
                <th className="px-3 py-2">Fecha completado</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((entrega) => (
                <tr key={entrega.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{entrega.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{entrega.descripcion}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{iniciativaPorId.get(entrega.iniciativa_id ?? '') ?? 'Sin iniciativa'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {historiasPorEntrega.get(entrega.id) ?? 0} historias · {requerimientosNoFuncionalesPorEntrega.get(entrega.id) ?? 0} RNF
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {releasesPorEntrega.get(entrega.id) ?? 0} releases
                      {estadoReleaseRecientePorEntrega.get(entrega.id)
                        ? ` · ${formatearEstadoRelease(estadoReleaseRecientePorEntrega.get(entrega.id)?.estado ?? 'borrador')}`
                        : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {operacionPorEntrega.get(entrega.id) ?? 0} registros operación · {bugsAbiertosPorEntrega.get(entrega.id) ?? 0} bugs abiertos · {bloqueosActivosPorEntrega.get(entrega.id) ?? 0} bloqueos activos
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-xs">Plan: {ventanaPorId.get(entrega.ventana_planificada_id ?? '') ?? 'Sin asignar'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Real: {ventanaPorId.get(entrega.ventana_real_id ?? '') ?? 'Sin asignar'}
                    </p>
                  </td>
                  <td className="px-3 py-2">{entrega.fecha_objetivo ? formatearFechaCorta(entrega.fecha_objetivo) : 'Sin fecha'}</td>
                  <td className="px-3 py-2">{entrega.fecha_completado ? formatearFechaCorta(entrega.fecha_completado) : 'Sin fecha'}</td>
                  <td className="px-3 py-2">{entrega.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', entrega)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', entrega)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          if (window.confirm('¿Eliminar esta entrega?')) {
                            void eliminarEntrega(entrega.id).then(cargarInformacion).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error ? errorInterno.message : 'No se pudo eliminar la entrega'
                              )
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} entrega`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              const erroresJerarquicos = validarJerarquiaFechas(
                {
                  fecha_inicio: valores.fecha_inicio,
                  fecha_fin: valores.fecha_fin
                },
                {
                  fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
                  fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
                },
                'iniciativa'
              )

              if (erroresJerarquicos.length > 0) {
                for (const errorJerarquico of erroresJerarquicos) {
                  setErrorFormulario(errorJerarquico.campo, { type: 'validate', message: errorJerarquico.mensaje })
                }

                return
              }

              const carga = {
                ...valores,
                iniciativa_id: valores.iniciativa_id || null,
                ventana_planificada_id: valores.ventana_planificada_id || null,
                ventana_real_id: valores.ventana_real_id || null,
                fecha_inicio: valores.fecha_inicio || null,
                fecha_fin: valores.fecha_fin || null,
                fecha_objetivo: valores.fecha_objetivo || null
              }

              if (modoModal === 'crear') {
                await crearEntrega(carga)
              }

              if (modoModal === 'editar' && entregaActiva) {
                await editarEntrega(entregaActiva.id, carga)
              }

              setModalAbierto(false)
              await cargarInformacion()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la entrega')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Iniciativa</label>
            <select
              {...register('iniciativa_id')}
              disabled={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Sin iniciativa</option>
              {iniciativas.map((iniciativa) => (
                <option key={iniciativa.id} value={iniciativa.id}>
                  {iniciativa.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Ventana planificada</label>
              <select
                {...register('ventana_planificada_id')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin asignar</option>
                {ventanas.map((ventana) => (
                  <option key={ventana.id} value={ventana.id}>
                    {ventana.etiqueta_visible}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Ventana real</label>
              <select
                {...register('ventana_real_id')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin asignar</option>
                {ventanas.map((ventana) => (
                  <option key={ventana.id} value={ventana.id}>
                    {ventana.etiqueta_visible}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              {...register('nombre')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.nombre ? <p className="text-xs text-red-500">{errors.nombre.message}</p> : null}
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              {...register('descripcion')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.descripcion ? <p className="text-xs text-red-500">{errors.descripcion.message}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Fecha inicio</label>
              <input
                type="date"
                min={limitesFechasIniciativa.minFechaInicio}
                max={limitesFechasIniciativa.maxFechaInicio}
                {...register('fecha_inicio', {
                  validate: (valor) =>
                    validarCampoFechaEnJerarquia(
                      'fecha_inicio',
                      valor,
                      {
                        fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
                        fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
                      },
                      'iniciativa'
                    )
                })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              {errors.fecha_inicio ? <p className="text-xs text-red-500">{errors.fecha_inicio.message}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium">Fecha fin</label>
              <input
                type="date"
                min={limitesFechasIniciativa.minFechaFin}
                max={limitesFechasIniciativa.maxFechaFin}
                {...register('fecha_fin', {
                  validate: (valor) =>
                    validarCampoFechaEnJerarquia(
                      'fecha_fin',
                      valor,
                      {
                        fecha_inicio: iniciativaSeleccionada?.fecha_inicio ?? null,
                        fecha_fin: iniciativaSeleccionada?.fecha_fin ?? null
                      },
                      'iniciativa'
                    )
                })}
                readOnly={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              {errors.fecha_fin ? <p className="text-xs text-red-500">{errors.fecha_fin.message}</p> : null}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Fecha objetivo</label>
            <input
              type="date"
              {...register('fecha_objetivo')}
              readOnly={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            {errors.fecha_objetivo ? <p className="text-xs text-red-500">{errors.fecha_objetivo.message}</p> : null}
          </div>

          {entregaActiva?.fecha_completado ? (
            <div>
              <label className="text-sm font-medium">Fecha completado</label>
              <input
                value={entregaActiva.fecha_completado}
                readOnly
                className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...register('estado')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {estadosRegistro.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <select
                {...register('prioridad')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {prioridadesRegistro.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {prioridad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {modoModal !== 'ver' ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-70 dark:bg-slate-200 dark:text-slate-900"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          ) : null}
        </form>
      </ModalPortal>
    </section>
  )
}
