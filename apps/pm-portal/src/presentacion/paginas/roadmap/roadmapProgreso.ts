import type { Entrega, EstadoRegistro, Iniciativa, Objetivo } from '@/dominio/modelos'

export interface ProgresoObjetivoRoadmap {
  id: string
  nombre: string
  estado: EstadoRegistro
  totalRelacionadas: number
  completadas: number
  porcentaje: number | null
  pendientes: number
  enProgreso: number
  proximas: number
  puntajeActividad: number
}

export interface ProgresoIniciativaRoadmap {
  id: string
  objetivoId: string | null
  totalRelacionadas: number
  completadas: number
  porcentaje: number | null
}

export interface ProgresoRoadmapDerivado {
  objetivos: ProgresoObjetivoRoadmap[]
  objetivosPorId: ReadonlyMap<string, ProgresoObjetivoRoadmap>
  iniciativasPorId: ReadonlyMap<string, ProgresoIniciativaRoadmap>
}

interface CalcularProgresoRoadmapParams {
  objetivos: Objetivo[]
  iniciativas: Iniciativa[]
  entregas: Entrega[]
  ahora?: Date
}

export function calcularProgresoRoadmapDerivado({
  objetivos,
  iniciativas,
  entregas,
  ahora = new Date()
}: CalcularProgresoRoadmapParams): ProgresoRoadmapDerivado {
  const fechaBase = new Date(ahora)
  fechaBase.setHours(0, 0, 0, 0)
  const ahoraMs = fechaBase.getTime()

  const iniciativasPorObjetivo = iniciativas.reduce((mapa, iniciativa) => {
    const claveObjetivo = iniciativa.objetivo_id ?? ''
    const actuales = mapa.get(claveObjetivo) ?? []
    mapa.set(claveObjetivo, [...actuales, iniciativa])
    return mapa
  }, new Map<string, Iniciativa[]>())

  const entregasPorIniciativa = entregas.reduce((mapa, entrega) => {
    const claveIniciativa = entrega.iniciativa_id ?? ''
    const actuales = mapa.get(claveIniciativa) ?? []
    mapa.set(claveIniciativa, [...actuales, entrega])
    return mapa
  }, new Map<string, Entrega[]>())

  const iniciativasPorId = new Map<string, ProgresoIniciativaRoadmap>()

  iniciativas.forEach((iniciativa) => {
    const entregasRelacionadas = entregasPorIniciativa.get(iniciativa.id) ?? []
    const completadas = entregasRelacionadas.filter((entrega) => entrega.estado === 'completado').length
    const totalRelacionadas = entregasRelacionadas.length

    iniciativasPorId.set(iniciativa.id, {
      id: iniciativa.id,
      objetivoId: iniciativa.objetivo_id ?? null,
      totalRelacionadas,
      completadas,
      porcentaje: totalRelacionadas === 0 ? null : Math.round((completadas / totalRelacionadas) * 100)
    })
  })

  const estadoOrden: Record<EstadoRegistro, number> = {
    en_progreso: 0,
    pendiente: 1,
    completado: 2
  }

  const objetivosCalculados = objetivos
    .map((objetivo) => {
      const iniciativasObjetivo = iniciativasPorObjetivo.get(objetivo.id) ?? []
      const idsIniciativas = new Set(iniciativasObjetivo.map((iniciativa) => iniciativa.id))
      const entregasObjetivo = entregas.filter((entrega) => idsIniciativas.has(entrega.iniciativa_id ?? ''))

      const totalRelacionadas = iniciativasObjetivo.length + entregasObjetivo.length
      const completadas =
        iniciativasObjetivo.filter((iniciativa) => iniciativa.estado === 'completado').length +
        entregasObjetivo.filter((entrega) => entrega.estado === 'completado').length
      const pendientes =
        iniciativasObjetivo.filter((iniciativa) => iniciativa.estado === 'pendiente').length +
        entregasObjetivo.filter((entrega) => entrega.estado === 'pendiente').length
      const enProgreso =
        iniciativasObjetivo.filter((iniciativa) => iniciativa.estado === 'en_progreso').length +
        entregasObjetivo.filter((entrega) => entrega.estado === 'en_progreso').length
      const proximas = entregasObjetivo.filter((entrega) => {
        if (!entrega.fecha_objetivo) {
          return false
        }

        const fechaObjetivo = new Date(`${entrega.fecha_objetivo}T00:00:00`)
        fechaObjetivo.setHours(0, 0, 0, 0)
        const tiempo = fechaObjetivo.getTime()
        return !Number.isNaN(tiempo) && tiempo >= ahoraMs
      }).length

      return {
        id: objetivo.id,
        nombre: objetivo.nombre,
        estado: objetivo.estado,
        totalRelacionadas,
        completadas,
        porcentaje: totalRelacionadas === 0 ? null : Math.round((completadas / totalRelacionadas) * 100),
        pendientes,
        enProgreso,
        proximas,
        puntajeActividad: enProgreso * 3 + pendientes * 2 + proximas
      } satisfies ProgresoObjetivoRoadmap
    })
    .sort((objetivoA, objetivoB) => {
      const ordenEstado = estadoOrden[objetivoA.estado] - estadoOrden[objetivoB.estado]
      if (ordenEstado !== 0) {
        return ordenEstado
      }

      return objetivoB.puntajeActividad - objetivoA.puntajeActividad
    })

  return {
    objetivos: objetivosCalculados,
    objetivosPorId: new Map(objetivosCalculados.map((objetivo) => [objetivo.id, objetivo])),
    iniciativasPorId
  }
}