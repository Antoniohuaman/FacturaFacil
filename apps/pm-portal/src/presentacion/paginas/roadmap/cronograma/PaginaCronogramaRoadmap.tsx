import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarVentanasPm } from '@/aplicacion/casos-uso/ajustes'
import { listarEntregas } from '@/aplicacion/casos-uso/entregas'
import { listarIniciativas } from '@/aplicacion/casos-uso/iniciativas'
import { listarReleases } from '@/aplicacion/casos-uso/lanzamientos'
import { listarObjetivos } from '@/aplicacion/casos-uso/objetivos'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import { formatearEstadoLegible, formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
import {
  type CatalogoVentanaPm,
  type Entrega,
  type EstadoRegistro,
  type Iniciativa,
  type Objetivo,
  type ReleasePm
} from '@/dominio/modelos'
import { NavegacionRoadmap } from '@/presentacion/paginas/roadmap/NavegacionRoadmap'

type VistaTemporal = 'anio' | 'trimestre'
type DensidadCronograma = 'ejecutivo' | 'detalle'
type TipoFilaCronograma = 'objetivo' | 'iniciativa' | 'entrega'

interface SegmentoCronograma {
  id: string
  inicio: Date
  fin: Date
  variante: 'objetivo' | 'iniciativa' | 'plan' | 'real'
}

interface MarcadorCronograma {
  id: string
  fecha: Date
  variante: 'entrega' | 'entrega_real' | 'release' | 'release_real'
  etiqueta: string
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
  tieneHijos: boolean
  expandido: boolean
  segmentos: SegmentoCronograma[]
  marcadores: MarcadorCronograma[]
  entregaAtrasada: boolean
}

const FILA_SIN_OBJETIVO = '__sin_objetivo__'
const FILA_SIN_INICIATIVA = '__sin_iniciativa__'
const ANCHO_COLUMNA_FIJA = 320
const ANCHO_MES = 140

function normalizarVistaTemporal(valor: string | null): VistaTemporal {
  return valor === 'trimestre' ? 'trimestre' : 'anio'
}

function normalizarDensidad(valor: string | null): DensidadCronograma {
  return valor === 'detalle' ? 'detalle' : 'ejecutivo'
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

function formatearAnio(fecha: Date) {
  return new Intl.DateTimeFormat('es-PE', { year: 'numeric' }).format(fecha)
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

function obtenerClaseSegmento(variante: SegmentoCronograma['variante']) {
  if (variante === 'objetivo') {
    return 'bg-slate-300/80 dark:bg-slate-700/80'
  }

  if (variante === 'iniciativa') {
    return 'bg-cyan-500/80 dark:bg-cyan-400/70'
  }

  if (variante === 'real') {
    return 'bg-emerald-500/85 dark:bg-emerald-400/70'
  }

  return 'bg-amber-400/80 dark:bg-amber-300/70'
}

function obtenerClaseMarcador(variante: MarcadorCronograma['variante']) {
  if (variante === 'release_real' || variante === 'entrega_real') {
    return 'bg-emerald-600 dark:bg-emerald-400'
  }

  if (variante === 'release') {
    return 'bg-slate-900 dark:bg-slate-100'
  }

  return 'bg-amber-500 dark:bg-amber-300'
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

function construirSegmento(inicio: Date | null, fin: Date | null, id: string, variante: SegmentoCronograma['variante']) {
  if (!inicio || !fin) {
    return null
  }

  return {
    id,
    inicio,
    fin,
    variante
  } satisfies SegmentoCronograma
}

function construirMarcador(fecha: Date | null, id: string, variante: MarcadorCronograma['variante'], etiqueta: string) {
  if (!fecha) {
    return null
  }

  return {
    id,
    fecha,
    variante,
    etiqueta
  } satisfies MarcadorCronograma
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
  const [densidad, setDensidad] = useState<DensidadCronograma>(() => normalizarDensidad(searchParams.get('densidad')))
  const [objetivosExpandidos, setObjetivosExpandidos] = useState<string[]>([])
  const [iniciativasExpandidas, setIniciativasExpandidas] = useState<string[]>([])

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)

      try {
        const [objetivosData, iniciativasData, entregasData, releasesData, ventanasData] = await Promise.all([
          listarObjetivos(),
          listarIniciativas(),
          listarEntregas(),
          listarReleases(),
          listarVentanasPm()
        ])

        setObjetivos(objetivosData)
        setIniciativas(iniciativasData)
        setEntregas(entregasData)
        setReleases(releasesData)
        setVentanas(ventanasData)
      } catch (errorInterno) {
        setError(errorInterno instanceof Error ? errorInterno.message : 'No se pudo cargar el cronograma roadmap')
      } finally {
        setCargando(false)
      }
    }

    void cargar()
  }, [])

  useEffect(() => {
    const parametros = new URLSearchParams(searchParams)

    parametros.set('vista', vistaTemporal)
    parametros.set('anio', String(anioSeleccionado))
    parametros.set('densidad', densidad)

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
  }, [anioSeleccionado, densidad, filtroEstado, filtroObjetivo, filtroVentana, searchParams, setSearchParams, trimestreSeleccionado, vistaTemporal])

  const iniciativasPorId = useMemo(() => new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa])), [iniciativas])
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
  }, [entregas, releases, ventanas])

  useEffect(() => {
    if (!aniosDisponibles.includes(anioSeleccionado)) {
      setAnioSeleccionado(aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear())
    }
  }, [anioSeleccionado, aniosDisponibles])

  const rangoTemporal = useMemo(() => {
    const inicio = vistaTemporal === 'trimestre'
      ? new Date(anioSeleccionado, (trimestreSeleccionado - 1) * 3, 1)
      : new Date(anioSeleccionado, 0, 1)
    const fin = vistaTemporal === 'trimestre'
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

  const anchoTimeline = Math.max(rangoTemporal.meses.length * ANCHO_MES, 720)

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

      const rangoVentana = obtenerRangoVentana(iniciativa.ventana_planificada_id, ventanasPorId)
      const releasesIniciativa = releasesPorIniciativa.get(iniciativa.id) ?? []
      const tieneReleaseEnRango = releasesIniciativa.some((release) => {
        const fecha = fechaRelease(release)
        return fecha ? fechaDentroDeRango(fecha, rangoTemporal.inicio, rangoTemporal.fin) : false
      })

      if (rangoVentana) {
        return rangoSeSuperpone(rangoVentana.inicio, rangoVentana.fin, rangoTemporal.inicio, rangoTemporal.fin) || tieneReleaseEnRango
      }

      return tieneReleaseEnRango
    })
  }, [filtroEstado, filtroObjetivo, filtroVentana, iniciativas, rangoTemporal.fin, rangoTemporal.inicio, releasesPorIniciativa, ventanasPorId])

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

      if (
        filtroVentana !== 'todas' &&
        entrega.ventana_planificada_id !== filtroVentana &&
        entrega.ventana_real_id !== filtroVentana
      ) {
        return false
      }

      const plan = obtenerRangoVentana(entrega.ventana_planificada_id, ventanasPorId)
      const real = obtenerRangoVentana(entrega.ventana_real_id, ventanasPorId)
      const fechaObjetivo = parsearFechaPortal(entrega.fecha_objetivo)
      const fechaCompletado = parsearFechaPortal(entrega.fecha_completado)
      const releasesEntrega = releasesPorEntrega.get(entrega.id) ?? []

      if (plan && rangoSeSuperpone(plan.inicio, plan.fin, rangoTemporal.inicio, rangoTemporal.fin)) {
        return true
      }

      if (real && rangoSeSuperpone(real.inicio, real.fin, rangoTemporal.inicio, rangoTemporal.fin)) {
        return true
      }

      if (fechaObjetivo && fechaDentroDeRango(fechaObjetivo, rangoTemporal.inicio, rangoTemporal.fin)) {
        return true
      }

      if (fechaCompletado && fechaDentroDeRango(fechaCompletado, rangoTemporal.inicio, rangoTemporal.fin)) {
        return true
      }

      return releasesEntrega.some((release) => {
        const fecha = fechaRelease(release)
        return fecha ? fechaDentroDeRango(fecha, rangoTemporal.inicio, rangoTemporal.fin) : false
      })
    })
  }, [entregas, filtroEstado, filtroObjetivo, filtroVentana, iniciativasPorId, rangoTemporal.fin, rangoTemporal.inicio, releasesPorEntrega, ventanasPorId])

  const iniciativasVisibles = useMemo(() => {
    return iniciativas.filter((iniciativa) => {
      if (filtroObjetivo !== 'todos' && iniciativa.objetivo_id !== filtroObjetivo) {
        return false
      }

      const directMatch = iniciativasFiltradas.some((actual) => actual.id === iniciativa.id)
      const tieneEntregas = entregasFiltradas.some((entrega) => entrega.iniciativa_id === iniciativa.id)
      const tieneReleases = (releasesPorIniciativa.get(iniciativa.id) ?? []).some((release) => {
        const fecha = fechaRelease(release)
        return fecha ? fechaDentroDeRango(fecha, rangoTemporal.inicio, rangoTemporal.fin) : false
      })

      return directMatch || tieneEntregas || tieneReleases
    })
  }, [entregasFiltradas, filtroObjetivo, iniciativas, iniciativasFiltradas, rangoTemporal.fin, rangoTemporal.inicio, releasesPorIniciativa])

  const objetivosVisibles = useMemo(() => {
    const idsObjetivos = new Set(
      iniciativasVisibles.map((iniciativa) => iniciativa.objetivo_id ?? FILA_SIN_OBJETIVO)
    )

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
  }, [filtroObjetivo, iniciativasVisibles, objetivos])

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
    const entregasAtrasadas = entregasFiltradas.filter((entrega) => {
      const fecha = parsearFechaPortal(entrega.fecha_objetivo)
      return Boolean(fecha && fecha.getTime() < hoy.getTime() && entrega.estado !== 'completado')
    }).length

    return [
      { etiqueta: 'Objetivos activos', valor: objetivosActivos, apoyo: 'con tracción visible en el rango' },
      { etiqueta: 'Iniciativas en curso', valor: iniciativasEnCurso, apoyo: 'con ventana o hitos vigentes' },
      { etiqueta: 'Entregas próximas', valor: entregasProximas, apoyo: 'vencen en los próximos 45 días' },
      { etiqueta: 'Entregas atrasadas', valor: entregasAtrasadas, apoyo: 'siguen abiertas sobre la fecha objetivo' }
    ]
  }, [entregasFiltradas, hoy, iniciativasVisibles, objetivosVisibles])

  const filasCronograma = useMemo(() => {
    const filas: FilaCronograma[] = []

    const calcularSegmentosIniciativa = (iniciativa: Iniciativa) => {
      const plan = obtenerRangoVentana(iniciativa.ventana_planificada_id, ventanasPorId)
      const releasesAsociados = (releasesPorIniciativa.get(iniciativa.id) ?? []).filter((release) => !release.entrega_id)
      const marcadores = releasesAsociados
        .map((release) =>
          construirMarcador(
            fechaRelease(release),
            `release-${release.id}`,
            release.fecha_lanzamiento_real ? 'release_real' : 'release',
            release.codigo
          )
        )
        .filter((item): item is MarcadorCronograma => Boolean(item))

      return {
        segmentos: [construirSegmento(plan?.inicio ?? null, plan?.fin ?? null, `plan-${iniciativa.id}`, 'iniciativa')].filter(
          (item): item is SegmentoCronograma => Boolean(item)
        ),
        marcadores
      }
    }

    const calcularSegmentosEntrega = (entrega: Entrega) => {
      const plan = obtenerRangoVentana(entrega.ventana_planificada_id, ventanasPorId)
      const real = obtenerRangoVentana(entrega.ventana_real_id, ventanasPorId)
      const marcadores = [
        construirMarcador(parsearFechaPortal(entrega.fecha_objetivo), `objetivo-${entrega.id}`, 'entrega', 'Fecha objetivo'),
        construirMarcador(parsearFechaPortal(entrega.fecha_completado), `real-${entrega.id}`, 'entrega_real', 'Fecha completada'),
        ...(releasesPorEntrega.get(entrega.id) ?? []).map((release) =>
          construirMarcador(
            fechaRelease(release),
            `release-${release.id}`,
            release.fecha_lanzamiento_real ? 'release_real' : 'release',
            release.codigo
          )
        )
      ].filter((item): item is MarcadorCronograma => Boolean(item))

      const segmentos = [
        construirSegmento(plan?.inicio ?? null, plan?.fin ?? null, `plan-${entrega.id}`, 'plan'),
        construirSegmento(real?.inicio ?? null, real?.fin ?? null, `real-${entrega.id}`, 'real')
      ].filter((item): item is SegmentoCronograma => Boolean(item))

      return { segmentos, marcadores }
    }

    const construirFilaObjetivo = (objetivo: Objetivo, iniciativasObjetivo: Iniciativa[], entregasObjetivo: Entrega[]) => {
      const segmentosIniciativas = iniciativasObjetivo.flatMap((iniciativa) => calcularSegmentosIniciativa(iniciativa).segmentos)
      const segmentosEntregas = entregasObjetivo.flatMap((entrega) => calcularSegmentosEntrega(entrega).segmentos)
      const todosLosSegmentos = [...segmentosIniciativas, ...segmentosEntregas].sort((a, b) => compararFechasAscendente(a.inicio, b.inicio))

      const segmentoObjetivo: SegmentoCronograma | null = todosLosSegmentos.length > 0
        ? {
            id: `objetivo-${objetivo.id}`,
            inicio: todosLosSegmentos[0].inicio,
            fin: [...todosLosSegmentos].sort((a, b) => compararFechasAscendente(a.fin, b.fin))[todosLosSegmentos.length - 1].fin,
            variante: 'objetivo'
          }
        : null

      const marcadoresObjetivo = [...iniciativasObjetivo, ...entregasObjetivo]
        .flatMap((item) => {
          if ('objetivo_id' in item) {
            return calcularSegmentosIniciativa(item).marcadores
          }

          return calcularSegmentosEntrega(item).marcadores
        })
        .sort((a, b) => compararFechasAscendente(a.fecha, b.fecha))
        .slice(0, 8)

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
        estado: objetivo.id === FILA_SIN_OBJETIVO ? estadoDominante(iniciativasObjetivo.map((iniciativa) => iniciativa.estado)) : objetivo.estado,
        resumen: `${iniciativasObjetivo.length} iniciativas`,
        detalle: `${entregasObjetivo.length} entregas · ${totalReleases} releases`,
        tieneHijos: iniciativasObjetivo.length > 0,
        expandido: objetivosExpandidos.includes(objetivo.id),
        segmentos: segmentoObjetivo ? [segmentoObjetivo] : [],
        marcadores: marcadoresObjetivo,
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
          tieneHijos: densidad === 'detalle' && entregasIniciativa.length > 0,
          expandido: iniciativasExpandidas.includes(iniciativa.id),
          segmentos: visual.segmentos,
          marcadores: visual.marcadores,
          entregaAtrasada: entregasIniciativa.some((entrega) => esEntregaAtrasada(entrega, hoy))
        })

        if (densidad !== 'detalle' || !iniciativasExpandidas.includes(iniciativa.id)) {
          return
        }

        entregasIniciativa.forEach((entrega) => {
          const visualEntrega = calcularSegmentosEntrega(entrega)
          const ventanaPlan = entrega.ventana_planificada_id
            ? ventanasPorId.get(entrega.ventana_planificada_id)?.etiqueta_visible ?? 'Sin ventana plan'
            : 'Sin ventana plan'
          const fecha = entrega.fecha_objetivo ? formatearFechaCorta(entrega.fecha_objetivo) : 'Sin fecha objetivo'

          filas.push({
            id: entrega.id,
            claveExpansion: entrega.id,
            tipo: 'entrega',
            nivel: 2,
            titulo: entrega.nombre,
            estado: entrega.estado,
            resumen: ventanaPlan,
            detalle: fecha,
            tieneHijos: false,
            expandido: false,
            segmentos: visualEntrega.segmentos,
            marcadores: visualEntrega.marcadores,
            entregaAtrasada: esEntregaAtrasada(entrega, hoy)
          })
        })
      })

      const entregasSinIniciativa = entregasObjetivo.filter((entrega) => !entrega.iniciativa_id)
      if (densidad === 'detalle' && entregasSinIniciativa.length > 0) {
        const clave = `${objetivo.id}-${FILA_SIN_INICIATIVA}`
        filas.push({
          id: clave,
          claveExpansion: clave,
          tipo: 'iniciativa',
          nivel: 1,
          titulo: 'Sin iniciativa asignada',
          estado: estadoDominante(entregasSinIniciativa.map((entrega) => entrega.estado)),
          resumen: 'Entregas huérfanas',
          detalle: `${entregasSinIniciativa.length} entregas`,
          tieneHijos: true,
          expandido: iniciativasExpandidas.includes(clave),
          segmentos: [],
          marcadores: [],
          entregaAtrasada: entregasSinIniciativa.some((entrega) => esEntregaAtrasada(entrega, hoy))
        })

        if (iniciativasExpandidas.includes(clave)) {
          entregasSinIniciativa.forEach((entrega) => {
            const visualEntrega = calcularSegmentosEntrega(entrega)
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
              tieneHijos: false,
              expandido: false,
              segmentos: visualEntrega.segmentos,
              marcadores: visualEntrega.marcadores,
              entregaAtrasada: esEntregaAtrasada(entrega, hoy)
            })
          })
        }
      }
    })

    return filas
  }, [densidad, entregasFiltradas, hoy, iniciativasExpandidas, iniciativasPorId, iniciativasVisibles, objetivosExpandidos, objetivosVisibles, releasesPorEntrega, releasesPorIniciativa, ventanasPorId])

  const porcentajeHorizontal = (fecha: Date) => {
    const dias = diferenciaDias(rangoTemporal.inicio, fecha)
    return (dias / rangoTemporal.totalDias) * 100
  }

  const hoyVisible = fechaDentroDeRango(hoy, rangoTemporal.inicio, rangoTemporal.fin)

  const limpiarFiltros = () => {
    setVistaTemporal('anio')
    setAnioSeleccionado(aniosDisponibles[aniosDisponibles.length - 1] ?? new Date().getFullYear())
    setTrimestreSeleccionado(1)
    setFiltroObjetivo('todos')
    setFiltroEstado('todos')
    setFiltroVentana('todas')
    setDensidad('ejecutivo')
    setObjetivosExpandidos([])
    setIniciativasExpandidas([])
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

  return (
    <EstadoVista cargando={cargando} error={error} vacio={false} mensajeVacio="No hay cronograma para mostrar.">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="space-y-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Cronograma</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Lectura horizontal del roadmap para revisar hitos, progreso y secuencia sin convertirlo en un gantt operativo.
            </p>
          </div>
          <NavegacionRoadmap />
        </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[repeat(6,minmax(0,1fr))]">
        <label className="space-y-1 text-sm lg:col-span-1">
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

        <label className="space-y-1 text-sm lg:col-span-1">
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

        {vistaTemporal === 'trimestre' ? (
          <label className="space-y-1 text-sm lg:col-span-1">
            <span className="text-slate-500 dark:text-slate-400">Trimestre</span>
            <select
              value={trimestreSeleccionado}
              onChange={(evento) => setTrimestreSeleccionado(Number(evento.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              <option value={1}>T1</option>
              <option value={2}>T2</option>
              <option value={3}>T3</option>
              <option value={4}>T4</option>
            </select>
          </label>
        ) : (
          <div className="lg:col-span-1" />
        )}

        <label className="space-y-1 text-sm lg:col-span-1">
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

        <label className="space-y-1 text-sm lg:col-span-1">
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

        <label className="space-y-1 text-sm lg:col-span-1">
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

        <div className="space-y-1 text-sm lg:col-span-5">
          <span className="text-slate-500 dark:text-slate-400">Densidad</span>
          <div className="flex flex-wrap gap-2">
            {(['ejecutivo', 'detalle'] as DensidadCronograma[]).map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setDensidad(valor)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  densidad === valor
                    ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {valor === 'ejecutivo' ? 'Ejecutivo' : 'Detalle'}
              </button>
            ))}
            <button
              type="button"
              onClick={limpiarFiltros}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Limpiar
            </button>
          </div>
        </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article key={kpi.etiqueta} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{kpi.etiqueta}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{kpi.valor}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{kpi.apoyo}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Lienzo temporal</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Objetivos agrupados a la izquierda, meses arriba, línea de hoy y detalle gradual según expansión.
            </p>
          </div>

          {filasCronograma.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay evidencia temporal suficiente en el rango y filtros actuales para construir un cronograma honesto.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <div style={{ minWidth: `${ANCHO_COLUMNA_FIJA + anchoTimeline}px` }}>
              <div
                className="sticky top-0 z-20 grid border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
                style={{ gridTemplateColumns: `${ANCHO_COLUMNA_FIJA}px ${anchoTimeline}px` }}
              >
                <div className="sticky left-0 z-30 flex items-end border-r border-slate-200 bg-slate-50/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/95">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Jerarquía</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Roadmap</p>
                  </div>
                </div>
                <div className="relative h-16">
                  <div className="absolute inset-0 flex">
                    {rangoTemporal.meses.map((mes) => (
                      <div key={`${mes.getFullYear()}-${mes.getMonth()}`} className="flex h-full flex-1 flex-col justify-between border-l border-slate-200 px-3 py-2 first:border-l-0 dark:border-slate-800">
                        <span className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{formatearAnio(mes)}</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatearMesCorto(mes)}</span>
                      </div>
                    ))}
                  </div>
                  {hoyVisible ? (
                    <div className="pointer-events-none absolute inset-y-0" style={{ left: `${porcentajeHorizontal(hoy)}%` }}>
                      <div className="absolute -left-px top-0 h-full w-0.5 bg-rose-500/80" />
                      <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        Hoy
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {filasCronograma.map((fila) => (
                <div
                  key={`${fila.tipo}-${fila.id}`}
                  className="grid border-b border-slate-200 last:border-b-0 dark:border-slate-800"
                  style={{ gridTemplateColumns: `${ANCHO_COLUMNA_FIJA}px ${anchoTimeline}px` }}
                >
                  <div className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start gap-3" style={{ paddingLeft: `${fila.nivel * 18}px` }}>
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
                          className="mt-0.5 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
                          aria-label={fila.expandido ? `Colapsar ${fila.titulo}` : `Expandir ${fila.titulo}`}
                        >
                          {fila.expandido ? '−' : '+'}
                        </button>
                      ) : (
                        <span className="mt-2 block h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-slate-950 dark:text-slate-50">{fila.titulo}</p>
                          {fila.estado ? (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${obtenerClaseBadgeEstado(fila.estado)}`}>
                              {formatearEstadoLegible(fila.estado)}
                            </span>
                          ) : null}
                          {fila.entregaAtrasada ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                              Desvío
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{fila.resumen}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{fila.detalle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-16 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[length:140px_100%] dark:bg-[linear-gradient(to_right,rgba(71,85,105,0.24)_1px,transparent_1px)]">
                    {hoyVisible ? (
                      <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${porcentajeHorizontal(hoy)}%` }}>
                        <div className="absolute -left-px top-0 h-full w-0.5 bg-rose-500/70" />
                      </div>
                    ) : null}

                    {fila.segmentos.map((segmento) => {
                      const inicioVisible = segmento.inicio.getTime() < rangoTemporal.inicio.getTime() ? rangoTemporal.inicio : segmento.inicio
                      const finVisible = segmento.fin.getTime() > rangoTemporal.fin.getTime() ? rangoTemporal.fin : segmento.fin
                      if (!rangoSeSuperpone(inicioVisible, finVisible, rangoTemporal.inicio, rangoTemporal.fin)) {
                        return null
                      }

                      const left = porcentajeHorizontal(inicioVisible)
                      const width = Math.max(((diferenciaDias(inicioVisible, finVisible) + 1) / rangoTemporal.totalDias) * 100, 1.2)

                      return (
                        <div
                          key={segmento.id}
                          className={`absolute top-5 h-5 rounded-full ${obtenerClaseSegmento(segmento.variante)}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${fila.titulo}: ${fila.resumen}`}
                        />
                      )
                    })}

                    {fila.marcadores.map((marcador) => {
                      if (!fechaDentroDeRango(marcador.fecha, rangoTemporal.inicio, rangoTemporal.fin)) {
                        return null
                      }

                      const left = porcentajeHorizontal(marcador.fecha)
                      return (
                        <div
                          key={marcador.id}
                          className="absolute top-3 z-10"
                          style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                          title={`${marcador.etiqueta}: ${formatearFechaCorta(marcador.fecha.toISOString().slice(0, 10))}`}
                        >
                          <div className={`h-2.5 w-2.5 rounded-full ${obtenerClaseMarcador(marcador.variante)}`} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}
        </section>
      </section>
    </EstadoVista>
  )
}