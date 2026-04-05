import {
  createContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useContext,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { cargarConfiguracionRice, listarEtapasPm, listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarReleases } from '@/aplicacion/casos-uso/lanzamientos'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { exportarCsv } from '@/compartido/utilidades/csv'
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { formatearEstadoLegible, formatearFechaCorta, normalizarFechaPortal } from '@/compartido/utilidades/formatoPortal'
import {
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type ConfiguracionRice,
  type Entrega,
  type EstadoRegistro,
  formatearEstadoRelease,
  formatearTipoRelease,
  type Iniciativa,
  type Objetivo,
  type ReleasePm
} from '@/dominio/modelos'
import {
  eliminarEntregaRoadmapConConfirmacion,
  eliminarIniciativaRoadmapConConfirmacion,
  eliminarObjetivoRoadmapConConfirmacion
} from '@/presentacion/paginas/roadmap/componentes/accionesContextualesRoadmap'
import { GestorModalEntregaRoadmap } from '@/presentacion/paginas/roadmap/componentes/GestorModalEntregaRoadmap'
import { GestorModalIniciativaRoadmap } from '@/presentacion/paginas/roadmap/componentes/GestorModalIniciativaRoadmap'
import { GestorModalObjetivoRoadmap } from '@/presentacion/paginas/roadmap/componentes/GestorModalObjetivoRoadmap'
import { MenuCrearRoadmapGlobal } from '@/presentacion/paginas/roadmap/componentes/MenuCrearRoadmapGlobal'
import { MenuContextualFilaRoadmap } from '@/presentacion/paginas/roadmap/componentes/MenuContextualFilaRoadmap'
import { MenuPersonalizacionCronograma } from '@/presentacion/paginas/roadmap/componentes/MenuPersonalizacionCronograma'
import type { ModoModalRoadmap } from '@/presentacion/paginas/roadmap/componentes/tiposModalRoadmap'
import { ControlTemporalCronograma } from '@/presentacion/paginas/roadmap/cronograma/ControlTemporalCronograma'
import { NavegacionRoadmap } from '@/presentacion/paginas/roadmap/NavegacionRoadmap'
import { calcularProgresoRoadmapDerivado } from '@/presentacion/paginas/roadmap/roadmapProgreso'

type VistaTemporal = 'anio' | 'trimestre'
type TipoFilaCronograma = 'objetivo' | 'iniciativa' | 'entrega'

interface SegmentoCronograma {
  id: string
  inicio: Date
  fin: Date
  variante: 'objetivo' | 'iniciativa' | 'plan'
  origen: 'plan_propio' | 'fallback_ventana_plan' | 'fallback_agregado_hijos'
}

interface FilaCronograma {
  id: string
  claveExpansion: string
  tipo: TipoFilaCronograma
  nivel: number
  titulo: string
  estado: EstadoRegistro | null
  resumen: string
  detalle: string
  rangoFechas: string | null
  contextoTemporal: string | null
  tieneHijos: boolean
  expandido: boolean
  segmentos: SegmentoCronograma[]
  entregaAtrasada: boolean
}

interface FilaExportableCronograma {
  nivel: 'Objetivo' | 'Iniciativa' | 'Entregable'
  nombre: string
  descripcion: string
  estado: string
  padre: string
  objetivo: string
  iniciativa: string
  fechaInicio: string
  fechaFin: string
  fechaObjetivo: string
  ventanaPlanificada: string
  ventanaReal: string
  origenTemporal: string
  rangoVisibleCronograma: string
}

interface ConstruirFilasExportablesCronogramaParams {
  objetivos: Objetivo[]
  iniciativas: Iniciativa[]
  entregas: Entrega[]
  ventanasPorId: ReadonlyMap<string, CatalogoVentanaPm>
  vistaTemporal: VistaTemporal
  anioSeleccionado: number
  trimestreSeleccionado: number
  rangoTemporal: RangoCronogramaBase
}

interface TooltipCronogramaProps {
  content: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
  disabled?: boolean
  maxWidthClassName?: string
}

interface RangoCronogramaBase {
  inicio: Date
  fin: Date
}

interface RangoTemporalCronograma extends RangoCronogramaBase {
  origen: SegmentoCronograma['origen']
}

interface ReleaseCronogramaVisual {
  id: string
  fecha: Date
  fechaFormateada: string
  origenFecha: 'real' | 'programada'
  nombre: string
  nombreCorto: string
  descripcion: string | null
  estado: ReleasePm['estado']
  tipo: ReleasePm['tipo_release']
  objetivoId: string | null
  objetivo: string | null
  iniciativa: string | null
  entrega: string | null
  alcance: 'objetivo' | 'roadmap' | 'transversal'
}

interface ReleaseCronogramaPosicionado extends ReleaseCronogramaVisual {
  filaEtiqueta: number
  anchoEtiquetaPx: number
  posicionNodoPx: number
  posicionEtiquetaPx: number
}

type ModalContextualCronograma =
  | { tipo: 'objetivo'; modo: ModoModalRoadmap; entidad: Objetivo | null }
  | { tipo: 'iniciativa'; modo: ModoModalRoadmap; entidad: Iniciativa | null }
  | { tipo: 'entrega'; modo: ModoModalRoadmap; entidad: Entrega | null }
  | null

const FILA_SIN_OBJETIVO = '__sin_objetivo__'
const FILA_SIN_INICIATIVA = '__sin_iniciativa__'
const ANCHO_MES = 140
const ANCHO_COLUMNA_JERARQUIA_MIN = 320
const ANCHO_COLUMNA_JERARQUIA_MAX = 560
const ANCHO_COLUMNA_JERARQUIA_POR_DEFECTO = 392
const CLAVE_ANCHO_COLUMNA_JERARQUIA = 'pm-portal-roadmap-cronograma-ancho-jerarquia'
const CLAVE_OBJETIVOS_EXPANDIDOS = 'pm-portal-roadmap-cronograma-objetivos-expandidos'
const CLAVE_INICIATIVAS_EXPANDIDAS = 'pm-portal-roadmap-cronograma-iniciativas-expandidas'
const CLAVE_RESUMEN_VISIBLE = 'pm-portal-roadmap-cronograma-resumen-visible'
const CLAVE_RELEASES_VISIBLE = 'pm-portal-roadmap-cronograma-releases-visible'
const CLAVE_PREFERENCIAS_TEMPORALES = 'pm-portal-roadmap-cronograma-preferencias-temporales'
const CLAVE_TOOLTIPS_VISIBLES = 'pm-portal-roadmap-cronograma-tooltips-visible'
const ALTURA_MINIMA_FILA_CRONOGRAMA = 48
const ALTURA_SEGMENTO_CRONOGRAMA = 8
const ALTURA_BANDA_RELEASES = 92
const POSICION_LINEA_RELEASES = 22
const TOTAL_FILAS_ETIQUETA_RELEASES = 2
const DESPLAZAMIENTO_OPTICO_ETIQUETA_RELEASE = 6
const INDENTACION_POR_NIVEL_CRONOGRAMA = 14
const ANCHO_MARCADOR_JERARQUIA = 22
const ALTURA_VISTA_CUERPO_CRONOGRAMA = 'min(68vh, 720px)'
const ESTILO_TITULO_DOS_LINEAS: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
}
const ContextoTooltipsCronograma = createContext(true)
const formateadorFechaReleaseVisual = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: '2-digit'
})

function limitarAnchoColumnaJerarquia(valor: number) {
  return Math.min(Math.max(valor, ANCHO_COLUMNA_JERARQUIA_MIN), ANCHO_COLUMNA_JERARQUIA_MAX)
}

function formatearFechaReleaseVisual(fecha: Date) {
  return formateadorFechaReleaseVisual.format(fecha)
}

function TooltipCronograma({
  content,
  children,
  className,
  style,
  disabled = false,
  maxWidthClassName = 'max-w-xs'
}: TooltipCronogramaProps) {
  const tooltipsHabilitados = useContext(ContextoTooltipsCronograma)
  const tooltipsDeshabilitados = disabled || !tooltipsHabilitados
  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState({ x: 0, y: 0, transform: 'translate(-50%, -100%)' })
  const anclaRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLSpanElement | null>(null)

  const actualizarPosicion = (elemento: HTMLElement, dimensiones?: { ancho: number; alto: number }) => {
    const rect = elemento.getBoundingClientRect()
    const anchoTooltip = dimensiones?.ancho ?? 240
    const altoTooltip = dimensiones?.alto ?? 88
    const margenViewport = 12
    const espacioSuperior = rect.top
    const espacioInferior = window.innerHeight - rect.bottom
    const mostrarDebajo = espacioSuperior < altoTooltip + 20 && espacioInferior > altoTooltip + 20
    const centro = rect.left + rect.width / 2
    const posicionX = Math.min(
      Math.max(centro, margenViewport + anchoTooltip / 2),
      window.innerWidth - margenViewport - anchoTooltip / 2
    )

    setPosicion({
      x: posicionX,
      y: mostrarDebajo ? rect.bottom + 10 : rect.top - 10,
      transform: mostrarDebajo ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
    })
  }

  useEffect(() => {
    if (!abierto || !anclaRef.current || !tooltipRef.current) {
      return
    }

    const recalcular = () => {
      if (!anclaRef.current || !tooltipRef.current) {
        return
      }

      const rectTooltip = tooltipRef.current.getBoundingClientRect()
      actualizarPosicion(anclaRef.current, { ancho: rectTooltip.width, alto: rectTooltip.height })
    }

    recalcular()

    window.addEventListener('resize', recalcular)
    window.addEventListener('scroll', recalcular, true)

    return () => {
      window.removeEventListener('resize', recalcular)
      window.removeEventListener('scroll', recalcular, true)
    }
  }, [abierto])

  const abrirTooltip = (elemento: HTMLElement) => {
    if (tooltipsDeshabilitados) {
      return
    }

    anclaRef.current = elemento
    actualizarPosicion(elemento)
    setAbierto(true)
  }

  const manejarMouseEnter = (evento: MouseEvent<HTMLSpanElement>) => {
    if (tooltipsDeshabilitados) {
      return
    }

    abrirTooltip(evento.currentTarget)
  }

  const manejarMouseMove = (evento: MouseEvent<HTMLSpanElement>) => {
    if (tooltipsDeshabilitados || !abierto) {
      return
    }

    anclaRef.current = evento.currentTarget
    actualizarPosicion(evento.currentTarget)
  }

  const manejarFocus = (evento: FocusEvent<HTMLSpanElement>) => {
    if (tooltipsDeshabilitados) {
      return
    }

    abrirTooltip(evento.currentTarget)
  }

  useEffect(() => {
    if (tooltipsDeshabilitados && abierto) {
      setAbierto(false)
    }
  }, [abierto, tooltipsDeshabilitados])

  return (
    <span
      className={className}
      style={style}
      onMouseEnter={manejarMouseEnter}
      onMouseMove={manejarMouseMove}
      onMouseLeave={() => setAbierto(false)}
      onFocus={manejarFocus}
      onBlur={() => setAbierto(false)}
    >
      {children}
      {abierto ? (
        <span
          ref={tooltipRef}
          className={`pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-900 shadow-2xl shadow-slate-900/12 [&_p]:!text-inherit [&_span]:!text-inherit dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:shadow-black/25 ${maxWidthClassName}`}
          style={{ left: posicion.x, top: posicion.y, transform: posicion.transform }}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}

function IconoFiltros({ abierto }: { abierto: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M3 5h14M6 10h8M8 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d={abierto ? 'M14 8l-4 4-4-4' : 'M6 8l4 4 4-4'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoExportarCronograma() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 3.5v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.75 8.75 10 12l3.25-3.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 16.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

  function normalizarTextoBusqueda(valor: string) {
    return valor
      .trim()
      .toLocaleLowerCase('es-PE')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }

  function coincideTextoBusqueda(texto: string, termino: string) {
    if (!termino) {
      return true
    }

    return normalizarTextoBusqueda(texto).includes(termino)
  }

function IconoResumen() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <rect x="3.5" y="4" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4v12M3.5 8.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconoReleases() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M3.5 10h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="10" r="2" fill="currentColor" />
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.78" />
      <circle cx="14" cy="10" r="2" fill="currentColor" opacity="0.58" />
    </svg>
  )
}

function IconoExpandirCronograma({ expandido }: { expandido: boolean }) {
  return expandido ? (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7 3.5H3.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 3.5h3.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16.5H3.5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 16.5h3.5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 8l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12 3.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M8 3.5H3.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3.5h4.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16.5H3.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16.5h4.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 8l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12 3.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

  function IconoBusqueda() {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

  function IconoCerrarBusqueda() {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }

function IconoChevron({ abierto }: { abierto: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`h-3.5 w-3.5 transition ${abierto ? 'rotate-90' : ''}`}>
      <path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function normalizarVistaTemporal(valor: string | null): VistaTemporal {
  return valor === 'trimestre' ? 'trimestre' : 'anio'
}

function normalizarNumero(valor: string | null, respaldo: number) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : respaldo
}

function normalizarTrimestre(valor: string | null) {
  const trimestre = Number(valor)
  return trimestre >= 1 && trimestre <= 4 ? trimestre : 1
}

function leerPreferenciasTemporalesPersistidas() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const guardado = window.localStorage.getItem(CLAVE_PREFERENCIAS_TEMPORALES)
    if (!guardado) {
      return null
    }

    const preferencias = JSON.parse(guardado) as {
      vista?: string
      anio?: number | string
      trimestre?: number | string
    }

    return {
      vistaTemporal: normalizarVistaTemporal(preferencias.vista ?? null),
      anioSeleccionado: normalizarNumero(
        preferencias.anio === undefined ? null : String(preferencias.anio),
        new Date().getFullYear()
      ),
      trimestreSeleccionado: normalizarTrimestre(
        preferencias.trimestre === undefined ? null : String(preferencias.trimestre)
      )
    }
  } catch {
    return null
  }
}

function leerPreferenciaTooltipsPersistida() {
  if (typeof window === 'undefined') {
    return true
  }

  return window.localStorage.getItem(CLAVE_TOOLTIPS_VISIBLES) !== 'false'
}

function leerPreferenciaReleasesPersistida() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(CLAVE_RELEASES_VISIBLE) === 'true'
}

function parsearFechaPortal(fecha: string | null | undefined) {
  if (!fecha) {
    return null
  }

  const fechaDate = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`)
  if (Number.isNaN(fechaDate.getTime())) {
    return null
  }

  fechaDate.setHours(0, 0, 0, 0)
  return fechaDate
}

function diferenciaDias(inicio: Date, fin: Date) {
  const milisegundos = fin.getTime() - inicio.getTime()
  return Math.floor(milisegundos / 86400000)
}

function fechaDentroDeRango(fecha: Date, inicio: Date, fin: Date) {
  return fecha.getTime() >= inicio.getTime() && fecha.getTime() <= fin.getTime()
}

function rangoSeSuperpone(inicio: Date, fin: Date, rangoInicio: Date, rangoFin: Date) {
  return inicio.getTime() <= rangoFin.getTime() && fin.getTime() >= rangoInicio.getTime()
}

function formatearMesCorto(fecha: Date) {
  return new Intl.DateTimeFormat('es-PE', { month: 'short' }).format(fecha)
}

function formatearFechaLarga(fecha: Date) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(fecha)
}

function formatearAnio(fecha: Date) {
  return new Intl.DateTimeFormat('es-PE', { year: 'numeric' }).format(fecha)
}

function formatearRangoFechas(inicio: Date, fin: Date) {
  return `${formatearFechaCorta(inicio.toISOString().slice(0, 10))} - ${formatearFechaCorta(fin.toISOString().slice(0, 10))}`
}

function resumirEtiquetaRelease(valor: string, longitudMaxima = 24) {
  const texto = valor.trim()
  if (texto.length <= longitudMaxima) {
    return texto
  }

  return `${texto.slice(0, Math.max(longitudMaxima - 1, 1)).trimEnd()}…`
}

function obtenerClaseBadgeEstado(estado: EstadoRegistro | null) {
  if (estado === 'completado') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
  }

  if (estado === 'en_progreso') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
}

function obtenerClaseFila(fila: FilaCronograma, activa: boolean) {
  const base =
    fila.tipo === 'objetivo'
      ? 'bg-slate-50/90 dark:bg-slate-950/50'
      : fila.tipo === 'iniciativa'
        ? 'bg-white dark:bg-slate-900'
        : 'bg-white dark:bg-slate-900/95'

  const destacada =
    fila.tipo === 'objetivo'
      ? 'bg-slate-100/95 shadow-[inset_2px_0_0_rgba(71,85,105,0.26),inset_0_0_0_1px_rgba(148,163,184,0.24)] dark:bg-slate-800/78 dark:shadow-[inset_2px_0_0_rgba(148,163,184,0.2),inset_0_0_0_1px_rgba(71,85,105,0.48)]'
      : fila.tipo === 'iniciativa'
        ? 'bg-sky-50/70 shadow-[inset_2px_0_0_rgba(14,165,233,0.22),inset_0_0_0_1px_rgba(148,163,184,0.16)] dark:bg-slate-800/62 dark:shadow-[inset_2px_0_0_rgba(56,189,248,0.28),inset_0_0_0_1px_rgba(71,85,105,0.38)]'
        : 'bg-slate-50/95 shadow-[inset_2px_0_0_rgba(148,163,184,0.18),inset_0_0_0_1px_rgba(148,163,184,0.14)] dark:bg-slate-800/48 dark:shadow-[inset_2px_0_0_rgba(100,116,139,0.28),inset_0_0_0_1px_rgba(71,85,105,0.34)]'

  return `${base} ${activa ? destacada : ''} transition-[background-color,box-shadow] duration-150`
}

function obtenerClaseTituloFila(fila: FilaCronograma) {
  if (fila.tipo === 'objetivo') {
    return 'text-sm font-semibold leading-[1.15rem] text-slate-900 dark:text-slate-100'
  }

  if (fila.tipo === 'iniciativa') {
    return 'text-[13px] font-semibold leading-[1.1rem] text-slate-900 dark:text-slate-100'
  }

  return 'text-[13px] font-medium leading-[1.1rem] text-slate-700 dark:text-slate-200'
}

function obtenerClaseControlExpansion(fila: FilaCronograma, activa: boolean) {
  if (fila.tipo === 'objetivo') {
    return `h-[22px] w-[22px] border text-slate-700 shadow-sm transition ${
      activa
        ? 'border-slate-500 bg-slate-200/90 dark:border-slate-500 dark:bg-slate-700/85 dark:text-slate-100'
        : 'border-slate-400/90 bg-slate-100 text-slate-700 hover:border-slate-500 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700'
    }`
  }

  return `h-5 w-5 border text-slate-500 transition ${
    activa
      ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/70 dark:bg-sky-500/10 dark:text-sky-200'
      : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'
  }`
}

function obtenerClaseIndicadorTerminal(fila: FilaCronograma) {
  if (fila.tipo === 'objetivo') {
    return 'bg-slate-300/80 dark:bg-slate-600/80'
  }

  if (fila.tipo === 'iniciativa') {
    return 'bg-slate-300/70 dark:bg-slate-700/80'
  }

  return 'bg-slate-200/90 dark:bg-slate-700/55'
}

function obtenerEstiloSegmento(variante: SegmentoCronograma['variante']) {
  if (variante === 'objetivo') {
    return {
      className: 'bg-slate-500 shadow-sm shadow-slate-500/20 ring-1 ring-inset ring-slate-600/15 dark:bg-slate-400 dark:shadow-slate-950/20 dark:ring-slate-200/10',
      top: 20,
      height: ALTURA_SEGMENTO_CRONOGRAMA,
      borderRadius: 9999
    }
  }

  if (variante === 'iniciativa') {
    return {
      className: 'bg-teal-500 shadow-sm shadow-teal-600/20 ring-1 ring-inset ring-teal-700/12 dark:bg-teal-400 dark:shadow-teal-950/20 dark:ring-teal-100/10',
      top: 20,
      height: ALTURA_SEGMENTO_CRONOGRAMA,
      borderRadius: 9999
    }
  }

  return {
    className: 'bg-orange-400 shadow-sm shadow-orange-500/20 ring-1 ring-inset ring-orange-600/12 dark:bg-orange-300 dark:shadow-orange-950/20 dark:ring-orange-100/10',
    top: 20,
    height: ALTURA_SEGMENTO_CRONOGRAMA,
    borderRadius: 9999
  }
}

function compararFechasAscendente(fechaA: Date, fechaB: Date) {
  return fechaA.getTime() - fechaB.getTime()
}

function fechaRelease(release: ReleasePm) {
  return parsearFechaPortal(release.fecha_lanzamiento_real ?? release.fecha_programada)
}

function normalizarTextoRelease(valor: string | null | undefined) {
  const texto = valor?.trim()
  return texto ? texto : null
}

function resolverContextoVisualRelease(
  release: ReleasePm,
  iniciativasPorId: ReadonlyMap<string, Iniciativa>,
  entregasPorId: ReadonlyMap<string, Entrega>,
  objetivosPorId: ReadonlyMap<string, Objetivo>
) {
  const entrega = release.entrega_id ? entregasPorId.get(release.entrega_id) ?? null : null
  const iniciativaDirecta = release.iniciativa_id ? iniciativasPorId.get(release.iniciativa_id) ?? null : null
  const iniciativaDesdeEntrega = entrega?.iniciativa_id ? iniciativasPorId.get(entrega.iniciativa_id) ?? null : null
  const iniciativaRelacionada = iniciativaDirecta ?? iniciativaDesdeEntrega
  const objetivoId = iniciativaRelacionada?.objetivo_id ?? null
  const objetivo = objetivoId ? objetivosPorId.get(objetivoId)?.nombre ?? null : null

  return {
    objetivoId,
    objetivo,
    iniciativa: iniciativaRelacionada?.nombre ?? null,
    entrega: entrega?.nombre ?? null,
    alcance: objetivo
      ? ('objetivo' as const)
      : iniciativaRelacionada || entrega
        ? ('roadmap' as const)
        : ('transversal' as const)
  }
}

function esEntregaAtrasada(entrega: Entrega, hoy: Date) {
  const fechaObjetivo = parsearFechaPortal(entrega.fecha_objetivo)
  return Boolean(fechaObjetivo && fechaObjetivo.getTime() < hoy.getTime() && entrega.estado !== 'completado')
}

function registrarAniosRango(anios: Set<number>, rango: RangoCronogramaBase | null) {
  if (!rango) {
    return
  }

  anios.add(rango.inicio.getFullYear())
  anios.add(rango.fin.getFullYear())
}

function obtenerRangoVentana(ventanaId: string | null, ventanasPorId: ReadonlyMap<string, CatalogoVentanaPm>) {
  if (!ventanaId) {
    return null
  }

  const ventana = ventanasPorId.get(ventanaId)
  if (!ventana) {
    return null
  }

  const inicio = parsearFechaPortal(ventana.fecha_inicio)
  const fin = parsearFechaPortal(ventana.fecha_fin)
  if (!inicio || !fin) {
    return null
  }

  return {
    inicio,
    fin,
    etiqueta: ventana.etiqueta_visible
  }
}

function obtenerRangoFechasPropias(fechaInicio: string | null | undefined, fechaFin: string | null | undefined) {
  const inicio = parsearFechaPortal(fechaInicio)
  const fin = parsearFechaPortal(fechaFin)

  if (!inicio || !fin) {
    return null
  }

  return { inicio, fin } satisfies RangoCronogramaBase
}

function obtenerRangoPlanObjetivo(objetivo: Objetivo, segmentosRespaldo: SegmentoCronograma[]) {
  const rangoPropio = obtenerRangoFechasPropias(objetivo.fecha_inicio, objetivo.fecha_fin)

  if (rangoPropio) {
    return {
      ...rangoPropio,
      origen: 'plan_propio'
    } satisfies RangoTemporalCronograma
  }

  if (segmentosRespaldo.length === 0) {
    return null
  }

  const segmentosOrdenadosPorInicio = [...segmentosRespaldo].sort((a, b) => compararFechasAscendente(a.inicio, b.inicio))
  const segmentosOrdenadosPorFin = [...segmentosRespaldo].sort((a, b) => compararFechasAscendente(a.fin, b.fin))

  return {
    inicio: segmentosOrdenadosPorInicio[0].inicio,
    fin: segmentosOrdenadosPorFin[segmentosOrdenadosPorFin.length - 1].fin,
    origen: 'fallback_agregado_hijos'
  } satisfies RangoTemporalCronograma
}

function obtenerRangoPlanIniciativa(iniciativa: Iniciativa, ventanasPorId: ReadonlyMap<string, CatalogoVentanaPm>) {
  const rangoPropio = obtenerRangoFechasPropias(iniciativa.fecha_inicio, iniciativa.fecha_fin)

  if (rangoPropio) {
    return {
      ...rangoPropio,
      origen: 'plan_propio'
    } satisfies RangoTemporalCronograma
  }

  const rangoVentana = obtenerRangoVentana(iniciativa.ventana_planificada_id, ventanasPorId)
  if (!rangoVentana) {
    return null
  }

  return {
    inicio: rangoVentana.inicio,
    fin: rangoVentana.fin,
    origen: 'fallback_ventana_plan'
  } satisfies RangoTemporalCronograma
}

function obtenerRangoPlanEntrega(entrega: Entrega, ventanasPorId: ReadonlyMap<string, CatalogoVentanaPm>) {
  const rangoPropio = obtenerRangoFechasPropias(entrega.fecha_inicio, entrega.fecha_fin)

  if (rangoPropio) {
    return {
      ...rangoPropio,
      origen: 'plan_propio'
    } satisfies RangoTemporalCronograma
  }

  const rangoVentana = obtenerRangoVentana(entrega.ventana_planificada_id, ventanasPorId)
  if (!rangoVentana) {
    return null
  }

  return {
    inicio: rangoVentana.inicio,
    fin: rangoVentana.fin,
    origen: 'fallback_ventana_plan'
  } satisfies RangoTemporalCronograma
}

function coincideFiltroVentanaEntrega(
  entrega: Entrega,
  filtroVentana: string,
  ventanasPorId: ReadonlyMap<string, CatalogoVentanaPm>
) {
  if (filtroVentana === 'todas') {
    return true
  }

  const rangoPlanVisible = obtenerRangoPlanEntrega(entrega, ventanasPorId)
  if (!rangoPlanVisible) {
    return false
  }

  if (rangoPlanVisible.origen === 'fallback_ventana_plan') {
    return entrega.ventana_planificada_id === filtroVentana
  }

  const rangoVentanaFiltro = obtenerRangoVentana(filtroVentana, ventanasPorId)
  if (!rangoVentanaFiltro) {
    return false
  }

  return rangoSeSuperpone(
    rangoPlanVisible.inicio,
    rangoPlanVisible.fin,
    rangoVentanaFiltro.inicio,
    rangoVentanaFiltro.fin
  )
}

function construirSegmento(
  inicio: Date | null,
  fin: Date | null,
  id: string,
  variante: SegmentoCronograma['variante'],
  origen: SegmentoCronograma['origen']
) {
  if (!inicio || !fin) {
    return null
  }

  return {
    id,
    inicio,
    fin,
    variante,
    origen
  } satisfies SegmentoCronograma
}

function describirContextoTemporalRango(tipo: TipoFilaCronograma, origen: SegmentoCronograma['origen']) {
  if (origen === 'plan_propio') {
    if (tipo === 'objetivo') {
      return 'Rango planificado del objetivo'
    }

    if (tipo === 'iniciativa') {
      return 'Rango planificado de la iniciativa'
    }

    return 'Rango planificado del entregable'
  }

  if (origen === 'fallback_agregado_hijos') {
    return 'Rango derivado de iniciativas y entregables'
  }

  return 'Ventana planificada usada como respaldo'
}

function serializarFechaCronograma(fecha: Date | null | undefined) {
  if (!fecha) {
    return ''
  }

  const anio = String(fecha.getFullYear())
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function obtenerEtiquetaVentana(
  ventanaId: string | null | undefined,
  ventanasPorId: ReadonlyMap<string, CatalogoVentanaPm>,
  etiquetaVacia = ''
) {
  if (!ventanaId) {
    return etiquetaVacia
  }

  return ventanasPorId.get(ventanaId)?.etiqueta_visible ?? etiquetaVacia
}

function construirEtiquetaRangoVisibleCronograma(
  vistaTemporal: VistaTemporal,
  anioSeleccionado: number,
  trimestreSeleccionado: number,
  rangoTemporal: RangoCronogramaBase
) {
  const etiquetaVista =
    vistaTemporal === 'trimestre' ? `${anioSeleccionado} · T${trimestreSeleccionado}` : `${anioSeleccionado} · Anual`

  return `${etiquetaVista} (${serializarFechaCronograma(rangoTemporal.inicio)} a ${serializarFechaCronograma(rangoTemporal.fin)})`
}

function construirNombreArchivoExportacionCronograma(vistaTemporal: VistaTemporal, anioSeleccionado: number, trimestreSeleccionado: number) {
  const sufijoPeriodo = vistaTemporal === 'trimestre' ? `t${trimestreSeleccionado}` : 'anual'

  return `roadmap-cronograma-${anioSeleccionado}-${sufijoPeriodo}.csv`
}

function construirFilasExportablesCronograma({
  objetivos,
  iniciativas,
  entregas,
  ventanasPorId,
  vistaTemporal,
  anioSeleccionado,
  trimestreSeleccionado,
  rangoTemporal
}: ConstruirFilasExportablesCronogramaParams) {
  const filas: FilaExportableCronograma[] = []
  const rangoVisibleCronograma = construirEtiquetaRangoVisibleCronograma(
    vistaTemporal,
    anioSeleccionado,
    trimestreSeleccionado,
    rangoTemporal
  )
  const iniciativasPorId = new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa]))
  const nombreObjetivoPorId = new Map<string, string>([[FILA_SIN_OBJETIVO, 'Sin objetivo asignado']])
  const iniciativasPorObjetivo = iniciativas.reduce((mapa, iniciativa) => {
    const claveObjetivo = iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO
    const actuales = mapa.get(claveObjetivo) ?? []
    mapa.set(claveObjetivo, [...actuales, iniciativa])
    return mapa
  }, new Map<string, Iniciativa[]>())
  const entregasPorIniciativa = entregas.reduce((mapa, entrega) => {
    if (!entrega.iniciativa_id) {
      return mapa
    }

    const actuales = mapa.get(entrega.iniciativa_id) ?? []
    mapa.set(entrega.iniciativa_id, [...actuales, entrega])
    return mapa
  }, new Map<string, Entrega[]>())
  const entregasSinIniciativa = entregas.filter((entrega) => !entrega.iniciativa_id)

  objetivos.forEach((objetivo) => {
    nombreObjetivoPorId.set(objetivo.id, objetivo.nombre)
  })

  const construirFilaEntrega = (entrega: Entrega) => {
    const iniciativa = entrega.iniciativa_id ? iniciativasPorId.get(entrega.iniciativa_id) ?? null : null
    const nombreObjetivo = nombreObjetivoPorId.get(iniciativa?.objetivo_id ?? FILA_SIN_OBJETIVO) ?? 'Sin objetivo asignado'
    const nombreIniciativa = iniciativa?.nombre ?? 'Sin iniciativa asignada'
    const rangoEntrega = obtenerRangoPlanEntrega(entrega, ventanasPorId)

    filas.push({
      nivel: 'Entregable',
      nombre: entrega.nombre,
      descripcion: entrega.descripcion,
      estado: formatearEstadoLegible(entrega.estado),
      padre: nombreIniciativa,
      objetivo: nombreObjetivo,
      iniciativa: nombreIniciativa,
      fechaInicio: normalizarFechaPortal(entrega.fecha_inicio),
      fechaFin: normalizarFechaPortal(entrega.fecha_fin),
      fechaObjetivo: normalizarFechaPortal(entrega.fecha_objetivo),
      ventanaPlanificada: obtenerEtiquetaVentana(entrega.ventana_planificada_id, ventanasPorId),
      ventanaReal: obtenerEtiquetaVentana(entrega.ventana_real_id, ventanasPorId),
      origenTemporal: rangoEntrega ? describirContextoTemporalRango('entrega', rangoEntrega.origen) : '',
      rangoVisibleCronograma
    })
  }

  const construirFilaIniciativa = (iniciativa: Iniciativa) => {
    const nombreObjetivo = nombreObjetivoPorId.get(iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO) ?? 'Sin objetivo asignado'
    const rangoIniciativa = obtenerRangoPlanIniciativa(iniciativa, ventanasPorId)

    filas.push({
      nivel: 'Iniciativa',
      nombre: iniciativa.nombre,
      descripcion: iniciativa.descripcion,
      estado: formatearEstadoLegible(iniciativa.estado),
      padre: nombreObjetivo,
      objetivo: nombreObjetivo,
      iniciativa: iniciativa.nombre,
      fechaInicio: normalizarFechaPortal(iniciativa.fecha_inicio),
      fechaFin: normalizarFechaPortal(iniciativa.fecha_fin),
      fechaObjetivo: '',
      ventanaPlanificada: obtenerEtiquetaVentana(iniciativa.ventana_planificada_id, ventanasPorId),
      ventanaReal: '',
      origenTemporal: rangoIniciativa ? describirContextoTemporalRango('iniciativa', rangoIniciativa.origen) : '',
      rangoVisibleCronograma
    })

    ;(entregasPorIniciativa.get(iniciativa.id) ?? []).forEach(construirFilaEntrega)
  }

  objetivos
    .filter((objetivo) => objetivo.id !== FILA_SIN_OBJETIVO)
    .forEach((objetivo) => {
      const iniciativasObjetivo = iniciativasPorObjetivo.get(objetivo.id) ?? []
      const segmentosRespaldo = iniciativasObjetivo.flatMap((iniciativa) => {
        const rangoIniciativa = obtenerRangoPlanIniciativa(iniciativa, ventanasPorId)
        const segmento = rangoIniciativa
          ? construirSegmento(rangoIniciativa.inicio, rangoIniciativa.fin, `export-iniciativa-${iniciativa.id}`, 'iniciativa', rangoIniciativa.origen)
          : null

        return segmento ? [segmento] : []
      })
      const rangoObjetivo = obtenerRangoPlanObjetivo(objetivo, segmentosRespaldo)

      filas.push({
        nivel: 'Objetivo',
        nombre: objetivo.nombre,
        descripcion: objetivo.descripcion,
        estado: formatearEstadoLegible(objetivo.estado),
        padre: '',
        objetivo: objetivo.nombre,
        iniciativa: '',
        fechaInicio: normalizarFechaPortal(objetivo.fecha_inicio),
        fechaFin: normalizarFechaPortal(objetivo.fecha_fin),
        fechaObjetivo: '',
        ventanaPlanificada: '',
        ventanaReal: '',
        origenTemporal: rangoObjetivo ? describirContextoTemporalRango('objetivo', rangoObjetivo.origen) : '',
        rangoVisibleCronograma
      })

      iniciativasObjetivo.forEach(construirFilaIniciativa)
    })

  ;(iniciativasPorObjetivo.get(FILA_SIN_OBJETIVO) ?? []).forEach(construirFilaIniciativa)
  entregasSinIniciativa.forEach(construirFilaEntrega)

  return filas
}

function estadoDominante(estados: EstadoRegistro[]) {
  if (estados.includes('en_progreso')) {
    return 'en_progreso'
  }

  if (estados.includes('pendiente')) {
    return 'pendiente'
  }

  return estados[0] ?? null
}

export function PaginaCronogramaRoadmap() {
  const { rol } = useSesionPortalPM()
  const hoy = useMemo(() => {
    const fecha = new Date()
    fecha.setHours(0, 0, 0, 0)
    return fecha
  }, [])
  const [searchParams, setSearchParams] = useSearchParams()
  const preferenciasTemporalesPersistidas = useMemo(() => {
    const tieneParametrosTemporales = Boolean(
      searchParams.get('vista') || searchParams.get('anio') || searchParams.get('trimestre')
    )

    return tieneParametrosTemporales ? null : leerPreferenciasTemporalesPersistidas()
  }, [searchParams])
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [releases, setReleases] = useState<ReleasePm[]>([])
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [etapas, setEtapas] = useState<CatalogoEtapaPm[]>([])
  const [configuracionRice, setConfiguracionRice] = useState<ConfiguracionRice | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vistaTemporal, setVistaTemporal] = useState<VistaTemporal>(() => {
    return preferenciasTemporalesPersistidas?.vistaTemporal ?? normalizarVistaTemporal(searchParams.get('vista'))
  })
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => {
    return preferenciasTemporalesPersistidas?.anioSeleccionado ?? normalizarNumero(searchParams.get('anio'), new Date().getFullYear())
  })
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(() => {
    return preferenciasTemporalesPersistidas?.trimestreSeleccionado ?? normalizarTrimestre(searchParams.get('trimestre'))
  })
  const [filtroObjetivo, setFiltroObjetivo] = useState(() => searchParams.get('objetivo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoRegistro>(() => {
    const valor = searchParams.get('estado')
    return valor === 'pendiente' || valor === 'en_progreso' || valor === 'completado' ? valor : 'todos'
  })
  const [filtroVentana, setFiltroVentana] = useState(() => searchParams.get('ventana') ?? 'todas')
  const [busquedaCronograma, setBusquedaCronograma] = useState('')
  const [anchoColumnaJerarquia, setAnchoColumnaJerarquia] = useState(() => {
    if (typeof window === 'undefined') {
      return ANCHO_COLUMNA_JERARQUIA_POR_DEFECTO
    }

    const anchoPersistido = Number(window.localStorage.getItem(CLAVE_ANCHO_COLUMNA_JERARQUIA))
    return Number.isFinite(anchoPersistido)
      ? limitarAnchoColumnaJerarquia(anchoPersistido)
      : ANCHO_COLUMNA_JERARQUIA_POR_DEFECTO
  })
  const [objetivosExpandidos, setObjetivosExpandidos] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const guardado = window.localStorage.getItem(CLAVE_OBJETIVOS_EXPANDIDOS)
      return guardado ? (JSON.parse(guardado) as string[]) : []
    } catch {
      return []
    }
  })
  const [iniciativasExpandidas, setIniciativasExpandidas] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const guardado = window.localStorage.getItem(CLAVE_INICIATIVAS_EXPANDIDAS)
      return guardado ? (JSON.parse(guardado) as string[]) : []
    } catch {
      return []
    }
  })
  const [resumenVisible, setResumenVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(CLAVE_RESUMEN_VISIBLE) === 'true'
  })
  const [releasesVisible, setReleasesVisible] = useState(leerPreferenciaReleasesPersistida)
  const [tooltipsVisibles, setTooltipsVisibles] = useState(leerPreferenciaTooltipsPersistida)
  const [redimensionandoJerarquia, setRedimensionandoJerarquia] = useState(false)
  const [cronogramaExpandido, setCronogramaExpandido] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(() => {
    return Boolean(searchParams.get('objetivo') || searchParams.get('estado') || searchParams.get('ventana'))
  })
  const contenedorFullscreenCronogramaRef = useRef<HTMLDivElement | null>(null)
  const contenedorScrollRef = useRef<HTMLDivElement | null>(null)
  const encabezadoTimelineRef = useRef<HTMLDivElement | null>(null)
  const cuerpoTimelineRef = useRef<HTMLDivElement | null>(null)
  const bandaReleasesTimelineRef = useRef<HTMLDivElement | null>(null)
  const referenciasFilasJerarquiaRef = useRef<Array<HTMLDivElement | null>>([])
  const sincronizandoScrollHorizontalRef = useRef<'encabezado' | 'cuerpo' | 'releases' | null>(null)
  const ejecutivoInicializadoRef = useRef(false)
  const [alturasFilas, setAlturasFilas] = useState<number[]>([])
  const [filaActiva, setFilaActiva] = useState<string | null>(null)
  const [menuAbiertoFilaId, setMenuAbiertoFilaId] = useState<string | null>(null)
  const [menuCrearAbierto, setMenuCrearAbierto] = useState(false)
  const [menuPersonalizacionAbierto, setMenuPersonalizacionAbierto] = useState(false)
  const [modalContextual, setModalContextual] = useState<ModalContextualCronograma>(null)
  const busquedaCronogramaDiferida = useDeferredValue(busquedaCronograma)

  const esEdicionPermitida = puedeEditar(rol)
  const terminoBusquedaCronograma = useMemo(
    () => normalizarTextoBusqueda(busquedaCronogramaDiferida),
    [busquedaCronogramaDiferida]
  )
  const hayBusquedaCronogramaActiva = terminoBusquedaCronograma.length > 0

  const cargarCronograma = async () => {
    setCargando(true)
    setError(null)

    try {
      const [
        objetivosData,
        iniciativasData,
        entregasData,
        releasesData,
        ventanasData,
        etapasData,
        configuracionData
      ] = await Promise.all([
        listarObjetivos(),
        listarIniciativas(),
        listarEntregas(),
        listarReleases(),
        listarVentanasPm(),
        listarEtapasPm(),
        cargarConfiguracionRice()
      ])

      setObjetivos(objetivosData)
      setIniciativas(iniciativasData)
      setEntregas(entregasData)
      setReleases(releasesData)
      setVentanas(ventanasData)
      setEtapas(etapasData)
      setConfiguracionRice(configuracionData)
    } catch (errorInterno) {
      setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el cronograma roadmap')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    void cargarCronograma()
  }, [])

  useEffect(() => {
    const parametros = new URLSearchParams(searchParams)

    parametros.set('vista', vistaTemporal)
    parametros.set('anio', String(anioSeleccionado))
    parametros.delete('densidad')

    if (vistaTemporal === 'trimestre') {
      parametros.set('trimestre', String(trimestreSeleccionado))
    } else {
      parametros.delete('trimestre')
    }

    if (filtroObjetivo === 'todos') {
      parametros.delete('objetivo')
    } else {
      parametros.set('objetivo', filtroObjetivo)
    }

    if (filtroEstado === 'todos') {
      parametros.delete('estado')
    } else {
      parametros.set('estado', filtroEstado)
    }

    if (filtroVentana === 'todas') {
      parametros.delete('ventana')
    } else {
      parametros.set('ventana', filtroVentana)
    }

    const actual = searchParams.toString()
    const siguiente = parametros.toString()
    if (actual !== siguiente) {
      setSearchParams(parametros, { replace: true })
    }
  }, [anioSeleccionado, filtroEstado, filtroObjetivo, filtroVentana, searchParams, setSearchParams, trimestreSeleccionado, vistaTemporal])

  const objetivosRealesPorId = useMemo(() => new Map(objetivos.map((objetivo) => [objetivo.id, objetivo])), [objetivos])
  const iniciativasPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa])), [iniciativas])
  const entregasPorId = useMemo(() => new Map(entregas.map((entrega) => [entrega.id, entrega])), [entregas])
  const ventanasPorId = useMemo(() => new Map(ventanas.map((ventana) => [ventana.id, ventana])), [ventanas])

  const releasesPorEntrega = useMemo(() => {
    return releases.reduce((mapa, release) => {
      if (!release.entrega_id) {
        return mapa
      }

      const actuales = mapa.get(release.entrega_id) ?? []
      mapa.set(release.entrega_id, [...actuales, release])
      return mapa
    }, new Map<string, ReleasePm[]>())
  }, [releases])

  const releasesRelacionadosPorIniciativa = useMemo(() => {
    const mapa = new Map<string, Map<string, ReleasePm>>()

    releases.forEach((release) => {
      const iniciativasRelacionadas = new Set<string>()

      if (release.iniciativa_id) {
        iniciativasRelacionadas.add(release.iniciativa_id)
      }

      if (release.entrega_id) {
        const iniciativaIdDesdeEntrega = entregasPorId.get(release.entrega_id)?.iniciativa_id
        if (iniciativaIdDesdeEntrega) {
          iniciativasRelacionadas.add(iniciativaIdDesdeEntrega)
        }
      }

      iniciativasRelacionadas.forEach((iniciativaId) => {
        const actuales = mapa.get(iniciativaId) ?? new Map<string, ReleasePm>()
        actuales.set(release.id, release)
        mapa.set(iniciativaId, actuales)
      })
    })

    return new Map(
      [...mapa.entries()].map(([iniciativaId, releasesMap]) => [iniciativaId, [...releasesMap.values()]])
    )
  }, [entregasPorId, releases])

  const aniosDisponibles = useMemo(() => {
    const anios = new Set<number>([new Date().getFullYear()])

    objetivos.forEach((objetivo) => {
      registrarAniosRango(anios, obtenerRangoFechasPropias(objetivo.fecha_inicio, objetivo.fecha_fin))
    })

    iniciativas.forEach((iniciativa) => {
      registrarAniosRango(anios, obtenerRangoFechasPropias(iniciativa.fecha_inicio, iniciativa.fecha_fin))
    })

    entregas.forEach((entrega) => {
      registrarAniosRango(anios, obtenerRangoFechasPropias(entrega.fecha_inicio, entrega.fecha_fin))
    })

    ventanas.forEach((ventana) => {
      if (typeof ventana.anio === 'number') {
        anios.add(ventana.anio)
      }

      const inicio = parsearFechaPortal(ventana.fecha_inicio)
      const fin = parsearFechaPortal(ventana.fecha_fin)
      if (inicio) {
        anios.add(inicio.getFullYear())
      }
      if (fin) {
        anios.add(fin.getFullYear())
      }
    })

    entregas.forEach((entrega) => {
      const objetivo = parsearFechaPortal(entrega.fecha_objetivo)
      const completado = parsearFechaPortal(entrega.fecha_completado)
      if (objetivo) {
        anios.add(objetivo.getFullYear())
      }
      if (completado) {
        anios.add(completado.getFullYear())
      }
    })

    releases.forEach((release) => {
      const fecha = fechaRelease(release)
      if (fecha) {
        anios.add(fecha.getFullYear())
      }
    })

    return [...anios].sort((a, b) => a - b)
  }, [entregas, iniciativas, objetivos, releases, ventanas])

  useEffect(() => {
    if (!aniosDisponibles.includes(anioSeleccionado)) {
      setAnioSeleccionado(aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear())
    }
  }, [anioSeleccionado, aniosDisponibles])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(CLAVE_ANCHO_COLUMNA_JERARQUIA, String(anchoColumnaJerarquia))
  }, [anchoColumnaJerarquia])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CLAVE_OBJETIVOS_EXPANDIDOS, JSON.stringify(objetivosExpandidos))
  }, [objetivosExpandidos])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CLAVE_INICIATIVAS_EXPANDIDAS, JSON.stringify(iniciativasExpandidas))
  }, [iniciativasExpandidas])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(CLAVE_RESUMEN_VISIBLE, String(resumenVisible))
  }, [resumenVisible])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(CLAVE_RELEASES_VISIBLE, String(releasesVisible))
  }, [releasesVisible])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(CLAVE_TOOLTIPS_VISIBLES, String(tooltipsVisibles))
  }, [tooltipsVisibles])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(
      CLAVE_PREFERENCIAS_TEMPORALES,
      JSON.stringify({
        vista: vistaTemporal,
        anio: anioSeleccionado,
        trimestre: trimestreSeleccionado
      })
    )
  }, [anioSeleccionado, trimestreSeleccionado, vistaTemporal])

  useEffect(() => {
    if (!redimensionandoJerarquia) {
      return
    }

    const manejarMouseMove = (evento: globalThis.MouseEvent) => {
      const contenedorScroll = contenedorScrollRef.current
      if (!contenedorScroll) {
        return
      }

      // Usar el contenedor externo (overflow-x-auto): su left nunca cambia al scrollear
      const rect = contenedorScroll.getBoundingClientRect()
      const nuevoAncho = limitarAnchoColumnaJerarquia(evento.clientX - rect.left)
      setAnchoColumnaJerarquia(nuevoAncho)
    }

    const manejarMouseUp = () => {
      setRedimensionandoJerarquia(false)
    }

    const cursorAnterior = document.body.style.cursor
    const seleccionAnterior = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', manejarMouseMove)
    window.addEventListener('mouseup', manejarMouseUp)

    return () => {
      document.body.style.cursor = cursorAnterior
      document.body.style.userSelect = seleccionAnterior
      window.removeEventListener('mousemove', manejarMouseMove)
      window.removeEventListener('mouseup', manejarMouseUp)
    }
  }, [redimensionandoJerarquia])

  const rangoTemporal = useMemo(() => {
    const inicio =
      vistaTemporal === 'trimestre'
        ? new Date(anioSeleccionado, (trimestreSeleccionado - 1) * 3, 1)
        : new Date(anioSeleccionado, 0, 1)
    const fin =
      vistaTemporal === 'trimestre'
        ? new Date(anioSeleccionado, trimestreSeleccionado * 3, 0)
        : new Date(anioSeleccionado, 11, 31)

    const meses: Date[] = []
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    while (cursor.getTime() <= fin.getTime()) {
      meses.push(new Date(cursor))
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return {
      inicio,
      fin,
      meses,
      totalDias: Math.max(diferenciaDias(inicio, fin) + 1, 1)
    }
  }, [anioSeleccionado, trimestreSeleccionado, vistaTemporal])

  const anchoTimeline = Math.max(rangoTemporal.meses.length * ANCHO_MES, 760)

  const iniciativasFiltradas = useMemo(() => {
    return iniciativas.filter((iniciativa) => {
      if (filtroObjetivo !== 'todos' && iniciativa.objetivo_id !== filtroObjetivo) {
        return false
      }

      if (filtroEstado !== 'todos' && iniciativa.estado !== filtroEstado) {
        return false
      }

      if (filtroVentana !== 'todas' && iniciativa.ventana_planificada_id !== filtroVentana) {
        return false
      }

      const rangoPlan = obtenerRangoPlanIniciativa(iniciativa, ventanasPorId)
      return Boolean(rangoPlan && rangoSeSuperpone(rangoPlan.inicio, rangoPlan.fin, rangoTemporal.inicio, rangoTemporal.fin))
    })
  }, [filtroEstado, filtroObjetivo, filtroVentana, iniciativas, rangoTemporal.fin, rangoTemporal.inicio, ventanasPorId])

  const entregasFiltradas = useMemo(() => {
    return entregas.filter((entrega) => {
      const iniciativa = entrega.iniciativa_id ? iniciativasPorId.get(entrega.iniciativa_id) : null
      const objetivoId = iniciativa?.objetivo_id ?? FILA_SIN_OBJETIVO

      if (filtroObjetivo !== 'todos' && objetivoId !== filtroObjetivo) {
        return false
      }

      if (filtroEstado !== 'todos' && entrega.estado !== filtroEstado) {
        return false
      }

      if (!coincideFiltroVentanaEntrega(entrega, filtroVentana, ventanasPorId)) {
        return false
      }

      const rangoPlan = obtenerRangoPlanEntrega(entrega, ventanasPorId)
      return Boolean(rangoPlan && rangoSeSuperpone(rangoPlan.inicio, rangoPlan.fin, rangoTemporal.inicio, rangoTemporal.fin))
    })
  }, [entregas, filtroEstado, filtroObjetivo, filtroVentana, iniciativasPorId, rangoTemporal.fin, rangoTemporal.inicio, ventanasPorId])

  const iniciativasVisibles = useMemo(() => {
    return iniciativas.filter((iniciativa) => {
      if (filtroObjetivo !== 'todos' && iniciativa.objetivo_id !== filtroObjetivo) {
        return false
      }

      const coincideDirecto = iniciativasFiltradas.some((actual) => actual.id === iniciativa.id)
      const tieneEntregas = entregasFiltradas.some((entrega) => entrega.iniciativa_id === iniciativa.id)
      return coincideDirecto || tieneEntregas
    })
  }, [entregasFiltradas, filtroObjetivo, iniciativas, iniciativasFiltradas])

  const objetivosVisibles = useMemo(() => {
    const idsObjetivos = new Set(iniciativasVisibles.map((iniciativa) => iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO))

    objetivos.forEach((objetivo) => {
      const rangoPropio = obtenerRangoFechasPropias(objetivo.fecha_inicio, objetivo.fecha_fin)
      if (rangoPropio && rangoSeSuperpone(rangoPropio.inicio, rangoPropio.fin, rangoTemporal.inicio, rangoTemporal.fin)) {
        idsObjetivos.add(objetivo.id)
      }
    })

    const base = objetivos.filter((objetivo) => {
      if (filtroObjetivo !== 'todos' && objetivo.id !== filtroObjetivo) {
        return false
      }

      return idsObjetivos.has(objetivo.id)
    })

    if (idsObjetivos.has(FILA_SIN_OBJETIVO)) {
      base.push({
        id: FILA_SIN_OBJETIVO,
        nombre: 'Sin objetivo asignado',
        descripcion: '',
        estado: 'pendiente',
        prioridad: 'media',
        created_at: '',
        updated_at: ''
      })
    }

    return base
  }, [filtroObjetivo, iniciativasVisibles, objetivos, rangoTemporal.fin, rangoTemporal.inicio])

  const iniciativasPorObjetivoVisible = useMemo(() => {
    return iniciativasVisibles.reduce((mapa, iniciativa) => {
      const claveObjetivo = iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO
      const actuales = mapa.get(claveObjetivo) ?? []
      mapa.set(claveObjetivo, [...actuales, iniciativa])
      return mapa
    }, new Map<string, Iniciativa[]>())
  }, [iniciativasVisibles])

  const entregasPorIniciativaVisible = useMemo(() => {
    return entregasFiltradas.reduce((mapa, entrega) => {
      if (!entrega.iniciativa_id) {
        return mapa
      }

      const actuales = mapa.get(entrega.iniciativa_id) ?? []
      mapa.set(entrega.iniciativa_id, [...actuales, entrega])
      return mapa
    }, new Map<string, Entrega[]>())
  }, [entregasFiltradas])

  const entregasSinIniciativaPorObjetivo = useMemo(() => {
    return entregasFiltradas.reduce((mapa, entrega) => {
      if (entrega.iniciativa_id) {
        return mapa
      }

      const actuales = mapa.get(FILA_SIN_OBJETIVO) ?? []
      mapa.set(FILA_SIN_OBJETIVO, [...actuales, entrega])
      return mapa
    }, new Map<string, Entrega[]>())
  }, [entregasFiltradas])

  const resultadoBusquedaCronograma = useMemo(() => {
    if (!hayBusquedaCronogramaActiva) {
      return null
    }

    const objetivosResultado = new Set<string>()
    const iniciativasResultado = new Set<string>()
    const entregasResultado = new Set<string>()
    const objetivosExpandidosBusqueda = new Set<string>()
    const iniciativasExpandidasBusqueda = new Set<string>()

    const incluirSubarbolObjetivo = (objetivoId: string) => {
      objetivosResultado.add(objetivoId)

      const iniciativasHijas = iniciativasPorObjetivoVisible.get(objetivoId) ?? []
      const entregasSinIniciativa = entregasSinIniciativaPorObjetivo.get(objetivoId) ?? []

      if (iniciativasHijas.length > 0 || entregasSinIniciativa.length > 0) {
        objetivosExpandidosBusqueda.add(objetivoId)
      }

      iniciativasHijas.forEach((iniciativa) => {
        iniciativasResultado.add(iniciativa.id)

        const entregasHijas = entregasPorIniciativaVisible.get(iniciativa.id) ?? []
        if (entregasHijas.length > 0) {
          iniciativasExpandidasBusqueda.add(iniciativa.id)
        }

        entregasHijas.forEach((entrega) => {
          entregasResultado.add(entrega.id)
        })
      })

      if (entregasSinIniciativa.length > 0) {
        iniciativasExpandidasBusqueda.add(`${objetivoId}-${FILA_SIN_INICIATIVA}`)
        entregasSinIniciativa.forEach((entrega) => {
          entregasResultado.add(entrega.id)
        })
      }
    }

    objetivosVisibles.forEach((objetivo) => {
      if (coincideTextoBusqueda(objetivo.nombre, terminoBusquedaCronograma)) {
        incluirSubarbolObjetivo(objetivo.id)
      }
    })

    iniciativasVisibles.forEach((iniciativa) => {
      if (!coincideTextoBusqueda(iniciativa.nombre, terminoBusquedaCronograma)) {
        return
      }

      const objetivoId = iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO
      objetivosResultado.add(objetivoId)
      objetivosExpandidosBusqueda.add(objetivoId)
      iniciativasResultado.add(iniciativa.id)

      const entregasHijas = entregasPorIniciativaVisible.get(iniciativa.id) ?? []
      if (entregasHijas.length > 0) {
        iniciativasExpandidasBusqueda.add(iniciativa.id)
      }

      entregasHijas.forEach((entrega) => {
        entregasResultado.add(entrega.id)
      })
    })

    entregasFiltradas.forEach((entrega) => {
      if (!coincideTextoBusqueda(entrega.nombre, terminoBusquedaCronograma)) {
        return
      }

      entregasResultado.add(entrega.id)

      if (entrega.iniciativa_id) {
        const iniciativa = iniciativasPorId.get(entrega.iniciativa_id)
        const objetivoId = iniciativa?.objetivo_id ?? FILA_SIN_OBJETIVO

        iniciativasResultado.add(entrega.iniciativa_id)
        iniciativasExpandidasBusqueda.add(entrega.iniciativa_id)
        objetivosResultado.add(objetivoId)
        objetivosExpandidosBusqueda.add(objetivoId)
        return
      }

      objetivosResultado.add(FILA_SIN_OBJETIVO)
      objetivosExpandidosBusqueda.add(FILA_SIN_OBJETIVO)
      iniciativasExpandidasBusqueda.add(`${FILA_SIN_OBJETIVO}-${FILA_SIN_INICIATIVA}`)
    })

    if (coincideTextoBusqueda('Sin iniciativa asignada', terminoBusquedaCronograma)) {
      entregasSinIniciativaPorObjetivo.forEach((entregasSinIniciativa, objetivoId) => {
        if (entregasSinIniciativa.length === 0) {
          return
        }

        objetivosResultado.add(objetivoId)
        objetivosExpandidosBusqueda.add(objetivoId)
        iniciativasExpandidasBusqueda.add(`${objetivoId}-${FILA_SIN_INICIATIVA}`)

        entregasSinIniciativa.forEach((entrega) => {
          entregasResultado.add(entrega.id)
        })
      })
    }

    return {
      objetivosResultado,
      iniciativasResultado,
      entregasResultado,
      objetivosExpandidosBusqueda,
      iniciativasExpandidasBusqueda
    }
  }, [
    entregasFiltradas,
    entregasPorIniciativaVisible,
    entregasSinIniciativaPorObjetivo,
    hayBusquedaCronogramaActiva,
    iniciativasPorId,
    iniciativasPorObjetivoVisible,
    iniciativasVisibles,
    objetivosVisibles,
    terminoBusquedaCronograma
  ])

  const objetivosCronograma = useMemo(() => {
    if (!resultadoBusquedaCronograma) {
      return objetivosVisibles
    }

    return objetivosVisibles.filter((objetivo) => resultadoBusquedaCronograma.objetivosResultado.has(objetivo.id))
  }, [objetivosVisibles, resultadoBusquedaCronograma])

  const iniciativasCronograma = useMemo(() => {
    if (!resultadoBusquedaCronograma) {
      return iniciativasVisibles
    }

    return iniciativasVisibles.filter((iniciativa) => resultadoBusquedaCronograma.iniciativasResultado.has(iniciativa.id))
  }, [iniciativasVisibles, resultadoBusquedaCronograma])

  const entregasCronograma = useMemo(() => {
    if (!resultadoBusquedaCronograma) {
      return entregasFiltradas
    }

    return entregasFiltradas.filter((entrega) => resultadoBusquedaCronograma.entregasResultado.has(entrega.id))
  }, [entregasFiltradas, resultadoBusquedaCronograma])

  const progresoCronograma = useMemo(() => {
    return calcularProgresoRoadmapDerivado({
      objetivos: objetivosCronograma,
      iniciativas: iniciativasCronograma,
      entregas: entregasCronograma,
      ahora: hoy
    })
  }, [entregasCronograma, hoy, iniciativasCronograma, objetivosCronograma])

  const objetivosExpandidosEfectivos = useMemo(() => {
    if (!resultadoBusquedaCronograma) {
      return objetivosExpandidos
    }

    return [...resultadoBusquedaCronograma.objetivosExpandidosBusqueda]
  }, [objetivosExpandidos, resultadoBusquedaCronograma])

  const iniciativasExpandidasEfectivas = useMemo(() => {
    if (!resultadoBusquedaCronograma) {
      return iniciativasExpandidas
    }

    return [...resultadoBusquedaCronograma.iniciativasExpandidasBusqueda]
  }, [iniciativasExpandidas, resultadoBusquedaCronograma])

  useEffect(() => {
    // Auto-expansión inicial: si no hay nada restaurado del localStorage, expandir objetivos con hijos
    if (!ejecutivoInicializadoRef.current && objetivosVisibles.length > 0) {
      const conHijos = objetivosVisibles
        .filter((objetivo) =>
          iniciativasVisibles.some((iniciativa) => (iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO) === objetivo.id) ||
          entregasFiltradas.some((entrega) => !entrega.iniciativa_id && objetivo.id === FILA_SIN_OBJETIVO)
        )
        .map((objetivo) => objetivo.id)

      if (conHijos.length > 0) {
        setObjetivosExpandidos((prev) => (prev.length === 0 ? conHijos : prev))
      }

      ejecutivoInicializadoRef.current = true
    }
  }, [entregasFiltradas, iniciativasVisibles, objetivosVisibles])

  const kpis = useMemo(() => {
    const objetivosActivos = objetivosCronograma.filter((objetivo) => objetivo.estado !== 'completado').length
    const iniciativasEnCurso = iniciativasCronograma.filter((iniciativa) => iniciativa.estado === 'en_progreso').length
    const entregasProximas = entregasCronograma.filter((entrega) => {
      const fecha = parsearFechaPortal(entrega.fecha_objetivo)
      if (!fecha || entrega.estado === 'completado') {
        return false
      }

      const dias = diferenciaDias(hoy, fecha)
      return dias >= 0 && dias <= 45
    }).length
    const entregasAtrasadas = entregasCronograma.filter((entrega) => esEntregaAtrasada(entrega, hoy)).length

    return [
      { etiqueta: 'Objetivos activos', valor: objetivosActivos, apoyo: 'con tracción visible' },
      { etiqueta: 'Iniciativas en curso', valor: iniciativasEnCurso, apoyo: 'vigentes en el rango' },
      { etiqueta: 'Entregas próximas', valor: entregasProximas, apoyo: 'hasta 45 días' },
      { etiqueta: 'Entregas atrasadas', valor: entregasAtrasadas, apoyo: 'siguen abiertas' }
    ]
  }, [entregasCronograma, hoy, iniciativasCronograma, objetivosCronograma])

  const filtrosActivos = useMemo(() => {
    let total = 0

    if (filtroObjetivo !== 'todos') {
      total += 1
    }

    if (filtroEstado !== 'todos') {
      total += 1
    }

    if (filtroVentana !== 'todas') {
      total += 1
    }

    return total
  }, [filtroEstado, filtroObjetivo, filtroVentana])

  const resumenControles = useMemo(() => {
    const items: string[] = []

    if (filtroObjetivo !== 'todos') {
      items.push('Objetivo filtrado')
    }

    if (filtroEstado !== 'todos') {
      items.push(formatearEstadoLegible(filtroEstado))
    }

    if (filtroVentana !== 'todas') {
      items.push(ventanasPorId.get(filtroVentana)?.etiqueta_visible ?? 'Ventana filtrada')
    }

    return items
  }, [filtroEstado, filtroObjetivo, filtroVentana, ventanasPorId])

  const filasCronograma = useMemo(() => {
    const filas: FilaCronograma[] = []

    const calcularSegmentosIniciativa = (iniciativa: Iniciativa) => {
      const rangoPlan = obtenerRangoPlanIniciativa(iniciativa, ventanasPorId)

      return {
        rangoPlan,
        segmentos: rangoPlan
          ? [construirSegmento(rangoPlan.inicio, rangoPlan.fin, `plan-${iniciativa.id}`, 'iniciativa', rangoPlan.origen)].filter(
              (item): item is SegmentoCronograma => Boolean(item)
            )
          : []
      }
    }

    const calcularSegmentosEntrega = (entrega: Entrega) => {
      const rangoPlan = obtenerRangoPlanEntrega(entrega, ventanasPorId)
      const segmentos = [
        rangoPlan
          ? construirSegmento(rangoPlan.inicio, rangoPlan.fin, `plan-${entrega.id}`, 'plan', rangoPlan.origen)
          : null
      ].filter((item): item is SegmentoCronograma => Boolean(item))

      return { rangoPlan, segmentos }
    }

    const construirFilaObjetivo = (objetivo: Objetivo, iniciativasObjetivo: Iniciativa[], entregasObjetivo: Entrega[]) => {
      const visualesIniciativas = new Map(iniciativasObjetivo.map((iniciativa) => [iniciativa.id, calcularSegmentosIniciativa(iniciativa)]))
      const visualesEntregas = new Map(entregasObjetivo.map((entrega) => [entrega.id, calcularSegmentosEntrega(entrega)]))

      const segmentosRespaldo = [
        ...[...visualesIniciativas.values()].flatMap((visual) => visual.segmentos),
        ...[...visualesEntregas.values()].flatMap((visual) => visual.segmentos)
      ]
      const rangoObjetivo = obtenerRangoPlanObjetivo(objetivo, segmentosRespaldo)
      const segmentoObjetivo = rangoObjetivo
        ? construirSegmento(rangoObjetivo.inicio, rangoObjetivo.fin, `objetivo-${objetivo.id}`, 'objetivo', rangoObjetivo.origen)
        : null

      const totalReleases = iniciativasObjetivo.reduce(
        (acumulado, iniciativa) => {
          ;(releasesRelacionadosPorIniciativa.get(iniciativa.id) ?? []).forEach((release) => acumulado.add(release.id))
          return acumulado
        },
        new Set<string>()
      )

      entregasObjetivo.forEach((entrega) => {
        ;(releasesPorEntrega.get(entrega.id) ?? []).forEach((release) => totalReleases.add(release.id))
      })

      filas.push({
        id: objetivo.id,
        claveExpansion: objetivo.id,
        tipo: 'objetivo',
        nivel: 0,
        titulo: objetivo.nombre,
        estado:
          objetivo.id === FILA_SIN_OBJETIVO
            ? estadoDominante(iniciativasObjetivo.map((iniciativa) => iniciativa.estado))
            : objetivo.estado,
        resumen: `${iniciativasObjetivo.length} iniciativas`,
        detalle: `${entregasObjetivo.length} entregas · ${totalReleases.size} releases`,
        rangoFechas: segmentoObjetivo ? formatearRangoFechas(segmentoObjetivo.inicio, segmentoObjetivo.fin) : null,
        contextoTemporal: rangoObjetivo ? describirContextoTemporalRango('objetivo', rangoObjetivo.origen) : null,
        tieneHijos: iniciativasObjetivo.length > 0 || entregasObjetivo.some((entrega) => !entrega.iniciativa_id),
        expandido: objetivosExpandidosEfectivos.includes(objetivo.id),
        segmentos: segmentoObjetivo ? [segmentoObjetivo] : [],
        entregaAtrasada: entregasObjetivo.some((entrega) => esEntregaAtrasada(entrega, hoy))
      })
    }

    objetivosCronograma.forEach((objetivo) => {
      const iniciativasObjetivo = iniciativasCronograma.filter(
        (iniciativa) => (iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO) === objetivo.id
      )
      const entregasObjetivo = entregasCronograma.filter((entrega) => {
        const iniciativa = entrega.iniciativa_id ? iniciativasPorId.get(entrega.iniciativa_id) : null
        return (iniciativa?.objetivo_id ?? FILA_SIN_OBJETIVO) === objetivo.id
      })

      construirFilaObjetivo(objetivo, iniciativasObjetivo, entregasObjetivo)

      if (!objetivosExpandidosEfectivos.includes(objetivo.id)) {
        return
      }

      iniciativasObjetivo.forEach((iniciativa) => {
        const entregasIniciativa = entregasCronograma.filter((entrega) => entrega.iniciativa_id === iniciativa.id)
        const visual = calcularSegmentosIniciativa(iniciativa)
        const etiquetaVentana = iniciativa.ventana_planificada_id
          ? ventanasPorId.get(iniciativa.ventana_planificada_id)?.etiqueta_visible ?? 'Sin ventana'
          : 'Sin ventana'

        filas.push({
          id: iniciativa.id,
          claveExpansion: iniciativa.id,
          tipo: 'iniciativa',
          nivel: 1,
          titulo: iniciativa.nombre,
          estado: iniciativa.estado,
          resumen: etiquetaVentana,
          detalle: `${entregasIniciativa.length} entregas · ${(releasesRelacionadosPorIniciativa.get(iniciativa.id) ?? []).length} releases`,
          rangoFechas: visual.rangoPlan ? formatearRangoFechas(visual.rangoPlan.inicio, visual.rangoPlan.fin) : null,
          contextoTemporal: visual.rangoPlan ? describirContextoTemporalRango('iniciativa', visual.rangoPlan.origen) : null,
          tieneHijos: entregasIniciativa.length > 0,
          expandido: iniciativasExpandidasEfectivas.includes(iniciativa.id),
          segmentos: visual.segmentos,
          entregaAtrasada: entregasIniciativa.some((entrega) => esEntregaAtrasada(entrega, hoy))
        })

        if (!iniciativasExpandidasEfectivas.includes(iniciativa.id)) {
          return
        }

        entregasIniciativa.forEach((entrega) => {
          const visualEntrega = calcularSegmentosEntrega(entrega)
          const ventanaPlan = entrega.ventana_planificada_id
            ? ventanasPorId.get(entrega.ventana_planificada_id)?.etiqueta_visible ?? 'Sin ventana plan'
            : 'Sin ventana plan'
          const fecha = entrega.fecha_objetivo ? formatearFechaCorta(entrega.fecha_objetivo) : 'Sin fecha objetivo'
          const rangoEntrega = visualEntrega.rangoPlan

          filas.push({
            id: entrega.id,
            claveExpansion: entrega.id,
            tipo: 'entrega',
            nivel: 2,
            titulo: entrega.nombre,
            estado: entrega.estado,
            resumen: ventanaPlan,
            detalle: fecha,
            rangoFechas: rangoEntrega ? formatearRangoFechas(rangoEntrega.inicio, rangoEntrega.fin) : null,
            contextoTemporal: rangoEntrega ? describirContextoTemporalRango('entrega', rangoEntrega.origen) : null,
            tieneHijos: false,
            expandido: false,
            segmentos: visualEntrega.segmentos,
            entregaAtrasada: esEntregaAtrasada(entrega, hoy)
          })
        })
      })

      const entregasSinIniciativa = entregasObjetivo.filter((entrega) => !entrega.iniciativa_id)
      if (entregasSinIniciativa.length > 0) {
        const clave = `${objetivo.id}-${FILA_SIN_INICIATIVA}`
        const releasesSinIniciativa = new Set<string>()

        const segsSinIni = entregasSinIniciativa
          .flatMap((entrega) => calcularSegmentosEntrega(entrega).segmentos)
          .sort((a, b) => compararFechasAscendente(a.inicio, b.inicio))

        entregasSinIniciativa.forEach((entrega) => {
          ;(releasesPorEntrega.get(entrega.id) ?? []).forEach((release) => releasesSinIniciativa.add(release.id))
        })

        const segAgregadoSinIni: SegmentoCronograma | null =
          segsSinIni.length > 0
            ? construirSegmento(
                segsSinIni[0].inicio,
                [...segsSinIni].sort((a, b) => compararFechasAscendente(a.fin, b.fin))[segsSinIni.length - 1].fin,
                `agregado-${clave}`,
                'objetivo',
                'fallback_agregado_hijos'
              )
            : null

        filas.push({
          id: clave,
          claveExpansion: clave,
          tipo: 'iniciativa',
          nivel: 1,
          titulo: 'Sin iniciativa asignada',
          estado: estadoDominante(entregasSinIniciativa.map((entrega) => entrega.estado)),
          resumen: 'Entregas sin iniciativa',
          detalle: `${entregasSinIniciativa.length} entregas · ${releasesSinIniciativa.size} releases`,
          rangoFechas: segAgregadoSinIni ? formatearRangoFechas(segAgregadoSinIni.inicio, segAgregadoSinIni.fin) : null,
          contextoTemporal: segAgregadoSinIni ? 'Rango derivado de entregables sin iniciativa' : null,
          tieneHijos: true,
          expandido: iniciativasExpandidasEfectivas.includes(clave),
          segmentos: segAgregadoSinIni ? [segAgregadoSinIni] : [],
          entregaAtrasada: entregasSinIniciativa.some((entrega) => esEntregaAtrasada(entrega, hoy))
        })

        if (iniciativasExpandidasEfectivas.includes(clave)) {
          entregasSinIniciativa.forEach((entrega) => {
            const visualEntrega = calcularSegmentosEntrega(entrega)
            const rangoEntregaH = visualEntrega.rangoPlan

            filas.push({
              id: entrega.id,
              claveExpansion: entrega.id,
              tipo: 'entrega',
              nivel: 2,
              titulo: entrega.nombre,
              estado: entrega.estado,
              resumen: entrega.ventana_planificada_id
                ? ventanasPorId.get(entrega.ventana_planificada_id)?.etiqueta_visible ?? 'Sin ventana plan'
                : 'Sin ventana plan',
              detalle: entrega.fecha_objetivo ? formatearFechaCorta(entrega.fecha_objetivo) : 'Sin fecha objetivo',
              rangoFechas: rangoEntregaH ? formatearRangoFechas(rangoEntregaH.inicio, rangoEntregaH.fin) : null,
              contextoTemporal: rangoEntregaH ? describirContextoTemporalRango('entrega', rangoEntregaH.origen) : null,
              tieneHijos: false,
              expandido: false,
              segmentos: visualEntrega.segmentos,
              entregaAtrasada: esEntregaAtrasada(entrega, hoy)
            })
          })
        }
      }
    })

    return filas
  }, [
    entregasCronograma,
    hoy,
    iniciativasCronograma,
    iniciativasExpandidasEfectivas,
    iniciativasPorId,
    objetivosCronograma,
    objetivosExpandidosEfectivos,
    releasesPorEntrega,
    releasesRelacionadosPorIniciativa,
    ventanasPorId
  ])

  const filasExportablesCronograma = useMemo(() => {
    return construirFilasExportablesCronograma({
      objetivos: objetivosCronograma,
      iniciativas: iniciativasCronograma,
      entregas: entregasCronograma,
      ventanasPorId,
      vistaTemporal,
      anioSeleccionado,
      trimestreSeleccionado,
      rangoTemporal
    })
  }, [
    anioSeleccionado,
    entregasCronograma,
    iniciativasCronograma,
    objetivosCronograma,
    rangoTemporal,
    trimestreSeleccionado,
    ventanasPorId,
    vistaTemporal
  ])

  const etiquetaTooltipExportarCronograma =
    filasExportablesCronograma.length > 0 ? 'Exportar cronograma CSV' : 'No hay filas para exportar en el contexto actual'

  const exportarCronogramaCsv = () => {
    exportarCsv(
      construirNombreArchivoExportacionCronograma(vistaTemporal, anioSeleccionado, trimestreSeleccionado),
      [
        { encabezado: 'Nivel', valor: (fila) => fila.nivel },
        { encabezado: 'Nombre', valor: (fila) => fila.nombre },
        { encabezado: 'Descripción', valor: (fila) => fila.descripcion },
        { encabezado: 'Estado', valor: (fila) => fila.estado },
        { encabezado: 'Padre', valor: (fila) => fila.padre },
        { encabezado: 'Objetivo', valor: (fila) => fila.objetivo },
        { encabezado: 'Iniciativa', valor: (fila) => fila.iniciativa },
        { encabezado: 'Fecha inicio', valor: (fila) => fila.fechaInicio },
        { encabezado: 'Fecha fin', valor: (fila) => fila.fechaFin },
        { encabezado: 'Fecha objetivo', valor: (fila) => fila.fechaObjetivo },
        { encabezado: 'Ventana planificada', valor: (fila) => fila.ventanaPlanificada },
        { encabezado: 'Ventana real', valor: (fila) => fila.ventanaReal },
        { encabezado: 'Origen temporal', valor: (fila) => fila.origenTemporal },
        { encabezado: 'Rango visible cronograma', valor: (fila) => fila.rangoVisibleCronograma }
      ],
      filasExportablesCronograma
    )
  }

  const releasesCronograma = useMemo(() => {
    return releases
      .reduce((acumulado, release) => {
        const fecha = fechaRelease(release)
        if (!fecha || !fechaDentroDeRango(fecha, rangoTemporal.inicio, rangoTemporal.fin)) {
          return acumulado
        }

        const contextoVisual = resolverContextoVisualRelease(release, iniciativasPorId, entregasPorId, objetivosRealesPorId)
        if (filtroObjetivo !== 'todos' && contextoVisual.objetivoId !== filtroObjetivo) {
          return acumulado
        }

        const nombreBase = release.nombre.trim() || release.codigo

        acumulado.push({
          id: release.id,
          fecha,
          fechaFormateada: formatearFechaCorta(serializarFechaCronograma(fecha)),
          origenFecha: release.fecha_lanzamiento_real ? 'real' : 'programada',
          nombre: nombreBase,
          nombreCorto: resumirEtiquetaRelease(nombreBase, 30),
          descripcion: normalizarTextoRelease(release.descripcion),
          estado: release.estado,
          tipo: release.tipo_release,
          objetivoId: contextoVisual.objetivoId,
          objetivo: contextoVisual.objetivo,
          iniciativa: contextoVisual.iniciativa,
          entrega: contextoVisual.entrega,
          alcance: contextoVisual.alcance
        })

        return acumulado
      }, [] as ReleaseCronogramaVisual[])
      .sort((releaseA, releaseB) => {
        const diferencia = compararFechasAscendente(releaseA.fecha, releaseB.fecha)
        return diferencia !== 0 ? diferencia : releaseA.nombre.localeCompare(releaseB.nombre, 'es')
      })
  }, [entregasPorId, filtroObjetivo, iniciativasPorId, objetivosRealesPorId, rangoTemporal.fin, rangoTemporal.inicio, releases])

  const releasesCronogramaPosicionados = useMemo(() => {
    const finPorFila = Array.from({ length: TOTAL_FILAS_ETIQUETA_RELEASES }, () => Number.NEGATIVE_INFINITY)

    return releasesCronograma.map((release) => {
      const diasDesdeInicio = diferenciaDias(rangoTemporal.inicio, release.fecha)
      const posicionNodoPx = Math.min(Math.max((diasDesdeInicio / rangoTemporal.totalDias) * anchoTimeline, 0), anchoTimeline)
      const anchoEtiquetaPx = Math.max(112, Math.min(156, 82 + release.nombreCorto.length * 2.9))
      const posicionEtiquetaPx = Math.min(
        Math.max(posicionNodoPx - DESPLAZAMIENTO_OPTICO_ETIQUETA_RELEASE, anchoEtiquetaPx / 2 + 8),
        anchoTimeline - anchoEtiquetaPx / 2 - 8
      )
      const inicioEtiqueta = posicionEtiquetaPx - anchoEtiquetaPx / 2
      let filaEtiqueta = finPorFila.findIndex((fin) => inicioEtiqueta > fin + 8)

      if (filaEtiqueta === -1) {
        const menorFin = Math.min(...finPorFila)
        filaEtiqueta = finPorFila.findIndex((fin) => fin === menorFin)
      }

      finPorFila[filaEtiqueta] = inicioEtiqueta + anchoEtiquetaPx

      return {
        ...release,
        filaEtiqueta,
        anchoEtiquetaPx,
        posicionNodoPx,
        posicionEtiquetaPx
      } satisfies ReleaseCronogramaPosicionado
    })
  }, [anchoTimeline, rangoTemporal.inicio, rangoTemporal.totalDias, releasesCronograma])

  const porcentajeHorizontal = (fecha: Date) => {
    const dias = diferenciaDias(rangoTemporal.inicio, fecha)
    return (dias / rangoTemporal.totalDias) * 100
  }

  const posicionHorizontalPx = (fecha: Date) => {
    const dias = diferenciaDias(rangoTemporal.inicio, fecha)
    return Math.min(Math.max((dias / rangoTemporal.totalDias) * anchoTimeline, 0), anchoTimeline)
  }

  const hoyVisible = fechaDentroDeRango(hoy, rangoTemporal.inicio, rangoTemporal.fin)
  const etiquetaTooltipCronograma = cronogramaExpandido ? 'Restaurar cronograma' : 'Expandir cronograma'
  const alturaVistaCuerpoCronograma = cronogramaExpandido ? '100%' : ALTURA_VISTA_CUERPO_CRONOGRAMA

  useEffect(() => {
    if (!releasesVisible) {
      return
    }

    const scrollActual = cuerpoTimelineRef.current?.scrollLeft ?? 0

    if (encabezadoTimelineRef.current) {
      encabezadoTimelineRef.current.scrollLeft = scrollActual
    }

    if (bandaReleasesTimelineRef.current) {
      bandaReleasesTimelineRef.current.scrollLeft = scrollActual
    }
  }, [releasesVisible, releasesCronogramaPosicionados.length])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const sincronizarEstadoFullscreen = () => {
      setCronogramaExpandido(document.fullscreenElement === contenedorFullscreenCronogramaRef.current)
    }

    document.addEventListener('fullscreenchange', sincronizarEstadoFullscreen)

    return () => {
      document.removeEventListener('fullscreenchange', sincronizarEstadoFullscreen)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const medirAlturas = () => {
      const nuevasAlturas = filasCronograma.map((_, indice) => {
        const fila = referenciasFilasJerarquiaRef.current[indice]
        return Math.max(fila?.getBoundingClientRect().height ?? 0, ALTURA_MINIMA_FILA_CRONOGRAMA)
      })

      setAlturasFilas((actuales) => {
        if (
          actuales.length === nuevasAlturas.length &&
          actuales.every((altura, indice) => Math.abs(altura - nuevasAlturas[indice]) < 0.25)
        ) {
          return actuales
        }

        return nuevasAlturas
      })
    }

    const programarMedicion = () => {
      cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(medirAlturas)
    }

    programarMedicion()

    const observer = new ResizeObserver(programarMedicion)
    referenciasFilasJerarquiaRef.current.forEach((fila) => {
      if (fila) {
        observer.observe(fila)
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [anchoColumnaJerarquia, filasCronograma])

  const sincronizarScrollHorizontal = (origen: 'encabezado' | 'cuerpo' | 'releases') => {
    const scrollOrigen =
      origen === 'encabezado'
        ? encabezadoTimelineRef.current
        : origen === 'releases'
          ? bandaReleasesTimelineRef.current
          : cuerpoTimelineRef.current

    if (!scrollOrigen) {
      return
    }

    const origenBloqueado =
      origen === 'encabezado' ? 'cuerpo' : origen === 'cuerpo' ? 'encabezado' : 'cuerpo'
    if (sincronizandoScrollHorizontalRef.current === origenBloqueado) {
      sincronizandoScrollHorizontalRef.current = null
      return
    }

    sincronizandoScrollHorizontalRef.current = origen

    ;[encabezadoTimelineRef.current, cuerpoTimelineRef.current, bandaReleasesTimelineRef.current].forEach((contenedor) => {
      if (!contenedor || contenedor === scrollOrigen) {
        return
      }

      contenedor.scrollLeft = scrollOrigen.scrollLeft
    })

    window.requestAnimationFrame(() => {
      if (sincronizandoScrollHorizontalRef.current === origen) {
        sincronizandoScrollHorizontalRef.current = null
      }
    })
  }

  const limpiarFiltros = () => {
    setFiltroObjetivo('todos')
    setFiltroEstado('todos')
    setFiltroVentana('todas')
    setFiltrosAbiertos(false)
  }

  const alternarExpansionObjetivo = (objetivoId: string) => {
    setObjetivosExpandidos((actuales) =>
      actuales.includes(objetivoId) ? actuales.filter((actual) => actual !== objetivoId) : [...actuales, objetivoId]
    )
  }

  const alternarExpansionIniciativa = (iniciativaId: string) => {
    setIniciativasExpandidas((actuales) =>
      actuales.includes(iniciativaId) ? actuales.filter((actual) => actual !== iniciativaId) : [...actuales, iniciativaId]
    )
  }

  const iniciarResizeJerarquia = (evento: MouseEvent<HTMLButtonElement>) => {
    evento.preventDefault()
    setRedimensionandoJerarquia(true)
  }

  const filaEsOperable = (fila: FilaCronograma) => {
    if (fila.tipo === 'objetivo') {
      return objetivosRealesPorId.has(fila.id)
    }

    if (fila.tipo === 'iniciativa') {
      return iniciativasPorId.has(fila.id)
    }

    return entregasPorId.has(fila.id)
  }

  const obtenerDescripcionTooltipActividad = (fila: FilaCronograma) => {
    if (fila.tipo === 'objetivo') {
      const descripcion = objetivosRealesPorId.get(fila.id)?.descripcion?.trim()
      return descripcion ? descripcion : null
    }

    if (fila.tipo === 'iniciativa') {
      const descripcion = iniciativasPorId.get(fila.id)?.descripcion?.trim()
      return descripcion ? descripcion : null
    }

    const descripcion = entregasPorId.get(fila.id)?.descripcion?.trim()
    return descripcion ? descripcion : null
  }

  const abrirModalDesdeFila = (fila: FilaCronograma, modo: ModoModalRoadmap) => {
    setMenuCrearAbierto(false)
    setMenuPersonalizacionAbierto(false)

    if (fila.tipo === 'objetivo') {
      const objetivo = objetivosRealesPorId.get(fila.id)
      if (objetivo) {
        setModalContextual({ tipo: 'objetivo', modo, entidad: objetivo })
      }
      return
    }

    if (fila.tipo === 'iniciativa') {
      const iniciativa = iniciativasPorId.get(fila.id)
      if (iniciativa) {
        setModalContextual({ tipo: 'iniciativa', modo, entidad: iniciativa })
      }
      return
    }

    const entrega = entregasPorId.get(fila.id)
    if (entrega) {
      setModalContextual({ tipo: 'entrega', modo, entidad: entrega })
    }
  }

  const abrirCreacionGlobal = (tipo: 'objetivo' | 'iniciativa' | 'entrega') => {
    setMenuAbiertoFilaId(null)
    setMenuPersonalizacionAbierto(false)

    if (tipo === 'objetivo') {
      setModalContextual({ tipo: 'objetivo', modo: 'crear', entidad: null })
      return
    }

    if (tipo === 'iniciativa') {
      setModalContextual({ tipo: 'iniciativa', modo: 'crear', entidad: null })
      return
    }

    setModalContextual({ tipo: 'entrega', modo: 'crear', entidad: null })
  }

  const eliminarDesdeFila = async (fila: FilaCronograma) => {
    if (fila.tipo === 'objetivo') {
      const objetivo = objetivosRealesPorId.get(fila.id)
      if (objetivo) {
        await eliminarObjetivoRoadmapConConfirmacion(objetivo.id, cargarCronograma, setError)
      }
      return
    }

    if (fila.tipo === 'iniciativa') {
      const iniciativa = iniciativasPorId.get(fila.id)
      if (iniciativa) {
        await eliminarIniciativaRoadmapConConfirmacion(iniciativa.id, cargarCronograma, setError)
      }
      return
    }

    const entrega = entregasPorId.get(fila.id)
    if (entrega) {
      await eliminarEntregaRoadmapConConfirmacion(entrega.id, cargarCronograma, setError)
    }
  }

  const manejarBlurFilaJerarquia = (evento: FocusEvent<HTMLDivElement>, claveVisualFila: string) => {
    if (evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
      return
    }

    setFilaActiva((actual) => (actual === claveVisualFila && menuAbiertoFilaId !== claveVisualFila ? null : actual))
  }

  const alternarFullscreenCronograma = async () => {
    if (typeof document === 'undefined') {
      return
    }

    const contenedor = contenedorFullscreenCronogramaRef.current
    if (!contenedor) {
      return
    }

    try {
      if (document.fullscreenElement === contenedor) {
        await document.exitFullscreen()
        return
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }

      await contenedor.requestFullscreen()
    } catch {
      // Si el navegador bloquea fullscreen por política o gesto inválido, mantener estado actual sin romper la UI.
    }
  }

  return (
    <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="No hay cronograma para mostrar.">
      <ContextoTooltipsCronograma.Provider value={tooltipsVisibles}>
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Cronograma</h1>
          <NavegacionRoadmap />
        </header>

        <div
          ref={contenedorFullscreenCronogramaRef}
          className={`flex flex-col gap-4 ${cronogramaExpandido ? 'h-full bg-slate-100 p-4 dark:bg-slate-950' : ''}`}
        >
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:gap-3">
              <div className="min-w-0 flex-[1_1_26rem] lg:max-w-xl">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                  <IconoBusqueda />
                </span>
                <input
                  type="search"
                  value={busquedaCronograma}
                  onChange={(evento) => setBusquedaCronograma(evento.target.value)}
                  placeholder="Buscar en el cronograma..."
                  aria-label="Buscar en el cronograma"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600"
                />
                {busquedaCronograma ? (
                  <button
                    type="button"
                    onClick={() => setBusquedaCronograma('')}
                    className="absolute inset-y-1.5 right-1.5 inline-flex items-center justify-center rounded-lg px-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label="Limpiar búsqueda del cronograma"
                    title="Limpiar búsqueda"
                  >
                    <IconoCerrarBusqueda />
                  </button>
                ) : null}
              </div>

              </div>

              {resumenControles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {resumenControles.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {esEdicionPermitida ? (
                <MenuCrearRoadmapGlobal
                  abierto={menuCrearAbierto}
                  alAlternar={() => {
                    setMenuPersonalizacionAbierto(false)
                    setMenuAbiertoFilaId(null)
                    setMenuCrearAbierto((actual) => !actual)
                  }}
                  alCerrar={() => setMenuCrearAbierto(false)}
                  alCrearObjetivo={() => abrirCreacionGlobal('objetivo')}
                  alCrearIniciativa={() => abrirCreacionGlobal('iniciativa')}
                  alCrearEntrega={() => abrirCreacionGlobal('entrega')}
                />
              ) : null}

              <button
                type="button"
                onClick={() => setResumenVisible((actual) => !actual)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  resumenVisible
                    ? 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                }`}
                aria-pressed={resumenVisible}
              >
                <IconoResumen />
                <span>Resumen</span>
              </button>

              <button
                type="button"
                onClick={() => setReleasesVisible((actual) => !actual)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  releasesVisible
                    ? 'border-slate-400 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                }`}
                aria-pressed={releasesVisible}
              >
                <IconoReleases />
                <span>Releases</span>
              </button>

              <button
                type="button"
                onClick={() => setFiltrosAbiertos((actual) => !actual)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                aria-expanded={filtrosAbiertos}
                aria-controls="panel-filtros-cronograma-roadmap"
              >
                <IconoFiltros abierto={filtrosAbiertos} />
                <span>Filtros</span>
                {filtrosActivos > 0 ? (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-slate-200 dark:text-slate-900">
                    {filtrosActivos}
                  </span>
                ) : null}
              </button>

              <TooltipCronograma content={etiquetaTooltipExportarCronograma}>
                <button
                  type="button"
                  onClick={exportarCronogramaCsv}
                  disabled={filasExportablesCronograma.length === 0}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  aria-label="Exportar cronograma a CSV"
                  title="Exportar cronograma a CSV"
                >
                  <IconoExportarCronograma />
                </button>
              </TooltipCronograma>

              <TooltipCronograma content={etiquetaTooltipCronograma}>
                <button
                  type="button"
                  onClick={() => {
                    void alternarFullscreenCronograma()
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  aria-label={etiquetaTooltipCronograma}
                  title={etiquetaTooltipCronograma}
                  aria-pressed={cronogramaExpandido}
                >
                  <IconoExpandirCronograma expandido={cronogramaExpandido} />
                </button>
              </TooltipCronograma>

              <MenuPersonalizacionCronograma
                abierto={menuPersonalizacionAbierto}
                tooltipsVisibles={tooltipsVisibles}
                alAlternar={() => {
                  setMenuCrearAbierto(false)
                  setMenuAbiertoFilaId(null)
                  setMenuPersonalizacionAbierto((actual) => !actual)
                }}
                alCerrar={() => setMenuPersonalizacionAbierto(false)}
                alCambiarTooltipsVisibles={setTooltipsVisibles}
              />
            </div>
          </div>

          {filtrosAbiertos ? (
            <div id="panel-filtros-cronograma-roadmap" className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">

                <label className="space-y-1 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Objetivo</span>
                  <select
                    value={filtroObjetivo}
                    onChange={(evento) => setFiltroObjetivo(evento.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="todos">Todos</option>
                    {objetivos.map((objetivo) => (
                      <option key={objetivo.id} value={objetivo.id}>
                        {objetivo.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Estado</span>
                  <select
                    value={filtroEstado}
                    onChange={(evento) => setFiltroEstado(evento.target.value as 'todos' | EstadoRegistro)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="completado">Completado</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Ventana</span>
                  <select
                    value={filtroVentana}
                    onChange={(evento) => setFiltroVentana(evento.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="todas">Todas</option>
                    {ventanas.map((ventana) => (
                      <option key={ventana.id} value={ventana.id}>
                        {ventana.etiqueta_visible}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {resumenVisible ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <article key={kpi.etiqueta} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{kpi.etiqueta}</p>
                <p className="mt-1.5 text-2xl font-semibold text-slate-950 dark:text-slate-50">{kpi.valor}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kpi.apoyo}</p>
              </article>
            ))}
          </section>
        ) : null}

        <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${cronogramaExpandido ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : ''}`}>
          {filasCronograma.length === 0 ? (
            hayBusquedaCronogramaActiva ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No hay resultados para &ldquo;{busquedaCronograma.trim()}&rdquo; dentro del rango temporal y filtros actuales.
                </p>
                <button
                  type="button"
                  onClick={() => setBusquedaCronograma('')}
                  className="mt-3 inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay evidencia temporal suficiente en el rango y filtros actuales para construir un cronograma honesto.
              </div>
            )
          ) : (
            <>
              {releasesVisible ? (
                <div className="border-b border-slate-200 py-2 dark:border-slate-800">
                  <div
                    className="overflow-hidden rounded-xl border border-slate-200/70 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(244,247,250,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(8,13,24,0.96),rgba(7,11,20,0.92))]"
                  >
                    <div ref={bandaReleasesTimelineRef} className="overflow-x-hidden">
                      <div
                        className="relative"
                        style={{ width: `${anchoTimeline}px`, height: `${ALTURA_BANDA_RELEASES}px` }}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.08),transparent_62%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(71,85,105,0.14),transparent_62%)]" />
                        <div
                          className="absolute h-px bg-gradient-to-r from-slate-300/75 via-slate-400/85 to-slate-300/75 dark:from-slate-700/75 dark:via-slate-500/90 dark:to-slate-700/75"
                          style={{ left: 0, right: 0, top: `${POSICION_LINEA_RELEASES}px` }}
                        />

                        {releasesCronogramaPosicionados.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            No hay releases dentro del rango temporal actual y filtro seleccionado.
                          </div>
                        ) : (
                          releasesCronogramaPosicionados.map((release) => {
                            const topEtiqueta = POSICION_LINEA_RELEASES + 12 + release.filaEtiqueta * 22
                            const desplazamientoEtiqueta = release.posicionEtiquetaPx - release.posicionNodoPx
                            const alturaGuia = Math.max(topEtiqueta - POSICION_LINEA_RELEASES - 8, 8)

                            return (
                              <TooltipCronograma
                                key={release.id}
                                className="absolute z-[16] block cursor-default"
                                style={{
                                  left: `${release.posicionNodoPx}px`,
                                  top: 0,
                                  width: '1px',
                                  height: `${ALTURA_BANDA_RELEASES}px`,
                                  overflow: 'visible'
                                }}
                                maxWidthClassName="max-w-[320px]"
                                content={
                                  <div className="space-y-2">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                        {release.fechaFormateada} · {release.origenFecha === 'real' ? 'Fecha real' : 'Fecha programada'}
                                      </p>
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{release.nombre}</p>
                                      {release.descripcion ? (
                                        <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{release.descripcion}</p>
                                      ) : null}
                                    </div>

                                    {release.objetivo ? (
                                      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Objetivo: {release.objetivo}</p>
                                    ) : null}

                                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                      {formatearTipoRelease(release.tipo)} · {formatearEstadoRelease(release.estado)}
                                    </p>
                                  </div>
                                }
                              >
                                <span
                                  tabIndex={0}
                                  className="relative block h-full w-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/45 dark:focus-visible:ring-slate-500/55"
                                >
                                  <span
                                    className="absolute left-1/2 w-px -translate-x-1/2 bg-slate-300/80 dark:bg-slate-600/70"
                                    style={{ top: `${POSICION_LINEA_RELEASES + 5}px`, height: `${alturaGuia}px` }}
                                  />
                                  <span
                                    className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-[0_0_0_3px_rgba(248,250,252,0.94)] dark:shadow-[0_0_0_3px_rgba(8,13,24,0.96)] ${
                                      release.origenFecha === 'real'
                                        ? 'border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100'
                                        : 'border-slate-500 bg-slate-50 dark:border-slate-400 dark:bg-slate-900'
                                    }`}
                                    style={{ top: `${POSICION_LINEA_RELEASES}px` }}
                                  />
                                  <span
                                    className="absolute text-center"
                                    style={{
                                      left: `${desplazamientoEtiqueta}px`,
                                      top: `${topEtiqueta}px`,
                                      width: `${release.anchoEtiquetaPx}px`,
                                      transform: 'translateX(-50%)'
                                    }}
                                  >
                                    <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                      {formatearFechaReleaseVisual(release.fecha)}
                                    </span>
                                    <span
                                      className="mx-auto mt-1 block text-[11px] font-semibold leading-[1.05rem] text-slate-900 dark:text-slate-100"
                                      style={ESTILO_TITULO_DOS_LINEAS}
                                    >
                                      {release.nombreCorto}
                                    </span>
                                  </span>
                                </span>
                              </TooltipCronograma>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

            <div ref={contenedorScrollRef} className={`relative ${cronogramaExpandido ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
              <button
                type="button"
                onMouseDown={iniciarResizeJerarquia}
                className={`group absolute inset-y-0 z-50 hidden w-5 -translate-x-1/2 cursor-col-resize md:block ${redimensionandoJerarquia ? 'bg-sky-500/15' : 'hover:bg-slate-400/10 dark:hover:bg-slate-500/10'}`}
                style={{ left: `${anchoColumnaJerarquia}px` }}
                aria-label="Arrastrar para redimensionar la columna de jerarquía"
                title="Arrastrar para redimensionar"
              >
                <span
                  className={`absolute left-1/2 top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
                    redimensionandoJerarquia
                      ? 'bg-sky-500 dark:bg-sky-400'
                      : 'bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-600 dark:group-hover:bg-slate-500'
                  }`}
                />
              </button>

              <div className="grid border-b border-slate-200 dark:border-slate-800" style={{ gridTemplateColumns: `${anchoColumnaJerarquia}px minmax(0, 1fr)` }}>
                <div className="border-r border-slate-200 dark:border-slate-800">
                  <div className="flex h-[58px] items-end bg-slate-50/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Jerarquía</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Roadmap</p>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 border-l border-slate-200 dark:border-slate-800">
                  <div ref={encabezadoTimelineRef} className="overflow-x-hidden">
                    <div className="relative h-[58px] bg-slate-50/95 backdrop-blur dark:bg-slate-950/95" style={{ width: `${anchoTimeline}px` }}>
                      <div className="absolute inset-0 flex">
                        {rangoTemporal.meses.map((mes) => (
                          <div
                            key={`${mes.getFullYear()}-${mes.getMonth()}`}
                            className="flex h-full flex-1 flex-col justify-between border-l border-slate-200 px-3 py-2 first:border-l-0 dark:border-slate-800"
                          >
                            <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {formatearAnio(mes)}
                            </span>
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatearMesCorto(mes)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`overflow-y-auto ${cronogramaExpandido ? 'min-h-0 flex-1' : ''}`} style={{ maxHeight: alturaVistaCuerpoCronograma }}>
                <div className="grid" style={{ gridTemplateColumns: `${anchoColumnaJerarquia}px minmax(0, 1fr)` }}>
                  <div className="border-r border-slate-200 dark:border-slate-800">
                    {filasCronograma.map((fila, indice) => {
                      const claveVisualFila = `${fila.tipo}-${fila.id}`
                      const filaEstaActiva = filaActiva === claveVisualFila || menuAbiertoFilaId === claveVisualFila
                      const alturaFila = alturasFilas[indice]
                      const claseFila = obtenerClaseFila(fila, filaEstaActiva)
                      const filaOperable = filaEsOperable(fila)
                      const descripcionTooltipActividad = obtenerDescripcionTooltipActividad(fila)

                      return (
                        <div
                          key={claveVisualFila}
                          ref={(elemento) => {
                            referenciasFilasJerarquiaRef.current[indice] = elemento
                          }}
                          className={`group border-b border-slate-200 px-4 py-2 last:border-b-0 dark:border-slate-800 ${claseFila}`}
                          style={alturaFila ? { height: `${alturaFila}px` } : undefined}
                          onMouseEnter={() => setFilaActiva(claveVisualFila)}
                          onMouseLeave={() =>
                            setFilaActiva((actual) =>
                              actual === claveVisualFila && menuAbiertoFilaId !== claveVisualFila ? null : actual
                            )
                          }
                          onFocusCapture={() => setFilaActiva(claveVisualFila)}
                          onBlurCapture={(evento) => manejarBlurFilaJerarquia(evento, claveVisualFila)}
                        >
                          <div
                            className="flex items-start gap-2"
                            style={{ paddingLeft: `${fila.nivel * INDENTACION_POR_NIVEL_CRONOGRAMA}px` }}
                          >
                            {fila.tieneHijos ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (fila.tipo === 'objetivo') {
                                    alternarExpansionObjetivo(fila.claveExpansion)
                                    return
                                  }

                                  alternarExpansionIniciativa(fila.claveExpansion)
                                }}
                                className={`mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full ${obtenerClaseControlExpansion(fila, filaEstaActiva)}`}
                                aria-label={fila.expandido ? `Colapsar ${fila.titulo}` : `Expandir ${fila.titulo}`}
                                aria-expanded={fila.expandido}
                              >
                                <IconoChevron abierto={fila.expandido} />
                              </button>
                            ) : (
                              <span
                                className="mt-0.5 flex shrink-0 items-center justify-center"
                                style={{ width: `${ANCHO_MARCADOR_JERARQUIA}px`, height: `${ANCHO_MARCADOR_JERARQUIA}px` }}
                                aria-hidden="true"
                              >
                                <span className={`h-4 w-px rounded-full ${obtenerClaseIndicadorTerminal(fila)}`} />
                              </span>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-start gap-1">
                                    <TooltipCronograma
                                      className="min-w-0 flex-1"
                                      maxWidthClassName="max-w-sm"
                                      content={
                                        <div className="space-y-1">
                                          <p className="font-medium text-slate-900 dark:text-slate-100">{fila.titulo}</p>
                                          {descripcionTooltipActividad ? (
                                            <p className="text-slate-500 dark:text-slate-400">{descripcionTooltipActividad}</p>
                                          ) : null}
                                        </div>
                                      }
                                    >
                                      <p
                                        className={`min-w-0 break-words ${obtenerClaseTituloFila(fila)}`}
                                        style={ESTILO_TITULO_DOS_LINEAS}
                                      >
                                        {fila.titulo}
                                      </p>
                                    </TooltipCronograma>

                                    {fila.estado ? (
                                      <TooltipCronograma
                                        content={
                                          <div className="space-y-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{formatearEstadoLegible(fila.estado)}</p>
                                            {fila.tipo === 'objetivo' ? (
                                              <>
                                                <p className="text-slate-600 dark:text-slate-300">
                                                  Progreso: {progresoCronograma.objetivosPorId.get(fila.id)?.porcentaje ?? 0}%
                                                </p>
                                                <p className="text-slate-500 dark:text-slate-400">
                                                  {progresoCronograma.objetivosPorId.get(fila.id)?.completadas ?? 0} de {progresoCronograma.objetivosPorId.get(fila.id)?.totalRelacionadas ?? 0}
                                                </p>
                                              </>
                                            ) : null}
                                            {fila.tipo === 'iniciativa' ? (
                                              <>
                                                <p className="text-slate-600 dark:text-slate-300">
                                                  Progreso: {progresoCronograma.iniciativasPorId.get(fila.id)?.porcentaje ?? 0}%
                                                </p>
                                                <p className="text-slate-500 dark:text-slate-400">
                                                  {progresoCronograma.iniciativasPorId.get(fila.id)?.completadas ?? 0} de {progresoCronograma.iniciativasPorId.get(fila.id)?.totalRelacionadas ?? 0}
                                                </p>
                                              </>
                                            ) : null}
                                          </div>
                                        }
                                      >
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${obtenerClaseBadgeEstado(fila.estado)}`}>
                                          {formatearEstadoLegible(fila.estado)}
                                        </span>
                                      </TooltipCronograma>
                                    ) : null}

                                    {fila.entregaAtrasada ? (
                                      <TooltipCronograma content="Tiene entregas con fecha objetivo vencida aún sin completar">
                                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                          Desvío
                                        </span>
                                      </TooltipCronograma>
                                    ) : null}
                                  </div>
                                </div>

                                {filaOperable ? (
                                  <MenuContextualFilaRoadmap
                                    etiquetaEntidad={`${fila.tipo} ${fila.titulo}`}
                                    visible={filaEstaActiva}
                                    abierto={menuAbiertoFilaId === claveVisualFila}
                                    puedeEditar={esEdicionPermitida}
                                    alAlternar={() =>
                                      {
                                        setMenuPersonalizacionAbierto(false)
                                        setMenuCrearAbierto(false)
                                        setMenuAbiertoFilaId((actual) =>
                                          actual === claveVisualFila ? null : claveVisualFila
                                        )
                                      }
                                    }
                                    alCerrar={() => setMenuAbiertoFilaId((actual) => (actual === claveVisualFila ? null : actual))}
                                    alVer={() => abrirModalDesdeFila(fila, 'ver')}
                                    alEditar={() => abrirModalDesdeFila(fila, 'editar')}
                                    alEliminar={() => {
                                      void eliminarDesdeFila(fila)
                                    }}
                                  />
                                ) : null}
                              </div>

                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="min-w-0 border-l border-slate-200 dark:border-slate-800">
                    <div ref={cuerpoTimelineRef} className="overflow-x-auto" onScroll={() => sincronizarScrollHorizontal('cuerpo')}>
                      <div className="relative" style={{ width: `${anchoTimeline}px` }}>
                        {hoyVisible ? (
                          <div className="pointer-events-none absolute inset-0 z-[18]">
                            <TooltipCronograma
                              content={
                                <div className="space-y-1">
                                  <p className="font-medium text-slate-900 dark:text-slate-100">Hoy</p>
                                  <p className="text-slate-600 dark:text-slate-300">{formatearFechaLarga(hoy)}</p>
                                </div>
                              }
                              className="pointer-events-auto absolute inset-y-0 block w-6 -translate-x-1/2"
                              style={{ left: `${posicionHorizontalPx(hoy)}px` }}
                              maxWidthClassName="max-w-[220px]"
                            >
                              <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-rose-500/80" />
                              <span className="absolute left-[calc(50%+10px)] top-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm">
                                Hoy
                              </span>
                            </TooltipCronograma>
                          </div>
                        ) : null}

                        <div className="relative">
                          {filasCronograma.map((fila, indice) => {
                            const claveVisualFila = `${fila.tipo}-${fila.id}`
                              const filaEstaActiva = filaActiva === claveVisualFila || menuAbiertoFilaId === claveVisualFila
                            const claseFila = obtenerClaseFila(fila, filaEstaActiva)
                            const alturaFila = alturasFilas[indice] ?? ALTURA_MINIMA_FILA_CRONOGRAMA

                            return (
                              <div
                                key={claveVisualFila}
                                className={`relative border-b border-slate-200 last:border-b-0 dark:border-slate-800 ${claseFila}`}
                                style={{ height: `${alturaFila}px` }}
                                onMouseEnter={() => setFilaActiva(claveVisualFila)}
                                onMouseLeave={() => setFilaActiva((actual) => (actual === claveVisualFila ? null : actual))}
                              >
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px)] bg-[length:140px_100%] dark:bg-[linear-gradient(to_right,rgba(71,85,105,0.22)_1px,transparent_1px)]" />
                                {filaEstaActiva ? (
                                  <>
                                    <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(14,165,233,0.08),rgba(14,165,233,0.03)_32%,transparent_68%)] dark:bg-[linear-gradient(90deg,rgba(56,189,248,0.12),rgba(56,189,248,0.05)_32%,transparent_68%)]" />
                                    <div className="pointer-events-none absolute inset-y-2 left-0 z-[2] w-1 rounded-r-full bg-sky-400/45 dark:bg-sky-300/35" />
                                  </>
                                ) : null}

                                {fila.segmentos.map((segmento) => {
                                  const inicioVisible =
                                    segmento.inicio.getTime() < rangoTemporal.inicio.getTime() ? rangoTemporal.inicio : segmento.inicio
                                  const finVisible = segmento.fin.getTime() > rangoTemporal.fin.getTime() ? rangoTemporal.fin : segmento.fin

                                  if (!rangoSeSuperpone(inicioVisible, finVisible, rangoTemporal.inicio, rangoTemporal.fin)) {
                                    return null
                                  }

                                  const left = porcentajeHorizontal(inicioVisible)
                                  const width = Math.max(
                                    ((diferenciaDias(inicioVisible, finVisible) + 1) / rangoTemporal.totalDias) * 100,
                                    segmento.variante === 'objetivo' ? 0.8 : 1.2
                                  )
                                  const estiloSegmento = obtenerEstiloSegmento(segmento.variante)

                                  return (
                                    <TooltipCronograma
                                      key={segmento.id}
                                      content={
                                        <div className="space-y-1">
                                          <p className="text-slate-600 dark:text-slate-300">
                                            Inicio: {formatearFechaCorta(segmento.inicio.toISOString().slice(0, 10))}
                                          </p>
                                          <p className="text-slate-600 dark:text-slate-300">
                                            Fin: {formatearFechaCorta(segmento.fin.toISOString().slice(0, 10))}
                                          </p>
                                        </div>
                                      }
                                      className={`${estiloSegmento.className} absolute z-[12] cursor-default`}
                                      style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        top: estiloSegmento.top,
                                        height: estiloSegmento.height,
                                        borderRadius: estiloSegmento.borderRadius
                                      }}
                                    >
                                      {''}
                                    </TooltipCronograma>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>
          )}

          <div className="relative border-t border-slate-100 px-4 py-2 dark:border-slate-800/60">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[8px] w-6 rounded-full bg-slate-500 shadow-sm shadow-slate-500/20 ring-1 ring-inset ring-slate-600/15 dark:bg-slate-400 dark:shadow-slate-950/20 dark:ring-slate-200/10" />
                  Objetivo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[8px] w-6 rounded-full bg-teal-500 shadow-sm shadow-teal-600/20 ring-1 ring-inset ring-teal-700/12 dark:bg-teal-400 dark:shadow-teal-950/20 dark:ring-teal-100/10" />
                  Iniciativa plan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-[8px] w-6 rounded-full bg-orange-400 shadow-sm shadow-orange-500/20 ring-1 ring-inset ring-orange-600/12 dark:bg-orange-300 dark:shadow-orange-950/20 dark:ring-orange-100/10" />
                  Entrega plan
                </span>
                {releasesVisible ? (
                  <span className="flex items-center gap-1.5">
                    <span className="relative inline-block h-3 w-6">
                      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-300 dark:bg-slate-700" />
                      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-900 dark:border-slate-900 dark:bg-slate-100" />
                    </span>
                    Release
                  </span>
                ) : null}
              </div>

              <ControlTemporalCronograma
                vistaTemporal={vistaTemporal}
                anioSeleccionado={anioSeleccionado}
                trimestreSeleccionado={trimestreSeleccionado}
                aniosDisponibles={aniosDisponibles}
                alCambiarVistaTemporal={setVistaTemporal}
                alCambiarAnio={setAnioSeleccionado}
                alCambiarTrimestre={setTrimestreSeleccionado}
              />
            </div>
          </div>
        </section>

        <GestorModalObjetivoRoadmap
          abierto={modalContextual?.tipo === 'objetivo'}
          modo={modalContextual?.tipo === 'objetivo' ? modalContextual.modo : 'ver'}
          objetivo={modalContextual?.tipo === 'objetivo' ? modalContextual.entidad : null}
          alCerrar={() => setModalContextual(null)}
          alGuardado={cargarCronograma}
          alError={setError}
        />
        </div>

        <GestorModalIniciativaRoadmap
          abierto={modalContextual?.tipo === 'iniciativa'}
          modo={modalContextual?.tipo === 'iniciativa' ? modalContextual.modo : 'ver'}
          iniciativa={modalContextual?.tipo === 'iniciativa' ? modalContextual.entidad : null}
          objetivos={objetivos}
          ventanas={ventanas}
          etapas={etapas}
          configuracionRice={configuracionRice}
          alCerrar={() => setModalContextual(null)}
          alGuardado={cargarCronograma}
          alError={setError}
        />

        <GestorModalEntregaRoadmap
          abierto={modalContextual?.tipo === 'entrega'}
          modo={modalContextual?.tipo === 'entrega' ? modalContextual.modo : 'ver'}
          entrega={modalContextual?.tipo === 'entrega' ? modalContextual.entidad : null}
          iniciativas={iniciativas}
          ventanas={ventanas}
          alCerrar={() => setModalContextual(null)}
          alGuardado={cargarCronograma}
          alError={setError}
        />
      </section>
      </ContextoTooltipsCronograma.Provider>
    </EstadoVista>
  )
}
