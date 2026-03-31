import { responderConsultaDni } from '../../_consulta-documentos'

export const onRequestGet = async (context: {
  env: {
    APIPERU_TOKEN?: string
    APIPERU_BASE_URL?: string
  }
  request: Request
  params: {
    numero?: string
  }
}): Promise<Response> => {
  return responderConsultaDni(context)
}