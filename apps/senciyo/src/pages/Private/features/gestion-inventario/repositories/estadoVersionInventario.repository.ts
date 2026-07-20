// gestion-inventario/repositories/estadoVersionInventario.repository.ts
//
// Persistencia del control optimista de concurrencia (§9.6bis del diseño aprobado). A diferencia
// de los cuatro repositorios de Etapa 1A, `EstadoVersionInventario` es un REGISTRO ÚNICO por
// empresa (no una colección de N entidades con `id` propio) — por eso no encaja en el contrato
// de `coleccionLocalStorageInventario.ts` (que asume un arreglo de elementos con `id`+`empresaId`
// cada uno). Se reutiliza el mismo PRINCIPIO defensivo (parseo validado, nunca convierte
// corrupción en un valor por defecto, `lsKey`/`esObjetoPlano` reales, ambos ya existentes) en una
// función dedicada — sin una segunda librería de parseo inseguro.
//
// Invariante reforzado (Bloqueante 5 de la revisión de Etapa 1B): la AUSENCIA de registro es la
// ÚNICA representación válida de "versión 0" — este módulo nunca persiste explícitamente un
// registro con `versionInventario === 0` (el CAS siempre incrementa desde una versión vigente
// hacia `vigente + 1 >= 1`). Por eso todo registro PERSISTIDO exige `versionInventario >= 1` y una
// `ultimaTransaccionId` real y no vacía — un registro con versión 0 o sin `ultimaTransaccionId`
// nunca puede ser resultado normal de este módulo, así que si aparece es corrupción externa y se
// rechaza, nunca se acepta silenciosamente como si fuera la versión inicial.

import { lsKey } from '../../../../../shared/tenant';
import { esObjetoPlano } from './coleccionLocalStorageInventario';
import { ConflictoVersionInventario } from '../utils/erroresInventario';
import type { EstadoVersionInventario } from '../models/estadoVersionInventario.types';

const STORAGE_KEY = 'facturafacil_estado_version_inventario';

function esEstadoVersionInventarioValido(valor: unknown): valor is EstadoVersionInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.empresaId === 'string' && valor.empresaId.trim() !== '' &&
    typeof valor.versionInventario === 'number' &&
    Number.isSafeInteger(valor.versionInventario) &&
    valor.versionInventario >= 1 &&
    typeof valor.fechaActualizacion === 'string' && valor.fechaActualizacion.trim() !== '' &&
    typeof valor.ultimaTransaccionId === 'string' && valor.ultimaTransaccionId.trim() !== ''
  );
}

/**
 * Lee el registro de versión de una empresa. `undefined` si nunca se creó (la empresa está,
 * implícitamente, en versión 0 — ver `obtenerVersionInventarioActual`). Cualquier anomalía (JSON
 * inválido, forma inesperada, un registro con versión 0 o sin `ultimaTransaccionId` — nunca
 * producidos por este módulo —, o un registro cuyo propio `empresaId` no coincide con el
 * parámetro — dato mezclado) lanza un `Error` explícito: nunca se convierte silenciosamente en
 * versión 0.
 */
function leerEstadoVersionInventario(empresaId: string): EstadoVersionInventario | undefined {
  const clave = lsKey(STORAGE_KEY, empresaId);
  const data = localStorage.getItem(clave);
  if (data === null) return undefined;

  const parsed: unknown = JSON.parse(data);
  if (!esEstadoVersionInventarioValido(parsed)) {
    throw new Error(`estadoVersionInventario.repository: el contenido almacenado en "${clave}" no tiene la forma esperada de EstadoVersionInventario.`);
  }
  if (parsed.empresaId !== empresaId) {
    throw new Error(
      `estadoVersionInventario.repository: el registro almacenado en "${clave}" pertenece a la empresa "${parsed.empresaId}", no a "${empresaId}" — dato mezclado, no se puede resolver automáticamente.`
    );
  }
  return parsed;
}

function guardarRegistroEstadoVersionInventario(estado: EstadoVersionInventario): void {
  const clave = lsKey(STORAGE_KEY, estado.empresaId);
  localStorage.setItem(clave, JSON.stringify(estado));
}

/** Registro completo, o `undefined` si la empresa nunca tuvo una operación confirmada (versión 0 implícita). */
export function obtenerEstadoVersionInventario(empresaId: string): EstadoVersionInventario | undefined {
  return leerEstadoVersionInventario(empresaId);
}

/** Versión vigente como número — 0 si la empresa no tiene registro previo (nunca se confirmó ninguna operación todavía). */
export function obtenerVersionInventarioActual(empresaId: string): number {
  return leerEstadoVersionInventario(empresaId)?.versionInventario ?? 0;
}

export interface ParametrosActualizarVersionInventario {
  empresaId: string;
  /** Versión que el llamador leyó al construir su plan — debe coincidir con la vigente, o se rechaza sin escribir (compare-and-set lógico). */
  versionEsperada: number;
  nuevaVersion: number;
  /** Obligatoria: `nuevaVersion` nunca es 0 (el CAS siempre incrementa desde ≥0 hacia ≥1), así que todo registro persistido por esta función SIEMPRE tiene una transacción real que lo produjo. */
  ultimaTransaccionId: string;
  fechaActualizacion: string;
}

/**
 * Valida la FORMA de los parámetros — sin leer ni escribir nada todavía (§6.1/§6.2 de la revisión
 * de Etapa 1B). Ningún parámetro inválido puede llegar a `localStorage.setItem`, sin importar el
 * resultado del CAS.
 */
function validarParametrosActualizacion(params: ParametrosActualizarVersionInventario): void {
  const { empresaId, versionEsperada, nuevaVersion, ultimaTransaccionId, fechaActualizacion } = params;

  if (!empresaId || empresaId.trim() === '') {
    throw new Error('estadoVersionInventario.repository: empresaId no puede estar vacío.');
  }
  if (!fechaActualizacion || fechaActualizacion.trim() === '') {
    throw new Error('estadoVersionInventario.repository: fechaActualizacion no puede estar vacía.');
  }
  if (!ultimaTransaccionId || ultimaTransaccionId.trim() === '') {
    throw new Error('estadoVersionInventario.repository: ultimaTransaccionId no puede estar vacía — toda versión persistida mayor que 0 debe tener la transacción que la produjo.');
  }
  if (!Number.isSafeInteger(versionEsperada) || versionEsperada < 0) {
    throw new Error(`estadoVersionInventario.repository: versionEsperada debe ser un entero seguro ≥ 0 (recibido: ${versionEsperada}).`);
  }
  if (!Number.isSafeInteger(nuevaVersion) || nuevaVersion < 1) {
    throw new Error(`estadoVersionInventario.repository: nuevaVersion debe ser un entero seguro ≥ 1 (recibido: ${nuevaVersion}).`);
  }
  if (versionEsperada >= Number.MAX_SAFE_INTEGER) {
    throw new Error(`estadoVersionInventario.repository: versionEsperada (${versionEsperada}) ya está en el límite de Number.MAX_SAFE_INTEGER — el incremento desbordaría.`);
  }
  if (nuevaVersion !== versionEsperada + 1) {
    throw new Error(
      `estadoVersionInventario.repository: el incremento de versión debe ser de exactamente 1 (esperada=${versionEsperada}, recibida=${nuevaVersion}).`
    );
  }
}

/**
 * Compare-and-set lógico: valida primero la FORMA de los parámetros (nunca toca `localStorage` si
 * son inválidos); luego, si la versión vigente no coincide con `versionEsperada`, lanza
 * `ConflictoVersionInventario` sin escribir nada. Ningún caso inválido o en conflicto ejecuta
 * `localStorage.setItem`.
 */
export function actualizarEstadoVersionInventario(params: ParametrosActualizarVersionInventario): void {
  validarParametrosActualizacion(params);

  const { empresaId, versionEsperada, nuevaVersion, ultimaTransaccionId, fechaActualizacion } = params;
  const versionVigente = obtenerVersionInventarioActual(empresaId);

  if (versionVigente !== versionEsperada) {
    throw new ConflictoVersionInventario({ empresaId, versionEsperada, versionVigente });
  }

  guardarRegistroEstadoVersionInventario({
    empresaId,
    versionInventario: nuevaVersion,
    fechaActualizacion,
    ultimaTransaccionId,
  });
}
