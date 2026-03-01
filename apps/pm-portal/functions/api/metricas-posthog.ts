import { configuracionMetasKpi, type ClaveMetricaKpi } from './config-metricas-kpi'
import {
  EVENTOS_POSTHOG_KPI,
  EVENTOS_POSTHOG_KPI_LISTA,
  type EventoPosthogKpi
} from './eventos-posthog-kpi'

interface EntornoMetricasPosthog {
  POSTHOG_HOST?: string
  POSTHOG_PROJECT_ID?: string
  POSTHOG_PERSONAL_API_KEY?: string
  DIAGNOSTICO_METRICAS?: string
}

interface DiagnosticoMetricasPosthog {
  host_dominio: string | null
  project_id_enmascarado: string | null
  eventos_consultados: ReadonlyArray<EventoPosthogKpi>
}

interface MetricaPosthog {
  clave: ClaveMetricaKpi
  nombre: string
  valor: number | null
  valor_periodo_actual: number | null
  valor_periodo_anterior: number | null
  delta_absoluto: number | null
  delta_porcentual: number | null
  delta_aplicable: boolean
  unidad: 'conteo' | 'porcentaje'
  meta: number | null
  estado_meta: 'ok' | 'atencion' | 'riesgo' | null
  periodo: string
  disponible: boolean
}

interface RespuestaMetricasPosthog {
  fuente: 'posthog'
  periodo_dias: number
  actualizado_en: string
  disponible: boolean
  motivo_no_disponible: string | null
  diagnostico?: DiagnosticoMetricasPosthog
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
  {
    clave: 'activacion_porcentaje',
    nombre: 'Activación',
    tipo: 'activacion' as const,
    unidad: 'porcentaje' as const
  },
  {
    clave: 'ventas_completadas',
    nombre: 'Ventas completadas',
    tipo: 'evento' as const,
    evento: EVENTOS_POSTHOG_KPI.VENTA_COMPLETADA,
    unidad: 'conteo' as const
  },
  {
    clave: 'productos_creados',
    nombre: 'Productos creados',
    tipo: 'evento' as const,
    evento: EVENTOS_POSTHOG_KPI.PRODUCTO_CREADO_EXITOSO,
    unidad: 'conteo' as const
  },
  {
    clave: 'clientes_creados',
    nombre: 'Clientes creados',
    tipo: 'evento' as const,
    evento: EVENTOS_POSTHOG_KPI.CLIENTE_CREADO_EXITOSO,
    unidad: 'conteo' as const
  },
  {
    clave: 'importacion_realizada',
    nombre: 'Importación realizada',
    tipo: 'evento' as const,
    evento: EVENTOS_POSTHOG_KPI.IMPORTACION_COMPLETADA,
    unidad: 'conteo' as const
  },
  {
    clave: 'usuarios_activos',
    nombre: 'Usuarios activos',
    tipo: 'usuarios_activos' as const,
    unidad: 'conteo' as const
  }
] as const

type DefinicionMetrica = (typeof definicionesMetricas)[number]

function construirTextoPeriodo(periodoDias: number): string {
  return `Últimos ${String(periodoDias)} días`
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}

function calcularPorcentaje(numerador: number, denominador: number): number {
  if (denominador <= 0) {
    return 0
  }

  return redondear((numerador / denominador) * 100)
}

function obtenerMeta(definicion: DefinicionMetrica, periodoDias: number): number | null {
  const configuracion = configuracionMetasKpi[definicion.clave]
  if (!configuracion) {
    return null
  }

  if (periodoDias !== 7 && periodoDias !== 30 && periodoDias !== 90) {
    return null
  }

  return configuracion.metaPorPeriodo[periodoDias]
}

function calcularEstadoMeta(
  definicion: DefinicionMetrica,
  valorActual: number | null,
  meta: number | null
): 'ok' | 'atencion' | 'riesgo' | null {
  if (valorActual === null || meta === null || meta <= 0) {
    return null
  }

  const configuracion = configuracionMetasKpi[definicion.clave]
  if (!configuracion) {
    return null
  }

  if (
    configuracion.umbralesCumplimiento.ok === null ||
    configuracion.umbralesCumplimiento.atencion === null
  ) {
    return null
  }

  const cumplimiento = valorActual / meta

  if (cumplimiento >= configuracion.umbralesCumplimiento.ok) {
    return 'ok'
  }

  if (cumplimiento >= configuracion.umbralesCumplimiento.atencion) {
    return 'atencion'
  }

  return 'riesgo'
}

function construirMetrica(
  definicion: DefinicionMetrica,
  valorActual: number | null,
  valorAnterior: number | null,
  periodoDias: number
): MetricaPosthog {
  const deltaAbsoluto =
    valorActual === null || valorAnterior === null ? null : redondear(valorActual - valorAnterior)
  const deltaAplicable = valorActual !== null && valorAnterior !== null && valorAnterior !== 0
  const deltaPorcentual =
    deltaAbsoluto === null || !deltaAplicable ? null : redondear((deltaAbsoluto / valorAnterior) * 100)
  const meta = obtenerMeta(definicion, periodoDias)
  const estadoMeta = calcularEstadoMeta(definicion, valorActual, meta)

  return {
    clave: definicion.clave,
    nombre: definicion.nombre,
    valor: valorActual,
    valor_periodo_actual: valorActual,
    valor_periodo_anterior: valorAnterior,
    delta_absoluto: deltaAbsoluto,
    delta_porcentual: deltaPorcentual,
    delta_aplicable: deltaAplicable,
    unidad: definicion.unidad,
    meta,
    estado_meta: estadoMeta,
    periodo: construirTextoPeriodo(periodoDias),
    disponible: valorActual !== null
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

function diagnosticoHabilitado(valor: string | undefined): boolean {
  if (!valor) {
    return false
  }

  return ['1', 'true', 'yes', 'si'].includes(valor.toLowerCase())
}

function extraerDominio(host: string | undefined): string | null {
  if (!host) {
    return null
  }

  try {
    return new URL(host).hostname
  } catch {
    return null
  }
}

function enmascararProjectId(projectId: string | undefined): string | null {
  if (!projectId) {
    return null
  }

  if (projectId.length <= 3) {
    return `***${projectId}`
  }

  return `***${projectId.slice(-3)}`
}

function construirDiagnosticoSeguro(
  env: EntornoMetricasPosthog,
  eventosConsultados: ReadonlyArray<EventoPosthogKpi>
): DiagnosticoMetricasPosthog | undefined {
  if (!diagnosticoHabilitado(env.DIAGNOSTICO_METRICAS)) {
    return undefined
  }

  return {
    host_dominio: extraerDominio(env.POSTHOG_HOST),
    project_id_enmascarado: enmascararProjectId(env.POSTHOG_PROJECT_ID),
    eventos_consultados: eventosConsultados
  }
}

function construirRespuestaNoDisponible(
  motivo: string,
  periodoDias: number,
  diagnostico?: DiagnosticoMetricasPosthog
): RespuestaMetricasPosthog {
  return {
    fuente: 'posthog',
    periodo_dias: periodoDias,
    actualizado_en: new Date().toISOString(),
    disponible: false,
    motivo_no_disponible: motivo,
    diagnostico,
    metricas: definicionesMetricas.map((metrica) => construirMetrica(metrica, null, null, periodoDias))
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
  const diagnostico = construirDiagnosticoSeguro(env, EVENTOS_POSTHOG_KPI_LISTA)

  if (!host || !projectId || !apiKey) {
    return construirRespuestaNoDisponible(
      'Faltan secretos de PostHog en Cloudflare Pages.',
      periodoDias,
      diagnostico
    )
  }

  console.info('[metricas-posthog] consulta', {
    project_id: projectId,
    periodo_dias: periodoDias,
    eventos: EVENTOS_POSTHOG_KPI_LISTA
  })

  const urlConsulta = construirUrlPosthog(host, projectId)

  const eventosObjetivo: ReadonlyArray<EventoPosthogKpi> = EVENTOS_POSTHOG_KPI_LISTA

  const construirFiltroRango = (dias: number, desplazamientoDias: number) => {
    const inicio = dias + desplazamientoDias
    const fin = desplazamientoDias

    if (fin === 0) {
      return `timestamp >= now() - INTERVAL ${String(inicio)} DAY AND timestamp < now()`
    }

    return `timestamp >= now() - INTERVAL ${String(inicio)} DAY AND timestamp < now() - INTERVAL ${String(fin)} DAY`
  }

  const consultaUsuariosActivosActual = `
    SELECT uniq(distinct_id) AS usuarios_activos
    FROM events
    WHERE ${construirFiltroRango(periodoDias, 0)}
      AND distinct_id IS NOT NULL
  `

  const consultaUsuariosActivosAnterior = `
    SELECT uniq(distinct_id) AS usuarios_activos
    FROM events
    WHERE ${construirFiltroRango(periodoDias, periodoDias)}
      AND distinct_id IS NOT NULL
  `

  const consultaEventosActual = `
    SELECT event, count() AS total
    FROM events
    WHERE ${construirFiltroRango(periodoDias, 0)}
      AND event IN (${eventosObjetivo.map((evento) => `'${evento}'`).join(', ')})
    GROUP BY event
  `

  const consultaEventosAnterior = `
    SELECT event, count() AS total
    FROM events
    WHERE ${construirFiltroRango(periodoDias, periodoDias)}
      AND event IN (${eventosObjetivo.map((evento) => `'${evento}'`).join(', ')})
    GROUP BY event
  `

  const construirConsultaUsuariosEvento = (evento: EventoPosthogKpi, desplazamientoDias: number) => `
    SELECT uniq(distinct_id) AS total
    FROM events
    WHERE ${construirFiltroRango(periodoDias, desplazamientoDias)}
      AND event = '${evento}'
      AND distinct_id IS NOT NULL
  `

  let usuariosActivosActual: number | null = null
  let usuariosActivosAnterior: number | null = null
  let mapaEventosActual: Map<string, number> | null = null
  let mapaEventosAnterior: Map<string, number> | null = null
  let usuariosConVentaActual: number | null = null
  let usuariosRegistradosActual: number | null = null
  let usuariosConVentaAnterior: number | null = null
  let usuariosRegistradosAnterior: number | null = null
  const erroresConsultas: string[] = []

  try {
    const resultado = await consultarPosthog(urlConsulta, apiKey, consultaUsuariosActivosActual)
    usuariosActivosActual = toNumero(resultado[0]?.usuarios_activos) ?? 0
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_activos_actual: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(urlConsulta, apiKey, consultaUsuariosActivosAnterior)
    usuariosActivosAnterior = toNumero(resultado[0]?.usuarios_activos) ?? 0
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_activos_anterior: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(urlConsulta, apiKey, consultaEventosActual)
    const mapa = new Map<string, number>()

    for (const fila of resultado) {
      const nombreEvento = fila.event
      if (typeof nombreEvento !== 'string') {
        continue
      }

      const total = toNumero(fila.total)
      if (total === null) {
        continue
      }

      mapa.set(nombreEvento, total)
    }

    mapaEventosActual = mapa
  } catch (errorInterno) {
    erroresConsultas.push(
      `eventos_actual: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(urlConsulta, apiKey, consultaEventosAnterior)
    const mapa = new Map<string, number>()

    for (const fila of resultado) {
      const nombreEvento = fila.event
      if (typeof nombreEvento !== 'string') {
        continue
      }

      const total = toNumero(fila.total)
      if (total === null) {
        continue
      }

      mapa.set(nombreEvento, total)
    }

    mapaEventosAnterior = mapa
  } catch (errorInterno) {
    erroresConsultas.push(
      `eventos_anterior: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(
      urlConsulta,
      apiKey,
      construirConsultaUsuariosEvento(EVENTOS_POSTHOG_KPI.VENTA_COMPLETADA, 0)
    )
    usuariosConVentaActual = toNumero(resultado[0]?.total) ?? 0
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_venta_actual: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(
      urlConsulta,
      apiKey,
      construirConsultaUsuariosEvento(EVENTOS_POSTHOG_KPI.REGISTRO_USUARIO_COMPLETADO, 0)
    )
    usuariosRegistradosActual = toNumero(resultado[0]?.total) ?? 0
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_registro_actual: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(
      urlConsulta,
      apiKey,
      construirConsultaUsuariosEvento(EVENTOS_POSTHOG_KPI.VENTA_COMPLETADA, periodoDias)
    )
    usuariosConVentaAnterior = toNumero(resultado[0]?.total) ?? 0
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_venta_anterior: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  try {
    const resultado = await consultarPosthog(
      urlConsulta,
      apiKey,
      construirConsultaUsuariosEvento(EVENTOS_POSTHOG_KPI.REGISTRO_USUARIO_COMPLETADO, periodoDias)
    )
    usuariosRegistradosAnterior = toNumero(resultado[0]?.total) ?? 0
  } catch (errorInterno) {
    erroresConsultas.push(
      `usuarios_registro_anterior: ${errorInterno instanceof Error ? errorInterno.message : 'consulta falló'}`
    )
  }

  const activacionActual =
    usuariosConVentaActual === null || usuariosRegistradosActual === null
      ? null
      : calcularPorcentaje(usuariosConVentaActual, usuariosRegistradosActual)
  const activacionAnterior =
    usuariosConVentaAnterior === null || usuariosRegistradosAnterior === null
      ? null
      : calcularPorcentaje(usuariosConVentaAnterior, usuariosRegistradosAnterior)

  const metricas = definicionesMetricas.map((definicion) => {
    if (definicion.tipo === 'usuarios_activos') {
      return construirMetrica(definicion, usuariosActivosActual, usuariosActivosAnterior, periodoDias)
    }

    if (definicion.tipo === 'activacion') {
      return construirMetrica(definicion, activacionActual, activacionAnterior, periodoDias)
    }

    const valorActual = mapaEventosActual ? (mapaEventosActual.get(definicion.evento) ?? 0) : null
    const valorAnterior = mapaEventosAnterior ? (mapaEventosAnterior.get(definicion.evento) ?? 0) : null

    return construirMetrica(definicion, valorActual, valorAnterior, periodoDias)
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
    diagnostico,
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
      periodoDias,
      construirDiagnosticoSeguro(context.env, EVENTOS_POSTHOG_KPI_LISTA)
    )
    return construirRespuestaJson(200, respuestaError, 'no-store')
  }
}
