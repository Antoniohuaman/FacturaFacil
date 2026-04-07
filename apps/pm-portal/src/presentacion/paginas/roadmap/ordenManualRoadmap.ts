import type { Entrega, Iniciativa, Objetivo } from '@/dominio/modelos'

export type PosicionInsercionOrdenRoadmap = 'antes' | 'despues'

const ORDEN_POR_DEFECTO = Number.MAX_SAFE_INTEGER

function obtenerValorOrden(orden: number | null | undefined) {
  return typeof orden === 'number' && Number.isFinite(orden) ? orden : ORDEN_POR_DEFECTO
}

function obtenerTiempoActualizacion(updatedAt: string) {
  const tiempo = Date.parse(updatedAt)
  return Number.isNaN(tiempo) ? 0 : tiempo
}

function compararTextoSeguro(textoA: string, textoB: string) {
  return textoA.localeCompare(textoB, 'es', { sensitivity: 'base' })
}

export function compararRegistrosRoadmapPorOrden(
  registroA: Pick<Objetivo, 'orden' | 'updated_at'> | null | undefined,
  registroB: Pick<Objetivo, 'orden' | 'updated_at'> | null | undefined
) {
  const ordenA = registroA ? registroA.orden : undefined
  const ordenB = registroB ? registroB.orden : undefined
  const diferenciaOrden = obtenerValorOrden(ordenA) - obtenerValorOrden(ordenB)
  if (diferenciaOrden !== 0) {
    return diferenciaOrden
  }

  const updatedAtA = registroA ? registroA.updated_at : ''
  const updatedAtB = registroB ? registroB.updated_at : ''

  return obtenerTiempoActualizacion(updatedAtB) - obtenerTiempoActualizacion(updatedAtA)
}

export function ordenarObjetivosRoadmap(objetivos: Objetivo[]) {
  return [...objetivos].sort((objetivoA, objetivoB) => {
    const diferencia = compararRegistrosRoadmapPorOrden(objetivoA, objetivoB)
    if (diferencia !== 0) {
      return diferencia
    }

    return compararTextoSeguro(objetivoA.nombre, objetivoB.nombre)
  })
}

export function ordenarIniciativasRoadmapParaVista(iniciativas: Iniciativa[], objetivos: Objetivo[]) {
  const objetivosOrdenados = ordenarObjetivosRoadmap(objetivos)
  const posicionObjetivoPorId = new Map(objetivosOrdenados.map((objetivo, indice) => [objetivo.id, indice]))

  return [...iniciativas].sort((iniciativaA, iniciativaB) => {
    const tieneObjetivoA = Boolean(iniciativaA.objetivo_id)
    const tieneObjetivoB = Boolean(iniciativaB.objetivo_id)

    if (tieneObjetivoA !== tieneObjetivoB) {
      return tieneObjetivoA ? -1 : 1
    }

    if (tieneObjetivoA && tieneObjetivoB) {
      const diferenciaObjetivo =
        (posicionObjetivoPorId.get(iniciativaA.objetivo_id ?? '') ?? ORDEN_POR_DEFECTO) -
        (posicionObjetivoPorId.get(iniciativaB.objetivo_id ?? '') ?? ORDEN_POR_DEFECTO)

      if (diferenciaObjetivo !== 0) {
        return diferenciaObjetivo
      }
    }

    const diferencia = compararRegistrosRoadmapPorOrden(iniciativaA, iniciativaB)
    if (diferencia !== 0) {
      return diferencia
    }

    return compararTextoSeguro(iniciativaA.nombre, iniciativaB.nombre)
  })
}

export function ordenarEntregasRoadmapParaVista(entregas: Entrega[], iniciativas: Iniciativa[], objetivos: Objetivo[]) {
  const iniciativasOrdenadas = ordenarIniciativasRoadmapParaVista(iniciativas, objetivos)
  const posicionIniciativaPorId = new Map(iniciativasOrdenadas.map((iniciativa, indice) => [iniciativa.id, indice]))
  const iniciativasPorId = new Map(iniciativas.map((iniciativa) => [iniciativa.id, iniciativa]))
  const objetivosOrdenados = ordenarObjetivosRoadmap(objetivos)
  const posicionObjetivoPorId = new Map(objetivosOrdenados.map((objetivo, indice) => [objetivo.id, indice]))

  return [...entregas].sort((entregaA, entregaB) => {
    const iniciativaA = entregaA.iniciativa_id ? iniciativasPorId.get(entregaA.iniciativa_id) ?? null : null
    const iniciativaB = entregaB.iniciativa_id ? iniciativasPorId.get(entregaB.iniciativa_id) ?? null : null
    const tieneIniciativaA = Boolean(iniciativaA)
    const tieneIniciativaB = Boolean(iniciativaB)

    if (tieneIniciativaA !== tieneIniciativaB) {
      return tieneIniciativaA ? -1 : 1
    }

    if (iniciativaA && iniciativaB) {
      const diferenciaObjetivo =
        (posicionObjetivoPorId.get(iniciativaA.objetivo_id ?? '') ?? ORDEN_POR_DEFECTO) -
        (posicionObjetivoPorId.get(iniciativaB.objetivo_id ?? '') ?? ORDEN_POR_DEFECTO)

      if (diferenciaObjetivo !== 0) {
        return diferenciaObjetivo
      }

      const diferenciaIniciativa =
        (posicionIniciativaPorId.get(iniciativaA.id) ?? ORDEN_POR_DEFECTO) -
        (posicionIniciativaPorId.get(iniciativaB.id) ?? ORDEN_POR_DEFECTO)

      if (diferenciaIniciativa !== 0) {
        return diferenciaIniciativa
      }
    }

    const diferencia = compararRegistrosRoadmapPorOrden(entregaA, entregaB)
    if (diferencia !== 0) {
      return diferencia
    }

    return compararTextoSeguro(entregaA.nombre, entregaB.nombre)
  })
}

export function reconstruirOrdenConMovimiento(
  idsActuales: string[],
  idArrastrado: string,
  idDestino: string,
  posicion: PosicionInsercionOrdenRoadmap
) {
  if (idArrastrado === idDestino) {
    return idsActuales
  }

  const idsSinArrastrado = idsActuales.filter((id) => id !== idArrastrado)
  const indiceDestino = idsSinArrastrado.indexOf(idDestino)

  if (indiceDestino < 0) {
    return idsActuales
  }

  const indiceInsercion = posicion === 'antes' ? indiceDestino : indiceDestino + 1
  idsSinArrastrado.splice(indiceInsercion, 0, idArrastrado)
  return idsSinArrastrado
}

export function reemplazarRegistrosPorId<T extends { id: string }>(actuales: T[], actualizados: T[]) {
  const actualizadosPorId = new Map(actualizados.map((registro) => [registro.id, registro]))
  return actuales.map((registro) => actualizadosPorId.get(registro.id) ?? registro)
}