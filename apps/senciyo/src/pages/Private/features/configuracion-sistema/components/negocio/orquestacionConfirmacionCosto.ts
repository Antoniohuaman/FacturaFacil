// configuracion-sistema/components/negocio/orquestacionConfirmacionCosto.ts
//
// Orquestación PURA de la confirmación de costo en `SeccionValorizacionInventario.tsx` (Etapa 2,
// cierre de bloqueante 4 de la revisión). Extraída del componente para poder probarla sin
// renderizar React (este repositorio no tiene infraestructura de pruebas de componente — React
// Testing Library/jsdom no están instalados; todas las pruebas existentes son de lógica pura).
//
// Corrige el bug original: el input de costo usaba `defaultValue` (no controlado) y el estado
// local `costosLocales` solo se poblaba en `onChange` — aceptar una propuesta SIN editar el input
// dejaba `costosLocales[clave]` en `undefined`, y `Number(undefined)` es `NaN`, que
// `confirmarCostoDetalle` siempre rechaza. Estas funciones dan una única fuente de verdad para
// "¿qué valor debe mostrar/enviar el input ahora mismo?" y "¿el usuario lo cambió?".

import type { DetalleValorizacionInicial } from '../../../gestion-inventario/models/valorizacionInicialInventario.types';

/**
 * Valor inicial/de reset del input editable para un detalle: `costoConfirmado` cuando existe: en
 * su defecto `costoPropuesto` cuando es mayor a cero; en su defecto cadena vacía. Es la fuente de
 * verdad tanto al montar/cambiar de lote como al limpiar el override local tras confirmar o
 * recalcular (recalcular exige mostrar la propuesta NUEVA, nunca la anterior).
 */
export function valorInicialInputCosto(detalle: Pick<DetalleValorizacionInicial, 'costoConfirmado' | 'costoPropuesto'>): string {
  if (detalle.costoConfirmado !== undefined && detalle.costoConfirmado !== null) {
    return String(detalle.costoConfirmado);
  }
  if (detalle.costoPropuesto > 0) {
    return String(detalle.costoPropuesto);
  }
  return '';
}

export interface ResultadoParseoCosto {
  valido: boolean;
  costo: number;
}

/** Parseo puro y explícito del texto del input — nunca `Number(undefined)` disperso por el componente. Cadena vacía/no numérica se reporta como inválida, nunca como 0 silencioso. */
export function parsearValorCosto(valorTexto: string): ResultadoParseoCosto {
  if (valorTexto.trim() === '') return { valido: false, costo: NaN };
  const costo = Number(valorTexto);
  return { valido: Number.isFinite(costo), costo };
}

/**
 * `true` si el costo que se va a confirmar difiere de la propuesta original — en ese caso
 * `confirmarCostoDetalle` debe invocarse con `esManual=true` para marcar `origenPropuesta='manual'`
 * (el usuario reemplazó la propuesta, no solo la aceptó). Comparación numérica exacta: aceptar la
 * propuesta sin editar el input siempre produce el mismo número, nunca "manual" por error de
 * redondeo de representación de cadena.
 */
export function determinarEsManual(costoPropuesto: number, costoAConfirmar: number): boolean {
  return costoAConfirmar !== costoPropuesto;
}
