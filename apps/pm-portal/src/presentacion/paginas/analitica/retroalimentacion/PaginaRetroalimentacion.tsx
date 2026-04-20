import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarModulosPm } from '@/aplicacion/casos-uso/ajustes'
import {
  obtenerDetalleRetroalimentacion,
  obtenerListadoRetroalimentacion,
  obtenerPanelRetroalimentacion,
  obtenerTodosLosRegistrosRetroalimentacion,
} from '@/aplicacion/casos-uso/retroalimentacion'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import type {
  CampoOrdenRetroalimentacionPm,
  CatalogoModuloPm,
  DireccionOrdenRetroalimentacionPm,
  RegistroRetroalimentacionPm,
  RespuestaDetalleRetroalimentacionPm,
  RespuestaDistribucionesRetroalimentacionPm,
  RespuestaListadoRetroalimentacionPm,
  RespuestaResumenRetroalimentacionPm,
  TipoRetroalimentacionPm
} from '@/dominio/modelos'
import {
  camposOrdenRetroalimentacionPm,
  direccionesOrdenRetroalimentacionPm,
  tiposRetroalimentacionPm
} from '@/dominio/modelos'
import { NavegacionAnalitica } from '@/presentacion/paginas/analitica/NavegacionAnalitica'
import { exportarRetroalimentacionExcel } from '@/presentacion/paginas/analitica/retroalimentacion/exportarRetroalimentacionExcel'
import { FranjaVisualRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/FranjaVisualRetroalimentacion'
import { ModalDetalleRetroalimentacion } from '@/presentacion/paginas/analitica/retroalimentacion/ModalDetalleRetroalimentacion'
import {
  formatearEstadoDominanteRetroalimentacion,
  formatearTipoRetroalimentacion,
  obtenerClaseTipoRetroalimentacion,
  obtenerMetaSecundariaRetroalimentacion,
  obtenerNombreEmpresaVisible,
  obtenerSubtituloEmpresa,
  obtenerSubtituloUsuario,
  opcionesTipoRetroalimentacion,
  resumirTexto
} from '@/presentacion/paginas/analitica/retroalimentacion/retroalimentacionPresentacion'

const TAMANOS_PAGINA = [10, 25, 50]
const TAMANO_POR_DEFECTO = 10
const ORDENAR_POR_DEFECTO: CampoOrdenRetroalimentacionPm = 'created_at'
const DIRECCION_ORDEN_POR_DEFECTO: DireccionOrdenRetroalimentacionPm = 'desc'
const CLASE_CONTROL_FILTRO =
  'h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm text-slate-700 transition outline-none focus:border-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200 dark:focus:border-slate-600 dark:focus:bg-slate-900'
const CLASE_BOTON_TABLA =
  'h-9 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
const CLASE_BOTON_EXPORTAR =
  'h-9 rounded-full bg-slate-950 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white'
const CLASE_BOTON_PAGINACION =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
const CLASE_BOTON_ENCABEZADO_ORDENABLE =
  'group inline-flex items-center gap-2 rounded-md px-0.5 py-1 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:focus-visible:ring-slate-600/40'
const DURACION_CACHE_MODULOS_RETROALIMENTACION_MS = 5 * 60_000
const formateadorFechaFiltroExportacion = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

let cacheModulosRetroalimentacion: {
  expiraEn: number
  valor: CatalogoModuloPm[]
} | null = null
let promesaModulosRetroalimentacion: Promise<CatalogoModuloPm[]> | null = null

type FiltroActivoRetroalimentacion = {
  id: 'tipo' | 'desde' | 'hasta' | 'empresa' | 'usuario' | 'modulo'
  etiqueta: string
  valor: string
}

type EncabezadoOrdenableTablaProps = {
  etiqueta: string
  campo: CampoOrdenRetroalimentacionPm
  ordenarPor: CampoOrdenRetroalimentacionPm
  direccion: DireccionOrdenRetroalimentacionPm
  alOrdenar: (campo: CampoOrdenRetroalimentacionPm) => void
}

function normalizarModulosRetroalimentacion(modulos: CatalogoModuloPm[]) {
  return [...modulos]
    .filter((item) => item.activo)
    .sort((a, b) => a.orden - b.orden)
}

async function obtenerModulosRetroalimentacionConCache() {
  const ahora = Date.now()

  if (cacheModulosRetroalimentacion && cacheModulosRetroalimentacion.expiraEn > ahora) {
    return cacheModulosRetroalimentacion.valor
  }

  if (promesaModulosRetroalimentacion) {
    return promesaModulosRetroalimentacion
  }

  promesaModulosRetroalimentacion = listarModulosPm()
    .then((respuesta) => {
      const valor = normalizarModulosRetroalimentacion(respuesta)

      cacheModulosRetroalimentacion = {
        expiraEn: Date.now() + DURACION_CACHE_MODULOS_RETROALIMENTACION_MS,
        valor
      }

      return valor
    })
    .finally(() => {
      promesaModulosRetroalimentacion = null
    })

  return promesaModulosRetroalimentacion
}

function construirClaveRetroalimentacion(valor: unknown) {
  return JSON.stringify(valor)
}

function esErrorAbortado(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function CampoFiltro({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {etiqueta}
      </span>
      {children}
    </label>
  )
}

function leerPagina(valor: string | null) {
  const numero = Number(valor ?? '1')
  return Number.isInteger(numero) && numero > 0 ? numero : 1
}

function leerTamano(valor: string | null) {
  const numero = Number(valor ?? String(TAMANO_POR_DEFECTO))
  return TAMANOS_PAGINA.includes(numero) ? numero : TAMANO_POR_DEFECTO
}

function leerTipo(valor: string | null): 'todos' | TipoRetroalimentacionPm {
  if (!valor) {
    return 'todos'
  }

  return tiposRetroalimentacionPm.includes(valor as TipoRetroalimentacionPm)
    ? (valor as TipoRetroalimentacionPm)
    : 'todos'
}

function obtenerDireccionInicialOrden(campo: CampoOrdenRetroalimentacionPm): DireccionOrdenRetroalimentacionPm {
  return campo === 'created_at' || campo === 'puntaje' ? 'desc' : 'asc'
}

function leerOrdenarPor(valor: string | null): CampoOrdenRetroalimentacionPm {
  if (!valor) {
    return ORDENAR_POR_DEFECTO
  }

  return camposOrdenRetroalimentacionPm.includes(valor as CampoOrdenRetroalimentacionPm)
    ? (valor as CampoOrdenRetroalimentacionPm)
    : ORDENAR_POR_DEFECTO
}

function leerDireccion(
  valor: string | null,
  ordenarPor: CampoOrdenRetroalimentacionPm
): DireccionOrdenRetroalimentacionPm {
  if (!valor) {
    return obtenerDireccionInicialOrden(ordenarPor)
  }

  return direccionesOrdenRetroalimentacionPm.includes(valor as DireccionOrdenRetroalimentacionPm)
    ? (valor as DireccionOrdenRetroalimentacionPm)
    : obtenerDireccionInicialOrden(ordenarPor)
}

function construirTarjetasResumen(resumen: RespuestaResumenRetroalimentacionPm) {
  const estadoPrincipal = resumen.distribucion_estado_animo[0]?.estado_animo ?? null

  return [
    {
      titulo: 'Total',
      valor: resumen.total_registros.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Ideas',
      valor: resumen.cantidad_ideas.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Ánimo',
      valor: resumen.totales_por_tipo.estado_animo.toLocaleString('es-PE'),
      detalle: formatearEstadoDominanteRetroalimentacion(estadoPrincipal)
    },
    {
      titulo: 'Calificaciones',
      valor: resumen.totales_por_tipo.calificacion.toLocaleString('es-PE'),
      detalle: null
    },
    {
      titulo: 'Promedio',
      valor:
        resumen.promedio_calificacion === null
          ? '—'
          : resumen.promedio_calificacion.toLocaleString('es-PE', {
              minimumFractionDigits: resumen.promedio_calificacion % 1 === 0 ? 0 : 1,
              maximumFractionDigits: 2
            }),
      detalle: null
    }
  ]
}

function formatearFechaFiltroExportacion(valor: string | null) {
  if (!valor) {
    return ''
  }

  const fecha = new Date(`${valor}T00:00:00`)

  if (Number.isNaN(fecha.getTime())) {
    return valor
  }

  return formateadorFechaFiltroExportacion.format(fecha)
}

function resolverNombreModuloFiltro(codigo: string, modulos: CatalogoModuloPm[]) {
  return modulos.find((item) => item.codigo === codigo)?.nombre ?? codigo
}

function construirFiltrosActivos(
  filtros: RespuestaListadoRetroalimentacionPm['filtros_aplicados'],
  modulos: CatalogoModuloPm[]
) {
  const filtrosActivos: FiltroActivoRetroalimentacion[] = []

  if (filtros.tipo) {
    filtrosActivos.push({
      id: 'tipo',
      etiqueta: 'Tipo',
      valor: formatearTipoRetroalimentacion(filtros.tipo)
    })
  }

  if (filtros.desde) {
    filtrosActivos.push({
      id: 'desde',
      etiqueta: 'Desde',
      valor: formatearFechaFiltroExportacion(filtros.desde)
    })
  }

  if (filtros.hasta) {
    filtrosActivos.push({
      id: 'hasta',
      etiqueta: 'Hasta',
      valor: formatearFechaFiltroExportacion(filtros.hasta)
    })
  }

  if (filtros.empresa) {
    filtrosActivos.push({
      id: 'empresa',
      etiqueta: 'Empresa',
      valor: filtros.empresa
    })
  }

  if (filtros.usuario) {
    filtrosActivos.push({
      id: 'usuario',
      etiqueta: 'Usuario',
      valor: filtros.usuario
    })
  }

  if (filtros.modulo) {
    filtrosActivos.push({
      id: 'modulo',
      etiqueta: 'Módulo',
      valor: resolverNombreModuloFiltro(filtros.modulo, modulos)
    })
  }

  return filtrosActivos
}

function construirFiltrosExportacion(
  filtros: RespuestaListadoRetroalimentacionPm['filtros_aplicados'],
  modulos: CatalogoModuloPm[]
) {
  const filtrosExportacion: Array<{ etiqueta: string; valor: string }> = []

  if (filtros.tipo) {
    filtrosExportacion.push({
      etiqueta: 'Tipo',
      valor: formatearTipoRetroalimentacion(filtros.tipo)
    })
  }

  if (filtros.desde) {
    filtrosExportacion.push({
      etiqueta: 'Desde',
      valor: formatearFechaFiltroExportacion(filtros.desde)
    })
  }

  if (filtros.hasta) {
    filtrosExportacion.push({
      etiqueta: 'Hasta',
      valor: formatearFechaFiltroExportacion(filtros.hasta)
    })
  }

  if (filtros.empresa) {
    filtrosExportacion.push({ etiqueta: 'Empresa', valor: filtros.empresa })
  } else if (filtros.empresa_id) {
    filtrosExportacion.push({ etiqueta: 'Empresa ID', valor: filtros.empresa_id })
  }

  if (filtros.usuario) {
    filtrosExportacion.push({ etiqueta: 'Usuario', valor: filtros.usuario })
  } else if (filtros.usuario_id) {
    filtrosExportacion.push({ etiqueta: 'Usuario ID', valor: filtros.usuario_id })
  }

  if (filtros.modulo) {
    filtrosExportacion.push({
      etiqueta: 'Modulo',
      valor: resolverNombreModuloFiltro(filtros.modulo, modulos)
    })
  }

  if (filtros.ruta) {
    filtrosExportacion.push({ etiqueta: 'Ruta', valor: filtros.ruta })
  }

  return filtrosExportacion
}

function obtenerAriaSort(
  campo: CampoOrdenRetroalimentacionPm,
  ordenarPor: CampoOrdenRetroalimentacionPm,
  direccion: DireccionOrdenRetroalimentacionPm
): 'ascending' | 'descending' | 'none' {
  if (campo !== ordenarPor) {
    return 'none'
  }

  return direccion === 'asc' ? 'ascending' : 'descending'
}

function IndicadorOrdenTabla({
  activo,
  direccion
}: {
  activo: boolean
  direccion: DireccionOrdenRetroalimentacionPm
}) {
  return (
    <span
      className={`inline-flex h-4 w-4 flex-col items-center justify-center rounded-full border transition ${
        activo
          ? 'border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
          : 'border-transparent text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 8 8"
        className={`-mb-px h-[7px] w-[7px] ${activo ? (direccion === 'asc' ? 'opacity-100' : 'opacity-35') : 'opacity-80'}`}
        fill="currentColor"
      >
        <path d="M4 1 7 5H1z" />
      </svg>
      <svg
        viewBox="0 0 8 8"
        className={`-mt-px h-[7px] w-[7px] ${activo ? (direccion === 'desc' ? 'opacity-100' : 'opacity-35') : 'opacity-80'}`}
        fill="currentColor"
      >
        <path d="M1 3h6L4 7z" />
      </svg>
    </span>
  )
}

function EncabezadoOrdenableTabla({
  etiqueta,
  campo,
  ordenarPor,
  direccion,
  alOrdenar
}: EncabezadoOrdenableTablaProps) {
  const activo = ordenarPor === campo

  return (
    <th
      scope="col"
      aria-sort={obtenerAriaSort(campo, ordenarPor, direccion)}
      className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95"
    >
      <button
        type="button"
        onClick={() => alOrdenar(campo)}
        className={`${CLASE_BOTON_ENCABEZADO_ORDENABLE} ${
          activo ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'
        }`}
        title={activo ? `Ordenado por ${etiqueta.toLowerCase()}` : `Ordenar por ${etiqueta.toLowerCase()}`}
      >
        <span>{etiqueta}</span>
        <IndicadorOrdenTabla activo={activo} direccion={direccion} />
      </button>
    </th>
  )
}

function IconoCerrarChip() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3 9 9" strokeLinecap="round" />
      <path d="M9 3 3 9" strokeLinecap="round" />
    </svg>
  )
}

export function PaginaRetroalimentacion() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { usuario: usuarioSesion, accessToken } = useSesionPortalPM()
  const ordenarInicial = leerOrdenarPor(searchParams.get('ordenar_por'))

  const [pagina, setPagina] = useState(() => leerPagina(searchParams.get('pagina')))
  const [tamano, setTamano] = useState(() => leerTamano(searchParams.get('tamano')))
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoRetroalimentacionPm>(() => leerTipo(searchParams.get('tipo')))
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') ?? '')
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') ?? '')
  const [empresa, setEmpresa] = useState(searchParams.get('empresa') ?? '')
  const [usuarioFiltro, setUsuarioFiltro] = useState(searchParams.get('usuario') ?? '')
  const [modulo, setModulo] = useState(searchParams.get('modulo') ?? 'todos')
  const [ordenarPor, setOrdenarPor] = useState<CampoOrdenRetroalimentacionPm>(ordenarInicial)
  const [direccionOrden, setDireccionOrden] = useState<DireccionOrdenRetroalimentacionPm>(() =>
    leerDireccion(searchParams.get('direccion'), ordenarInicial)
  )

  const [modulos, setModulos] = useState<CatalogoModuloPm[]>([])
  const [listado, setListado] = useState<RespuestaListadoRetroalimentacionPm | null>(null)
  const [resumen, setResumen] = useState<RespuestaResumenRetroalimentacionPm | null>(null)
  const [distribuciones, setDistribuciones] = useState<RespuestaDistribucionesRetroalimentacionPm | null>(null)
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportandoExcel, setExportandoExcel] = useState(false)
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null)

  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false)
  const [registroSeleccionado, setRegistroSeleccionado] = useState<RegistroRetroalimentacionPm | null>(null)
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<RespuestaDetalleRetroalimentacionPm | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  const solicitudContenidoRef = useRef(0)
  const solicitudDetalleRef = useRef(0)
  const haCargadoContenidoRef = useRef(false)
  const ultimaClaveListadoRef = useRef<string | null>(null)
  const ultimaClavePanelRef = useRef<string | null>(null)
  const controladorContenidoRef = useRef<AbortController | null>(null)
  const controladorDetalleRef = useRef<AbortController | null>(null)
  const empresaNormalizada = empresa.trim()
  const usuarioFiltroNormalizado = usuarioFiltro.trim()

  useEffect(() => {
    const parametros = new URLSearchParams()

    if (filtroTipo !== 'todos') {
      parametros.set('tipo', filtroTipo)
    }

    if (fechaDesde) {
      parametros.set('desde', fechaDesde)
    }

    if (fechaHasta) {
      parametros.set('hasta', fechaHasta)
    }

    if (empresaNormalizada) {
      parametros.set('empresa', empresaNormalizada)
    }

    if (usuarioFiltroNormalizado) {
      parametros.set('usuario', usuarioFiltroNormalizado)
    }

    if (modulo !== 'todos') {
      parametros.set('modulo', modulo)
    }

    if (ordenarPor !== ORDENAR_POR_DEFECTO || direccionOrden !== DIRECCION_ORDEN_POR_DEFECTO) {
      parametros.set('ordenar_por', ordenarPor)
      parametros.set('direccion', direccionOrden)
    }

    if (pagina > 1) {
      parametros.set('pagina', String(pagina))
    }

    if (tamano !== TAMANO_POR_DEFECTO) {
      parametros.set('tamano', String(tamano))
    }

    setSearchParams(parametros, { replace: true })
  }, [
    direccionOrden,
    empresaNormalizada,
    fechaDesde,
    fechaHasta,
    filtroTipo,
    modulo,
    ordenarPor,
    pagina,
    setSearchParams,
    tamano,
    usuarioFiltroNormalizado
  ])

  useEffect(() => {
    let activo = true

    const cargarModulos = async () => {
      try {
        const respuesta = await obtenerModulosRetroalimentacionConCache()

        if (!activo) {
          return
        }

        setModulos(respuesta)
      } catch {
        if (!activo) {
          return
        }

        setModulos([])
      }
    }

    void cargarModulos()

    return () => {
      activo = false
    }
  }, [])

  const filtrosActuales = useMemo<RespuestaListadoRetroalimentacionPm['filtros_aplicados']>(
    () => ({
      tipo: filtroTipo === 'todos' ? null : filtroTipo,
      desde: fechaDesde || null,
      hasta: fechaHasta || null,
      empresa_id: null,
      empresa: empresaNormalizada || null,
      usuario_id: null,
      usuario: usuarioFiltroNormalizado || null,
      modulo: modulo === 'todos' ? null : modulo,
      ruta: null
    }),
    [empresaNormalizada, fechaDesde, fechaHasta, filtroTipo, modulo, usuarioFiltroNormalizado]
  )

  const parametrosListado = useMemo(
    () => ({
      pagina,
      tamano,
      ordenar_por: ordenarPor,
      direccion: direccionOrden,
      ...filtrosActuales
    }),
    [direccionOrden, filtrosActuales, ordenarPor, pagina, tamano]
  )

  const clavePanel = useMemo(() => construirClaveRetroalimentacion(filtrosActuales), [filtrosActuales])
  const claveListado = useMemo(() => construirClaveRetroalimentacion(parametrosListado), [parametrosListado])

  const cargarContenido = useCallback(async (opciones?: { forzarListado?: boolean; forzarPanel?: boolean }) => {
    const solicitudActual = solicitudContenidoRef.current + 1
    solicitudContenidoRef.current = solicitudActual

    if (!usuarioSesion || !accessToken) {
      controladorContenidoRef.current?.abort()
      ultimaClaveListadoRef.current = null
      ultimaClavePanelRef.current = null
      haCargadoContenidoRef.current = false
      setListado(null)
      setResumen(null)
      setDistribuciones(null)
      setError('Inicia sesión para consultar Retroalimentación.')
      setCargandoInicial(false)
      setActualizando(false)
      return
    }

    const debeRecargarListado = opciones?.forzarListado === true || !listado || ultimaClaveListadoRef.current !== claveListado
    const debeRecargarPanel = opciones?.forzarPanel === true || !resumen || !distribuciones || ultimaClavePanelRef.current !== clavePanel

    if (!debeRecargarListado && !debeRecargarPanel) {
      return
    }

    controladorContenidoRef.current?.abort()
    const controlador = new AbortController()
    controladorContenidoRef.current = controlador

    if (haCargadoContenidoRef.current) {
      setActualizando(true)
    } else {
      setCargandoInicial(true)
    }

    setError(null)

    try {
      const [respuestaListado, respuestaPanel] = await Promise.all([
        debeRecargarListado
          ? obtenerListadoRetroalimentacion({
              accessToken,
              parametros: parametrosListado,
              signal: controlador.signal
            })
          : Promise.resolve(null),
        debeRecargarPanel
          ? obtenerPanelRetroalimentacion({
              accessToken,
              filtros: filtrosActuales,
              signal: controlador.signal,
              omitirCache: opciones?.forzarPanel === true
            })
          : Promise.resolve(null)
      ])

      if (controlador.signal.aborted || solicitudActual !== solicitudContenidoRef.current) {
        return
      }

      if (respuestaListado) {
        setListado(respuestaListado)
        ultimaClaveListadoRef.current = claveListado
      }

      if (respuestaPanel) {
        setResumen(respuestaPanel.resumen)
        setDistribuciones(respuestaPanel.distribuciones)
        ultimaClavePanelRef.current = clavePanel
      }

      haCargadoContenidoRef.current = true
    } catch (errorInterno) {
      if (controlador.signal.aborted || esErrorAbortado(errorInterno) || solicitudActual !== solicitudContenidoRef.current) {
        return
      }

      if (!haCargadoContenidoRef.current) {
        setListado(null)
        setResumen(null)
        setDistribuciones(null)
      }

      setError(
        errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el módulo de Retroalimentación.'
      )
    } finally {
      if (controladorContenidoRef.current === controlador) {
        controladorContenidoRef.current = null
      }

      if (solicitudActual === solicitudContenidoRef.current) {
        setCargandoInicial(false)
        setActualizando(false)
      }
    }
  }, [accessToken, claveListado, clavePanel, distribuciones, filtrosActuales, listado, parametrosListado, resumen, usuarioSesion])

  useEffect(() => {
    void cargarContenido()
  }, [cargarContenido])

  useEffect(() => {
    return () => {
      controladorContenidoRef.current?.abort()
      controladorDetalleRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!listado) {
      return
    }

    if (listado.paginacion.total > 0 && listado.items.length === 0 && pagina > listado.paginacion.total_paginas) {
      setPagina(listado.paginacion.total_paginas)
    }
  }, [listado, pagina])

  const cargarDetalle = useCallback(async () => {
    if (!registroSeleccionado) {
      return
    }

    const solicitudActual = solicitudDetalleRef.current + 1
    solicitudDetalleRef.current = solicitudActual

    if (!accessToken) {
      setDetalleSeleccionado(null)
      setErrorDetalle('Inicia sesión para consultar el detalle.')
      setCargandoDetalle(false)
      return
    }

    controladorDetalleRef.current?.abort()
    const controlador = new AbortController()
    controladorDetalleRef.current = controlador

    setCargandoDetalle(true)
    setErrorDetalle(null)

    try {
      const respuesta = await obtenerDetalleRetroalimentacion({
        accessToken,
        tipo: registroSeleccionado.tipo,
        id: registroSeleccionado.id,
        signal: controlador.signal
      })

      if (controlador.signal.aborted || solicitudActual !== solicitudDetalleRef.current) {
        return
      }

      setDetalleSeleccionado(respuesta)
    } catch (errorInterno) {
      if (controlador.signal.aborted || esErrorAbortado(errorInterno) || solicitudActual !== solicitudDetalleRef.current) {
        return
      }

      setDetalleSeleccionado(null)
      setErrorDetalle(
        errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el detalle del registro.'
      )
    } finally {
      if (controladorDetalleRef.current === controlador) {
        controladorDetalleRef.current = null
      }

      if (solicitudActual === solicitudDetalleRef.current) {
        setCargandoDetalle(false)
      }
    }
  }, [accessToken, registroSeleccionado])

  useEffect(() => {
    if (!modalDetalleAbierto || !registroSeleccionado) {
      controladorDetalleRef.current?.abort()
      return
    }

    void cargarDetalle()
  }, [cargarDetalle, modalDetalleAbierto, registroSeleccionado])

  const tarjetasResumen = useMemo(
    () => (resumen ? construirTarjetasResumen(resumen) : []),
    [resumen]
  )

  const filtrosExportacion = useMemo(
    () => construirFiltrosExportacion(filtrosActuales, modulos),
    [filtrosActuales, modulos]
  )

  const filtrosActivos = useMemo(
    () => construirFiltrosActivos(filtrosActuales, modulos),
    [filtrosActuales, modulos]
  )

  const rangoPagina = useMemo(() => {
    if (!listado || listado.paginacion.total === 0) {
      return { desde: 0, hasta: 0 }
    }

    const desde = (listado.paginacion.pagina - 1) * listado.paginacion.tamano + 1
    const hasta = Math.min(listado.paginacion.pagina * listado.paginacion.tamano, listado.paginacion.total)
    return { desde, hasta }
  }, [listado])

  const hayFiltrosActivos = filtrosActivos.length > 0

  const limpiarFiltros = () => {
    setFiltroTipo('todos')
    setFechaDesde('')
    setFechaHasta('')
    setEmpresa('')
    setUsuarioFiltro('')
    setModulo('todos')
    setPagina(1)
  }

  const quitarFiltroActivo = (filtroId: FiltroActivoRetroalimentacion['id']) => {
    if (filtroId === 'tipo') {
      setFiltroTipo('todos')
    }

    if (filtroId === 'desde') {
      setFechaDesde('')
    }

    if (filtroId === 'hasta') {
      setFechaHasta('')
    }

    if (filtroId === 'empresa') {
      setEmpresa('')
    }

    if (filtroId === 'usuario') {
      setUsuarioFiltro('')
    }

    if (filtroId === 'modulo') {
      setModulo('todos')
    }

    setPagina(1)
  }

  const alternarOrden = (campo: CampoOrdenRetroalimentacionPm) => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc')
      setPagina(1)
      return
    }

    setOrdenarPor(campo)
    setDireccionOrden(obtenerDireccionInicialOrden(campo))
    setPagina(1)
  }

  const exportarExcel = useCallback(async () => {
    if (!listado || listado.paginacion.total === 0) {
      return
    }

    setExportandoExcel(true)
    setErrorExportacion(null)

    try {
      const registros = await obtenerTodosLosRegistrosRetroalimentacion({
        accessToken,
        parametros: parametrosListado,
        tamanoLote: 100
      })

      await exportarRetroalimentacionExcel({
        registros,
        filtros: filtrosExportacion
      })
    } catch (errorInterno) {
      setErrorExportacion(
        errorInterno instanceof Error ? errorInterno.message : 'No se pudo exportar la vista actual a Excel.'
      )
    } finally {
      setExportandoExcel(false)
    }
  }, [accessToken, filtrosExportacion, listado, parametrosListado])

  return (
    <section className="mx-auto flex w-full max-w-[94rem] flex-col gap-2.5 xl:gap-3">
      <header className="space-y-1.5">
        <div className="space-y-0.5">
          <h1 className="text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50">Retroalimentación</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ideas, ánimo y calificaciones de producto.
          </p>
        </div>
        <NavegacionAnalitica />
      </header>

      <EstadoVista cargando={cargandoInicial} error={error && !listado ? error : null} vacio={false} mensajeVacio="">
        <>
          {resumen || distribuciones ? (
            <section className="grid gap-2.5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.94fr)] xl:items-stretch">
              {resumen ? (
                <div className="order-1 grid gap-2 sm:grid-cols-2 xl:order-2 xl:auto-rows-fr">
                  {tarjetasResumen.map((tarjeta, indice) => (
                    <article
                      key={tarjeta.titulo}
                      className={`rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/80 px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/70 dark:shadow-none ${indice === tarjetasResumen.length - 1 ? 'sm:col-span-2' : ''}`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{tarjeta.titulo}</p>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <p className="text-[1.35rem] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{tarjeta.valor}</p>
                        {tarjeta.detalle ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {tarjeta.detalle}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {distribuciones ? (
                <div className="order-2 xl:order-1 xl:h-full">
                  <FranjaVisualRetroalimentacion distribuciones={distribuciones} />
                </div>
              ) : null}
            </section>
          ) : null}

          {error && listado ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>No se pudo actualizar la información. Se muestran los últimos datos disponibles.</p>
                <button
                  type="button"
                  onClick={() => {
                    void cargarContenido({ forzarListado: true, forzarPanel: true })
                  }}
                  className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-medium transition hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/40"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : null}

          <article className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800/90 dark:bg-slate-900 dark:shadow-none">
            <header className="border-b border-slate-200/90 px-4 py-3 dark:border-slate-800/90">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Registros</h2>
                  {actualizando ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      Actualizando
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void exportarExcel()
                    }}
                    disabled={cargandoInicial || actualizando || exportandoExcel || !listado || listado.paginacion.total === 0}
                    className={CLASE_BOTON_EXPORTAR}
                    title="Exporta todos los registros de la vista filtrada a Excel"
                  >
                    {exportandoExcel ? 'Exportando Excel…' : 'Exportar Excel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void cargarContenido({ forzarListado: true, forzarPanel: true })
                    }}
                    disabled={cargandoInicial || actualizando || exportandoExcel}
                    className={CLASE_BOTON_TABLA}
                  >
                    {actualizando ? 'Actualizando…' : 'Recargar'}
                  </button>
                </div>
              </div>

              {errorExportacion ? (
                <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">{errorExportacion}</p>
              ) : null}

              {hayFiltrosActivos ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Activos
                  </span>

                  {filtrosActivos.map((filtro) => (
                    <span
                      key={filtro.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                    >
                      <span className="font-medium text-slate-500 dark:text-slate-400">{filtro.etiqueta}:</span>
                      <span className="max-w-[14rem] truncate text-slate-700 dark:text-slate-100" title={filtro.valor}>
                        {filtro.valor}
                      </span>
                      <button
                        type="button"
                        onClick={() => quitarFiltroActivo(filtro.id)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/80 hover:text-slate-700 dark:hover:bg-slate-700/80 dark:hover:text-slate-100"
                        aria-label={`Quitar filtro ${filtro.etiqueta}`}
                        title={`Quitar filtro ${filtro.etiqueta}`}
                      >
                        <IconoCerrarChip />
                      </button>
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="inline-flex items-center rounded-full border border-transparent px-2.5 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
                <CampoFiltro etiqueta="Tipo">
                  <select
                    value={filtroTipo}
                    onChange={(evento) => {
                      setFiltroTipo(evento.target.value as 'todos' | TipoRetroalimentacionPm)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  >
                    {opcionesTipoRetroalimentacion.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                </CampoFiltro>

                <CampoFiltro etiqueta="Desde">
                  <input
                    type="date"
                    value={fechaDesde}
                    max={fechaHasta || undefined}
                    onChange={(evento) => {
                      setFechaDesde(evento.target.value)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Hasta">
                  <input
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde || undefined}
                    onChange={(evento) => {
                      setFechaHasta(evento.target.value)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Empresa">
                  <input
                    value={empresa}
                    onChange={(evento) => {
                      setEmpresa(evento.target.value)
                      setPagina(1)
                    }}
                    placeholder="Todas"
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Usuario">
                  <input
                    value={usuarioFiltro}
                    onChange={(evento) => {
                      setUsuarioFiltro(evento.target.value)
                      setPagina(1)
                    }}
                    placeholder="Todos"
                    className={CLASE_CONTROL_FILTRO}
                  />
                </CampoFiltro>

                <CampoFiltro etiqueta="Módulo">
                  <select
                    value={modulo}
                    onChange={(evento) => {
                      setModulo(evento.target.value)
                      setPagina(1)
                    }}
                    className={CLASE_CONTROL_FILTRO}
                  >
                    <option value="todos">Todos</option>
                    {modulos.map((item) => (
                      <option key={item.id} value={item.codigo}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </CampoFiltro>
              </div>
            </header>

            {listado && listado.items.length > 0 ? (
              <div className="overflow-auto md:max-h-[60vh]">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="text-left text-[10px] uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <EncabezadoOrdenableTabla
                        etiqueta="Fecha"
                        campo="created_at"
                        ordenarPor={ordenarPor}
                        direccion={direccionOrden}
                        alOrdenar={alternarOrden}
                      />
                      <EncabezadoOrdenableTabla
                        etiqueta="Tipo"
                        campo="tipo"
                        ordenarPor={ordenarPor}
                        direccion={direccionOrden}
                        alOrdenar={alternarOrden}
                      />
                      <EncabezadoOrdenableTabla
                        etiqueta="Usuario"
                        campo="usuario_nombre"
                        ordenarPor={ordenarPor}
                        direccion={direccionOrden}
                        alOrdenar={alternarOrden}
                      />
                      <EncabezadoOrdenableTabla
                        etiqueta="Empresa"
                        campo="empresa_nombre"
                        ordenarPor={ordenarPor}
                        direccion={direccionOrden}
                        alOrdenar={alternarOrden}
                      />
                      <EncabezadoOrdenableTabla
                        etiqueta="Módulo"
                        campo="modulo"
                        ordenarPor={ordenarPor}
                        direccion={direccionOrden}
                        alOrdenar={alternarOrden}
                      />
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 font-medium backdrop-blur dark:bg-slate-950/95">Señal</th>
                      <th className="sticky top-0 z-10 bg-slate-50/95 px-4 py-2.5 text-right font-medium backdrop-blur dark:bg-slate-950/95">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {listado.items.map((registro) => {
                      const metaSecundaria = obtenerMetaSecundariaRetroalimentacion(registro)
                      const detalleBreve = resumirTexto(registro.detalle, 64)
                      const subtituloUsuario = obtenerSubtituloUsuario(registro)
                      const nombreEmpresaVisible = obtenerNombreEmpresaVisible(registro)
                      const subtituloEmpresa = obtenerSubtituloEmpresa(registro)

                      return (
                        <tr key={registro.registro_uid} className="align-top transition hover:bg-slate-50/70 dark:hover:bg-slate-950/30">
                          <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-slate-600 dark:text-slate-300">
                            {formatearFechaHoraCorta(registro.created_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${obtenerClaseTipoRetroalimentacion(registro.tipo)}`}>
                              {formatearTipoRetroalimentacion(registro.tipo)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="max-w-[10rem] truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={registro.usuario_nombre}>
                              {registro.usuario_nombre}
                            </p>
                            {subtituloUsuario ? (
                              <p className="max-w-[10rem] truncate text-[11px] text-slate-500 dark:text-slate-400" title={subtituloUsuario}>
                                {subtituloUsuario}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="max-w-[12rem] truncate text-sm font-medium text-slate-900 dark:text-slate-100" title={nombreEmpresaVisible}>
                              {nombreEmpresaVisible}
                            </p>
                            {subtituloEmpresa ? (
                              <p className="max-w-[12rem] truncate text-[11px] text-slate-500 dark:text-slate-400" title={subtituloEmpresa}>
                                {subtituloEmpresa}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-200">
                            <span className="block max-w-[9rem] truncate" title={registro.modulo}>
                              {registro.modulo}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="max-w-[36rem] space-y-0.5 xl:max-w-[44rem]">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{registro.valor_principal}</p>
                              {metaSecundaria || detalleBreve ? (
                                <div className="space-y-0.5 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                                  {metaSecundaria ? <p>{metaSecundaria}</p> : null}
                                  {detalleBreve ? <p>{detalleBreve}</p> : null}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setRegistroSeleccionado(registro)
                                setDetalleSeleccionado(null)
                                setErrorDetalle(null)
                                setModalDetalleAbierto(true)
                              }}
                              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            >
                              Abrir
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="m-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No hay resultados con los filtros actuales.
              </div>
            )}

            {listado && listado.paginacion.total > 0 ? (
              <footer className="flex flex-col gap-2 border-t border-slate-200/90 px-4 py-3 dark:border-slate-800/90 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <label htmlFor="tamano-retroalimentacion">Filas</label>
                  <select
                    id="tamano-retroalimentacion"
                    value={listado.paginacion.tamano}
                    onChange={(evento) => {
                      setTamano(Number(evento.target.value))
                      setPagina(1)
                    }}
                    className="h-8 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200"
                  >
                    {TAMANOS_PAGINA.map((opcion) => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                  <span>
                    {rangoPagina.desde}-{rangoPagina.hasta} de {listado.paginacion.total.toLocaleString('es-PE')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPagina(1)}
                    disabled={listado.paginacion.pagina <= 1}
                    className={`${CLASE_BOTON_PAGINACION} hidden sm:inline-flex`}
                  >
                    Inicio
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina(Math.max(1, listado.paginacion.pagina - 1))}
                    disabled={listado.paginacion.pagina <= 1}
                    className={CLASE_BOTON_PAGINACION}
                  >
                    {'<'}
                  </button>
                  <span className="min-w-14 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                    {listado.paginacion.pagina}/{listado.paginacion.total_paginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina(Math.min(listado.paginacion.total_paginas, listado.paginacion.pagina + 1))}
                    disabled={listado.paginacion.pagina >= listado.paginacion.total_paginas}
                    className={CLASE_BOTON_PAGINACION}
                  >
                    {'>'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina(listado.paginacion.total_paginas)}
                    disabled={listado.paginacion.pagina >= listado.paginacion.total_paginas}
                    className={`${CLASE_BOTON_PAGINACION} hidden sm:inline-flex`}
                  >
                    Fin
                  </button>
                </div>
              </footer>
            ) : null}
          </article>
        </>
      </EstadoVista>

      <ModalDetalleRetroalimentacion
        abierto={modalDetalleAbierto}
        registroBase={registroSeleccionado}
        detalle={detalleSeleccionado}
        cargando={cargandoDetalle}
        error={errorDetalle}
        alCerrar={() => {
          setModalDetalleAbierto(false)
          setRegistroSeleccionado(null)
          setDetalleSeleccionado(null)
          setErrorDetalle(null)
        }}
        alReintentar={() => {
          void cargarDetalle()
        }}
      />
    </section>
  )
}