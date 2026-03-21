import { eliminarEntrega } from '@/aplicacion/casos-uso/entregas'
import { eliminarIniciativa } from '@/aplicacion/casos-uso/iniciativas'
import { eliminarObjetivo } from '@/aplicacion/casos-uso/objetivos'

type CallbackExito = (() => Promise<void> | void) | undefined
type CallbackError = ((mensaje: string) => void) | undefined

interface EliminacionRoadmapConfig {
  confirmar: string
  fallbackError: string
  accion: () => Promise<void>
  alExito?: CallbackExito
  alError?: CallbackError
}

async function ejecutarEliminacionRoadmap({ confirmar, fallbackError, accion, alExito, alError }: EliminacionRoadmapConfig) {
  if (!window.confirm(confirmar)) {
    return false
  }

  try {
    await accion()
    await alExito?.()
    return true
  } catch (errorInterno) {
    alError?.(errorInterno instanceof Error ? errorInterno.message : fallbackError)
    return false
  }
}

export function eliminarObjetivoRoadmapConConfirmacion(
  objetivoId: string,
  alExito?: CallbackExito,
  alError?: CallbackError
) {
  return ejecutarEliminacionRoadmap({
    confirmar: '¿Eliminar este objetivo?',
    fallbackError: 'No se pudo eliminar el objetivo',
    accion: () => eliminarObjetivo(objetivoId),
    alExito,
    alError
  })
}

export function eliminarIniciativaRoadmapConConfirmacion(
  iniciativaId: string,
  alExito?: CallbackExito,
  alError?: CallbackError
) {
  return ejecutarEliminacionRoadmap({
    confirmar: '¿Eliminar esta iniciativa?',
    fallbackError: 'No se pudo eliminar la iniciativa',
    accion: () => eliminarIniciativa(iniciativaId),
    alExito,
    alError
  })
}

export function eliminarEntregaRoadmapConConfirmacion(
  entregaId: string,
  alExito?: CallbackExito,
  alError?: CallbackError
) {
  return ejecutarEliminacionRoadmap({
    confirmar: '¿Eliminar esta entrega?',
    fallbackError: 'No se pudo eliminar la entrega',
    accion: () => eliminarEntrega(entregaId),
    alExito,
    alError
  })
}