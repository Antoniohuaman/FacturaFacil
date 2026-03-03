interface EntradaRice {
  alcance: number | string | null | undefined
  impacto: number | string | null | undefined
  confianza: number | string | null | undefined
  esfuerzo: number | string | null | undefined
}

function convertirANumero(valor: number | string | null | undefined) {
  if (typeof valor === 'number') {
    return valor
  }

  if (typeof valor === 'string') {
    const numero = Number(valor.trim())
    return numero
  }

  return Number.NaN
}

export function calcularRice(entrada: EntradaRice) {
  const alcance = convertirANumero(entrada.alcance)
  const impacto = convertirANumero(entrada.impacto)
  const confianzaPct = convertirANumero(entrada.confianza)
  const esfuerzo = convertirANumero(entrada.esfuerzo)

  const valoresValidos = [alcance, impacto, confianzaPct, esfuerzo].every((valor) => Number.isFinite(valor))
  if (!valoresValidos || esfuerzo <= 0) {
    return 0
  }

  const confianzaNormalizada = confianzaPct / 100
  const rice = (alcance * impacto * confianzaNormalizada) / esfuerzo
  if (!Number.isFinite(rice)) {
    return 0
  }

  // Nota: al normalizar confianza con C/100 el score puede variar respecto a datos históricos.
  return Number(rice.toFixed(2))
}
