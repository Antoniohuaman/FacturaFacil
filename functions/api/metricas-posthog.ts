import { obtenerClienteSupabaseAdmin, type EntornoAuth, validarAutorizacion } from './_autorizacion'
import type { ClaveMetricaKpi } from './config-metricas-kpi'
import {
  EVENTOS_POSTHOG_KPI,
  EVENTOS_POSTHOG_KPI_LISTA,
  type EventoPosthogKpi
} from './eventos-posthog-kpi'

interface EntornoMetricasPosthog extends EntornoAuth {
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
  codigo_error?: string | null
  rango?: {
    tipo: 'periodo' | 'personalizado'
    desde: string | null
    hasta: string | null
  }
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
type PeriodoMetricas = 7 | 30 | 90
const MAX_DIAS_RANGO_PERSONALIZADO = 365
const TIMEOUT_POSTHOG_MS = 8_000

const cacheMemoriaPorClave = new Map<string, RespuestaCacheada>()

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

interface ConfiguracionKpiDinamica {
  clave: ClaveMetricaKpi
  nombre: string | null
  unidad: 'conteo' | 'porcentaje' | null
  activo: boolean
  metaPorPeriodo: Record<PeriodoMetricas, number | null>
  umbralesCumplimiento: {
    ok: number | null
    atencion: number | null
  }
}

type ParametrosConsultaMetricas =
  | {
      tipo: 'periodo'
      periodo_dias: PeriodoMetricas
      cache_key: string
      filtro_actual_hogql: string
      filtro_anterior_hogql: string
      rango_respuesta: {
        tipo: 'periodo'
        desde: null
        hasta: null
      }
    }
  | {
      tipo: 'personalizado'
      periodo_dias: number
      cache_key: string
      filtro_actual_hogql: string
      filtro_anterior_hogql: string
      rango_respuesta: {
        tipo: 'personalizado'
        desde: string
        hasta: string
      }
    }

interface FilaConfiguracionKpi {
  clave_kpi: string
  nombre: string | null
  unidad: string | null
  meta_7: number | string | null
  meta_30: number | string | null
  meta_90: number | string | null
  umbral_ok: number | string | null
  umbral_atencion: number | string | null
  activo: boolean | null
}

interface ResultadoBloquePeriodo {
  usuariosActivos: number | null
  conteosPorEvento: Map<string, number> | null
  usuariosUnicosPorEvento: Map<string, number> | null
  huboFormatoInesperado: boolean
  huboError: boolean
}

function construirTextoPeriodo(periodoDias: number): string {
  return `Últimos ${String(periodoDias)} días`
}

function esFechaYmd(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor)
}

function escaparLiteralSql(valor: string): string {
  return valor.replace(/'/g, "''")
}

function construirFiltroPorRangoIso(inicioIso: string, finIsoExclusivo: string): string {
  const inicio = escaparLiteralSql(inicioIso)
  const fin = escaparLiteralSql(finIsoExclusivo)
  return `timestamp >= toDateTime('${inicio}') AND timestamp < toDateTime('${fin}')`
}

function obtenerInicioUtcDia(fechaYmd: string): Date | null {
  if (!esFechaYmd(fechaYmd)) {
    return null
  }

  const fecha = new Date(`${fechaYmd}T00:00:00.000Z`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

function construirFiltroRangoPeriodo(periodoDias: PeriodoMetricas, desplazamientoDias: number): string {
  const inicio = periodoDias + desplazamientoDias
  const fin = desplazamientoDias

  if (fin === 0) {
    return `timestamp >= now() - INTERVAL ${String(inicio)} DAY AND timestamp < now()`
  }

  return `timestamp >= now() - INTERVAL ${String(inicio)} DAY AND timestamp < now() - INTERVAL ${String(fin)} DAY`
}

function periodoDesdeNumero(valor: number): PeriodoMetricas {
  if (valor === 7 || valor === 30 || valor === 90) {
    return valor
  }

  return PERIODO_DIAS_POR_DEFECTO
}

function obtenerParametrosConsultaMetricas(request: Request): ParametrosConsultaMetricas {
  const url = new URL(request.url)
  const periodoRecibido = Number(url.searchParams.get('periodo_dias'))
  const periodoDias = periodoDesdeNumero(periodoRecibido)

  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')

  if (!desde || !hasta) {
    return {
      tipo: 'periodo',
      periodo_dias: periodoDias,
      cache_key: `periodo:${String(periodoDias)}`,
      filtro_actual_hogql: construirFiltroRangoPeriodo(periodoDias, 0),
      filtro_anterior_hogql: construirFiltroRangoPeriodo(periodoDias, periodoDias),
      rango_respuesta: {
        tipo: 'periodo',
        desde: null,
        hasta: null
      }
    }
  }

  const fechaInicio = obtenerInicioUtcDia(desde)
  const fechaHasta = obtenerInicioUtcDia(hasta)

  if (!fechaInicio || !fechaHasta || fechaHasta.getTime() < fechaInicio.getTime()) {
    return {
      tipo: 'periodo',
      periodo_dias: periodoDias,
      cache_key: `periodo:${String(periodoDias)}`,
      filtro_actual_hogql: construirFiltroRangoPeriodo(periodoDias, 0),
      filtro_anterior_hogql: construirFiltroRangoPeriodo(periodoDias, periodoDias),
      rango_respuesta: {
        tipo: 'periodo',
        desde: null,
        hasta: null
      }
    }
  }

  const finExclusivo = new Date(fechaHasta.getTime() + 24 * 60 * 60 * 1000)
  const dias = Math.floor((finExclusivo.getTime() - fechaInicio.getTime()) / (24 * 60 * 60 * 1000))

  if (dias < 1 || dias > MAX_DIAS_RANGO_PERSONALIZADO) {
    return {
      tipo: 'periodo',
      periodo_dias: periodoDias,
      cache_key: `periodo:${String(periodoDias)}`,
      filtro_actual_hogql: construirFiltroRangoPeriodo(periodoDias, 0),
      filtro_anterior_hogql: construirFiltroRangoPeriodo(periodoDias, periodoDias),
      rango_respuesta: {
        tipo: 'periodo',
        desde: null,
        hasta: null
      }
    }
  }

  const inicioActualIso = fechaInicio.toISOString()
  const finActualIso = finExclusivo.toISOString()
  const inicioAnteriorIso = new Date(fechaInicio.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()
  const finAnteriorIso = fechaInicio.toISOString()

  return {
    tipo: 'personalizado',
    periodo_dias: dias,
    cache_key: `rango:${desde}:${hasta}`,
    filtro_actual_hogql: construirFiltroPorRangoIso(inicioActualIso, finActualIso),
    filtro_anterior_hogql: construirFiltroPorRangoIso(inicioAnteriorIso, finAnteriorIso),
    rango_respuesta: {
      tipo: 'personalizado',
      desde,
      hasta
    }
  }
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

function obtenerMeta(configuracionKpi: ConfiguracionKpiDinamica | null, periodoDias: number): number | null {
  if (!configuracionKpi) {
    return null
  }

  if (periodoDias !== 7 && periodoDias !== 30 && periodoDias !== 90) {
    return null
  }

  return configuracionKpi.metaPorPeriodo[periodoDias]
}

function calcularEstadoMeta(
  configuracionKpi: ConfiguracionKpiDinamica | null,
  valorActual: number | null,
  meta: number | null
): 'ok' | 'atencion' | 'riesgo' | null {
  if (valorActual === null || meta === null || meta <= 0) {
    return null
  }

  if (!configuracionKpi) {
    return null
  }

  if (
    configuracionKpi.umbralesCumplimiento.ok === null ||
    configuracionKpi.umbralesCumplimiento.atencion === null
  ) {
    return null
  }

  const cumplimiento = valorActual / meta

  if (cumplimiento >= configuracionKpi.umbralesCumplimiento.ok) {
    return 'ok'
  }

  if (cumplimiento >= configuracionKpi.umbralesCumplimiento.atencion) {
    return 'atencion'
  }

  return 'riesgo'
}

function construirMetrica(
  definicion: DefinicionMetrica,
  valorActual: number | null,
  valorAnterior: number | null,
  periodoDias: number,
  configuracionKpi?: ConfiguracionKpiDinamica
): MetricaPosthog {
  const deltaAbsoluto =
    valorActual === null || valorAnterior === null ? null : redondear(valorActual - valorAnterior)
  const deltaAplicable = valorActual !== null && valorAnterior !== null && valorAnterior !== 0
  const deltaPorcentual =
    deltaAbsoluto === null || !deltaAplicable ? null : redondear((deltaAbsoluto / valorAnterior) * 100)
  const configuracionAplicada = configuracionKpi?.activo ? configuracionKpi : null
  const meta = obtenerMeta(configuracionAplicada, periodoDias)
  const estadoMeta = calcularEstadoMeta(configuracionAplicada, valorActual, meta)
  const nombre =
    configuracionAplicada?.nombre && configuracionAplicada.nombre.trim().length > 0
      ? configuracionAplicada.nombre.trim()
      : definicion.nombre
  const unidad = configuracionAplicada?.unidad ?? definicion.unidad

  return {
    clave: definicion.clave,
    nombre,
    valor: valorActual,
    valor_periodo_actual: valorActual,
    valor_periodo_anterior: valorAnterior,
    delta_absoluto: deltaAbsoluto,
    delta_porcentual: deltaPorcentual,
    delta_aplicable: deltaAplicable,
    unidad,
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
  diagnostico?: DiagnosticoMetricasPosthog,
  codigoError?: string
): RespuestaMetricasPosthog {
  return {
    fuente: 'posthog',
    periodo_dias: periodoDias,
    actualizado_en: new Date().toISOString(),
    disponible: false,
    motivo_no_disponible: motivo,
    codigo_error: codigoError ?? null,
    diagnostico,
    metricas: definicionesMetricas.map((metrica) => construirMetrica(metrica, null, null, periodoDias))
  }
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

function normalizarUnidad(valor: unknown): 'conteo' | 'porcentaje' | null {
  if (valor !== 'conteo' && valor !== 'porcentaje') {
    return null
  }

  return valor
}

function normalizarClaveMetrica(valor: unknown): ClaveMetricaKpi | null {
  if (typeof valor !== 'string') {
    return null
  }

  const claves = new Set<ClaveMetricaKpi>(definicionesMetricas.map((definicion) => definicion.clave))
  return claves.has(valor as ClaveMetricaKpi) ? (valor as ClaveMetricaKpi) : null
}

async function cargarConfiguracionesKpi(env: EntornoMetricasPosthog): Promise<Map<ClaveMetricaKpi, ConfiguracionKpiDinamica>> {
  const clienteSupabaseAdmin = obtenerClienteSupabaseAdmin(env)
  if (!clienteSupabaseAdmin) {
    return new Map()
  }

  const { data, error } = await clienteSupabaseAdmin
    .from('kpis_config')
    .select(
      'clave_kpi,nombre,unidad,meta_7,meta_30,meta_90,umbral_ok,umbral_atencion,activo'
    )

  if (error || !Array.isArray(data)) {
    return new Map()
  }

  const mapa = new Map<ClaveMetricaKpi, ConfiguracionKpiDinamica>()

  for (const fila of data as FilaConfiguracionKpi[]) {
    const clave = normalizarClaveMetrica(fila.clave_kpi)
    if (!clave) {
      continue
    }

    mapa.set(clave, {
      clave,
      nombre: typeof fila.nombre === 'string' ? fila.nombre : null,
      unidad: normalizarUnidad(fila.unidad),
      activo: fila.activo ?? true,
      metaPorPeriodo: {
        7: toNumero(fila.meta_7),
        30: toNumero(fila.meta_30),
        90: toNumero(fila.meta_90)
      },
      umbralesCumplimiento: {
        ok: toNumero(fila.umbral_ok),
        atencion: toNumero(fila.umbral_atencion)
      }
    })
  }

  return mapa
}

function construirConsultaUsuariosActivos(filtroHogql: string): string {
  return `
    SELECT uniq(distinct_id) AS usuarios_activos
    FROM events
    WHERE ${filtroHogql}
      AND distinct_id IS NOT NULL
  `
}

function construirConsultaConteosEventos(
  filtroHogql: string,
  eventosObjetivo: ReadonlyArray<EventoPosthogKpi>
): string {
  return `
    SELECT event, count() AS total
    FROM events
    WHERE ${filtroHogql}
      AND event IN (${eventosObjetivo.map((evento) => `'${evento}'`).join(', ')})
    GROUP BY event
  `
}

function construirConsultaUsuariosUnicosPorEvento(
  filtroHogql: string,
  eventosObjetivo: ReadonlyArray<EventoPosthogKpi>
): string {
  return `
    SELECT event, uniq(distinct_id) AS total_usuarios
    FROM events
    WHERE ${filtroHogql}
      AND event IN (${eventosObjetivo.map((evento) => `'${evento}'`).join(', ')})
      AND distinct_id IS NOT NULL
    GROUP BY event
  `
}

function mapearTotalesPorEvento(
  filas: Array<Record<string, unknown>>,
  nombreMetrica: 'total' | 'total_usuarios'
): Map<string, number> {
  const mapa = new Map<string, number>()

  for (const fila of filas) {
    const evento = fila.event
    if (typeof evento !== 'string') {
      continue
    }

    const total = toNumero(fila[nombreMetrica])
    if (total === null) {
      continue
    }

    mapa.set(evento, total)
  }

  return mapa
}

async function consultarBloquePeriodo(
  urlConsulta: string,
  apiKey: string,
  filtroHogql: string,
  eventosObjetivo: ReadonlyArray<EventoPosthogKpi>
): Promise<ResultadoBloquePeriodo> {
  const [resultadoUsuariosActivos, resultadoConteos, resultadoUsuariosUnicos] = await Promise.allSettled([
    consultarPosthog(urlConsulta, apiKey, construirConsultaUsuariosActivos(filtroHogql)),
    consultarPosthog(
      urlConsulta,
      apiKey,
      construirConsultaConteosEventos(filtroHogql, eventosObjetivo)
    ),
    consultarPosthog(
      urlConsulta,
      apiKey,
      construirConsultaUsuariosUnicosPorEvento(filtroHogql, eventosObjetivo)
    )
  ])

  const huboFormatoInesperado =
    (resultadoUsuariosActivos.status === 'rejected' &&
      resultadoUsuariosActivos.reason instanceof ErrorFormatoRespuestaPosthog) ||
    (resultadoConteos.status === 'rejected' && resultadoConteos.reason instanceof ErrorFormatoRespuestaPosthog) ||
    (resultadoUsuariosUnicos.status === 'rejected' &&
      resultadoUsuariosUnicos.reason instanceof ErrorFormatoRespuestaPosthog)

  const huboError =
    resultadoUsuariosActivos.status === 'rejected' ||
    resultadoConteos.status === 'rejected' ||
    resultadoUsuariosUnicos.status === 'rejected'

  const usuariosActivos =
    resultadoUsuariosActivos.status === 'fulfilled'
      ? (toNumero(resultadoUsuariosActivos.value[0]?.usuarios_activos) ?? 0)
      : null

  const conteosPorEvento =
    resultadoConteos.status === 'fulfilled'
      ? mapearTotalesPorEvento(resultadoConteos.value, 'total')
      : null

  const usuariosUnicosPorEvento =
    resultadoUsuariosUnicos.status === 'fulfilled'
      ? mapearTotalesPorEvento(resultadoUsuariosUnicos.value, 'total_usuarios')
      : null

  return {
    usuariosActivos,
    conteosPorEvento,
    usuariosUnicosPorEvento,
    huboFormatoInesperado,
    huboError
  }
}

async function consultarPosthog(
  url: string,
  apiKey: string,
  consultaHogql: string
): Promise<Array<Record<string, unknown>>> {
  const controlador = new AbortController()
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_POSTHOG_MS)

  let respuesta: Response

  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json'
      },
      signal: controlador.signal,
      body: JSON.stringify({
        query: {
          kind: 'HogQLQuery',
          query: consultaHogql
        }
      })
    })
  } catch (errorInterno) {
    if (errorInterno instanceof DOMException && errorInterno.name === 'AbortError') {
      throw new Error('PostHog timeout: la consulta tardó demasiado.')
    }

    throw errorInterno
  } finally {
    clearTimeout(timeout)
  }

  if (!respuesta.ok) {
    throw new Error(`PostHog ${respuesta.status}: ${traducirErrorPosthog(respuesta.status)}`)
  }

  const json = (await respuesta.json()) as { results?: unknown; columns?: unknown }
  return parsearResultadosPosthog(json)
}

class ErrorFormatoRespuestaPosthog extends Error {
  constructor() {
    super('Formato de respuesta inesperado de PostHog.')
    this.name = 'ErrorFormatoRespuestaPosthog'
  }
}

function esRegistroPlano(valor: unknown): valor is Record<string, unknown> {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor)
}

function extraerNombreColumna(columna: unknown): string | null {
  if (typeof columna === 'string' && columna.trim().length > 0) {
    return columna.trim()
  }

  if (esRegistroPlano(columna)) {
    const nombre = columna.name
    if (typeof nombre === 'string' && nombre.trim().length > 0) {
      return nombre.trim()
    }

    const clave = columna.key
    if (typeof clave === 'string' && clave.trim().length > 0) {
      return clave.trim()
    }
  }

  return null
}

function parsearResultadosTabulares(
  results: ReadonlyArray<unknown>,
  columns: unknown
): Array<Record<string, unknown>> {
  if (!Array.isArray(columns)) {
    throw new ErrorFormatoRespuestaPosthog()
  }

  const nombresColumnas = columns
    .map((columna) => extraerNombreColumna(columna))
    .filter((columna): columna is string => columna !== null)

  if (nombresColumnas.length === 0) {
    throw new ErrorFormatoRespuestaPosthog()
  }

  return results.map((fila) => {
    if (!Array.isArray(fila)) {
      throw new ErrorFormatoRespuestaPosthog()
    }

    const registro: Record<string, unknown> = {}

    nombresColumnas.forEach((nombreColumna, indice) => {
      registro[nombreColumna] = fila[indice]
    })

    return registro
  })
}

function parsearResultadosPosthog(json: { results?: unknown; columns?: unknown }): Array<Record<string, unknown>> {
  if (!Array.isArray(json.results)) {
    throw new ErrorFormatoRespuestaPosthog()
  }

  if (json.results.length === 0) {
    return []
  }

  const sonRegistros = json.results.every((fila) => esRegistroPlano(fila))
  if (sonRegistros) {
    return json.results
  }

  const sonFilasTabulares = json.results.every((fila) => Array.isArray(fila))
  if (sonFilasTabulares) {
    return parsearResultadosTabulares(json.results, json.columns)
  }

  throw new ErrorFormatoRespuestaPosthog()
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
  parametrosConsulta: ParametrosConsultaMetricas
): Promise<RespuestaMetricasPosthog> {
  const periodoDias = parametrosConsulta.periodo_dias
  const host = env.POSTHOG_HOST
  const projectId = env.POSTHOG_PROJECT_ID
  const apiKey = env.POSTHOG_PERSONAL_API_KEY
  const diagnostico = construirDiagnosticoSeguro(env, EVENTOS_POSTHOG_KPI_LISTA)

  if (!host || !projectId || !apiKey) {
    return construirRespuestaNoDisponible(
      'Faltan secretos de PostHog en Cloudflare Pages.',
      periodoDias,
      diagnostico,
      'configuracion_posthog'
    )
  }

  console.info('[metricas-posthog] consulta', {
    project_id_enmascarado: enmascararProjectId(projectId),
    periodo_dias: periodoDias,
    eventos: EVENTOS_POSTHOG_KPI_LISTA
  })

  const urlConsulta = construirUrlPosthog(host, projectId)

  const eventosObjetivo: ReadonlyArray<EventoPosthogKpi> = EVENTOS_POSTHOG_KPI_LISTA

  const [configuracionesKpi, bloqueActual, bloqueAnterior] = await Promise.all([
    cargarConfiguracionesKpi(env),
    consultarBloquePeriodo(urlConsulta, apiKey, parametrosConsulta.filtro_actual_hogql, eventosObjetivo),
    consultarBloquePeriodo(urlConsulta, apiKey, parametrosConsulta.filtro_anterior_hogql, eventosObjetivo)
  ])

  if (bloqueActual.huboFormatoInesperado || bloqueAnterior.huboFormatoInesperado) {
    return construirRespuestaNoDisponible(
      'Formato de respuesta inesperado de PostHog.',
      periodoDias,
      diagnostico,
      'posthog_formato'
    )
  }

  const usuariosConVentaActual = bloqueActual.usuariosUnicosPorEvento
    ? (bloqueActual.usuariosUnicosPorEvento.get(EVENTOS_POSTHOG_KPI.VENTA_COMPLETADA) ?? 0)
    : null
  const usuariosRegistradosActual = bloqueActual.usuariosUnicosPorEvento
    ? (bloqueActual.usuariosUnicosPorEvento.get(EVENTOS_POSTHOG_KPI.REGISTRO_USUARIO_COMPLETADO) ?? 0)
    : null
  const usuariosConVentaAnterior = bloqueAnterior.usuariosUnicosPorEvento
    ? (bloqueAnterior.usuariosUnicosPorEvento.get(EVENTOS_POSTHOG_KPI.VENTA_COMPLETADA) ?? 0)
    : null
  const usuariosRegistradosAnterior = bloqueAnterior.usuariosUnicosPorEvento
    ? (bloqueAnterior.usuariosUnicosPorEvento.get(EVENTOS_POSTHOG_KPI.REGISTRO_USUARIO_COMPLETADO) ?? 0)
    : null

  const activacionActual =
    usuariosConVentaActual === null || usuariosRegistradosActual === null
      ? null
      : calcularPorcentaje(usuariosConVentaActual, usuariosRegistradosActual)
  const activacionAnterior =
    usuariosConVentaAnterior === null || usuariosRegistradosAnterior === null
      ? null
      : calcularPorcentaje(usuariosConVentaAnterior, usuariosRegistradosAnterior)

  const metricas = definicionesMetricas.map((definicion) => {
    const configuracionKpi = configuracionesKpi.get(definicion.clave)

    if (definicion.tipo === 'usuarios_activos') {
      return construirMetrica(
        definicion,
        bloqueActual.usuariosActivos,
        bloqueAnterior.usuariosActivos,
        periodoDias,
        configuracionKpi
      )
    }

    if (definicion.tipo === 'activacion') {
      return construirMetrica(definicion, activacionActual, activacionAnterior, periodoDias, configuracionKpi)
    }

    const valorActual = bloqueActual.conteosPorEvento
      ? (bloqueActual.conteosPorEvento.get(definicion.evento) ?? 0)
      : null
    const valorAnterior = bloqueAnterior.conteosPorEvento
      ? (bloqueAnterior.conteosPorEvento.get(definicion.evento) ?? 0)
      : null

    return construirMetrica(definicion, valorActual, valorAnterior, periodoDias, configuracionKpi)
  })

  const hayMetricasDisponibles = metricas.some((metrica) => metrica.valor !== null)
  const huboErrorParcial = bloqueActual.huboError || bloqueAnterior.huboError
  const motivoNoDisponible = huboErrorParcial ? 'Fallo parcial consultando PostHog.' : null

  return {
    fuente: 'posthog',
    periodo_dias: periodoDias,
    actualizado_en: new Date().toISOString(),
    disponible: hayMetricasDisponibles,
    motivo_no_disponible: motivoNoDisponible,
    codigo_error: huboErrorParcial ? 'posthog_parcial' : null,
    rango: parametrosConsulta.rango_respuesta,
    diagnostico,
    metricas
  }
}

export const onRequestGet = async (context: ContextoFunction): Promise<Response> => {
  const parametrosConsulta = obtenerParametrosConsultaMetricas(context.request)
  const periodoDias = parametrosConsulta.periodo_dias
  const autorizacion = await validarAutorizacion(context.request, context.env)

  if (!autorizacion.autorizado) {
    const respuestaNoAutorizado = construirRespuestaNoDisponible(
      autorizacion.motivo,
      periodoDias,
      construirDiagnosticoSeguro(context.env, EVENTOS_POSTHOG_KPI_LISTA),
      autorizacion.codigoError
    )
    return construirRespuestaJson(autorizacion.status, respuestaNoAutorizado, 'no-store')
  }

  const ahora = Date.now()
  const cachePeriodo = cacheMemoriaPorClave.get(parametrosConsulta.cache_key)

  if (cachePeriodo && cachePeriodo.expiraEn > ahora) {
    return construirRespuestaJson(200, cachePeriodo.valor, 'public, max-age=60')
  }

  try {
    const valor = await obtenerMetricasDesdePosthog(context.env, parametrosConsulta)
    cacheMemoriaPorClave.set(parametrosConsulta.cache_key, {
      expiraEn: ahora + DURACION_CACHE_MS,
      valor
    })

    return construirRespuestaJson(200, valor, 'public, max-age=60')
  } catch {
    const respuestaError = construirRespuestaNoDisponible(
      'No se pudieron consultar métricas en PostHog.',
      periodoDias,
      construirDiagnosticoSeguro(context.env, EVENTOS_POSTHOG_KPI_LISTA),
      'posthog_error'
    )
    return construirRespuestaJson(200, respuestaError, 'no-store')
  }
}
