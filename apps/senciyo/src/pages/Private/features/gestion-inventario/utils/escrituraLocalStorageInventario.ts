// gestion-inventario/utils/escrituraLocalStorageInventario.ts
//
// Primitiva de bajo nivel compartida por `unidadTrabajoInventario.ts` (confirmación en vivo) y
// `recuperacionInventario.ts` (reanudación tras interrupción): aplica UNA escritura planificada
// comparando el valor actual contra el snapshot anterior/propuesto (§11 paso 14, §32). Nunca
// recalcula reglas de negocio, nunca decide qué escribir — solo ejecuta lo que el plan ya trae.

import type { EscrituraPlanificadaInventario } from '../models/planUnidadTrabajoInventario.types';
import { InconsistenciaDiarioInventario } from './erroresInventario';

export type ResultadoAplicarEscritura = 'ya_aplicada' | 'aplicada';

export interface ContextoEscrituraInventario {
  empresaId: string;
  transaccionId: string;
  operacionIdempotenteId: string;
}

/** `true` si la clave no coincide ni con `valorAnterior` ni con `valorPropuesto` — ninguna reanudación puede resolver esto sola. */
export function detectarDriftEscritura(escritura: EscrituraPlanificadaInventario): boolean {
  const actual = localStorage.getItem(escritura.clave);
  return actual !== escritura.valorAnterior && actual !== escritura.valorPropuesto;
}

/**
 * Aplica una única escritura de forma idempotente (§11 paso 14):
 * - si la clave ya tiene `valorPropuesto`, no la reescribe (`ya_aplicada`);
 * - si tiene `valorAnterior`, aplica `valorPropuesto` (`aplicada`);
 * - si no coincide con ninguno de los dos, se detiene con `InconsistenciaDiarioInventario` — nunca
 *   sobrescribe un valor que no reconoce.
 */
export function aplicarEscrituraPlanificada(
  contexto: ContextoEscrituraInventario,
  escritura: EscrituraPlanificadaInventario
): ResultadoAplicarEscritura {
  const actual = localStorage.getItem(escritura.clave);
  if (actual === escritura.valorPropuesto) {
    return 'ya_aplicada';
  }
  if (actual !== escritura.valorAnterior) {
    throw new InconsistenciaDiarioInventario({
      empresaId: contexto.empresaId,
      mensaje: `escrituraLocalStorageInventario: la clave "${escritura.clave}" de la transacción "${contexto.transaccionId}" no coincide ni con el valor anterior ni con el propuesto — no se puede aplicar de forma segura ni asumir que ya se aplicó.`,
      transaccionId: contexto.transaccionId,
      operacionIdempotenteId: contexto.operacionIdempotenteId,
      clavesInconsistentes: [escritura.clave],
    });
  }
  if (escritura.valorPropuesto === null) {
    localStorage.removeItem(escritura.clave);
  } else {
    localStorage.setItem(escritura.clave, escritura.valorPropuesto);
  }
  return 'aplicada';
}

/** `true` si la clave ya refleja exactamente `valorPropuesto` — usado para reverificar tras aplicar todo el lote (§11 paso 16). */
export function verificarEscrituraAplicada(escritura: EscrituraPlanificadaInventario): boolean {
  return localStorage.getItem(escritura.clave) === escritura.valorPropuesto;
}
