// src/features/gestion-inventario/repositories/notaIngreso.repository.ts
//
// Persistencia de Notas de Ingreso. Aislamiento multiempresa estricto: toda operación exige
// `empresaId` explícito del llamador — nunca resuelto internamente, nunca con fallback hacia una
// clave global sin empresa (`lsKey` lanza si `empresaId` es inválido/vacío). Mismo estándar de
// rigor que los repositorios del motor de Kardex Valorizado
// (ver gestion-inventario/repositories/coleccionLocalStorageInventario.ts): solo la ausencia real
// de la clave representa una colección vacía; un JSON corrupto o una raíz que no es arreglo lanza
// un `Error` explícito, nunca se degrada a `[]` en silencio. Ningún error de escritura (incluida
// cuota excedida) se descarta: siempre se propaga al llamador.

import { lsKey } from '@/shared/tenant';
import { STORAGE_KEY_NOTAS_INGRESO } from '../models/notaIngreso.constants';
import type { NotaIngreso } from '../models/notaIngreso.types';

export const NOTAS_INGRESO_CHANGED_EVENT = 'facturafacil:notas-ingreso-changed';

function mensajeErrorEscrituraNI(causa: unknown): string {
  if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
    return 'No hay espacio disponible en el almacenamiento local para guardar la Nota de Ingreso.';
  }
  return `Error al guardar las Notas de Ingreso: ${causa instanceof Error ? causa.message : 'error desconocido'}.`;
}

/**
 * Lee la colección completa de Notas de Ingreso de la empresa indicada. Solo la ausencia real de
 * la clave devuelve `[]`; un JSON corrupto o una raíz que no es arreglo lanza un `Error` explícito
 * en vez de interpretarse silenciosamente como "no hay notas".
 */
export const cargarNotasIngreso = (empresaId: string): NotaIngreso[] => {
  const clave = lsKey(STORAGE_KEY_NOTAS_INGRESO, empresaId);
  const raw = localStorage.getItem(clave);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (causa) {
    throw new Error(
      `Notas de Ingreso: el contenido almacenado en "${clave}" no es JSON válido (${causa instanceof Error ? causa.message : 'error desconocido'}).`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Notas de Ingreso: el contenido almacenado en "${clave}" no es un arreglo — no se puede interpretar como colección.`);
  }
  return parsed as NotaIngreso[];
};

/** Persiste la colección completa de la empresa indicada. Nunca silencia un error de escritura: siempre lo propaga como `Error` con mensaje de dominio, incluida cuota excedida. */
export const guardarNotasIngreso = (notas: NotaIngreso[], empresaId: string): void => {
  const clave = lsKey(STORAGE_KEY_NOTAS_INGRESO, empresaId);
  try {
    localStorage.setItem(clave, JSON.stringify(notas));
  } catch (causa) {
    throw new Error(mensajeErrorEscrituraNI(causa));
  }
  window.dispatchEvent(new Event(NOTAS_INGRESO_CHANGED_EVENT));
};

export const agregarOActualizarNI = (nota: NotaIngreso, empresaId: string): void => {
  const notas = cargarNotasIngreso(empresaId);
  const idx = notas.findIndex(n => n.id === nota.id);
  if (idx >= 0) {
    notas[idx] = nota;
  } else {
    notas.unshift(nota);
  }
  guardarNotasIngreso(notas, empresaId);
};
