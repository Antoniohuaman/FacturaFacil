import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type ConfiguracionRice,
  estadosRegistro,
  prioridadesRegistro,
  type Iniciativa,
  type Objetivo,
  type RelHipotesisDiscoveryIniciativaPm,
  type RelIniciativaHipotesisPm,
  type RelIniciativaKrPm
} from '@/dominio/modelos'
import {
  listarIniciativas
} from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { cargarConfiguracionRice, listarEtapasPm, listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { listarRelIniciativaHipotesis, listarRelIniciativaKr } from '@/aplicacion/casos-uso/estrategia'
import { listarRelHipotesisDiscoveryIniciativa } from '@/aplicacion/casos-uso/discovery'
import {
  listarCasosUso,
  listarHistoriasUsuario,
  listarRequerimientosNoFuncionales
} from '@/aplicacion/casos-uso/requerimientos'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '../../../../compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible, formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import { NavegacionRoadmap } from '@/presentacion/paginas/roadmap/NavegacionRoadmap'
import { eliminarIniciativaRoadmapConConfirmacion } from '@/presentacion/paginas/roadmap/componentes/accionesContextualesRoadmap'
import { GestorModalIniciativaRoadmap } from '@/presentacion/paginas/roadmap/componentes/GestorModalIniciativaRoadmap'
import type { ModoModalRoadmap } from '@/presentacion/paginas/roadmap/componentes/tiposModalRoadmap'

export function PaginaIniciativasRoadmap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const paginaInicial = Number(searchParams.get('pagina') ?? '1')
  const tamanoInicial = Number(searchParams.get('tamano') ?? '10')
  const { rol } = useSesionPortalPM()
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [etapas, setEtapas] = useState<CatalogoEtapaPm[]>([])
  const [relacionesKr, setRelacionesKr] = useState<RelIniciativaKrPm[]>([])
  const [relacionesHipotesis, setRelacionesHipotesis] = useState<RelIniciativaHipotesisPm[]>([])
  const [relacionesHipotesisDiscovery, setRelacionesHipotesisDiscovery] = useState<RelHipotesisDiscoveryIniciativaPm[]>([])
  const [historiasPorIniciativaMapa, setHistoriasPorIniciativaMapa] = useState<Map<string, number>>(new Map())
  const [casosUsoPorIniciativaMapa, setCasosUsoPorIniciativaMapa] = useState<Map<string, number>>(new Map())
  const [requerimientosNoFuncionalesPorIniciativaMapa, setRequerimientosNoFuncionalesPorIniciativaMapa] = useState<Map<string, number>>(new Map())
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
  const [filtroVentana, setFiltroVentana] = useState(searchParams.get('ventana') ?? 'todas')
  const [filtroEtapa, setFiltroEtapa] = useState(searchParams.get('etapa') ?? 'todas')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modoModal, setModoModal] = useState<ModoModalRoadmap>('crear')
  const [iniciativaActiva, setIniciativaActiva] = useState<Iniciativa | null>(null)
  const [configuracionRice, setConfiguracionRice] = useState<ConfiguracionRice | null>(null)

  const esEdicionPermitida = puedeEditar(rol)

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [
        listaIniciativas,
        listaObjetivos,
        listaVentanas,
        listaEtapas,
        relKrData,
        relHipotesisData,
        relHipotesisDiscoveryData,
        historiasData,
        casosUsoData,
        requerimientosNoFuncionalesData
      ] = await Promise.all([
        listarIniciativas(),
        listarObjetivos(),
        listarVentanasPm(),
        listarEtapasPm(),
        listarRelIniciativaKr(),
        listarRelIniciativaHipotesis(),
        listarRelHipotesisDiscoveryIniciativa(),
        listarHistoriasUsuario(),
        listarCasosUso(),
        listarRequerimientosNoFuncionales()
      ])
      setIniciativas(listaIniciativas)
      setObjetivos(listaObjetivos)
      setVentanas(listaVentanas)
      setEtapas(listaEtapas)
      setRelacionesKr(relKrData)
      setRelacionesHipotesis(relHipotesisData)
      setRelacionesHipotesisDiscovery(relHipotesisDiscoveryData)
      setHistoriasPorIniciativaMapa(
        historiasData.reduce((mapa, historia) => {
          if (!historia.iniciativa_id) {
            return mapa
          }

          return mapa.set(historia.iniciativa_id, (mapa.get(historia.iniciativa_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setCasosUsoPorIniciativaMapa(
        casosUsoData.reduce((mapa, casoUso) => {
          if (!casoUso.iniciativa_id) {
            return mapa
          }

          return mapa.set(casoUso.iniciativa_id, (mapa.get(casoUso.iniciativa_id) ?? 0) + 1)
        }, new Map<string, number>())
      )
      setRequerimientosNoFuncionalesPorIniciativaMapa(
        requerimientosNoFuncionalesData.reduce((mapa, requerimiento) => {
          if (!requerimiento.iniciativa_id) {
            return mapa
          }

          return mapa.set(requerimiento.iniciativa_id, (mapa.get(requerimiento.iniciativa_id) ?? 0) + 1)
        }, new Map<string, number>())
      )

      const configuracion = await cargarConfiguracionRice()
      setConfiguracionRice(configuracion)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar iniciativas')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarInformacion()
  }, [])

  const iniciativasFiltradas = useMemo(() => {
    return iniciativas.filter((iniciativa) => {
      const coincideBusqueda =
        iniciativa.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        iniciativa.descripcion.toLowerCase().includes(busqueda.toLowerCase())

      const coincideEstado = filtroEstado === 'todos' ? true : iniciativa.estado === filtroEstado
      const coincidePrioridad = filtroPrioridad === 'todas' ? true : iniciativa.prioridad === filtroPrioridad
      const coincideObjetivo = filtroObjetivo === 'todos' ? true : iniciativa.objetivo_id === filtroObjetivo
      const coincideVentana =
        filtroVentana === 'todas'
          ? true
          : filtroVentana === 'sin_asignar'
            ? !iniciativa.ventana_planificada_id
            : iniciativa.ventana_planificada_id === filtroVentana
      const coincideEtapa =
        filtroEtapa === 'todas'
          ? true
          : filtroEtapa === 'sin_asignar'
            ? !iniciativa.etapa_id
            : iniciativa.etapa_id === filtroEtapa

      return coincideBusqueda && coincideEstado && coincidePrioridad && coincideObjetivo && coincideVentana && coincideEtapa
    })
  }, [iniciativas, busqueda, filtroEstado, filtroPrioridad, filtroObjetivo, filtroVentana, filtroEtapa])

  const paginacion = usePaginacion({
    items: iniciativasFiltradas,
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
    if (filtroVentana !== 'todas') {
      parametros.set('ventana', filtroVentana)
    }
    if (filtroEtapa !== 'todas') {
      parametros.set('etapa', filtroEtapa)
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
    filtroVentana,
    filtroEtapa,
    paginacion.paginaActual,
    paginacion.tamanoPagina,
    setSearchParams
  ])

  const objetivoPorId = useMemo(() => {
    return new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.nombre]))
  }, [objetivos])

  const ventanaPorId = useMemo(() => {
    return new Map(ventanas.map((ventana) => [ventana.id, ventana.etiqueta_visible]))
  }, [ventanas])

  const etapaPorId = useMemo(() => {
    return new Map(etapas.map((etapa) => [etapa.id, etapa.etiqueta_visible]))
  }, [etapas])

  const krPorIniciativa = useMemo(() => {
    return relacionesKr.reduce(
      (mapa, relacion) => mapa.set(relacion.iniciativa_id, (mapa.get(relacion.iniciativa_id) ?? 0) + 1),
      new Map<string, number>()
    )
  }, [relacionesKr])

  const hipotesisPorIniciativa = useMemo(() => {
    return relacionesHipotesis.reduce(
      (mapa, relacion) => mapa.set(relacion.iniciativa_id, (mapa.get(relacion.iniciativa_id) ?? 0) + 1),
      new Map<string, number>()
    )
  }, [relacionesHipotesis])

  const hipotesisDiscoveryPorIniciativa = useMemo(() => {
    return relacionesHipotesisDiscovery.reduce(
      (mapa, relacion) => mapa.set(relacion.iniciativa_id, (mapa.get(relacion.iniciativa_id) ?? 0) + 1),
      new Map<string, number>()
    )
  }, [relacionesHipotesisDiscovery])

  const abrirModal = (modo: ModoModalRoadmap, iniciativa?: Iniciativa) => {
    setModoModal(modo)
    setIniciativaActiva(iniciativa ?? null)
    setModalAbierto(true)
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Roadmap de iniciativas</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Gestiona iniciativas y prioriza usando cálculo RICE automático.
          </p>
        </div>
        <NavegacionRoadmap />
      </header>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto_auto]">
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar iniciativa"
            aria-label="Buscar iniciativas"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
          />
          <select
            value={filtroObjetivo}
            onChange={(evento) => {
              setFiltroObjetivo(evento.target.value)
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
          <button
            type="button"
            onClick={() => {
              setBusqueda('')
              setFiltroEstado('todos')
              setFiltroPrioridad('todas')
              setFiltroObjetivo('todos')
              setFiltroVentana('todas')
              setFiltroEtapa('todas')
              paginacion.setPaginaActual(1)
            }}
            aria-label="Limpiar filtros de iniciativas"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => {
              exportarCsv('roadmap-iniciativas.csv', [
                { encabezado: 'Iniciativa', valor: (iniciativa) => iniciativa.nombre },
                { encabezado: 'Descripción', valor: (iniciativa) => iniciativa.descripcion },
                { encabezado: 'Objetivo', valor: (iniciativa) => objetivoPorId.get(iniciativa.objetivo_id ?? '') ?? 'Sin objetivo' },
                { encabezado: 'Ventana', valor: (iniciativa) => ventanaPorId.get(iniciativa.ventana_planificada_id ?? '') ?? 'Sin asignar' },
                { encabezado: 'Etapa', valor: (iniciativa) => etapaPorId.get(iniciativa.etapa_id ?? '') ?? 'Sin asignar' },
                { encabezado: 'Fecha inicio', valor: (iniciativa) => formatearFechaCorta(iniciativa.fecha_inicio) },
                { encabezado: 'Fecha fin', valor: (iniciativa) => formatearFechaCorta(iniciativa.fecha_fin) },
                { encabezado: 'RICE', valor: (iniciativa) => iniciativa.rice },
                { encabezado: 'Estado', valor: (iniciativa) => formatearEstadoLegible(iniciativa.estado) },
                { encabezado: 'Prioridad', valor: (iniciativa) => iniciativa.prioridad },
                { encabezado: 'KR vinculados', valor: (iniciativa) => krPorIniciativa.get(iniciativa.id) ?? 0 },
                { encabezado: 'Hipótesis estrategia vinculadas', valor: (iniciativa) => hipotesisPorIniciativa.get(iniciativa.id) ?? 0 },
                { encabezado: 'Hipótesis discovery vinculadas', valor: (iniciativa) => hipotesisDiscoveryPorIniciativa.get(iniciativa.id) ?? 0 },
                { encabezado: 'Historias vinculadas', valor: (iniciativa) => historiasPorIniciativaMapa.get(iniciativa.id) ?? 0 },
                { encabezado: 'Casos de uso vinculados', valor: (iniciativa) => casosUsoPorIniciativaMapa.get(iniciativa.id) ?? 0 },
                {
                  encabezado: 'RNF vinculados',
                  valor: (iniciativa) => requerimientosNoFuncionalesPorIniciativaMapa.get(iniciativa.id) ?? 0
                }
              ], iniciativasFiltradas)
            }}
            aria-label="Exportar iniciativas a CSV"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            disabled={!esEdicionPermitida}
            onClick={() => abrirModal('crear')}
            aria-label="Crear iniciativa"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
          >
            Crear iniciativa
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={filtroVentana}
            onChange={(evento) => {
              setFiltroVentana(evento.target.value)
              paginacion.setPaginaActual(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            aria-label="Filtrar por ventana"
          >
            <option value="todas">Ventana: todas</option>
            <option value="sin_asignar">Ventana: sin asignar</option>
            {ventanas.map((ventana) => (
              <option key={ventana.id} value={ventana.id}>
                {ventana.etiqueta_visible}
              </option>
            ))}
          </select>
          <select
            value={filtroEtapa}
            onChange={(evento) => {
              setFiltroEtapa(evento.target.value)
              paginacion.setPaginaActual(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            aria-label="Filtrar por etapa"
          >
            <option value="todas">Etapa: todas</option>
            <option value="sin_asignar">Etapa: sin asignar</option>
            {etapas.map((etapa) => (
              <option key={etapa.id} value={etapa.id}>
                {etapa.etiqueta_visible}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estado</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroEstado('todos')}
              aria-label="Filtrar iniciativas por todos los estados"
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
                aria-label={`Filtrar iniciativas por estado ${estado}`}
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
              aria-label="Filtrar iniciativas por todas las prioridades"
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
                aria-label={`Filtrar iniciativas por prioridad ${prioridad}`}
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
      </div>

      <EstadoVista
        cargando={cargando}
        error={error}
        vacio={iniciativasFiltradas.length === 0}
        mensajeVacio="No hay iniciativas para los filtros seleccionados."
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2">Iniciativa</th>
                <th className="px-3 py-2">Objetivo</th>
                <th className="px-3 py-2">Planificación</th>
                <th className="px-3 py-2">RICE</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginacion.itemsPaginados.map((iniciativa) => (
                <tr key={iniciativa.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <p className="font-medium">{iniciativa.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{iniciativa.descripcion}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {krPorIniciativa.get(iniciativa.id) ?? 0} KR · {hipotesisPorIniciativa.get(iniciativa.id) ?? 0} hipótesis estrategia ·{' '}
                      {hipotesisDiscoveryPorIniciativa.get(iniciativa.id) ?? 0} hipótesis discovery
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {historiasPorIniciativaMapa.get(iniciativa.id) ?? 0} historias · {casosUsoPorIniciativaMapa.get(iniciativa.id) ?? 0} casos de uso ·{' '}
                      {requerimientosNoFuncionalesPorIniciativaMapa.get(iniciativa.id) ?? 0} RNF
                    </p>
                  </td>
                  <td className="px-3 py-2">{objetivoPorId.get(iniciativa.objetivo_id ?? '') ?? 'Sin objetivo'}</td>
                  <td className="px-3 py-2">
                    <p className="text-xs">{ventanaPorId.get(iniciativa.ventana_planificada_id ?? '') ?? 'Sin asignar'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{etapaPorId.get(iniciativa.etapa_id ?? '') ?? 'Sin asignar'}</p>
                    {iniciativa.fecha_inicio ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatearFechaCorta(iniciativa.fecha_inicio)}
                        {iniciativa.fecha_fin ? ` - ${formatearFechaCorta(iniciativa.fecha_fin)}` : ''}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-semibold">{iniciativa.rice}</td>
                  <td className="px-3 py-2">{iniciativa.estado}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal('ver', iniciativa)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => abrirModal('editar', iniciativa)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={!esEdicionPermitida}
                        onClick={() => {
                          void eliminarIniciativaRoadmapConConfirmacion(iniciativa.id, cargarInformacion, setError)
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

      <GestorModalIniciativaRoadmap
        abierto={modalAbierto}
        modo={modoModal}
        iniciativa={iniciativaActiva}
        objetivos={objetivos}
        ventanas={ventanas}
        etapas={etapas}
        configuracionRice={configuracionRice}
        alCerrar={() => setModalAbierto(false)}
        alGuardado={cargarInformacion}
        alError={setError}
      />
    </section>
  )
}
