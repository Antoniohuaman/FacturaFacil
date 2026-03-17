type FechaFormulario = string | null | undefined

type EtiquetaPadre = 'objetivo' | 'iniciativa'

type CampoFechaJerarquica = 'fecha_inicio' | 'fecha_fin'

export interface RangoPadreFechas {
  fecha_inicio: FechaFormulario
  fecha_fin: FechaFormulario
}

export interface LimitesFechasJerarquicas {
  minFechaInicio?: string
  maxFechaInicio?: string
  minFechaFin?: string
  maxFechaFin?: string
}

export interface ErrorJerarquiaFechas {
  campo: CampoFechaJerarquica
  mensaje: string
}

function normalizarFecha(valor: FechaFormulario) {
  return valor && valor.trim().length > 0 ? valor : null
}

function obtenerRangoPadreValido(rangoPadre: RangoPadreFechas) {
  const fechaInicio = normalizarFecha(rangoPadre.fecha_inicio)
  const fechaFin = normalizarFecha(rangoPadre.fecha_fin)

  if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) {
    return null
  }

  return { fecha_inicio: fechaInicio, fecha_fin: fechaFin }
}

function crearMensaje(etiquetaPadre: EtiquetaPadre) {
  return etiquetaPadre === 'objetivo'
    ? 'La fecha debe estar dentro del rango del objetivo'
    : 'La fecha debe estar dentro del rango de la iniciativa'
}

export function construirLimitesFechasJerarquicas(
  rangoPadre: RangoPadreFechas,
  fechaInicioActual: FechaFormulario
): LimitesFechasJerarquicas {
  const rangoValido = obtenerRangoPadreValido(rangoPadre)

  if (!rangoValido) {
    return {}
  }

  const fechaInicioNormalizada = normalizarFecha(fechaInicioActual)
  const minFechaFin =
    fechaInicioNormalizada &&
    fechaInicioNormalizada >= rangoValido.fecha_inicio &&
    fechaInicioNormalizada <= rangoValido.fecha_fin
      ? fechaInicioNormalizada
      : rangoValido.fecha_inicio

  return {
    minFechaInicio: rangoValido.fecha_inicio,
    maxFechaInicio: rangoValido.fecha_fin,
    minFechaFin,
    maxFechaFin: rangoValido.fecha_fin
  }
}

export function validarJerarquiaFechas(
  valores: Pick<RangoPadreFechas, 'fecha_inicio' | 'fecha_fin'>,
  rangoPadre: RangoPadreFechas,
  etiquetaPadre: EtiquetaPadre
) {
  const rangoValido = obtenerRangoPadreValido(rangoPadre)

  if (!rangoValido) {
    return [] satisfies ErrorJerarquiaFechas[]
  }

  const errores: ErrorJerarquiaFechas[] = []
  const fechaInicio = normalizarFecha(valores.fecha_inicio)
  const fechaFin = normalizarFecha(valores.fecha_fin)
  const mensaje = crearMensaje(etiquetaPadre)

  if (fechaInicio && (fechaInicio < rangoValido.fecha_inicio || fechaInicio > rangoValido.fecha_fin)) {
    errores.push({ campo: 'fecha_inicio', mensaje })
  }

  if (fechaFin && (fechaFin < rangoValido.fecha_inicio || fechaFin > rangoValido.fecha_fin)) {
    errores.push({ campo: 'fecha_fin', mensaje })
  }

  return errores
}

export function validarCampoFechaEnJerarquia(
  campo: CampoFechaJerarquica,
  valor: FechaFormulario,
  rangoPadre: RangoPadreFechas,
  etiquetaPadre: EtiquetaPadre
) {
  const errores = validarJerarquiaFechas({ [campo]: valor } as Pick<RangoPadreFechas, CampoFechaJerarquica>, rangoPadre, etiquetaPadre)
  return errores.find((error) => error.campo === campo)?.mensaje ?? true
}