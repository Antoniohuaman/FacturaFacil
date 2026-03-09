import { formatearEstadoRegistro } from '@/dominio/modelos'

export function normalizarFechaPortal(fecha: string | null | undefined) {
  if (!fecha) {
    return ''
  }

  const fechaNormalizada = fecha.includes('T') ? fecha.slice(0, 10) : fecha
  return fechaNormalizada
}

export function formatearEstadoLegible(estado: string | null | undefined) {
  if (!estado) {
    return ''
  }

  return formatearEstadoRegistro(estado)
}

export function formatearTendenciaLegible(tendencia: string | null | undefined) {
  if (!tendencia) {
    return ''
  }

  if (tendencia === 'sube') {
    return 'Sube'
  }

  if (tendencia === 'baja') {
    return 'Baja'
  }

  return 'Estable'
}

export function obtenerSemaforoKpi(valorActual: number | null, umbralBajo: number | null, umbralAlto: number | null) {
  if (valorActual === null || valorActual === undefined) {
    return 'Sin dato'
  }

  if (umbralAlto !== null && umbralAlto !== undefined && valorActual >= umbralAlto) {
    return 'Verde'
  }

  if (umbralBajo !== null && umbralBajo !== undefined && valorActual < umbralBajo) {
    return 'Rojo'
  }

  return 'Amarillo'
}

export function calcularAvancePorcentaje(valorActual: number | null, meta: number | null, baseline = 0) {
  if (valorActual === null || meta === null || meta === baseline) {
    return null
  }

  const avance = ((valorActual - baseline) / (meta - baseline)) * 100
  return Number(Math.max(0, Math.min(100, avance)).toFixed(1))
}