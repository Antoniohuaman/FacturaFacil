// gestion-inventario/models/planUnidadTrabajoInventario.types.ts
//
// Contrato de infraestructura de Etapa 1B (§10 del encargo de Etapa 1B; complementa §12.2 del
// diseño aprobado, `PlanOperacionInventario`). La Etapa 1B todavía no calcula movimientos, capas
// ni consumos — `unidadTrabajoInventario.ts` recibe este plan YA CALCULADO por un llamador futuro
// (Etapa 1C en adelante) y únicamente lo ejecuta de forma determinista y recuperable, sin inventar
// ni recalcular reglas de negocio.

import type { TipoOperacionIdempotenteInventario } from './operacionIdempotenteInventario.types';

/**
 * Una escritura planificada sobre una única clave tenantizada. `valorAnterior`/`valorPropuesto`
 * son snapshots exactos y deterministas del string que `localStorage.getItem`/`setItem`
 * leería/escribiría — `null` representa la AUSENCIA real de la clave (equivalente a que
 * `getItem` devuelva `null`, o a que la escritura final sea un `removeItem`), nunca la cadena
 * literal `"null"`.
 */
export interface EscrituraPlanificadaInventario {
  clave: string;
  valorAnterior: string | null;
  valorPropuesto: string | null;
}

/**
 * Plan completo de una única operación de Inventario — cubre TODA la operación (no existe
 * confirmación por línea/escritura individual). Debe ser inmutable durante la ejecución: la
 * unidad de trabajo (`unidadTrabajoInventario.ts`) nunca modifica este objeto, solo lo lee y
 * persiste su contenido dentro de `TransaccionInventario.datosAnteriores`/`datosPropuestos`.
 */
export interface PlanUnidadTrabajoInventario {
  id: string;
  empresaId: string;
  operacionIdempotenteId: string;
  claveIdempotencia: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  hashEntrada: string;
  /** Versión de EstadoVersionInventario leída al construir este plan — la unidad de trabajo aborta sin escribir dominio si la versión vigente ya no coincide (invariante 26, §32). */
  versionEsperada: number;
  /** Sin claves duplicadas; cada clave debe pertenecer al ámbito tenantizado de `empresaId`. */
  escrituras: EscrituraPlanificadaInventario[];
  resultadoIds: string[];
  usuario: string;
}
