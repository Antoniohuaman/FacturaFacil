import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'react-router-dom'
import { iniciativaSchema, type IniciativaEntrada } from '@/compartido/validacion/esquemas'
import {
  formatearAlcancePeriodoRice,
  formatearEsfuerzoUnidadRice,
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type ConfiguracionRice,
  estadosRegistro,
  prioridadesRegistro,
  type Iniciativa,
  type Objetivo,
  type RelIniciativaHipotesisPm,
  type RelIniciativaKrPm
} from '@/dominio/modelos'
import {
  crearIniciativa,
  editarIniciativa,
  eliminarIniciativa,
  listarIniciativas
} from '@/aplicacion/casos-uso/iniciativas'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { cargarConfiguracionRice, listarEtapasPm, listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { listarRelIniciativaHipotesis, listarRelIniciativaKr } from '@/aplicacion/casos-uso/estrategia'
import { ModalPortal } from '@/compartido/ui/ModalPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { usePaginacion } from '../../../../compartido/utilidades/usePaginacion'
import { PaginacionTabla } from '@/compartido/ui/PaginacionTabla'
import { calcularRice } from '@/compartido/utilidades/calcularRice'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'

type ModoModal = 'crear' | 'ver' | 'editar'

const opcionesImpacto: IniciativaEntrada['impacto'][] = [0.25, 0.5, 1, 2, 3]

function convertirNumeroControlado(valor: unknown, respaldo: number) {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? numero : respaldo
}

function normalizarImpacto(valor: number | null | undefined): IniciativaEntrada['impacto'] {
  const impacto = convertirNumeroControlado(valor, 1)

  if (opcionesImpacto.includes(impacto as IniciativaEntrada['impacto'])) {
    return impacto as IniciativaEntrada['impacto']
  }

  return opcionesImpacto.reduce((masCercano, opcionActual) => {
    const distanciaActual = Math.abs(opcionActual - impacto)
    const distanciaMasCercana = Math.abs(masCercano - impacto)

    return distanciaActual < distanciaMasCercana ? opcionActual : masCercano
  }, 1)
}

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
  const [modoModal, setModoModal] = useState<ModoModal>('crear')
  const [iniciativaActiva, setIniciativaActiva] = useState<Iniciativa | null>(null)
  const [configuracionRice, setConfiguracionRice] = useState<ConfiguracionRice | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isValid }
  } = useForm<IniciativaEntrada>({
    resolver: zodResolver(iniciativaSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      objetivo_id: null,
      ventana_planificada_id: null,
      etapa_id: null,
      nombre: '',
      descripcion: '',
      alcance: 10,
      impacto: 1,
      confianza: 70,
      esfuerzo: 1,
      estado: 'pendiente',
      prioridad: 'media'
    }
  })

  const esEdicionPermitida = puedeEditar(rol)

  const alcance = watch('alcance')
  const impacto = watch('impacto')
  const confianza = watch('confianza')
  const esfuerzo = watch('esfuerzo')

  const camposRiceValidos = useMemo(() => {
    return (
      Number.isInteger(alcance) &&
      alcance >= 0 &&
      opcionesImpacto.includes(impacto) &&
      Number.isFinite(confianza) &&
      confianza >= 0 &&
      confianza <= 100 &&
      Number.isFinite(esfuerzo) &&
      esfuerzo >= 0.5
    )
  }, [alcance, impacto, confianza, esfuerzo])

  const riceCalculado = useMemo(() => {
    if (!camposRiceValidos) {
      return null
    }

    return calcularRice({ alcance, impacto, confianza, esfuerzo })
  }, [alcance, impacto, confianza, esfuerzo, camposRiceValidos])

  const claseCampoNumero = (campo: 'alcance' | 'impacto' | 'confianza' | 'esfuerzo') =>
    `mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 ${
      errors[campo] ? 'border-red-300 dark:border-red-800' : 'border-slate-300 dark:border-slate-700'
    }`

  const cargarInformacion = async () => {
    setCargando(true)
    setError(null)
    try {
      const [listaIniciativas, listaObjetivos, listaVentanas, listaEtapas, relKrData, relHipotesisData] = await Promise.all([
        listarIniciativas(),
        listarObjetivos(),
        listarVentanasPm(),
        listarEtapasPm(),
        listarRelIniciativaKr(),
        listarRelIniciativaHipotesis()
      ])
      setIniciativas(listaIniciativas)
      setObjetivos(listaObjetivos)
      setVentanas(listaVentanas)
      setEtapas(listaEtapas)
      setRelacionesKr(relKrData)
      setRelacionesHipotesis(relHipotesisData)

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

  const helperAlcance = configuracionRice
    ? `Impactados por ${formatearAlcancePeriodoRice(configuracionRice.alcance_periodo)}`
    : 'Impactados (periodo)'

  const helperEsfuerzo = configuracionRice
    ? formatearEsfuerzoUnidadRice(configuracionRice.esfuerzo_unidad)
    : 'Esfuerzo (unidad)'

  const abrirModal = (modo: ModoModal, iniciativa?: Iniciativa) => {
    setModoModal(modo)
    setIniciativaActiva(iniciativa ?? null)
    setModalAbierto(true)
    reset({
      objetivo_id: iniciativa?.objetivo_id ?? null,
      ventana_planificada_id: iniciativa?.ventana_planificada_id ?? null,
      etapa_id: iniciativa?.etapa_id ?? null,
      nombre: iniciativa?.nombre ?? '',
      descripcion: iniciativa?.descripcion ?? '',
      alcance: iniciativa?.alcance ?? 10,
      impacto: normalizarImpacto(iniciativa?.impacto),
      confianza: iniciativa?.confianza ?? 70,
      esfuerzo: iniciativa?.esfuerzo ?? 1,
      estado: iniciativa?.estado ?? 'pendiente',
      prioridad: iniciativa?.prioridad ?? 'media'
    })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Roadmap de iniciativas</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Gestiona iniciativas y prioriza usando cálculo RICE automático.
        </p>
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
                { encabezado: 'RICE', valor: (iniciativa) => iniciativa.rice },
                { encabezado: 'Estado', valor: (iniciativa) => formatearEstadoLegible(iniciativa.estado) },
                { encabezado: 'Prioridad', valor: (iniciativa) => iniciativa.prioridad },
                { encabezado: 'KR vinculados', valor: (iniciativa) => krPorIniciativa.get(iniciativa.id) ?? 0 },
                { encabezado: 'Hipótesis vinculadas', valor: (iniciativa) => hipotesisPorIniciativa.get(iniciativa.id) ?? 0 }
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
            Crear
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
                      {krPorIniciativa.get(iniciativa.id) ?? 0} KR · {hipotesisPorIniciativa.get(iniciativa.id) ?? 0} hipótesis
                    </p>
                  </td>
                  <td className="px-3 py-2">{objetivoPorId.get(iniciativa.objetivo_id ?? '') ?? 'Sin objetivo'}</td>
                  <td className="px-3 py-2">
                    <p className="text-xs">{ventanaPorId.get(iniciativa.ventana_planificada_id ?? '') ?? 'Sin asignar'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {etapaPorId.get(iniciativa.etapa_id ?? '') ?? 'Sin asignar'}
                    </p>
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
                          if (window.confirm('¿Eliminar esta iniciativa?')) {
                            void eliminarIniciativa(iniciativa.id).then(cargarInformacion).catch((errorInterno) => {
                              setError(
                                errorInterno instanceof Error
                                  ? errorInterno.message
                                  : 'No se pudo eliminar la iniciativa'
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
        titulo={`${modoModal === 'crear' ? 'Crear' : modoModal === 'editar' ? 'Editar' : 'Ver'} iniciativa`}
        alCerrar={() => setModalAbierto(false)}
      >
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(async (valores) => {
            if (modoModal === 'ver') {
              return
            }

            try {
              const carga = {
                ...valores,
                objetivo_id: valores.objetivo_id || null,
                ventana_planificada_id: valores.ventana_planificada_id || null,
                etapa_id: valores.etapa_id || null
              }

              if (modoModal === 'crear') {
                await crearIniciativa(carga)
              }

              if (modoModal === 'editar' && iniciativaActiva) {
                await editarIniciativa(iniciativaActiva.id, carga)
              }

              setModalAbierto(false)
              await cargarInformacion()
            } catch (errorInterno) {
              setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo guardar la iniciativa')
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Objetivo</label>
            <select
              {...register('objetivo_id')}
              disabled={modoModal === 'ver'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Sin objetivo</option>
              {objetivos.map((objetivo) => (
                <option key={objetivo.id} value={objetivo.id}>
                  {objetivo.nombre}
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
              <label className="text-sm font-medium">Etapa</label>
              <select
                {...register('etapa_id')}
                disabled={modoModal === 'ver'}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Sin asignar</option>
                {etapas.map((etapa) => (
                  <option key={etapa.id} value={etapa.id}>
                    {etapa.etiqueta_visible}
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

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Alcance</label>
              <input
                type="number"
                min={0}
                step={1}
                {...register('alcance', {
                  setValueAs: (valor) => {
                    if (valor === '' || valor === null || valor === undefined) {
                      return Number.NaN
                    }

                    return Number(valor)
                  }
                })}
                readOnly={modoModal === 'ver'}
                className={claseCampoNumero('alcance')}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperAlcance}</p>
              {errors.alcance ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.alcance.message}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium">Impacto</label>
              <select
                {...register('impacto', {
                  setValueAs: (valor) => Number(valor)
                })}
                disabled={modoModal === 'ver'}
                className={claseCampoNumero('impacto')}
              >
                {opcionesImpacto.map((impactoOpcion) => (
                  <option key={impactoOpcion} value={impactoOpcion}>
                    {impactoOpcion === 0.25
                      ? '0.25 (muy bajo)'
                      : impactoOpcion === 0.5
                        ? '0.5 (bajo)'
                        : impactoOpcion === 1
                          ? '1 (medio)'
                          : impactoOpcion === 2
                            ? '2 (alto)'
                            : '3 (muy alto)'}
                  </option>
                ))}
              </select>
              {errors.impacto ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.impacto.message}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium">Confianza</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  {...register('confianza', {
                    setValueAs: (valor) => {
                      if (valor === '' || valor === null || valor === undefined) {
                        return Number.NaN
                      }

                      return Number(valor)
                    }
                  })}
                  readOnly={modoModal === 'ver'}
                  className={`${claseCampoNumero('confianza')} pr-8`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-slate-400">
                  %
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">0–100%</p>
              {errors.confianza ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.confianza.message}</p> : null}
            </div>
            <div>
              <label className="text-sm font-medium">Esfuerzo</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                {...register('esfuerzo', {
                  setValueAs: (valor) => {
                    if (valor === '' || valor === null || valor === undefined) {
                      return Number.NaN
                    }

                    return Number(valor)
                  }
                })}
                readOnly={modoModal === 'ver'}
                className={claseCampoNumero('esfuerzo')}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperEsfuerzo}</p>
              {errors.esfuerzo ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.esfuerzo.message}</p> : null}
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
            {riceCalculado === null ? (
              <>
                RICE: <span className="font-semibold">inválido</span>. Corrige los campos para ver el RICE.
              </>
            ) : (
              <>
                RICE calculado automáticamente: <span className="font-semibold">{riceCalculado}</span>
              </>
            )}
          </div>

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
              disabled={isSubmitting || !isValid}
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
