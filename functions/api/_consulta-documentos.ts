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

const BASE_APIPERU = 'https://dniruc.apisperu.com/api/v1'
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

  const baseUrl = env.APIPERU_BASE_URL?.trim() || BASE_APIPERU
  const url = new URL(`${baseUrl}/${tipo}/${numero}`)
  url.searchParams.set('token', token)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    return await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json'
      },
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
  const data = recordPlano(payload)
  if (!data) {
    return null
  }

  const nombres = textoPlano(data.nombres) || ''
  const apellidoPaterno = textoPlano(data.apellidoPaterno) || ''
  const apellidoMaterno = textoPlano(data.apellidoMaterno) || ''
  const nombreCompleto = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ').trim()

  if (!nombres && !apellidoPaterno && !apellidoMaterno) {
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
  const data = recordPlano(payload)
  if (!data) {
    return null
  }

  const razonSocial = textoPlano(data.razonSocial) || textoPlano(data.nombre) || textoPlano(data.razon_social)
  const direccion = textoPlano(data.direccion) || textoPlano(data.domicilioFiscal) || textoPlano(data.domicilio)

  if (!razonSocial || !direccion) {
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
    nombreComercial: textoPlano(data.nombreComercial),
    tipo: textoPlano(data.tipo) || textoPlano(data.tipoContribuyente),
    direccion,
    estado: textoPlano(data.estado) || 'No disponible',
    condicion: textoPlano(data.condicion) || 'No disponible',
    pais: textoPlano(data.pais),
    departamento: textoPlano(data.departamento),
    provincia: textoPlano(data.provincia),
    distrito: textoPlano(data.distrito),
    ubigeo: textoPlano(data.ubigeo),
    referenciaDireccion: textoPlano(data.referenciaDireccion),
    fechaInscripcion: textoPlano(data.fechaInscripcion),
    sistemaEmision,
    sistEmsion: sistemaEmision,
    sistContabilidad: textoPlano(data.sistContabilidad),
    actEconomicas: actividades.lista,
    actividadEconomicaPrincipal: actividades.principal,
    esAgenteRetencion: booleanoPlano(data.esAgenteRetencion),
    esAgentePercepcion: booleanoPlano(data.esAgentePercepcion),
    esBuenContribuyente: booleanoPlano(data.esBuenContribuyente),
    esEmisorElectronico: booleanoPlano(data.esEmisorElectronico),
    exceptuadaPercepcion: booleanoPlano(data.exceptuadaPercepcion)
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

    if (!response.ok) {
      const mensaje = mensajeProveedor(payload)

      if (response.status === 404) {
        return {
          status: 404,
          error: {
            success: false,
            message: mensaje || 'No se encontraron datos para el documento consultado.',
            codigoError: 'sin_resultados'
          }
        }
      }

      if (response.status === 400 || response.status === 422) {
        return {
          status: 400,
          error: {
            success: false,
            message: mensaje || 'El documento enviado no es válido para la consulta.',
            codigoError: 'documento_invalido'
          }
        }
      }

      if (response.status === 401 || response.status === 403) {
        return {
          status: 503,
          error: {
            success: false,
            message: 'La consulta documental no está disponible por un problema de configuración del servicio.',
            codigoError: 'configuracion_proveedor'
          }
        }
      }

      if (response.status === 429) {
        return {
          status: 503,
          error: {
            success: false,
            message: 'El servicio de consulta documental alcanzó su límite temporal. Intenta nuevamente en unos minutos.',
            codigoError: 'limite_proveedor'
          }
        }
      }

      return {
        status: 502,
        error: {
          success: false,
          message: mensaje || 'El proveedor de consulta documental no respondió correctamente.',
          codigoError: 'respuesta_proveedor_invalida'
        }
      }
    }

    const normalizado = tipo === 'dni'
      ? normalizarDni(payload, numero)
      : normalizarRuc(payload, numero)

    if (!normalizado) {
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