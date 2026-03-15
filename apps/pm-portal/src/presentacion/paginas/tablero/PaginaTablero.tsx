import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSesionPortalPM } from '@/compartido/autenticacion/contextoSesionPortalPM'
import { EstadoVista } from '@/compartido/ui/EstadoVista'
import {
  leerEstadoDespliegue,
  type EstadoDesplieguePortal
} from '@/infraestructura/estado/lectorEstado'
import {
  obtenerMetricasPosthogAutenticado,
  type ParametrosMetricasPosthog,
  type PeriodoMetricas
} from '@/infraestructura/apis/clienteApiPortalPM'
import type { RespuestaMetricasPosthog } from '@/infraestructura/apis/esquemasApiPortalPM'
import {
  clienteSupabase,
  mensajeErrorConfiguracionSupabase
} from '@/infraestructura/supabase/clienteSupabase'
import { listarPeriodosEstrategicos } from '@/aplicacion/casos-uso/estrategia'
import { obtenerResumenOperacion } from '@/aplicacion/casos-uso/operacion'
import { obtenerResumenGobierno } from '@/aplicacion/casos-uso/gobierno'
import { obtenerContadoresLanzamientos } from '@/aplicacion/casos-uso/lanzamientos'
import { formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'

// ─── tipos locales ────────────────────────────────────────────────────────────

type ModoFiltroMetricas = 'periodo' | 'personalizado'

interface SeñalesPm {
  periodoActivo: { nombre: string; fechaInicio: string; fechaFin: string } | null
  releasesProximos: number
  bugsAbiertos: number
  bugsAltaPrioridad: number
  bloqueosActivos: number
  riesgosAltosYCriticos: number
  dependenciasBloqueantes: number
  bloqueosDetalle: Array<{ id: string; codigo: string; titulo: string }>
  bugsAltaDetalle: Array<{ id: string; codigo: string; titulo: string }>
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fechaLocalHoy(): string {
  const hoy = new Date()
  const anio = String(hoy.getFullYear())
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function formatearFechaYmdLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${String(anio)}-${mes}-${dia}`
}

function esFechaYmdValida(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

function derivarSaludGlobal(señales: SeñalesPm): 'estable' | 'atencion' | 'riesgo' {
  if (señales.bloqueosActivos > 0 || señales.dependenciasBloqueantes > 0 || señales.riesgosAltosYCriticos > 3) {
    return 'riesgo'
  }

  if (señales.bugsAltaPrioridad > 0 || señales.riesgosAltosYCriticos > 0) {
    return 'atencion'
  }

  return 'estable'
}

// ─── componente ──────────────────────────────────────────────────────────────

export function PaginaTablero() {
  const { usuario, accessToken } = useSesionPortalPM()

  // PM data
  const [señalesPm, setSeñalesPm] = useState<SeñalesPm | null>(null)
  const [cargandoPm, setCargandoPm] = useState(true)
  const [errorPm, setErrorPm] = useState<string | null>(null)

  // Infra — estado despliegue + supabase
  const [estadoDespliegue, setEstadoDespliegue] = useState<EstadoDesplieguePortal | null>(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)
  const [saludSupabase, setSaludSupabase] = useState<'pendiente' | 'ok' | 'error'>('pendiente')
  const [detalleSupabase, setDetalleSupabase] = useState<string>('Validando conexión...')

  // Infra — PostHog
  const [metricasPosthog, setMetricasPosthog] = useState<RespuestaMetricasPosthog | null>(null)
  const [cargandoMetricas, setCargandoMetricas] = useState(true)
  const [errorMetricas, setErrorMetricas] = useState<string | null>(null)
  const [modoFiltroMetricas, setModoFiltroMetricas] = useState<ModoFiltroMetricas>('periodo')
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoMetricas>(30)
  const [desdePersonalizado, setDesdePersonalizado] = useState<string>(() => {
    const hoy = new Date()
    const inicio = new Date(hoy)
    inicio.setDate(inicio.getDate() - 29)
    return formatearFechaYmdLocal(inicio)
  })
  const [hastaPersonalizado, setHastaPersonalizado] = useState<string>(() => formatearFechaYmdLocal(new Date()))
  const [filtroAplicadoMetricas, setFiltroAplicadoMetricas] = useState<ParametrosMetricasPosthog>({
    tipo: 'periodo',
    periodoDias: 30
  })

  // ── carga PM ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const hoy = fechaLocalHoy()

    const cargarPm = async () => {
      setCargandoPm(true)
      setErrorPm(null)

      try {
        const [periodos, resumenOp, resumenGob, contadores] = await Promise.all([
          listarPeriodosEstrategicos(),
          obtenerResumenOperacion(),
          obtenerResumenGobierno(),
          obtenerContadoresLanzamientos()
        ])

        const periodoActivo = periodos.find((p) => p.activo) ?? null
        const releasesProximos = contadores.releases.filter(
          (r) => r.fecha_programada >= hoy && r.estado !== 'cerrado'
        ).length

        const bugsAbiertos = resumenOp.bugs.filter(
          (b) => b.estado !== 'resuelto' && b.estado !== 'cerrado'
        )
        const bugsAltaDetalle = bugsAbiertos
          .filter((b) => b.prioridad === 'alta')
          .slice(0, 5)
          .map((b) => ({ id: b.id, codigo: b.codigo, titulo: b.titulo }))

        const bloqueosActivos = resumenOp.bloqueos.filter((b) => b.estado !== 'resuelto')
        const bloqueosDetalle = bloqueosActivos
          .slice(0, 5)
          .map((b) => ({ id: b.id, codigo: b.codigo, titulo: b.titulo }))

        const riesgosAltosYCriticos = resumenGob.riesgos.filter(
          (r) => r.estado !== 'cerrado' && (r.criticidad === 'alta' || r.criticidad === 'critica')
        ).length

        const dependenciasBloqueantes = resumenGob.dependencias.filter(
          (d) => d.estado === 'bloqueante'
        ).length

        setSeñalesPm({
          periodoActivo: periodoActivo
            ? { nombre: periodoActivo.nombre, fechaInicio: periodoActivo.fecha_inicio, fechaFin: periodoActivo.fecha_fin }
            : null,
          releasesProximos,
          bugsAbiertos: bugsAbiertos.length,
          bugsAltaPrioridad: bugsAltaDetalle.length,
          bloqueosActivos: bloqueosActivos.length,
          riesgosAltosYCriticos,
          dependenciasBloqueantes,
          bloqueosDetalle,
          bugsAltaDetalle
        })
      } catch (errorInterno) {
        setErrorPm(errorInterno instanceof Error ? errorInterno.message : 'No se pudieron cargar datos del tablero.')
      } finally {
        setCargandoPm(false)
      }
    }

    void cargarPm()
  }, [])

  // ── carga infra ───────────────────────────────────────────────────────────

  useEffect(() => {
    let activo = true

    const cargarEstado = async () => {
      setCargandoEstado(true)
      setErrorEstado(null)

      try {
        const estado = await leerEstadoDespliegue()
        if (!activo) return
        setEstadoDespliegue(estado)
      } catch (errorInterno) {
        if (!activo) return
        setEstadoDespliegue(null)
        setErrorEstado(
          errorInterno instanceof Error ? errorInterno.message : 'No se pudo leer estado del despliegue.'
        )
      } finally {
        if (activo) setCargandoEstado(false)
      }
    }

    const validarSaludSupabase = async () => {
      if (mensajeErrorConfiguracionSupabase || !clienteSupabase) {
        setSaludSupabase('error')
        setDetalleSupabase(
          mensajeErrorConfiguracionSupabase ??
            'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Cloudflare Pages (Variables and Secrets).'
        )
        return
      }

      try {
        const { error } = await clienteSupabase.from('perfiles').select('id').limit(1)
        if (error) throw new Error(error.message)
        setSaludSupabase('ok')
        setDetalleSupabase('Conexión Supabase operativa.')
      } catch (errorInterno) {
        setSaludSupabase('error')
        setDetalleSupabase(
          errorInterno instanceof Error
            ? `No se pudo validar Supabase: ${errorInterno.message}`
            : 'No se pudo validar Supabase.'
        )
      }
    }

    void cargarEstado()
    void validarSaludSupabase()

    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    let activo = true

    const cargarMetricas = async () => {
      if (!usuario || !accessToken) {
        if (activo) {
          setCargandoMetricas(false)
          setMetricasPosthog(null)
          setErrorMetricas('Inicia sesión para ver métricas.')
        }
        return
      }

      setCargandoMetricas(true)
      setErrorMetricas(null)

      try {
        const respuesta = await obtenerMetricasPosthogAutenticado(filtroAplicadoMetricas, accessToken)
        if (!activo) return
        setMetricasPosthog(respuesta)
      } catch (errorInterno) {
        if (!activo) return
        setMetricasPosthog(null)
        setErrorMetricas(
          errorInterno instanceof Error
            ? errorInterno.message
            : 'No se pudieron cargar métricas de analítica.'
        )
      } finally {
        if (activo) setCargandoMetricas(false)
      }
    }

    void cargarMetricas()

    return () => {
      activo = false
    }
  }, [filtroAplicadoMetricas, accessToken, usuario])

  // ── señales derivadas ─────────────────────────────────────────────────────

  const saludGlobal = useMemo(
    () => (señalesPm ? derivarSaludGlobal(señalesPm) : null),
    [señalesPm]
  )

  const hayAtencionInmediata = useMemo(
    () =>
      señalesPm !== null &&
      (señalesPm.bloqueosDetalle.length > 0 || señalesPm.bugsAltaDetalle.length > 0),
    [señalesPm]
  )

  const etiquetaFiltroMetricas = useMemo(() => {
    if (filtroAplicadoMetricas.tipo === 'periodo') {
      return `Últimos ${String(filtroAplicadoMetricas.periodoDias)} días`
    }
    return `${filtroAplicadoMetricas.desde} a ${filtroAplicadoMetricas.hasta}`
  }, [filtroAplicadoMetricas])

  const commitCorto = useMemo(() => {
    if (!estadoDespliegue?.commit) return 'No disponible'
    return estadoDespliegue.commit.slice(0, 8)
  }, [estadoDespliegue?.commit])

  const fechaConstruccionFormateada = useMemo(() => {
    if (!estadoDespliegue?.fechaConstruccion) return 'No disponible'
    const fecha = new Date(estadoDespliegue.fechaConstruccion)
    if (Number.isNaN(fecha.getTime())) return estadoDespliegue.fechaConstruccion
    return fecha.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
  }, [estadoDespliegue?.fechaConstruccion])

  const metricasDisponibles = useMemo(() => metricasPosthog?.metricas ?? [], [metricasPosthog?.metricas])

  // ── helpers de formato PostHog ────────────────────────────────────────────

  const formatearValorMetrica = (valor: number | null, unidad: 'conteo' | 'porcentaje') => {
    if (valor === null) return 'No disponible'
    if (unidad === 'porcentaje') {
      return `${valor.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    }
    return valor.toLocaleString('es-PE')
  }

  const formatearDeltaMetrica = (metrica: {
    delta_aplicable: boolean
    delta_absoluto: number | null
    delta_porcentual: number | null
    unidad: 'conteo' | 'porcentaje'
  }): string => {
    if (!metrica.delta_aplicable || metrica.delta_absoluto === null || metrica.delta_porcentual === null) return '—'
    const signo = metrica.delta_absoluto > 0 ? '+' : ''
    const flecha = metrica.delta_absoluto > 0 ? '▲' : metrica.delta_absoluto < 0 ? '▼' : '→'
    const valorAbsoluto =
      metrica.unidad === 'porcentaje'
        ? `${signo}${metrica.delta_absoluto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} pp`
        : `${signo}${metrica.delta_absoluto.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
    const valorPorcentual = `${signo}${metrica.delta_porcentual.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    return `${flecha} ${valorAbsoluto} (${valorPorcentual})`
  }

  const formatearMetaMetrica = (meta: number | null, unidad: 'conteo' | 'porcentaje') => {
    if (meta === null) return 'Sin meta'
    if (unidad === 'porcentaje') return `${meta.toLocaleString('es-PE', { maximumFractionDigits: 2 })}%`
    return meta.toLocaleString('es-PE')
  }

  const etiquetaEstadoMeta = (estado: 'ok' | 'atencion' | 'riesgo' | null) => {
    if (estado === 'ok') return 'OK'
    if (estado === 'atencion') return 'Atención'
    if (estado === 'riesgo') return 'Riesgo'
    return 'Sin meta'
  }

  const claseEstadoMeta = (estado: 'ok' | 'atencion' | 'riesgo' | null) => {
    if (estado === 'ok') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    if (estado === 'atencion') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
    if (estado === 'riesgo') return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  }

  const aplicarFiltroMetricas = () => {
    if (modoFiltroMetricas === 'periodo') {
      setFiltroAplicadoMetricas({ tipo: 'periodo', periodoDias: periodoSeleccionado })
      return
    }

    if (!esFechaYmdValida(desdePersonalizado) || !esFechaYmdValida(hastaPersonalizado)) {
      setErrorMetricas('Ingresa fechas válidas en formato YYYY-MM-DD.')
      return
    }

    if (hastaPersonalizado < desdePersonalizado) {
      setErrorMetricas('La fecha Hasta debe ser mayor o igual a Desde.')
      return
    }

    const fechaInicio = new Date(`${desdePersonalizado}T00:00:00.000Z`)
    const fechaHasta = new Date(`${hastaPersonalizado}T00:00:00.000Z`)
    const diferenciaDias =
      Math.floor((fechaHasta.getTime() - fechaInicio.getTime()) / (24 * 60 * 60 * 1000)) + 1

    if (diferenciaDias < 1 || diferenciaDias > 365) {
      setErrorMetricas('El rango personalizado debe ser entre 1 y 365 días.')
      return
    }

    setFiltroAplicadoMetricas({ tipo: 'personalizado', desde: desdePersonalizado, hasta: hastaPersonalizado })
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">

      {/* ── Bloque 1: Encabezado ejecutivo ─────────────────────────────────── */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Tablero</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Visión ejecutiva del estado actual del producto y señales operativas activas.
        </p>
      </header>

      {/* ── Bloque 2: Snapshot PM ──────────────────────────────────────────── */}
      <EstadoVista cargando={cargandoPm} error={errorPm} vacio={false} mensajeVacio="">
        {señalesPm ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Periodo activo</p>
                {señalesPm.periodoActivo ? (
                  <>
                    <p className="mt-2 text-base font-semibold leading-tight">{señalesPm.periodoActivo.nombre}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatearFechaCorta(señalesPm.periodoActivo.fechaInicio)} — {formatearFechaCorta(señalesPm.periodoActivo.fechaFin)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sin periodo activo</p>
                )}
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Releases próximos</p>
                <p className="mt-2 text-2xl font-semibold">{señalesPm.releasesProximos}</p>
                <Link to="/lanzamientos/releases" className="mt-1 block text-xs text-slate-500 underline underline-offset-2 dark:text-slate-400">
                  Ver releases
                </Link>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bugs abiertos</p>
                <p className="mt-2 text-2xl font-semibold">{señalesPm.bugsAbiertos}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {señalesPm.bugsAltaPrioridad > 0
                    ? `${String(señalesPm.bugsAltaPrioridad)} de alta prioridad`
                    : 'Sin alta prioridad'}
                </p>
              </article>

              <article className={`rounded-xl border p-4 ${
                señalesPm.bloqueosActivos > 0
                  ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Bloqueos activos</p>
                <p className={`mt-2 text-2xl font-semibold ${
                  señalesPm.bloqueosActivos > 0 ? 'text-red-600 dark:text-red-400' : ''
                }`}>
                  {señalesPm.bloqueosActivos}
                </p>
                <Link to="/operacion/bloqueos" className="mt-1 block text-xs text-slate-500 underline underline-offset-2 dark:text-slate-400">
                  Ver bloqueos
                </Link>
              </article>

              <article className={`rounded-xl border p-4 ${
                señalesPm.riesgosAltosYCriticos > 0
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Riesgos altos / críticos</p>
                <p className={`mt-2 text-2xl font-semibold ${
                  señalesPm.riesgosAltosYCriticos > 0 ? 'text-amber-600 dark:text-amber-400' : ''
                }`}>
                  {señalesPm.riesgosAltosYCriticos}
                </p>
                <Link to="/gobierno/riesgos" className="mt-1 block text-xs text-slate-500 underline underline-offset-2 dark:text-slate-400">
                  Ver riesgos
                </Link>
              </article>
            </div>

            {/* ── Bloque 3: Atención inmediata ─────────────────────────────── */}
            {hayAtencionInmediata ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {señalesPm.bloqueosDetalle.length > 0 ? (
                  <article className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/50 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold">Bloqueos activos</h2>
                      <Link to="/operacion/bloqueos" className="text-xs font-medium text-slate-600 underline underline-offset-2 dark:text-slate-300">
                        Ver todos
                      </Link>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {señalesPm.bloqueosDetalle.map((bloqueo) => (
                        <li key={bloqueo.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                          <span className="font-medium text-slate-500 dark:text-slate-400">{bloqueo.codigo}</span>
                          {' '}
                          <span>{bloqueo.titulo}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ) : null}

                {señalesPm.bugsAltaDetalle.length > 0 ? (
                  <article className="rounded-xl border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-semibold">Bugs de alta prioridad</h2>
                      <Link to="/operacion/bugs" className="text-xs font-medium text-slate-600 underline underline-offset-2 dark:text-slate-300">
                        Ver todos
                      </Link>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {señalesPm.bugsAltaDetalle.map((bug) => (
                        <li key={bug.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                          <span className="font-medium text-slate-500 dark:text-slate-400">{bug.codigo}</span>
                          {' '}
                          <span>{bug.titulo}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ) : null}
              </div>
            ) : null}

            {/* ── Bloque 4: Salud ejecutiva ─────────────────────────────────── */}
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Salud general del producto</p>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                      saludGlobal === 'estable'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : saludGlobal === 'atencion'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {saludGlobal === 'estable' ? 'Estable' : saludGlobal === 'atencion' ? 'Atención' : 'En riesgo'}
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {saludGlobal === 'estable'
                        ? 'Sin bloqueos ni alertas activas. El producto opera con normalidad.'
                        : saludGlobal === 'atencion'
                          ? 'Hay señales que requieren seguimiento. Revisar bugs de alta prioridad o riesgos abiertos.'
                          : 'Existen bloqueos o dependencias bloqueantes activas que requieren acción inmediata.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{señalesPm.bloqueosActivos} bloqueos activos</span>
                <span>·</span>
                <span>{señalesPm.riesgosAltosYCriticos} riesgos altos/críticos</span>
                <span>·</span>
                <span>{señalesPm.dependenciasBloqueantes} dependencias bloqueantes</span>
                <span>·</span>
                <span>{señalesPm.bugsAltaPrioridad} bugs de alta prioridad</span>
              </div>
            </article>
          </>
        ) : null}
      </EstadoVista>

      {/* ── Bloque 5: Técnico compacto ─────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Infraestructura y analítica
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Deploy */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estado del despliegue</h2>
            <div className="mt-3">
              <EstadoVista
                cargando={cargandoEstado}
                error={errorEstado}
                vacio={!cargandoEstado && !errorEstado && !estadoDespliegue}
                mensajeVacio="No hay datos de despliegue disponibles."
              >
                <dl className="grid gap-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Versión</dt>
                    <dd className="font-medium">{estadoDespliegue?.version ?? 'No disponible'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Commit</dt>
                    <dd className="font-medium">
                      {estadoDespliegue?.commitUrl && estadoDespliegue?.commit ? (
                        <a href={estadoDespliegue.commitUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">
                          {commitCorto}
                        </a>
                      ) : commitCorto}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Rama</dt>
                    <dd className="font-medium">{estadoDespliegue?.rama ?? 'No disponible'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500 dark:text-slate-400">Construcción</dt>
                    <dd className="font-medium">{fechaConstruccionFormateada}</dd>
                  </div>
                  {estadoDespliegue?.repositorioUrl ? (
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-slate-500 dark:text-slate-400">Repositorio</dt>
                      <dd>
                        <a href={estadoDespliegue.repositorioUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline dark:text-blue-400">
                          Abrir
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </EstadoVista>
            </div>
          </article>

          {/* Supabase */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Salud operativa</h2>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Auth</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    usuario
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}>
                    {usuario ? 'OK' : 'Sin sesión'}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">Supabase</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    saludSupabase === 'ok'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : saludSupabase === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}>
                    {saludSupabase === 'ok' ? 'OK' : saludSupabase === 'error' ? 'Error' : 'Validando'}
                  </span>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{detalleSupabase}</p>
          </article>

          {/* PostHog */}
          <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Métricas PostHog</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Resumen agregado de onboarding y ventas.</p>

            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                  Filtro
                  <select
                    value={modoFiltroMetricas === 'periodo' ? String(periodoSeleccionado) : 'personalizado'}
                    onChange={(evento) => {
                      const valor = evento.target.value
                      if (valor === 'personalizado') {
                        setModoFiltroMetricas('personalizado')
                        return
                      }
                      const periodo = Number(valor)
                      if (periodo === 7 || periodo === 30 || periodo === 90) {
                        setModoFiltroMetricas('periodo')
                        setPeriodoSeleccionado(periodo)
                      }
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="7">7 días</option>
                    <option value="30">30 días</option>
                    <option value="90">90 días</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                </label>

                {modoFiltroMetricas === 'personalizado' ? (
                  <>
                    <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                      Desde
                      <input
                        type="date"
                        value={desdePersonalizado}
                        onChange={(evento) => setDesdePersonalizado(evento.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                      Hasta
                      <input
                        type="date"
                        value={hastaPersonalizado}
                        onChange={(evento) => setHastaPersonalizado(evento.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                    </label>
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={aplicarFiltroMetricas}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
                >
                  Aplicar
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">Mostrando: {etiquetaFiltroMetricas}</p>
            </div>

            <div className="mt-4">
              <EstadoVista
                cargando={cargandoMetricas}
                error={errorMetricas}
                vacio={!cargandoMetricas && !errorMetricas && metricasDisponibles.length === 0}
                mensajeVacio="No hay métricas disponibles."
              >
                <div className="space-y-3">
                  {metricasPosthog?.motivo_no_disponible ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                      {metricasPosthog.motivo_no_disponible}
                    </p>
                  ) : null}

                  <ul className="grid gap-2 text-sm">
                    {metricasDisponibles.map((metrica) => (
                      <li
                        key={metrica.clave}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{metrica.nombre}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{metrica.periodo}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Δ vs periodo anterior: {formatearDeltaMetrica(metrica)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Meta: {formatearMetaMetrica(metrica.meta, metrica.unidad)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className={`text-sm font-semibold ${
                            metrica.valor === null ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                          }`}>
                            {formatearValorMetrica(metrica.valor, metrica.unidad)}
                          </p>
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${claseEstadoMeta(metrica.estado_meta)}`}>
                            {etiquetaEstadoMeta(metrica.estado_meta)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {metricasPosthog?.actualizado_en ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Última actualización:{' '}
                      {(() => {
                        const fecha = new Date(metricasPosthog.actualizado_en)
                        return Number.isNaN(fecha.getTime())
                          ? metricasPosthog.actualizado_en
                          : fecha.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
                      })()}
                    </p>
                  ) : null}
                </div>
              </EstadoVista>
            </div>
          </article>
        </div>
      </div>

    </section>
  )
}
