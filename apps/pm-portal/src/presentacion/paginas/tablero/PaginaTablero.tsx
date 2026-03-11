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

type ModoFiltroMetricas = 'periodo' | 'personalizado'

function formatearFechaYmdLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${String(anio)}-${mes}-${dia}`
}

function esFechaYmdValida(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

export function PaginaTablero() {
  const { usuario, accessToken } = useSesionPortalPM()
  const [estadoDespliegue, setEstadoDespliegue] = useState<EstadoDesplieguePortal | null>(null)
  const [cargandoEstado, setCargandoEstado] = useState(true)
  const [errorEstado, setErrorEstado] = useState<string | null>(null)
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

  const [saludSupabase, setSaludSupabase] = useState<'pendiente' | 'ok' | 'error'>('pendiente')
  const [detalleSupabase, setDetalleSupabase] = useState<string>('Validando conexión...')

  useEffect(() => {
    let activo = true

    const cargarEstado = async () => {
      setCargandoEstado(true)
      setErrorEstado(null)

      try {
        const estado = await leerEstadoDespliegue()
        if (!activo) {
          return
        }
        setEstadoDespliegue(estado)
      } catch (errorInterno) {
        if (!activo) {
          return
        }
        setEstadoDespliegue(null)
        setErrorEstado(
          errorInterno instanceof Error ? errorInterno.message : 'No se pudo leer estado del despliegue.'
        )
      } finally {
        if (activo) {
          setCargandoEstado(false)
        }
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
        if (error) {
          throw new Error(error.message)
        }

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
        if (!activo) {
          return
        }

        setMetricasPosthog(respuesta)
      } catch (errorInterno) {
        if (!activo) {
          return
        }

        setMetricasPosthog(null)
        setErrorMetricas(
          errorInterno instanceof Error
            ? errorInterno.message
            : 'No se pudieron cargar métricas de analítica.'
        )
      } finally {
        if (activo) {
          setCargandoMetricas(false)
        }
      }
    }

    void cargarMetricas()

    return () => {
      activo = false
    }
  }, [filtroAplicadoMetricas, accessToken, usuario])

  const etiquetaFiltroMetricas = useMemo(() => {
    if (filtroAplicadoMetricas.tipo === 'periodo') {
      return `Últimos ${String(filtroAplicadoMetricas.periodoDias)} días`
    }

    return `${filtroAplicadoMetricas.desde} a ${filtroAplicadoMetricas.hasta}`
  }, [filtroAplicadoMetricas])

  const aplicarFiltroMetricas = () => {
    if (modoFiltroMetricas === 'periodo') {
      setFiltroAplicadoMetricas({
        tipo: 'periodo',
        periodoDias: periodoSeleccionado
      })
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

    setFiltroAplicadoMetricas({
      tipo: 'personalizado',
      desde: desdePersonalizado,
      hasta: hastaPersonalizado
    })
  }

  const commitCorto = useMemo(() => {
    if (!estadoDespliegue?.commit) {
      return 'No disponible'
    }

    return estadoDespliegue.commit.slice(0, 8)
  }, [estadoDespliegue?.commit])

  const fechaConstruccionFormateada = useMemo(() => {
    if (!estadoDespliegue?.fechaConstruccion) {
      return 'No disponible'
    }

    const fecha = new Date(estadoDespliegue.fechaConstruccion)
    if (Number.isNaN(fecha.getTime())) {
      return estadoDespliegue.fechaConstruccion
    }

    return fecha.toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }, [estadoDespliegue?.fechaConstruccion])

  const fechaActualizacionMetricas = useMemo(() => {
    if (!metricasPosthog?.actualizado_en) {
      return 'No disponible'
    }

    const fecha = new Date(metricasPosthog.actualizado_en)
    if (Number.isNaN(fecha.getTime())) {
      return metricasPosthog.actualizado_en
    }

    return fecha.toLocaleString('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }, [metricasPosthog?.actualizado_en])

  const metricasDisponibles = useMemo(() => metricasPosthog?.metricas ?? [], [metricasPosthog?.metricas])

  const formatearValorMetrica = (valor: number | null, unidad: 'conteo' | 'porcentaje') => {
    if (valor === null) {
      return 'No disponible'
    }

    if (unidad === 'porcentaje') {
      return `${valor.toLocaleString('es-PE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}%`
    }

    return valor.toLocaleString('es-PE')
  }

  const formatearDeltaMetrica = (metrica: {
    delta_aplicable: boolean
    delta_absoluto: number | null
    delta_porcentual: number | null
    unidad: 'conteo' | 'porcentaje'
  }): string => {
    if (!metrica.delta_aplicable || metrica.delta_absoluto === null || metrica.delta_porcentual === null) {
      return '—'
    }

    const signo = metrica.delta_absoluto > 0 ? '+' : ''
    const flecha = metrica.delta_absoluto > 0 ? '▲' : metrica.delta_absoluto < 0 ? '▼' : '→'
    const valorAbsoluto =
      metrica.unidad === 'porcentaje'
        ? `${signo}${metrica.delta_absoluto.toLocaleString('es-PE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })} pp`
        : `${signo}${metrica.delta_absoluto.toLocaleString('es-PE', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}`

    const valorPorcentual = `${signo}${metrica.delta_porcentual.toLocaleString('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}%`

    return `${flecha} ${valorAbsoluto} (${valorPorcentual})`
  }

  const formatearMetaMetrica = (meta: number | null, unidad: 'conteo' | 'porcentaje') => {
    if (meta === null) {
      return 'Sin meta'
    }

    if (unidad === 'porcentaje') {
      return `${meta.toLocaleString('es-PE', { maximumFractionDigits: 2 })}%`
    }

    return meta.toLocaleString('es-PE')
  }

  const etiquetaEstadoMeta = (estado: 'ok' | 'atencion' | 'riesgo' | null) => {
    if (estado === 'ok') {
      return 'OK'
    }

    if (estado === 'atencion') {
      return 'Atención'
    }

    if (estado === 'riesgo') {
      return 'Riesgo'
    }

    return 'Sin meta'
  }

  const claseEstadoMeta = (estado: 'ok' | 'atencion' | 'riesgo' | null) => {
    if (estado === 'ok') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    }

    if (estado === 'atencion') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
    }

    if (estado === 'riesgo') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
    }

    return 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Nuevo módulo</p>
            <h1 className="mt-1 text-2xl font-semibold">Analítica</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
              Accede al resumen ejecutivo transversal, KPIs, portafolio consolidado, tendencias y health scores sin reemplazar el Tablero operativo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/analitica" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900">
              Ir a Analítica
            </Link>
            <Link to="/analitica/kpis" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">
              Ver KPIs
            </Link>
          </div>
        </div>
      </article>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Tablero</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Estado actual del despliegue y verificación básica de salud operativa.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold">Estado del despliegue</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Información generada automáticamente durante el build del portal.
          </p>

          <div className="mt-4">
            <EstadoVista
              cargando={cargandoEstado}
              error={errorEstado}
              vacio={!cargandoEstado && !errorEstado && !estadoDespliegue}
              mensajeVacio="No hay datos de despliegue disponibles."
            >
              <dl className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Versión</dt>
                  <dd className="font-medium">{estadoDespliegue?.version ?? 'No disponible'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Commit</dt>
                  <dd className="font-medium">
                    {estadoDespliegue?.commitUrl && estadoDespliegue?.commit ? (
                      <a
                        href={estadoDespliegue.commitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline dark:text-blue-400"
                      >
                        {commitCorto}
                      </a>
                    ) : (
                      commitCorto
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Rama</dt>
                  <dd className="font-medium">{estadoDespliegue?.rama ?? 'No disponible'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Construcción</dt>
                  <dd className="font-medium">{fechaConstruccionFormateada}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Repositorio</dt>
                  <dd className="font-medium">
                    {estadoDespliegue?.repositorioUrl ? (
                      <a
                        href={estadoDespliegue.repositorioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline dark:text-blue-400"
                      >
                        Abrir repositorio
                      </a>
                    ) : (
                      'No disponible'
                    )}
                  </dd>
                </div>
              </dl>
            </EstadoVista>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold">Salud operativa</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Verificación ligera de sesión y conectividad del backend.
          </p>

          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Auth</dt>
              <dd>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    usuario
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                  }`}
                >
                  {usuario ? 'OK' : 'Sin sesión'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Conexión Supabase</dt>
              <dd>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    saludSupabase === 'ok'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : saludSupabase === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {saludSupabase === 'ok'
                    ? 'OK'
                    : saludSupabase === 'error'
                      ? 'Error'
                      : 'Validando'}
                </span>
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{detalleSupabase}</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold">Métricas PostHog</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Resumen agregado de onboarding y ventas.
          </p>

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

            <p className="text-xs text-slate-600 dark:text-slate-400">Mostrando: {etiquetaFiltroMetricas}</p>
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
                        <p
                          className={`text-sm font-semibold ${
                            metrica.valor === null
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {formatearValorMetrica(metrica.valor, metrica.unidad)}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${claseEstadoMeta(
                            metrica.estado_meta
                          )}`}
                        >
                          {etiquetaEstadoMeta(metrica.estado_meta)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Última actualización: {fechaActualizacionMetricas}
                </p>
              </div>
            </EstadoVista>
          </div>
        </article>
      </div>
    </section>
  )
}
