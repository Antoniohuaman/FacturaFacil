interface EntornoMetricasPosthog {
  POSTHOG_HOST?: string
  POSTHOG_PROJECT_ID?: string
  POSTHOG_PERSONAL_API_KEY?: string
}

interface MetricaPosthog {
  clave: string
  nombre: string
  valor: number | null
  periodo: string
  disponible: boolean
}

interface RespuestaMetricasPosthog {
  fuente: 'posthog'
  periodo_dias: number
  actualizado_en: string
  disponible: boolean
  motivo_no_disponible: string | null
  metricas: MetricaPosthog[]
}

type ContextoFunction = {
  env: EntornoMetricasPosthog
  request: Request
}

type RespuestaCacheada = {
  expiraEn: number
  valor: RespuestaMetricasPosthog
}

const DURACION_CACHE_MS = 60_000
const PERIODO_DIAS_POR_DEFECTO = 30

const cacheMemoriaPorPeriodo = new Map<number, RespuestaCacheada>()

const definicionesMetricas = [
  { clave: 'usuarios_activos', nombre: 'Usuarios activos', evento: null },
  { clave: 'ventas_completadas', nombre: 'Ventas completadas', evento: 'venta_completada' },
  { clave: 'primera_venta', nombre: 'Primera venta', evento: 'primera_venta_completada' },
  { clave: 'ruc_actualizado', nombre: 'RUC actualizado', evento: 'ruc_actualizado' },
  { clave: 'productos_creados', nombre: 'Productos creados', evento: 'producto_creado_exitoso' },
  { clave: 'clientes_creados', nombre: 'Clientes creados', evento: 'cliente_creado_exitoso' }
] as const

type DefinicionMetrica = (typeof definicionesMetricas)[number]
type EventoPosthog = Exclude<DefinicionMetrica['evento'], null>

function construirTextoPeriodo(periodoDias: number): string {
  return `Últimos ${String(periodoDias)} días`
}

function construirMetrica(definicion: DefinicionMetrica, valor: number | null, periodoDias: number): MetricaPosthog {
  return {
    clave: definicion.clave,
    nombre: definicion.nombre,
    valor,
    periodo: construirTextoPeriodo(periodoDias),
    disponible: valor !== null
  }
}

function construirRespuestaJson(status: number, cuerpo: RespuestaMetricasPosthog, cache: 'public, max-age=60' | 'no-store') {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache
    }
  })
}

function construirRespuestaNoDisponible(motivo: string, periodoDias: number): RespuestaMetricasPosthog {
  return {
    fuente: 'posthog',
    periodo_dias: periodoDias,
    actualizado_en: new Date().toISOString(),
    disponible: false,
    motivo_no_disponible: motivo,
    metricas: definicionesMetricas.map((metrica) => construirMetrica(metrica, null, periodoDias))
  }
}

function obtenerPeriodoDiasDesdeRequest(request: Request): number {
  const url = new URL(request.url)
  const periodoRecibido = Number(url.searchParams.get('periodo_dias'))
  const periodosPermitidos = new Set([7, 30, 90])

  return periodosPermitidos.has(periodoRecibido) ? periodoRecibido : PERIODO_DIAS_POR_DEFECTO
}

function traducirErrorPosthog(status: number): string {
  if (status === 401 || status === 403) {
    return 'Permisos insuficientes o credenciales inválidas en PostHog.'
  }

  if (status === 429) {
    return 'Límite de solicitudes alcanzado en PostHog.'
  }

  if (status >= 500) {
    return 'PostHog presentó un error interno al ejecutar la consulta.'
  }

  return 'La consulta a PostHog no fue aceptada.'
}

function construirUrlPosthog(host: string, projectId: string): string {
  const hostNormalizado = normalizarHostPosthog(host)
  return `${hostNormalizado}/api/projects/${projectId}/query/`
}

function normalizarHostPosthog(host: string): string {
  const hostSinSlash = host.endsWith('/') ? host.slice(0, -1) : host

  try {
    const url = new URL(hostSinSlash)

    if (url.hostname === 'us.posthog.com' || url.hostname === 'app.posthog.com') {
      url.hostname = 'us.i.posthog.com'
    }

    if (url.hostname === 'eu.posthog.com') {
      url.hostname = 'eu.i.posthog.com'
    }

    return url.toString().endsWith('/') ? url.toString().slice(0, -1) : url.toString()
  } catch {
    return hostSinSlash
  }
}

async function consultarPosthog(
  url: string,
  apiKey: string,
  consultaHogql: string
): Promise<Array<Record<string, unknown>>> {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query: consultaHogql
      }
    })
  })

  if (!respuesta.ok) {
    throw new Error(`PostHog ${respuesta.status}: ${traducirErrorPosthog(respuesta.status)}`)
  }

  const json = (await respuesta.json()) as { results?: unknown }
  if (!Array.isArray(json.results)) {
    return []
  }

  return json.results.filter((registro): registro is Record<string, unknown> => !!registro && typeof registro === 'object')
}

function toNumero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor
  }

  if (typeof valor === 'string') {
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : null
  }

  return null
}

async function obtenerMetricasDesdePosthog(
  env: EntornoMetricasPosthog,
  periodoDias: number
): Promise<RespuestaMetricasPosthog> {
  const host = env.POSTHOG_HOST
  const projectId = env.POSTHOG_PROJECT_ID
  const apiKey = env.POSTHOG_PERSONAL_API_KEY

  if (!host || !projectId || !apiKey) {
    return construirRespuestaNoDisponible('Faltan secretos de PostHog en Cloudflare Pages.', periodoDias)
  }

  const urlConsulta = construirUrlPosthog(host, projectId)

  const eventosObjetivo = definicionesMetricas
    .map((metrica) => metrica.evento)
    .filter((evento): evento is EventoPosthog => typeof evento === 'string')

  const consultaUsuariosActivos = `
    SELECT uniq(distinct_id) AS usuarios_activos
    FROM events
    WHERE timestamp >= now() - INTERVAL ${String(periodoDias)} DAY
      AND distinct_id IS NOT NULL
  `

  const consultaEventos = `
    SELECT event, count() AS total
    FROM events
    WHERE timestamp >= now() - INTERVAL ${String(periodoDias)} DAY
      AND event IN (${eventosObjetivo.map((evento) => `'${evento}'`).join(', ')})
    GROUP BY event
  `

  let resultadoUsuarios: Array<Record<string, unknown>> = []
  let resultadoEventos: Array<Record<string, unknown>> = []
  const erroresConsultas: string[] = []

  try {
    resultadoUsuarios = await consultarPosthog(urlConsulta, apiKey, consultaUsuariosActivos)
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_activos: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    resultadoEventos = await consultarPosthog(urlConsulta, apiKey, consultaEventos)
  } catch (errorInterno) {
    erroresConsultas.push(
      `eventos_agregados: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  const consultaUsuariosExitosa = !erroresConsultas.some((errorConsulta) => errorConsulta.startsWith('usuarios_activos:'))
  const consultaEventosExitosa = !erroresConsultas.some((errorConsulta) => errorConsulta.startsWith('eventos_agregados:'))
  const usuariosActivos = consultaUsuariosExitosa ? (toNumero(resultadoUsuarios[0]?.usuarios_activos) ?? 0) : null
  const mapaEventos = new Map<string, number>()

  for (const fila of resultadoEventos) {
    const nombreEvento = fila.event
    if (typeof nombreEvento !== 'string') {
      continue
    }

    const total = toNumero(fila.total)
    if (total === null) {
      continue
    }

    mapaEventos.set(nombreEvento, total)
  }

  const metricas = definicionesMetricas.map((definicion) => {
    if (definicion.clave === 'usuarios_activos') {
      return construirMetrica(definicion, usuariosActivos, periodoDias)
    }

    if (!definicion.evento) {
      return construirMetrica(definicion, null, periodoDias)
    }

    if (!consultaEventosExitosa) {
      return construirMetrica(definicion, null, periodoDias)
    }

    return construirMetrica(definicion, mapaEventos.get(definicion.evento) ?? 0, periodoDias)
  })

  const hayMetricasDisponibles = metricas.some((metrica) => metrica.valor !== null)
  const motivoNoDisponible =
    erroresConsultas.length > 0
      ? `Fallo parcial consultando PostHog (${erroresConsultas.join(' | ')}).`
      : null

  return {
    fuente: 'posthog',
    periodo_dias: periodoDias,
    actualizado_en: new Date().toISOString(),
    disponible: hayMetricasDisponibles,
    motivo_no_disponible: motivoNoDisponible,
    metricas
  }
}

export const onRequestGet = async (context: ContextoFunction): Promise<Response> => {
  const periodoDias = obtenerPeriodoDiasDesdeRequest(context.request)
  const ahora = Date.now()
  const cachePeriodo = cacheMemoriaPorPeriodo.get(periodoDias)

  if (cachePeriodo && cachePeriodo.expiraEn > ahora) {
    return construirRespuestaJson(200, cachePeriodo.valor, 'public, max-age=60')
  }

  try {
    const valor = await obtenerMetricasDesdePosthog(context.env, periodoDias)
    cacheMemoriaPorPeriodo.set(periodoDias, {
      expiraEn: ahora + DURACION_CACHE_MS,
      valor
    })

    return construirRespuestaJson(200, valor, 'public, max-age=60')
  } catch (errorInterno) {
    const respuestaError = construirRespuestaNoDisponible(
      errorInterno instanceof Error ? errorInterno.message : 'No se pudieron consultar métricas en PostHog.',
      periodoDias
    )
    return construirRespuestaJson(200, respuestaError, 'no-store')
  }
}
