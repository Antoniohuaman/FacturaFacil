// src/features/gestion-inventario/repositories/notaSalida.repository.ts
//
// Persistencia de Notas de Salida. Aislamiento multiempresa estricto: toda operación exige
// `empresaId` explícito del llamador — nunca resuelto internamente, nunca con fallback hacia una
// clave global sin empresa (`lsKey` lanza si `empresaId` es inválido/vacío). Mismo estándar de
// rigor que los repositorios del motor de Kardex Valorizado
// (ver gestion-inventario/repositories/coleccionLocalStorageInventario.ts): solo la ausencia real
// de la clave representa una colección vacía; un JSON corrupto o una raíz que no es arreglo lanza
// un `Error` explícito, nunca se degrada a `[]` en silencio. Ningún error de escritura (incluida
// cuota excedida) se descarta: siempre se propaga al llamador.

import { lsKey } from '@/shared/tenant';
import { STORAGE_KEY_NOTAS_SALIDA, NOTAS_SALIDA_CHANGED_EVENT } from '../models/notaSalida.constants';
import type { NotaSalida } from '../models/notaSalida.types';

export { NOTAS_SALIDA_CHANGED_EVENT };

function mensajeErrorEscrituraNS(causa: unknown): string {
  if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
    return 'No hay espacio disponible en el almacenamiento local para guardar la Nota de Salida.';
  }
  return `Error al guardar las Notas de Salida: ${causa instanceof Error ? causa.message : 'error desconocido'}.`;
}

/**
 * Lee la colección completa de Notas de Salida de la empresa indicada. Solo la ausencia real de
 * la clave devuelve `[]`; un JSON corrupto o una raíz que no es arreglo lanza un `Error` explícito
 * en vez de interpretarse silenciosamente como "no hay notas".
 */
export const cargarNotasSalida = (empresaId: string): NotaSalida[] => {
  const clave = lsKey(STORAGE_KEY_NOTAS_SALIDA, empresaId);
  const raw = localStorage.getItem(clave);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (causa) {
    throw new Error(
      `Notas de Salida: el contenido almacenado en "${clave}" no es JSON válido (${causa instanceof Error ? causa.message : 'error desconocido'}).`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Notas de Salida: el contenido almacenado en "${clave}" no es un arreglo — no se puede interpretar como colección.`);
  }
  return parsed as NotaSalida[];
};

/** Persiste la colección completa de la empresa indicada. Nunca silencia un error de escritura: siempre lo propaga como `Error` con mensaje de dominio, incluida cuota excedida. */
export const guardarNotasSalida = (notas: NotaSalida[], empresaId: string): void => {
  const clave = lsKey(STORAGE_KEY_NOTAS_SALIDA, empresaId);
  try {
    localStorage.setItem(clave, JSON.stringify(notas));
  } catch (causa) {
    throw new Error(mensajeErrorEscrituraNS(causa));
  }
  window.dispatchEvent(new Event(NOTAS_SALIDA_CHANGED_EVENT));
};

/**
 * Persiste la colección completa de NS en una sola escritura con resultado tipado (para flujos de
 * rollback, que necesitan decidir su propio mensaje sin depender de una excepción). Mismo
 * comportamiento de fondo que `guardarNotasSalida` — nunca silencia un error, solo lo tipa en vez
 * de lanzarlo. El evento de cambio solo se despacha si la escritura tiene éxito.
 */
export function persistirNotasSalidaCompleto(
  notas: NotaSalida[],
  empresaId: string,
): { exito: true } | { exito: false; error: string } {
  try {
    guardarNotasSalida(notas, empresaId);
  } catch (causa) {
    return { exito: false, error: causa instanceof Error ? causa.message : 'error desconocido' };
  }
  return { exito: true };
}

export const agregarOActualizarNS = (nota: NotaSalida, empresaId: string): void => {
  const notas = cargarNotasSalida(empresaId);
  const idx = notas.findIndex(n => n.id === nota.id);
  if (idx >= 0) {
    notas[idx] = nota;
  } else {
    notas.unshift(nota);
  }
  guardarNotasSalida(notas, empresaId);
};

export interface NsDocumentoRef {
  comprobanteOrigenId?: string;
  ordenVentaOrigenId?: string;
  notaSalidaIds?: string[];
  notaSalidaIdLegacy?: string;
}

export function obtenerNSActivasPorDocumento(ref: NsDocumentoRef, empresaId: string): NotaSalida[] {
  const allNS = cargarNotasSalida(empresaId);
  return allNS.filter(n => {
    if (n.estado === 'Anulada') return false;
    if (ref.comprobanteOrigenId && n.comprobanteOrigenId === ref.comprobanteOrigenId) return true;
    if (ref.ordenVentaOrigenId && n.ordenVentaOrigenId === ref.ordenVentaOrigenId) return true;
    if (ref.notaSalidaIds?.includes(n.id)) return true;
    if (ref.notaSalidaIdLegacy && n.id === ref.notaSalidaIdLegacy) return true;
    return false;
  });
}
