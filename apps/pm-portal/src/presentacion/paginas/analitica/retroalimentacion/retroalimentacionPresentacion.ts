import { formatearEstadoLegible } from '@/compartido/utilidades/formatoPortal'
import type { RegistroRetroalimentacionPm, TipoRetroalimentacionPm } from '@/dominio/modelos'

export const opcionesTipoRetroalimentacion: Array<{
  valor: 'todos' | TipoRetroalimentacionPm
  etiqueta: string
}> = [
  { valor: 'todos', etiqueta: 'Todos los tipos' },
  { valor: 'estado_animo', etiqueta: 'Estado de ánimo' },
  { valor: 'idea', etiqueta: 'Ideas' },
  { valor: 'calificacion', etiqueta: 'Calificaciones' }
]

export function formatearTipoRetroalimentacion(tipo: TipoRetroalimentacionPm) {
  if (tipo === 'estado_animo') {
    return 'Estado de ánimo'
  }

  if (tipo === 'calificacion') {
    return 'Calificación'
  }

  return 'Idea'
}

export function obtenerClaseTipoRetroalimentacion(tipo: TipoRetroalimentacionPm) {
  if (tipo === 'estado_animo') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300'
  }

  if (tipo === 'calificacion') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
}

export function resumirTexto(valor: string | null | undefined, maximo = 96) {
  if (!valor) {
    return null
  }

  const limpio = valor.replace(/\s+/g, ' ').trim()

  if (limpio.length <= maximo) {
    return limpio
  }

  return `${limpio.slice(0, maximo - 1).trimEnd()}…`
}

function formatearPuntaje(puntaje: number) {
  return puntaje.toLocaleString('es-PE', {
    minimumFractionDigits: Number.isInteger(puntaje) ? 0 : 1,
    maximumFractionDigits: 1
  })
}

export function obtenerMetaSecundariaRetroalimentacion(registro: RegistroRetroalimentacionPm) {
  if (registro.tipo === 'calificacion' && typeof registro.puntaje === 'number') {
    return `Puntaje ${formatearPuntaje(registro.puntaje)}`
  }

  if (registro.tipo === 'estado_animo' && registro.estado_animo) {
    return formatearEstadoLegible(registro.estado_animo)
  }

  if (typeof registro.puntaje === 'number') {
    return `Puntaje ${formatearPuntaje(registro.puntaje)}`
  }

  if (registro.estado_animo) {
    return formatearEstadoLegible(registro.estado_animo)
  }

  return null
}

export function obtenerSubtituloEmpresa(registro: RegistroRetroalimentacionPm) {
  return registro.establecimiento_nombre ?? null
}

export function formatearEstadoDominanteRetroalimentacion(estado: string | null) {
  if (!estado) {
    return null
  }

  return `Más frecuente: ${formatearEstadoLegible(estado)}`
}

export function formatearCantidadConPuntaje(total: number) {
  const etiqueta = total === 1 ? 'respuesta' : 'respuestas'
  return `${total.toLocaleString('es-PE')} ${etiqueta} con puntaje`
}