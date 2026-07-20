// gestion-inventario/repositories/transaccionInventario.repository.ts
//
// Persistencia del diario transaccional (§9.6 del diseño aprobado). No ejecuta ni interpreta
// `datosPropuestos` — se conservan tal cual fueron entregados. Ver `utils/unidadTrabajoInventario.ts`
// (confirmación) y `utils/recuperacionInventario.ts` (recuperación).
//
// Corrección estructural de la revisión de Etapa 1B (Bloqueante 2): la relación con
// OperacionIdempotenteInventario es 1:N (un intento por fila, `numeroIntento`) — NUNCA se elimina
// una transacción para "liberar" la relación con su operación. La unicidad real protegida aquí es
// (empresaId, operacionIdempotenteId, numeroIntento), y como máximo UN intento puede estar activo
// (`preparada`/`confirmando`) por operación a la vez. Las mutaciones legítimas de una transacción
// existente son ÚNICAMENTE `pasarTransaccionAConfirmando`, `marcarTransaccionConfirmada` y
// `marcarTransaccionFallida` — no existe un actualizador genérico capaz de romper invariantes ni
// de reescribir campos de una entidad terminal (`confirmada`/`fallida`/`revertida`).

import type { EstadoTransaccionInventario, TransaccionInventario } from '../models/transaccionInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';
import { IntentoActivoDuplicadoInventario } from '../utils/erroresInventario';

const STORAGE_KEY = 'facturafacil_transacciones_inventario';
const NOMBRE_RECURSO = 'transacciones de inventario';

/** Cada valor del registro debe ser `string` o `null` (nunca `undefined`, objeto ni arreglo) — snapshots exactos de `localStorage.getItem`. */
function esRegistroDeStringONull(valor: unknown): valor is Record<string, string | null> {
  if (!esObjetoPlano(valor)) return false;
  return Object.values(valor).every((v) => v === null || typeof v === 'string');
}

/** Campos propios del modelo, además de id/empresaId (ya validados por el helper compartido antes de invocar este guard). */
function esTransaccionInventarioValida(valor: unknown): valor is TransaccionInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.operacionIdempotenteId === 'string' && valor.operacionIdempotenteId.trim() !== '' &&
    typeof valor.numeroIntento === 'number' && Number.isSafeInteger(valor.numeroIntento) && valor.numeroIntento >= 1 &&
    typeof valor.tipoOperacion === 'string' &&
    typeof valor.claveIdempotencia === 'string' &&
    typeof valor.estado === 'string' &&
    typeof valor.hashEntrada === 'string' &&
    Array.isArray(valor.clavesAfectadas) &&
    esRegistroDeStringONull(valor.datosAnteriores) &&
    esRegistroDeStringONull(valor.datosPropuestos) &&
    typeof valor.versionEsperada === 'number' && Number.isSafeInteger(valor.versionEsperada) && valor.versionEsperada >= 0 &&
    typeof valor.versionResultante === 'number' && Number.isSafeInteger(valor.versionResultante) && valor.versionResultante === valor.versionEsperada + 1 &&
    Array.isArray(valor.resultadoIds)
  );
}

const ESTADOS_ACTIVOS: ReadonlySet<EstadoTransaccionInventario> = new Set(['preparada', 'confirmando']);

function leerTodas(empresaId: string): TransaccionInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esTransaccionInventarioValida);
}

/** Paso previo obligatorio a guardar/mutar: bloquea si la colección física tiene registros válidos de otra empresa (ver coleccionLocalStorageInventario.ts). */
function leerTodasParaMutar(empresaId: string): TransaccionInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esTransaccionInventarioValida);
}

function guardarTodas(empresaId: string, transacciones: readonly TransaccionInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, transacciones);
}

function validarEmpresaCoincide(empresaId: string, entidadEmpresaId: string): void {
  if (empresaId !== entidadEmpresaId) {
    throw new Error(
      `transaccionInventario.repository: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${entidadEmpresaId}").`
    );
  }
}

/** Todos los intentos históricos de una operación, ordenados por `numeroIntento` ascendente — NUNCA por posición en el arreglo ni por fecha. */
export function listarTransaccionesPorOperacionIdempotenteId(empresaId: string, operacionIdempotenteId: string): TransaccionInventario[] {
  return leerTodas(empresaId)
    .filter((t) => t.operacionIdempotenteId === operacionIdempotenteId)
    .sort((a, b) => a.numeroIntento - b.numeroIntento);
}

/**
 * El intento ACTIVO (`preparada`/`confirmando`) de una operación, si existe — como máximo debe
 * haber uno; encontrar más de uno es una inconsistencia real (nunca se elige "el primero").
 */
export function obtenerTransaccionActivaPorOperacionIdempotenteId(empresaId: string, operacionIdempotenteId: string): TransaccionInventario | undefined {
  const activos = listarTransaccionesPorOperacionIdempotenteId(empresaId, operacionIdempotenteId).filter((t) => ESTADOS_ACTIVOS.has(t.estado));
  if (activos.length > 1) {
    throw new IntentoActivoDuplicadoInventario({
      empresaId,
      operacionIdempotenteId,
      transaccionesActivasIds: activos.map((t) => t.id),
    });
  }
  return activos[0];
}

/** El intento con mayor `numeroIntento` (el más reciente), sin importar su estado. */
export function obtenerUltimoIntentoPorOperacionIdempotenteId(empresaId: string, operacionIdempotenteId: string): TransaccionInventario | undefined {
  const intentos = listarTransaccionesPorOperacionIdempotenteId(empresaId, operacionIdempotenteId);
  return intentos[intentos.length - 1];
}

/** `máximo numeroIntento histórico + 1`, o `1` si la operación no tiene ningún intento todavía — nunca se confía en el orden del arreglo. */
export function calcularSiguienteNumeroIntento(empresaId: string, operacionIdempotenteId: string): number {
  const ultimo = obtenerUltimoIntentoPorOperacionIdempotenteId(empresaId, operacionIdempotenteId);
  return ultimo ? ultimo.numeroIntento + 1 : 1;
}

/**
 * Inserta un NUEVO intento (siempre en estado `preparada`). Rechaza explícitamente si: ya existe
 * una transacción con el mismo `id`; `numeroIntento` no es exactamente el siguiente correcto
 * (recalculado aquí mismo, nunca confiando ciegamente en el valor recibido); o ya existe un
 * intento ACTIVO para la misma operación (como máximo uno a la vez — §32).
 */
export function guardarTransaccionInventario(transaccion: TransaccionInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, transaccion.empresaId);
  if (transaccion.estado !== 'preparada') {
    throw new Error(`transaccionInventario.repository: un nuevo intento debe insertarse en estado 'preparada' (recibido: "${transaccion.estado}").`);
  }
  if (!Number.isSafeInteger(transaccion.versionEsperada) || transaccion.versionEsperada < 0) {
    throw new Error(`transaccionInventario.repository: versionEsperada inválida (${transaccion.versionEsperada}) — debe ser un entero seguro ≥ 0.`);
  }
  if (transaccion.versionEsperada >= Number.MAX_SAFE_INTEGER) {
    throw new Error(
      `transaccionInventario.repository: versionEsperada (${transaccion.versionEsperada}) ya está en el límite de Number.MAX_SAFE_INTEGER — el incremento a versionResultante desbordaría.`
    );
  }
  if (!Number.isSafeInteger(transaccion.versionResultante) || transaccion.versionResultante < 1) {
    throw new Error(`transaccionInventario.repository: versionResultante inválida (${transaccion.versionResultante}) — debe ser un entero seguro ≥ 1.`);
  }
  if (transaccion.versionResultante !== transaccion.versionEsperada + 1) {
    throw new Error(
      `transaccionInventario.repository: versionResultante (${transaccion.versionResultante}) debe ser exactamente versionEsperada + 1 (${transaccion.versionEsperada + 1}).`
    );
  }
  const transacciones = leerTodasParaMutar(empresaId);
  if (transacciones.some((t) => t.id === transaccion.id)) {
    throw new Error(`transaccionInventario.repository: ya existe una transacción con id "${transaccion.id}" para la empresa "${empresaId}".`);
  }

  const delaMismaOperacion = transacciones.filter((t) => t.operacionIdempotenteId === transaccion.operacionIdempotenteId);
  if (delaMismaOperacion.some((t) => ESTADOS_ACTIVOS.has(t.estado))) {
    throw new Error(
      `transaccionInventario.repository: la operación idempotente "${transaccion.operacionIdempotenteId}" ya tiene un intento activo — no puede existir más de uno a la vez.`
    );
  }
  const siguienteEsperado = delaMismaOperacion.length > 0 ? Math.max(...delaMismaOperacion.map((t) => t.numeroIntento)) + 1 : 1;
  if (transaccion.numeroIntento !== siguienteEsperado) {
    throw new Error(
      `transaccionInventario.repository: numeroIntento inválido para la operación "${transaccion.operacionIdempotenteId}" (recibido: ${transaccion.numeroIntento}, esperado: ${siguienteEsperado}).`
    );
  }

  guardarTodas(empresaId, [...transacciones, transaccion]);
}

export function obtenerTransaccionInventarioPorId(id: string, empresaId: string): TransaccionInventario | undefined {
  return leerTodas(empresaId).find((t) => t.id === id);
}

export function listarTransaccionesInventarioPorEmpresa(empresaId: string): TransaccionInventario[] {
  return leerTodas(empresaId);
}

function obtenerParaTransicion(empresaId: string, id: string): TransaccionInventario {
  const transacciones = leerTodasParaMutar(empresaId);
  const actual = transacciones.find((t) => t.id === id);
  if (!actual) {
    throw new Error(`transaccionInventario.repository: no existe una transacción con id "${id}" para la empresa "${empresaId}".`);
  }
  return actual;
}

/** `preparada → confirmando` (§11 paso 12). Ningún otro campo cambia. */
export function pasarTransaccionAConfirmando(empresaId: string, transaccionId: string): void {
  const actual = obtenerParaTransicion(empresaId, transaccionId);
  if (actual.estado !== 'preparada') {
    throw new Error(`transaccionInventario.repository: solo una transacción 'preparada' puede pasar a 'confirmando' (estado actual: "${actual.estado}", id="${transaccionId}").`);
  }
  reemplazarTransaccionSegura(empresaId, { ...actual, estado: 'confirmando' });
}

/** `confirmando → confirmada` (terminal). Solo cambia `estado` y `fechaConfirmacion`. */
export function marcarTransaccionConfirmada(empresaId: string, transaccionId: string, params: { fechaConfirmacion: string }): void {
  const actual = obtenerParaTransicion(empresaId, transaccionId);
  if (actual.estado !== 'confirmando') {
    throw new Error(`transaccionInventario.repository: solo una transacción 'confirmando' puede marcarse 'confirmada' (estado actual: "${actual.estado}", id="${transaccionId}").`);
  }
  reemplazarTransaccionSegura(empresaId, { ...actual, estado: 'confirmada', fechaConfirmacion: params.fechaConfirmacion });
}

/**
 * `preparada → fallida` (terminal). Por invariante de transición (§11/§32), una transacción SOLO
 * puede fallar mientras sigue `preparada` — es decir, antes de aplicar cualquier escritura de
 * dominio. Una vez `confirmando`, nunca vuelve a `fallida`: si la aplicación se interrumpe, la
 * recuperación la completa, nunca la revierte a ciegas (§11 paso 15).
 */
export function marcarTransaccionFallida(empresaId: string, transaccionId: string): void {
  const actual = obtenerParaTransicion(empresaId, transaccionId);
  if (actual.estado !== 'preparada') {
    throw new Error(`transaccionInventario.repository: solo una transacción 'preparada' puede marcarse 'fallida' (estado actual: "${actual.estado}", id="${transaccionId}").`);
  }
  reemplazarTransaccionSegura(empresaId, { ...actual, estado: 'fallida' });
}

function reemplazarTransaccionSegura(empresaId: string, actualizada: TransaccionInventario): void {
  const transacciones = leerTodasParaMutar(empresaId);
  const indice = transacciones.findIndex((t) => t.id === actualizada.id);
  if (indice === -1) {
    throw new Error(`transaccionInventario.repository: no existe una transacción con id "${actualizada.id}" para la empresa "${empresaId}".`);
  }
  const siguientes = [...transacciones];
  siguientes[indice] = actualizada;
  guardarTodas(empresaId, siguientes);
}

/** Consulta por `claveIdempotencia` dentro de una empresa — puede devolver varias filas (una por intento histórico). */
export function buscarTransaccionesPorClaveIdempotencia(empresaId: string, claveIdempotencia: string): TransaccionInventario[] {
  return leerTodas(empresaId).filter((t) => t.claveIdempotencia === claveIdempotencia);
}

/** Filtra por `estado` dentro de una empresa. */
export function filtrarTransaccionesInventarioPorEstado(empresaId: string, estado: EstadoTransaccionInventario): TransaccionInventario[] {
  return leerTodas(empresaId).filter((t) => t.estado === estado);
}
