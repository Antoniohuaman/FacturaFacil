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
}

type RespuestaCacheada = {
  expiraEn: number
  valor: RespuestaMetricasPosthog
}

const DURACION_CACHE_MS = 60_000
const PERIODO_DIAS = 30
const PERIODO_TEXTO = 'Últimos 30 días'

let cacheMemoria: RespuestaCacheada | null = null

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

function construirMetrica(definicion: DefinicionMetrica, valor: number | null): MetricaPosthog {
  return {
    clave: definicion.clave,
    nombre: definicion.nombre,
    valor,
    periodo: PERIODO_TEXTO,
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

function construirRespuestaNoDisponible(motivo: string): RespuestaMetricasPosthog {
  return {
    fuente: 'posthog',
    periodo_dias: PERIODO_DIAS,
    actualizado_en: new Date().toISOString(),
    disponible: false,
    motivo_no_disponible: motivo,
    metricas: definicionesMetricas.map((metrica) => construirMetrica(metrica, null))
  }
}

function construirUrlPosthog(host: string, projectId: string): string {
  const hostNormalizado = host.endsWith('/') ? host.slice(0, -1) : host
  return `${hostNormalizado}/api/projects/${projectId}/query/`
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
    const texto = await respuesta.text()
    throw new Error(`PostHog respondió ${respuesta.status}: ${texto || 'sin detalle'}`)
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

async function obtenerMetricasDesdePosthog(env: EntornoMetricasPosthog): Promise<RespuestaMetricasPosthog> {
  const host = env.POSTHOG_HOST
  const projectId = env.POSTHOG_PROJECT_ID
  const apiKey = env.POSTHOG_PERSONAL_API_KEY

  if (!host || !projectId || !apiKey) {
    return construirRespuestaNoDisponible('Faltan secretos de PostHog en Cloudflare Pages.')
  }

  const urlConsulta = construirUrlPosthog(host, projectId)

  const eventosObjetivo = definicionesMetricas
    .map((metrica) => metrica.evento)
    .filter((evento): evento is EventoPosthog => typeof evento === 'string')

  const consultaUsuariosActivos = `
    SELECT uniq(person_id) AS usuarios_activos
    FROM events
    WHERE timestamp >= now() - INTERVAL ${String(PERIODO_DIAS)} DAY
      AND person_id IS NOT NULL
      AND person_id != ''
  `

  const consultaEventos = `
    SELECT event, count() AS total
    FROM events
    WHERE timestamp >= now() - INTERVAL ${String(PERIODO_DIAS)} DAY
      AND event IN (${eventosObjetivo.map((evento) => `'${evento}'`).join(', ')})
    GROUP BY event
  `

  const [resultadoUsuarios, resultadoEventos] = await Promise.all([
    consultarPosthog(urlConsulta, apiKey, consultaUsuariosActivos),
    consultarPosthog(urlConsulta, apiKey, consultaEventos)
  ])

  const usuariosActivos = toNumero(resultadoUsuarios[0]?.usuarios_activos) ?? 0
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
      return construirMetrica(definicion, usuariosActivos)
    }

    if (!definicion.evento) {
      return construirMetrica(definicion, null)
    }

    if (!mapaEventos.has(definicion.evento)) {
      return construirMetrica(definicion, null)
    }

    return construirMetrica(definicion, mapaEventos.get(definicion.evento) ?? null)
  })

  return {
    fuente: 'posthog',
    periodo_dias: PERIODO_DIAS,
    actualizado_en: new Date().toISOString(),
    disponible: true,
    motivo_no_disponible: null,
    metricas
  }
}

export const onRequestGet = async (context: ContextoFunction): Promise<Response> => {
  const ahora = Date.now()

  if (cacheMemoria && cacheMemoria.expiraEn > ahora) {
    return construirRespuestaJson(200, cacheMemoria.valor, 'public, max-age=60')
  }

  try {
    const valor = await obtenerMetricasDesdePosthog(context.env)
    cacheMemoria = {
      expiraEn: ahora + DURACION_CACHE_MS,
      valor
    }

    return construirRespuestaJson(200, valor, 'public, max-age=60')
  } catch (errorInterno) {
    const respuestaError = construirRespuestaNoDisponible(
      errorInterno instanceof Error ? errorInterno.message : 'No se pudieron consultar métricas en PostHog.'
    )
    return construirRespuestaJson(200, respuestaError, 'no-store')
  }
}
