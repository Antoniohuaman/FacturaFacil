// gestion-inventario/repositories/operacionIdempotenteInventario.repository.ts
//
// Persistencia del ledger de idempotencia (§9.5 del diseño aprobado). NO implementa generación
// criptográfica del hash, comparación de hash, reintentos ni recuperación — ver
// `utils/idempotenciaInventario.ts` (reserva) y `utils/recuperacionInventario.ts` (recuperación).
//
// Unicidad lógica real: SIEMPRE (empresaId, clave), nunca `clave` sola — la misma clave puede
// existir en empresas distintas, pero la misma empresa nunca puede tener dos operaciones con la
// misma clave (invariante 8/9/10, §32).
//
// Corrección estructural de la revisión de Etapa 1B (Bloqueante 2): no existe un actualizador
// genérico capaz de romper invariantes o de reescribir una operación terminal. Las únicas
// mutaciones legítimas de una operación existente son `enlazarOperacionConTransaccionActiva`,
// `marcarOperacionConfirmada` y `marcarOperacionFallida` — cada una valida su propio estado
// anterior y solo toca los campos que le corresponden. `confirmada` y `revertida` son terminales:
// ninguna función de este archivo produce una transición de salida desde ellas (el reverso real
// queda para una etapa futura, §3.7 de la revisión).
//
// Corrección estructural de la corrección final (retiro de exportaciones inseguras): la creación
// de una reserva nueva y la reactivación de una operación fallida YA NO se exportan desde este
// repositorio — ninguna advertencia de JSDoc impide que un consumidor futuro las importe y se
// salte el bloqueo o la validación del historial. Esa lógica de persistencia ahora vive como
// funciones NO exportadas dentro de `utils/idempotenciaInventario.ts` (el único módulo que puede
// invocarlas, porque en JavaScript/TypeScript una función no exportada solo es visible dentro de
// su propio archivo). Para que esa lógica no duplique el guard de forma ni la clave de
// almacenamiento, este repositorio exporta `esOperacionIdempotenteValida` y
// `CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES` — ninguno de los dos, por sí solo, permite reservar
// ni reactivar nada (son un predicado puro y una constante de texto), así que exponerlos no reabre
// la ventana de bypass que sí abría exportar la función de escritura completa.

import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

export const CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES = 'facturafacil_operaciones_idempotentes_inventario';
const STORAGE_KEY = CLAVE_COLECCION_OPERACIONES_IDEMPOTENTES;
const NOMBRE_RECURSO = 'operaciones idempotentes de inventario';

/** Campos propios del modelo, además de id/empresaId (ya validados por el helper compartido antes de invocar este guard). Exportado (predicado puro, sin efectos) para que `utils/idempotenciaInventario.ts` reutilice exactamente esta misma validación de forma, sin duplicarla. */
export function esOperacionIdempotenteValida(valor: unknown): valor is OperacionIdempotenteInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.clave === 'string' &&
    typeof valor.tipoOperacion === 'string' &&
    typeof valor.estado === 'string' &&
    typeof valor.hashEntrada === 'string' &&
    Array.isArray(valor.resultadoIds) &&
    (valor.transaccionInventarioId === undefined || typeof valor.transaccionInventarioId === 'string')
  );
}

function leerTodas(empresaId: string): OperacionIdempotenteInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esOperacionIdempotenteValida);
}

/** Paso previo obligatorio a guardar/mutar: bloquea si la colección física tiene registros válidos de otra empresa (ver coleccionLocalStorageInventario.ts). */
function leerTodasParaMutar(empresaId: string): OperacionIdempotenteInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esOperacionIdempotenteValida);
}

function guardarTodas(empresaId: string, operaciones: readonly OperacionIdempotenteInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, operaciones);
}

export function obtenerOperacionIdempotentePorId(id: string, empresaId: string): OperacionIdempotenteInventario | undefined {
  return leerTodas(empresaId).find((o) => o.id === id);
}

/** Busca por la clave compuesta real (empresaId + clave). */
export function buscarOperacionIdempotentePorClave(empresaId: string, clave: string): OperacionIdempotenteInventario | undefined {
  return leerTodas(empresaId).find((o) => o.clave === clave);
}

export function listarOperacionesIdempotentesPorEmpresa(empresaId: string): OperacionIdempotenteInventario[] {
  return leerTodas(empresaId);
}

function obtenerParaTransicion(empresaId: string, id: string): OperacionIdempotenteInventario {
  const operaciones = leerTodasParaMutar(empresaId);
  const actual = operaciones.find((o) => o.id === id);
  if (!actual) {
    throw new Error(`operacionIdempotenteInventario.repository: no existe una operación con id "${id}" para la empresa "${empresaId}".`);
  }
  return actual;
}

function reemplazarOperacion(empresaId: string, actualizada: OperacionIdempotenteInventario): void {
  const operaciones = leerTodasParaMutar(empresaId);
  const indice = operaciones.findIndex((o) => o.id === actualizada.id);
  if (indice === -1) {
    throw new Error(`operacionIdempotenteInventario.repository: no existe una operación con id "${actualizada.id}" para la empresa "${empresaId}".`);
  }
  const siguientes = [...operaciones];
  siguientes[indice] = actualizada;
  guardarTodas(empresaId, siguientes);
}

/**
 * Enlaza la operación (todavía `preparada`) con el intento activo recién creado (§11 paso 9). Solo
 * cambia `transaccionInventarioId` — rechaza si la operación ya tenía uno enlazado (un enlace
 * accidental duplicado indicaría un bug del llamador, nunca se sobrescribe en silencio).
 */
export function enlazarOperacionConTransaccionActiva(empresaId: string, operacionId: string, transaccionId: string): void {
  const actual = obtenerParaTransicion(empresaId, operacionId);
  if (actual.estado !== 'preparada') {
    throw new Error(`operacionIdempotenteInventario.repository: solo una operación 'preparada' puede enlazarse con un intento activo (estado actual: "${actual.estado}", id="${operacionId}").`);
  }
  if (actual.transaccionInventarioId !== undefined) {
    throw new Error(`operacionIdempotenteInventario.repository: la operación "${operacionId}" ya tiene un transaccionInventarioId enlazado ("${actual.transaccionInventarioId}") — no se sobrescribe.`);
  }
  reemplazarOperacion(empresaId, { ...actual, transaccionInventarioId: transaccionId });
}

/**
 * `preparada → confirmada` (terminal). Exige que la operación ya esté enlazada con `transaccionId`
 * (§11 paso 18) — nunca confirma una operación sin su intento activo identificado.
 */
export function marcarOperacionConfirmada(
  empresaId: string,
  operacionId: string,
  params: { transaccionId: string; resultadoIds: string[]; fechaConfirmacion: string }
): void {
  const actual = obtenerParaTransicion(empresaId, operacionId);
  if (actual.estado !== 'preparada') {
    throw new Error(`operacionIdempotenteInventario.repository: solo una operación 'preparada' puede marcarse 'confirmada' (estado actual: "${actual.estado}", id="${operacionId}").`);
  }
  if (actual.transaccionInventarioId !== params.transaccionId) {
    throw new Error(
      `operacionIdempotenteInventario.repository: la operación "${operacionId}" está enlazada con "${actual.transaccionInventarioId}", no con "${params.transaccionId}" — no se puede confirmar contra un intento distinto del enlazado.`
    );
  }
  reemplazarOperacion(empresaId, {
    ...actual,
    estado: 'confirmada',
    resultadoIds: params.resultadoIds,
    fechaConfirmacion: params.fechaConfirmacion,
  });
}

/**
 * `preparada → fallida` (terminal). `resultadoIds` se fuerza a vacío — una operación fallida nunca
 * conserva resultados, fingiría efectos que nunca se aplicaron. El `transaccionInventarioId` del
 * intento fallido se CONSERVA (valor de auditoría: "el último intento de esta operación fue esa
 * transacción") — se limpia únicamente al preparar un reintento seguro.
 */
export function marcarOperacionFallida(empresaId: string, operacionId: string): void {
  const actual = obtenerParaTransicion(empresaId, operacionId);
  if (actual.estado !== 'preparada') {
    throw new Error(`operacionIdempotenteInventario.repository: solo una operación 'preparada' puede marcarse 'fallida' (estado actual: "${actual.estado}", id="${operacionId}").`);
  }
  reemplazarOperacion(empresaId, { ...actual, estado: 'fallida', resultadoIds: [] });
}
