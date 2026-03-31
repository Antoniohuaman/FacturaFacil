interface EntornoConsultaDocumentos {
  APIPERU_TOKEN?: string
  APIPERU_BASE_URL?: string
}

interface RespuestaErrorConsulta {
  success: false
  message: string
  codigoError: string
}

interface DatosConsultaDni {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
}

interface DatosConsultaRuc {
  ruc: string
  razonSocial: string
  nombreComercial?: string
  tipo?: string
  direccion: string
  estado: string
  condicion: string
  pais?: string
  departamento?: string
  provincia?: string
  distrito?: string
  ubigeo?: string
  referenciaDireccion?: string
  fechaInscripcion?: string
  sistEmsion?: string
  sistemaEmision?: string
  sistContabilidad?: string
  actEconomicas?: string[]
  actividadEconomicaPrincipal?: string
  esAgenteRetencion?: boolean
  esAgentePercepcion?: boolean
  esBuenContribuyente?: boolean
  esEmisorElectronico?: boolean
  exceptuadaPercepcion?: boolean
}

type RespuestaConsultaDni =
  | { success: true; data: DatosConsultaDni }
  | RespuestaErrorConsulta

type RespuestaConsultaRuc =
  | { success: true; data: DatosConsultaRuc }
  | RespuestaErrorConsulta

type ContextoConsulta = {
  env: EntornoConsultaDocumentos
  request: Request
  params: {
    numero?: string
  }
}

const BASE_APIPERU = 'https://apiperu.dev/api'
const DNI_REGEX = /^\d{8}$/
const RUC_REGEX = /^[12]\d{10}$/
const TIMEOUT_MS = 8_000

function responderJson(status: number, body: RespuestaConsultaDni | RespuestaConsultaRuc | RespuestaErrorConsulta): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })
}

function textoPlano(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function booleanoPlano(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'si', 'sí'].includes(normalized)) {
      return true
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false
    }
  }

  return undefined
}

function recordPlano(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function mensajeProveedor(data: unknown): string | undefined {
  const record = recordPlano(data)
  if (!record) {
    return undefined
  }

  return (
    textoPlano(record.message) ||
    textoPlano(record.mensaje) ||
    textoPlano(record.error) ||
    textoPlano(record.detail)
  )
}

function serializarPayloadParaLog(payload: unknown): string {
  try {
    const serialized = JSON.stringify(payload)
    return serialized.length > 500 ? `${serialized.slice(0, 500)}...` : serialized
  } catch {
    return String(payload)
  }
}

function normalizarBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function primerTextoPlano(...values: unknown[]): string | undefined {
  for (const value of values) {
    const texto = textoPlano(value)
    if (texto) {
      return texto
    }
  }

  return undefined
}

function ubigeoComoTexto(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const texto = textoPlano(value[index])
      if (texto) {
        return texto
      }
    }
  }

  return textoPlano(value)
}

function extraerRegistroDatos(payload: unknown): Record<string, unknown> | null {
  const record = recordPlano(payload)
  if (!record) {
    return null
  }

  const nested =
    recordPlano(record.data) ||
    recordPlano(record.result) ||
    recordPlano(record.resultado)

  return nested || record
}

function detectarErrorExplicito(payload: unknown): { message?: string; status?: string } | null {
  const record = recordPlano(payload)
  if (!record) {
    return null
  }

  const success = record.success
  const status = textoPlano(record.status)?.toLowerCase()
  const estadoExitoso = success === true || status === 'success' || status === 'ok'
  const mensajeError = textoPlano(record.error) || textoPlano(record.detail)
  const message = mensajeProveedor(record)
  const tieneMarcaError = success === false || status === 'error' || status === 'fail' || status === 'failed'

  if (estadoExitoso || (!tieneMarcaError && !mensajeError)) {
    return null
  }

  return {
    message,
    status,
  }
}

function clasificarErrorProveedor(responseStatus: number, payload: unknown): { status: number; error: RespuestaErrorConsulta } {
  const detalleError = detectarErrorExplicito(payload)
  const mensaje = detalleError?.message || mensajeProveedor(payload) || 'El proveedor devolvió una respuesta no procesable.'
  const mensajeNormalizado = mensaje.toLowerCase()

  if (responseStatus === 404 || mensajeNormalizado.includes('no encontrado') || mensajeNormalizado.includes('not found')) {
    return {
      status: 404,
      error: {
        success: false,
        message: 'No se encontraron datos para el documento consultado.',
        codigoError: 'sin_resultados'
      }
    }
  }

  if (
    responseStatus === 400 ||
    responseStatus === 422 ||
    mensajeNormalizado.includes('inválido') ||
    mensajeNormalizado.includes('invalido')
  ) {
    return {
      status: 400,
      error: {
        success: false,
        message: mensaje || 'El documento enviado no es válido para la consulta.',
        codigoError: 'documento_invalido'
      }
    }
  }

  if (
    responseStatus === 401 ||
    responseStatus === 403 ||
    mensajeNormalizado.includes('token') ||
    (responseStatus === 500 && mensajeNormalizado === 'ocurrió un error') ||
    (responseStatus === 500 && mensajeNormalizado === 'ocurrio un error')
  ) {
    return {
      status: 503,
      error: {
        success: false,
        message: 'El proveedor rechazó la autenticación o devolvió un error interno al consultar el documento. Verifica el token y el estado del servicio.',
        codigoError: 'configuracion_proveedor'
      }
    }
  }

  if (responseStatus === 429) {
    return {
      status: 503,
      error: {
        success: false,
        message: 'El servicio de consulta documental alcanzó su límite temporal. Intenta nuevamente en unos minutos.',
        codigoError: 'limite_proveedor'
      }
    }
  }

  if (responseStatus >= 500) {
    return {
      status: 502,
      error: {
        success: false,
        message: 'El proveedor devolvió un error interno al consultar el documento. Intenta nuevamente más tarde.',
        codigoError: 'proveedor_no_disponible'
      }
    }
  }

  return {
    status: 502,
    error: {
      success: false,
      message: mensaje,
      codigoError: 'respuesta_inesperada'
    }
  }
}

function esMismaOrigen(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }

  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

function actividadComoTexto(item: unknown): string | null {
  if (typeof item === 'string') {
    const normalized = item.trim()
    return normalized || null
  }

  const record = recordPlano(item)
  if (!record) {
    return null
  }

  const descripcion =
    textoPlano(record.descripcion) ||
    textoPlano(record.actividad) ||
    textoPlano(record.nombre)
  const codigo = textoPlano(record.codigo) || textoPlano(record.codActividad)
  const esPrincipal = booleanoPlano(record.esPrincipal) ?? booleanoPlano(record.principal)

  const partes = [esPrincipal ? 'Principal' : undefined, codigo, descripcion].filter(
    (value): value is string => Boolean(value)
  )

  if (!partes.length) {
    return null
  }

  return partes.join(' - ')
}

function extraerActividadesEconomicas(data: Record<string, unknown>): { lista?: string[]; principal?: string } {
  const candidatas = [
    data.actEconomicas,
    data.actividadesEconomicas,
    data.actividadEconomicas,
    data.actividades,
    data.actividadEconomica,
    data.actividadPrincipal
  ]

  const valores = candidatas.flatMap((candidate) => {
    if (Array.isArray(candidate)) {
      return candidate.map(actividadComoTexto).filter((value): value is string => Boolean(value))
    }

    const texto = actividadComoTexto(candidate)
    return texto ? [texto] : []
  })

  const lista = Array.from(new Set(valores))
  return {
    lista: lista.length ? lista : undefined,
    principal: lista[0]
  }
}

async function consultarProveedor(tipo: 'dni' | 'ruc', numero: string, env: EntornoConsultaDocumentos): Promise<Response> {
  const token = env.APIPERU_TOKEN?.trim()
  if (!token) {
    throw new Error('La consulta documental no está configurada en este entorno.')
  }

  const baseUrl = normalizarBaseUrl(env.APIPERU_BASE_URL?.trim() || BASE_APIPERU)
  const url = new URL(`${baseUrl}/${tipo}`)
  const body = JSON.stringify({ [tipo]: numero })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url.toString(), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function extraerPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

function normalizarDni(payload: unknown, dni: string): DatosConsultaDni | null {
  const data = extraerRegistroDatos(payload)
  if (!data) {
    return null
  }

  const nombres = primerTextoPlano(data.nombres) || ''
  const apellidoPaterno = primerTextoPlano(data.apellidoPaterno, data.apellido_paterno) || ''
  const apellidoMaterno = primerTextoPlano(data.apellidoMaterno, data.apellido_materno) || ''
  const nombreCompleto =
    primerTextoPlano(data.nombreCompleto, data.nombre_completo) ||
    [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ').trim()

  if (!nombres && !apellidoPaterno && !apellidoMaterno && !nombreCompleto) {
    return null
  }

  return {
    dni: textoPlano(data.dni) || dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    nombreCompleto
  }
}

function normalizarRuc(payload: unknown, ruc: string): DatosConsultaRuc | null {
  const data = extraerRegistroDatos(payload)
  if (!data) {
    return null
  }

  const razonSocial = primerTextoPlano(
    data.razonSocial,
    data.nombre,
    data.razon_social,
    data.nombre_o_razon_social
  )
  const direccion =
    primerTextoPlano(data.direccion, data.direccion_completa, data.domicilioFiscal, data.domicilio) || '-'

  if (!razonSocial) {
    return null
  }

  const actividades = extraerActividadesEconomicas(data)
  const sistemaEmision =
    textoPlano(data.sistemaEmision) ||
    textoPlano(data.sistEmsion) ||
    textoPlano(data.sistEmision)

  return {
    ruc: textoPlano(data.ruc) || ruc,
    razonSocial,
    nombreComercial: primerTextoPlano(data.nombreComercial, data.nombre_comercial),
    tipo: primerTextoPlano(data.tipo, data.tipoContribuyente, data.tipo_contribuyente),
    direccion,
    estado: textoPlano(data.estado) || 'No disponible',
    condicion: textoPlano(data.condicion) || 'No disponible',
    pais: textoPlano(data.pais),
    departamento: textoPlano(data.departamento),
    provincia: textoPlano(data.provincia),
    distrito: textoPlano(data.distrito),
    ubigeo: primerTextoPlano(data.ubigeo_sunat) || ubigeoComoTexto(data.ubigeo),
    referenciaDireccion: primerTextoPlano(data.referenciaDireccion, data.referencia_direccion),
    fechaInscripcion: primerTextoPlano(data.fechaInscripcion, data.fecha_inscripcion),
    sistemaEmision,
    sistEmsion: sistemaEmision,
    sistContabilidad: primerTextoPlano(data.sistContabilidad, data.sist_contabilidad),
    actEconomicas: actividades.lista,
    actividadEconomicaPrincipal: actividades.principal,
    esAgenteRetencion: booleanoPlano(data.esAgenteRetencion) ?? booleanoPlano(data.es_agente_de_retencion),
    esAgentePercepcion:
      booleanoPlano(data.esAgentePercepcion) ?? booleanoPlano(data.es_agente_de_percepcion),
    esBuenContribuyente:
      booleanoPlano(data.esBuenContribuyente) ?? booleanoPlano(data.es_buen_contribuyente),
    esEmisorElectronico: booleanoPlano(data.esEmisorElectronico) ?? booleanoPlano(data.es_emisor_electronico),
    exceptuadaPercepcion:
      booleanoPlano(data.exceptuadaPercepcion) ??
      booleanoPlano(data.exceptuada_percepcion) ??
      booleanoPlano(data.es_agente_de_percepcion_combustible)
  }
}

async function resolverRespuestaProveedor(
  tipo: 'dni' | 'ruc',
  numero: string,
  env: EntornoConsultaDocumentos
): Promise<{ status: number; payload: DatosConsultaDni | DatosConsultaRuc } | { status: number; error: RespuestaErrorConsulta }> {
  try {
    const response = await consultarProveedor(tipo, numero, env)
    const payload = await extraerPayload(response)
    const normalizado = response.ok
      ? (tipo === 'dni' ? normalizarDni(payload, numero) : normalizarRuc(payload, numero))
      : null

    if (normalizado) {
      return { status: 200, payload: normalizado }
    }

    const errorExplicito = detectarErrorExplicito(payload)

    if (errorExplicito) {
      const clasificacion = clasificarErrorProveedor(response.ok ? 200 : response.status, payload)

      console.error('[consulta-documentos] Proveedor respondió error explícito', {
        tipo,
        numero,
        status: response.status,
        clasificacion: clasificacion.error.codigoError,
        payload: serializarPayloadParaLog(payload)
      })

      return clasificacion
    }

    if (!response.ok) {
      const clasificacion = clasificarErrorProveedor(response.status, payload)

      console.error('[consulta-documentos] Proveedor respondió HTTP no exitoso', {
        tipo,
        numero,
        status: response.status,
        clasificacion: clasificacion.error.codigoError,
        payload: serializarPayloadParaLog(payload)
      })

      return clasificacion
    }

    if (!normalizado) {
      console.error('[consulta-documentos] Payload exitoso no normalizable', {
        tipo,
        numero,
        status: response.status,
        payload: serializarPayloadParaLog(payload)
      })

      return {
        status: 502,
        error: {
          success: false,
          message: 'El proveedor respondió con un formato inesperado.',
          codigoError: 'respuesta_inesperada'
        }
      }
    }

    return { status: 200, payload: normalizado }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 504,
        error: {
          success: false,
          message: 'La consulta documental superó el tiempo de espera permitido.',
          codigoError: 'timeout'
        }
      }
    }

    const message = error instanceof Error ? error.message : 'No se pudo consultar el proveedor documental.'
    const codigoError = message.includes('no está configurada') ? 'configuracion_incompleta' : 'proveedor_no_disponible'

    return {
      status: codigoError === 'configuracion_incompleta' ? 503 : 502,
      error: {
        success: false,
        message,
        codigoError
      }
    }
  }
}

export async function responderConsultaDni(context: ContextoConsulta): Promise<Response> {
  if (!esMismaOrigen(context.request)) {
    return responderJson(403, {
      success: false,
      message: 'Origen no permitido para la consulta documental.',
      codigoError: 'origen_no_permitido'
    })
  }

  const dni = context.params.numero?.trim() || ''
  if (!DNI_REGEX.test(dni)) {
    return responderJson(400, {
      success: false,
      message: 'DNI inválido. Debe tener exactamente 8 dígitos.',
      codigoError: 'documento_invalido'
    })
  }

  const resultado = await resolverRespuestaProveedor('dni', dni, context.env)
  if ('error' in resultado) {
    return responderJson(resultado.status, resultado.error)
  }

  return responderJson(resultado.status, {
    success: true,
    data: resultado.payload as DatosConsultaDni
  })
}

export async function responderConsultaRuc(context: ContextoConsulta): Promise<Response> {
  if (!esMismaOrigen(context.request)) {
    return responderJson(403, {
      success: false,
      message: 'Origen no permitido para la consulta documental.',
      codigoError: 'origen_no_permitido'
    })
  }

  const ruc = context.params.numero?.trim() || ''
  if (!RUC_REGEX.test(ruc)) {
    return responderJson(400, {
      success: false,
      message: 'RUC inválido. Debe tener 11 dígitos y comenzar con 1 o 2.',
      codigoError: 'documento_invalido'
    })
  }

  const resultado = await resolverRespuestaProveedor('ruc', ruc, context.env)
  if ('error' in resultado) {
    return responderJson(resultado.status, resultado.error)
  }

  return responderJson(resultado.status, {
    success: true,
    data: resultado.payload as DatosConsultaRuc
  })
}