// src/features/gestion-inventario/repositories/notaIngreso.repository.ts

import { tryLsKey } from '@/shared/tenant';
import { STORAGE_KEY_NOTAS_INGRESO } from '../models/notaIngreso.constants';
import type { NotaIngreso } from '../models/notaIngreso.types';

export const NOTAS_INGRESO_CHANGED_EVENT = 'facturafacil:notas-ingreso-changed';

const obtenerClave = (): string =>
  tryLsKey(STORAGE_KEY_NOTAS_INGRESO) ?? STORAGE_KEY_NOTAS_INGRESO;

export const cargarNotasIngreso = (): NotaIngreso[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as NotaIngreso[];
  } catch {
    return [];
  }
};

export const guardarNotasIngreso = (notas: NotaIngreso[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(notas));
    window.dispatchEvent(new Event(NOTAS_INGRESO_CHANGED_EVENT));
  } catch {
    // ignorar cuota
  }
};

export const agregarOActualizarNI = (nota: NotaIngreso): void => {
  const notas = cargarNotasIngreso();
  const idx = notas.findIndex(n => n.id === nota.id);
  if (idx >= 0) {
    notas[idx] = nota;
  } else {
    notas.unshift(nota);
  }
  guardarNotasIngreso(notas);
};
