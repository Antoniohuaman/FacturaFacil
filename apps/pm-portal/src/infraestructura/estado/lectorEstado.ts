import { z } from 'zod'

const esquemaEstadoDespliegue = z.object({
  aplicacion: z.string().min(1),
  version: z.string().min(1),
  commit: z.string().nullable(),
  rama: z.string().min(1),
  fechaConstruccion: z.string().min(1),
  repositorioUrl: z.string().url().nullable(),
  commitUrl: z.string().url().nullable()
})

export type EstadoDesplieguePortal = z.infer<typeof esquemaEstadoDespliegue>

export async function leerEstadoDespliegue(): Promise<EstadoDesplieguePortal> {
  const marcaTiempo = Date.now()
  const respuesta = await fetch(`/estado.json?ts=${marcaTiempo}`, {
    headers: {
      'cache-control': 'no-cache'
    }
  })

  if (!respuesta.ok) {
    throw new Error('No se pudo obtener estado del despliegue.')
  }

  const json = (await respuesta.json()) as unknown
  const resultado = esquemaEstadoDespliegue.safeParse(json)

  if (!resultado.success) {
    throw new Error('El archivo estado.json no tiene el formato esperado.')
  }

  return resultado.data
}
