import type { EntregaEntrada, IniciativaEntrada } from '@/compartido/validacion/esquemas'
import { validarJerarquiaFechas, type RangoPadreFechas } from '@/compartido/validacion/roadmapJerarquiaFechas'
import type { Iniciativa, Objetivo } from '@/dominio/modelos'

type EntidadConRango = Pick<RangoPadreFechas, 'fecha_inicio' | 'fecha_fin'>

type EntidadPadreConRango = {
  fecha_inicio?: RangoPadreFechas['fecha_inicio']
  fecha_fin?: RangoPadreFechas['fecha_fin']
}

export class ErrorValidacionNegocio extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErrorValidacionNegocio'
  }
}

function asegurarContencionJerarquica(
  hijo: EntidadConRango,
  padre: EntidadPadreConRango | null,
  etiquetaPadre: 'objetivo' | 'iniciativa',
  mensaje: string
) {
  const errores = validarJerarquiaFechas(
    hijo,
    {
      fecha_inicio: padre?.fecha_inicio ?? null,
      fecha_fin: padre?.fecha_fin ?? null
    },
    etiquetaPadre
  )

  if (errores.length > 0) {
    throw new ErrorValidacionNegocio(mensaje)
  }
}

export function asegurarIniciativaDentroDeObjetivo(entrada: IniciativaEntrada, objetivo: Objetivo | null) {
  asegurarContencionJerarquica(
    {
      fecha_inicio: entrada.fecha_inicio ?? null,
      fecha_fin: entrada.fecha_fin ?? null
    },
    objetivo,
    'objetivo',
    'La iniciativa debe estar dentro del rango del objetivo'
  )
}

export function asegurarEntregaDentroDeIniciativa(entrada: EntregaEntrada, iniciativa: Iniciativa | null) {
  asegurarContencionJerarquica(
    {
      fecha_inicio: entrada.fecha_inicio ?? null,
      fecha_fin: entrada.fecha_fin ?? null
    },
    iniciativa,
    'iniciativa',
    'La entrega debe estar dentro del rango de la iniciativa'
  )
}