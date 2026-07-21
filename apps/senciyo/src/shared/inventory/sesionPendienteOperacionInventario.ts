// shared/inventory/sesionPendienteOperacionInventario.ts
//
// Sesión pendiente de idempotencia de UI, tenantizada y persistida en `localStorage` — generaliza
// el patrón aprobado para ajustes positivos (Etapa 1C) a cualquier operación de inventario que no
// tenga un ID de documento persistente previo (ajustes negativos, ventas sin comprobante todavía
// persistido — Etapa 1D, §9: "no crees otro mecanismo distinto... si puede generalizarse la
// sesión pendiente de ajustes").
//
// A diferencia de un `useRef`, sobrevive al desmontaje del componente y a una recarga completa de
// la pantalla. Guarda únicamente `operacionId` + una `huella` (ya calculada por el llamador,
// nunca por este módulo) del contenido de la operación: un reintento con la MISMA huella reutiliza
// el mismo `operacionId`; una huella distinta (acción realmente distinta) genera uno nuevo.
// `espacioNombre` evita que dos flujos distintos (p. ej. 'ajuste_positivo' y 'ajuste_negativo')
// compartan o se pisen la misma sesión — cada uno tiene su propia clave de almacenamiento.
//
// No es un ledger nuevo ni un repositorio: es una caché de intención de UI de un solo registro por
// (espacio de nombres, empresa), completamente separada de `OperacionIdempotenteInventario`
// (Etapa 1B).

import { lsKey } from '../tenant';

export interface SesionPendienteOperacion {
  operacionId: string;
  huella: string;
  /**
   * Datos de negocio YA CALCULADOS y dependientes del stock vigente al momento del cálculo (p. ej.
   * la asignación FIFO por almacén de una venta) — corrección post-1D, §1: si el llamador los
   * calculó una vez para esta huella, un reintento (incluso si el stock ya cambió) DEBE reutilizar
   * este valor tal cual, nunca recalcularlo contra el stock ya modificado. Opaco para este módulo
   * (nunca se interpreta ni se valida aquí) — cada consumidor conoce su propio tipo `T`.
   */
  datos?: unknown;
}

function esSesionPendienteValida(valor: unknown): valor is SesionPendienteOperacion {
  return (
    typeof valor === 'object' && valor !== null &&
    typeof (valor as { operacionId?: unknown }).operacionId === 'string' &&
    typeof (valor as { huella?: unknown }).huella === 'string'
  );
}

function claveSesionPendiente(espacioNombre: string, empresaId: string): string {
  return lsKey(`facturafacil_sesion_pendiente_${espacioNombre}`, empresaId);
}

/**
 * Devuelve el `operacionId` estable para la huella de contenido dada — lo genera y lo persiste
 * solo si no hay una sesión pendiente con la MISMA huella para este `espacioNombre`+`empresaId`.
 * Reintento tras desmontar/recargar con el mismo contenido: reutiliza el id. Contenido distinto:
 * genera uno nuevo (nunca reutiliza el id de una acción diferente).
 */
export function obtenerOperacionIdEstablePersistente(
  espacioNombre: string,
  empresaId: string,
  huella: string,
  generarId: () => string
): string {
  const clave = claveSesionPendiente(espacioNombre, empresaId);
  const raw = localStorage.getItem(clave);
  const actual = raw !== null ? (JSON.parse(raw) as unknown) : null;
  if (actual !== null && esSesionPendienteValida(actual) && actual.huella === huella) {
    return actual.operacionId;
  }
  const operacionId = generarId();
  localStorage.setItem(clave, JSON.stringify({ operacionId, huella } satisfies SesionPendienteOperacion));
  return operacionId;
}

/** Se elimina tras un resultado 'nueva'/'repetida' o al cancelar explícitamente la acción — nunca ante un fallo incierto (el reintento debe poder reutilizar el mismo operacionId). */
export function limpiarSesionPendienteOperacion(espacioNombre: string, empresaId: string): void {
  localStorage.removeItem(claveSesionPendiente(espacioNombre, empresaId));
}

/**
 * Devuelve los datos de negocio YA CALCULADOS para esta huella exacta, si existen — o `undefined`
 * si no hay sesión pendiente, o si la huella cambió (contenido distinto: nunca se reutiliza un
 * cálculo de otra operación). El llamador solo debe recalcular cuando esto devuelve `undefined`.
 */
export function obtenerDatosOperacionPendiente<T>(
  espacioNombre: string,
  empresaId: string,
  huella: string
): T | undefined {
  const clave = claveSesionPendiente(espacioNombre, empresaId);
  const raw = localStorage.getItem(clave);
  if (raw === null) return undefined;
  const actual = JSON.parse(raw) as unknown;
  if (!esSesionPendienteValida(actual) || actual.huella !== huella) return undefined;
  return actual.datos as T | undefined;
}

/**
 * Persiste el `operacionId` (si aún no existía para esta huella) junto con los datos de negocio ya
 * calculados — para que un reintento posterior (antes de limpiar la sesión) los reutilice sin
 * recalcular contra un stock que pudo haber cambiado (corrección post-1D, §1).
 */
export function guardarDatosOperacionPendiente<T>(
  espacioNombre: string,
  empresaId: string,
  huella: string,
  operacionId: string,
  datos: T
): void {
  const clave = claveSesionPendiente(espacioNombre, empresaId);
  localStorage.setItem(clave, JSON.stringify({ operacionId, huella, datos } satisfies SesionPendienteOperacion));
}
