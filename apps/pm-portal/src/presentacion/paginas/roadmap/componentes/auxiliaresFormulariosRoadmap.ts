import type { EntregaEntrada, IniciativaEntrada, ObjetivoEntrada } from '@/compartido/validacion/esquemas'
import type { Entrega, Iniciativa, Objetivo } from '@/dominio/modelos'

export const opcionesImpactoIniciativaRoadmap: IniciativaEntrada['impacto'][] = [0.25, 0.5, 1, 2, 3]

function convertirNumeroControlado(valor: unknown, respaldo: number) {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? numero : respaldo
}

export function normalizarImpactoFormularioIniciativa(valor: number | null | undefined): IniciativaEntrada['impacto'] {
  const impacto = convertirNumeroControlado(valor, 1)

  if (opcionesImpactoIniciativaRoadmap.includes(impacto as IniciativaEntrada['impacto'])) {
    return impacto as IniciativaEntrada['impacto']
  }

  return opcionesImpactoIniciativaRoadmap.reduce((masCercano, opcionActual) => {
    const distanciaActual = Math.abs(opcionActual - impacto)
    const distanciaMasCercana = Math.abs(masCercano - impacto)

    return distanciaActual < distanciaMasCercana ? opcionActual : masCercano
  }, 1)
}

export function crearValoresInicialesObjetivoRoadmap(objetivo?: Objetivo | null): ObjetivoEntrada {
  return {
    nombre: objetivo?.nombre ?? '',
    descripcion: objetivo?.descripcion ?? '',
    estado: objetivo?.estado ?? 'pendiente',
    prioridad: objetivo?.prioridad ?? 'media',
    fecha_inicio: objetivo?.fecha_inicio ?? null,
    fecha_fin: objetivo?.fecha_fin ?? null
  }
}

export function crearValoresInicialesIniciativaRoadmap(iniciativa?: Iniciativa | null): IniciativaEntrada {
  return {
    objetivo_id: iniciativa?.objetivo_id ?? null,
    ventana_planificada_id: iniciativa?.ventana_planificada_id ?? null,
    etapa_id: iniciativa?.etapa_id ?? null,
    nombre: iniciativa?.nombre ?? '',
    descripcion: iniciativa?.descripcion ?? '',
    alcance: iniciativa?.alcance ?? 10,
    impacto: normalizarImpactoFormularioIniciativa(iniciativa?.impacto),
    confianza: iniciativa?.confianza ?? 70,
    esfuerzo: iniciativa?.esfuerzo ?? 1,
    estado: iniciativa?.estado ?? 'pendiente',
    prioridad: iniciativa?.prioridad ?? 'media',
    fecha_inicio: iniciativa?.fecha_inicio ?? null,
    fecha_fin: iniciativa?.fecha_fin ?? null
  }
}

export function crearValoresInicialesEntregaRoadmap(entrega?: Entrega | null): EntregaEntrada {
  return {
    iniciativa_id: entrega?.iniciativa_id ?? null,
    ventana_planificada_id: entrega?.ventana_planificada_id ?? null,
    ventana_real_id: entrega?.ventana_real_id ?? null,
    nombre: entrega?.nombre ?? '',
    descripcion: entrega?.descripcion ?? '',
    fecha_inicio: entrega?.fecha_inicio ?? null,
    fecha_fin: entrega?.fecha_fin ?? null,
    fecha_objetivo: entrega?.fecha_objetivo ?? null,
    fecha_completado: entrega?.fecha_completado ?? null,
    estado: entrega?.estado ?? 'pendiente',
    prioridad: entrega?.prioridad ?? 'media'
  }
}