import {
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { puedeEditar } from '@/compartido/utilidades/permisosRol'
import { formatearEstadoLegible, formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import {
  type CatalogoEtapaPm,
  type CatalogoVentanaPm,
  type ConfiguracionRice,
  type Entrega,
  type EstadoRegistro,
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
import type { ModoModalRoadmap } from '@/presentacion/paginas/roadmap/componentes/tiposModalRoadmap'
import { NavegacionRoadmap } from '@/presentacion/paginas/roadmap/NavegacionRoadmap'

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
const ALTURA_MINIMA_FILA_CRONOGRAMA = 48
const INDENTACION_POR_NIVEL_CRONOGRAMA = 14
const ANCHO_MARCADOR_JERARQUIA = 22
const ALTURA_VISTA_CUERPO_CRONOGRAMA = 'min(68vh, 720px)'
const ESTILO_TITULO_DOS_LINEAS: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
}

function limitarAnchoColumnaJerarquia(valor: number) {
  return Math.min(Math.max(valor, ANCHO_COLUMNA_JERARQUIA_MIN), ANCHO_COLUMNA_JERARQUIA_MAX)
}

function TooltipCronograma({
  content,
  children,
  className,
  style,
  disabled = false,
  maxWidthClassName = 'max-w-xs'
}: TooltipCronogramaProps) {
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
    anclaRef.current = elemento
    actualizarPosicion(elemento)
    setAbierto(true)
  }

  const manejarMouseEnter = (evento: MouseEvent<HTMLSpanElement>) => {
    if (disabled) {
      return
    }

    abrirTooltip(evento.currentTarget)
  }

  const manejarMouseMove = (evento: MouseEvent<HTMLSpanElement>) => {
    if (disabled || !abierto) {
      return
    }

    anclaRef.current = evento.currentTarget
    actualizarPosicion(evento.currentTarget)
  }

  const manejarFocus = (evento: FocusEvent<HTMLSpanElement>) => {
    if (disabled) {
      return
    }

    abrirTooltip(evento.currentTarget)
  }

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
          className={`pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-200 bg-white/96 px-3 py-2 text-left text-xs text-slate-700 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/96 dark:text-slate-200 ${maxWidthClassName}`}
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

function IconoResumen() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <rect x="3.5" y="4" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4v12M3.5 8.5h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
      className: 'bg-slate-300/55 ring-1 ring-inset ring-slate-400/25 dark:bg-slate-700/55 dark:ring-slate-500/30',
      top: 24,
      height: 4,
      borderRadius: 9999
    }
  }

  if (variante === 'iniciativa') {
    return {
      className: 'bg-cyan-500/80 shadow-sm shadow-cyan-900/10 dark:bg-cyan-400/75',
      top: 15,
      height: 8,
      borderRadius: 9999
    }
  }

  return {
    className: 'bg-amber-400/85 dark:bg-amber-300/80',
    top: 12,
    height: 5,
    borderRadius: 9999
  }
}

function compararFechasAscendente(fechaA: Date, fechaB: Date) {
  return fechaA.getTime() - fechaB.getTime()
}

function fechaRelease(release: ReleasePm) {
  return parsearFechaPortal(release.fecha_lanzamiento_real ?? release.fecha_programada)
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

function describirSegmentoTemporal(segmento: SegmentoCronograma, tipoFila: TipoFilaCronograma) {
  return describirContextoTemporalRango(tipoFila, segmento.origen)
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
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [iniciativas, setIniciativas] = useState<Iniciativa[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [releases, setReleases] = useState<ReleasePm[]>([])
  const [ventanas, setVentanas] = useState<CatalogoVentanaPm[]>([])
  const [etapas, setEtapas] = useState<CatalogoEtapaPm[]>([])
  const [configuracionRice, setConfiguracionRice] = useState<ConfiguracionRice | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vistaTemporal, setVistaTemporal] = useState<VistaTemporal>(() => normalizarVistaTemporal(searchParams.get('vista')))
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => normalizarNumero(searchParams.get('anio'), new Date().getFullYear()))
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(() => normalizarTrimestre(searchParams.get('trimestre')))
  const [filtroObjetivo, setFiltroObjetivo] = useState(() => searchParams.get('objetivo') ?? 'todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoRegistro>(() => {
    const valor = searchParams.get('estado')
    return valor === 'pendiente' || valor === 'en_progreso' || valor === 'completado' ? valor : 'todos'
  })
  const [filtroVentana, setFiltroVentana] = useState(() => searchParams.get('ventana') ?? 'todas')
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
  const [redimensionandoJerarquia, setRedimensionandoJerarquia] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(() => {
    return Boolean(
      searchParams.get('objetivo') ||
        searchParams.get('estado') ||
        searchParams.get('ventana') ||
        searchParams.get('trimestre') ||
        searchParams.get('vista') === 'trimestre'
    )
  })
  const contenedorScrollRef = useRef<HTMLDivElement | null>(null)
  const encabezadoTimelineRef = useRef<HTMLDivElement | null>(null)
  const cuerpoTimelineRef = useRef<HTMLDivElement | null>(null)
  const referenciasFilasJerarquiaRef = useRef<Array<HTMLDivElement | null>>([])
  const sincronizandoScrollHorizontalRef = useRef<'encabezado' | 'cuerpo' | null>(null)
  const ejecutivoInicializadoRef = useRef(false)
  const [alturasFilas, setAlturasFilas] = useState<number[]>([])
  const [filaActiva, setFilaActiva] = useState<string | null>(null)
  const [menuAbiertoFilaId, setMenuAbiertoFilaId] = useState<string | null>(null)
  const [menuCrearAbierto, setMenuCrearAbierto] = useState(false)
  const [modalContextual, setModalContextual] = useState<ModalContextualCronograma>(null)

  const esEdicionPermitida = puedeEditar(rol)

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

  const releasesPorIniciativa = useMemo(() => {
    return releases.reduce((mapa, release) => {
      if (!release.iniciativa_id) {
        return mapa
      }

      const actuales = mapa.get(release.iniciativa_id) ?? []
      mapa.set(release.iniciativa_id, [...actuales, release])
      return mapa
    }, new Map<string, ReleasePm[]>())
  }, [releases])

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

  useEffect(() => {
    // Auto-expansión inicial: si no hay nada restaurado del localStorage, expandir objetivos con hijos
    if (!ejecutivoInicializadoRef.current && objetivosVisibles.length > 0) {
      const conHijos = objetivosVisibles
        .filter((objetivo) =>
          iniciativasVisibles.some((iniciativa) => (iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO) === objetivo.id)
        )
        .map((objetivo) => objetivo.id)

      if (conHijos.length > 0) {
        setObjetivosExpandidos((prev) => (prev.length === 0 ? conHijos : prev))
      }

      ejecutivoInicializadoRef.current = true
    }
  }, [iniciativasVisibles, objetivosVisibles])

  const kpis = useMemo(() => {
    const objetivosActivos = objetivosVisibles.filter((objetivo) => objetivo.estado !== 'completado').length
    const iniciativasEnCurso = iniciativasVisibles.filter((iniciativa) => iniciativa.estado === 'en_progreso').length
    const entregasProximas = entregasFiltradas.filter((entrega) => {
      const fecha = parsearFechaPortal(entrega.fecha_objetivo)
      if (!fecha || entrega.estado === 'completado') {
        return false
      }

      const dias = diferenciaDias(hoy, fecha)
      return dias >= 0 && dias <= 45
    }).length
    const entregasAtrasadas = entregasFiltradas.filter((entrega) => esEntregaAtrasada(entrega, hoy)).length

    return [
      { etiqueta: 'Objetivos activos', valor: objetivosActivos, apoyo: 'con tracción visible' },
      { etiqueta: 'Iniciativas en curso', valor: iniciativasEnCurso, apoyo: 'vigentes en el rango' },
      { etiqueta: 'Entregas próximas', valor: entregasProximas, apoyo: 'hasta 45 días' },
      { etiqueta: 'Entregas atrasadas', valor: entregasAtrasadas, apoyo: 'siguen abiertas' }
    ]
  }, [entregasFiltradas, hoy, iniciativasVisibles, objetivosVisibles])

  const filtrosActivos = useMemo(() => {
    let total = 0

    if (vistaTemporal === 'trimestre') {
      total += 1
    }

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
  }, [filtroEstado, filtroObjetivo, filtroVentana, vistaTemporal])

  const resumenControles = useMemo(() => {
    const items = [`${anioSeleccionado}`]

    items.push(vistaTemporal === 'trimestre' ? `T${trimestreSeleccionado}` : 'Vista anual')

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
  }, [anioSeleccionado, filtroEstado, filtroObjetivo, filtroVentana, trimestreSeleccionado, vistaTemporal, ventanasPorId])

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
        (acumulado, iniciativa) => acumulado + (releasesPorIniciativa.get(iniciativa.id) ?? []).length,
        0
      )

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
        detalle: `${entregasObjetivo.length} entregas · ${totalReleases} releases`,
        rangoFechas: segmentoObjetivo ? formatearRangoFechas(segmentoObjetivo.inicio, segmentoObjetivo.fin) : null,
        contextoTemporal: rangoObjetivo ? describirContextoTemporalRango('objetivo', rangoObjetivo.origen) : null,
        tieneHijos: iniciativasObjetivo.length > 0,
        expandido: objetivosExpandidos.includes(objetivo.id),
        segmentos: segmentoObjetivo ? [segmentoObjetivo] : [],
        entregaAtrasada: entregasObjetivo.some((entrega) => esEntregaAtrasada(entrega, hoy))
      })
    }

    objetivosVisibles.forEach((objetivo) => {
      const iniciativasObjetivo = iniciativasVisibles.filter(
        (iniciativa) => (iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO) === objetivo.id
      )
      const entregasObjetivo = entregasFiltradas.filter((entrega) => {
        const iniciativa = entrega.iniciativa_id ? iniciativasPorId.get(entrega.iniciativa_id) : null
        return (iniciativa?.objetivo_id ?? FILA_SIN_OBJETIVO) === objetivo.id
      })

      construirFilaObjetivo(objetivo, iniciativasObjetivo, entregasObjetivo)

      if (!objetivosExpandidos.includes(objetivo.id)) {
        return
      }

      iniciativasObjetivo.forEach((iniciativa) => {
        const entregasIniciativa = entregasFiltradas.filter((entrega) => entrega.iniciativa_id === iniciativa.id)
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
          detalle: `${entregasIniciativa.length} entregas · ${(releasesPorIniciativa.get(iniciativa.id) ?? []).length} releases`,
          rangoFechas: visual.rangoPlan ? formatearRangoFechas(visual.rangoPlan.inicio, visual.rangoPlan.fin) : null,
          contextoTemporal: visual.rangoPlan ? describirContextoTemporalRango('iniciativa', visual.rangoPlan.origen) : null,
          tieneHijos: entregasIniciativa.length > 0,
          expandido: iniciativasExpandidas.includes(iniciativa.id),
          segmentos: visual.segmentos,
          entregaAtrasada: entregasIniciativa.some((entrega) => esEntregaAtrasada(entrega, hoy))
        })

        if (!iniciativasExpandidas.includes(iniciativa.id)) {
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

        const segsSinIni = entregasSinIniciativa
          .flatMap((entrega) => calcularSegmentosEntrega(entrega).segmentos)
          .sort((a, b) => compararFechasAscendente(a.inicio, b.inicio))
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
          detalle: `${entregasSinIniciativa.length} entregas`,
          rangoFechas: segAgregadoSinIni ? formatearRangoFechas(segAgregadoSinIni.inicio, segAgregadoSinIni.fin) : null,
          contextoTemporal: segAgregadoSinIni ? 'Rango derivado de entregables sin iniciativa' : null,
          tieneHijos: true,
          expandido: iniciativasExpandidas.includes(clave),
          segmentos: segAgregadoSinIni ? [segAgregadoSinIni] : [],
          entregaAtrasada: entregasSinIniciativa.some((entrega) => esEntregaAtrasada(entrega, hoy))
        })

        if (iniciativasExpandidas.includes(clave)) {
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
  }, [entregasFiltradas, hoy, iniciativasExpandidas, iniciativasPorId, iniciativasVisibles, objetivosExpandidos, objetivosVisibles, releasesPorIniciativa, ventanasPorId])

  const porcentajeHorizontal = (fecha: Date) => {
    const dias = diferenciaDias(rangoTemporal.inicio, fecha)
    return (dias / rangoTemporal.totalDias) * 100
  }

  const posicionHorizontalPx = (fecha: Date) => {
    const dias = diferenciaDias(rangoTemporal.inicio, fecha)
    return Math.min(Math.max((dias / rangoTemporal.totalDias) * anchoTimeline, 0), anchoTimeline)
  }

  const hoyVisible = fechaDentroDeRango(hoy, rangoTemporal.inicio, rangoTemporal.fin)

  useEffect(() => {
    let frame = 0
    const medirAlturas = () => {
      const nuevasAlturas = filasCronograma.map((_, indice) => {
        const fila = referenciasFilasJerarquiaRef.current[indice]
        return Math.max(Math.ceil(fila?.getBoundingClientRect().height ?? 0), ALTURA_MINIMA_FILA_CRONOGRAMA)
      })

      setAlturasFilas((actuales) => {
        if (
          actuales.length === nuevasAlturas.length &&
          actuales.every((altura, indice) => Math.abs(altura - nuevasAlturas[indice]) < 1)
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

  const sincronizarScrollHorizontal = (origen: 'encabezado' | 'cuerpo') => {
    const scrollOrigen = origen === 'encabezado' ? encabezadoTimelineRef.current : cuerpoTimelineRef.current
    const scrollDestino = origen === 'encabezado' ? cuerpoTimelineRef.current : encabezadoTimelineRef.current

    if (!scrollOrigen || !scrollDestino) {
      return
    }

    const origenBloqueado = origen === 'encabezado' ? 'cuerpo' : 'encabezado'
    if (sincronizandoScrollHorizontalRef.current === origenBloqueado) {
      sincronizandoScrollHorizontalRef.current = null
      return
    }

    sincronizandoScrollHorizontalRef.current = origen
    scrollDestino.scrollLeft = scrollOrigen.scrollLeft

    window.requestAnimationFrame(() => {
      if (sincronizandoScrollHorizontalRef.current === origen) {
        sincronizandoScrollHorizontalRef.current = null
      }
    })
  }

  const limpiarFiltros = () => {
    setVistaTemporal('anio')
    setAnioSeleccionado(new Date().getFullYear())
    setTrimestreSeleccionado(1)
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

  const abrirModalDesdeFila = (fila: FilaCronograma, modo: ModoModalRoadmap) => {
    setMenuCrearAbierto(false)

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

  return (
    <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="No hay cronograma para mostrar.">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Cronograma</h1>
          <NavegacionRoadmap />
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {esEdicionPermitida ? (
                <MenuCrearRoadmapGlobal
                  abierto={menuCrearAbierto}
                  alAlternar={() => {
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
            </div>
          </div>

          {filtrosAbiertos ? (
            <div id="panel-filtros-cronograma-roadmap" className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
              <div className="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
                <label className="space-y-1 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Vista temporal</span>
                  <select
                    value={vistaTemporal}
                    onChange={(evento) => setVistaTemporal(evento.target.value === 'trimestre' ? 'trimestre' : 'anio')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="anio">Año</option>
                    <option value="trimestre">Trimestre</option>
                  </select>
                </label>

                <label className="space-y-1 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Año</span>
                  <select
                    value={anioSeleccionado}
                    onChange={(evento) => setAnioSeleccionado(Number(evento.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    {aniosDisponibles.map((anio) => (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    ))}
                  </select>
                </label>

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

              {vistaTemporal === 'trimestre' ? (
                <div className="mt-3">
                  <label className="space-y-1 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Trimestre</span>
                    <select
                      value={trimestreSeleccionado}
                      onChange={(evento) => setTrimestreSeleccionado(Number(evento.target.value))}
                      className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value={1}>T1</option>
                      <option value={2}>T2</option>
                      <option value={3}>T3</option>
                      <option value={4}>T4</option>
                    </select>
                  </label>
                </div>
              ) : null}
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

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {filasCronograma.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay evidencia temporal suficiente en el rango y filtros actuales para construir un cronograma honesto.
            </div>
          ) : (
            <div ref={contenedorScrollRef} className="relative">
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

              <div className="overflow-y-auto" style={{ maxHeight: ALTURA_VISTA_CUERPO_CRONOGRAMA }}>
                <div className="grid" style={{ gridTemplateColumns: `${anchoColumnaJerarquia}px minmax(0, 1fr)` }}>
                  <div className="border-r border-slate-200 dark:border-slate-800">
                    {filasCronograma.map((fila, indice) => {
                      const claveVisualFila = `${fila.tipo}-${fila.id}`
                      const filaEstaActiva = filaActiva === claveVisualFila || menuAbiertoFilaId === claveVisualFila
                      const claseFila = obtenerClaseFila(fila, filaEstaActiva)
                      const filaOperable = filaEsOperable(fila)

                      return (
                        <div
                          key={claveVisualFila}
                          ref={(elemento) => {
                            referenciasFilasJerarquiaRef.current[indice] = elemento
                          }}
                          className={`group border-b border-slate-200 px-4 py-2 last:border-b-0 dark:border-slate-800 ${claseFila}`}
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
                                          {fila.estado ? <p>{formatearEstadoLegible(fila.estado)}</p> : null}
                                          {fila.rangoFechas ? (
                                            <p className="text-slate-500 dark:text-slate-400">{fila.rangoFechas}</p>
                                          ) : null}
                                          {fila.contextoTemporal ? (
                                            <p className="text-slate-600 dark:text-slate-300">{fila.contextoTemporal}</p>
                                          ) : null}
                                          {fila.resumen && fila.resumen !== fila.detalle ? (
                                            <p className="text-slate-500 dark:text-slate-400">{fila.resumen}</p>
                                          ) : null}
                                          {fila.detalle ? <p className="text-slate-500 dark:text-slate-400">{fila.detalle}</p> : null}
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
                                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${obtenerClaseBadgeEstado(fila.estado)}`}>
                                        {formatearEstadoLegible(fila.estado)}
                                      </span>
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
                            const filaEstaActiva = filaActiva === claveVisualFila
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
                                          <p className="font-medium text-slate-900 dark:text-slate-100">{fila.titulo}</p>
                                          <p className="text-slate-600 dark:text-slate-300">{describirSegmentoTemporal(segmento, fila.tipo)}</p>
                                          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                            {formatearRangoFechas(segmento.inicio, segmento.fin)}
                                          </p>
                                          {fila.estado ? (
                                            <p className="text-slate-500 dark:text-slate-400">{formatearEstadoLegible(fila.estado)}</p>
                                          ) : null}
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
          )}

          <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800/60">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[4px] w-6 rounded-full bg-slate-300/80 ring-1 ring-inset ring-slate-400/30 dark:bg-slate-600/70" />
                Objetivo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[10px] w-6 rounded-full bg-cyan-500/80 dark:bg-cyan-400/75" />
                Iniciativa plan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[6px] w-6 rounded-full bg-amber-400/85 dark:bg-amber-300/80" />
                Entrega plan
              </span>
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
    </EstadoVista>
  )
}
