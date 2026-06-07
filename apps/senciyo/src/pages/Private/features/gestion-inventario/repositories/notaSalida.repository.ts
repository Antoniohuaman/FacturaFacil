// src/features/gestion-inventario/repositories/notaSalida.repository.ts

import { tryLsKey } from '@/shared/tenant';
import { STORAGE_KEY_NOTAS_SALIDA, NOTAS_SALIDA_CHANGED_EVENT } from '../models/notaSalida.constants';
import type { NotaSalida } from '../models/notaSalida.types';

export { NOTAS_SALIDA_CHANGED_EVENT };

const obtenerClave = (): string =>
  tryLsKey(STORAGE_KEY_NOTAS_SALIDA) ?? STORAGE_KEY_NOTAS_SALIDA;

export const cargarNotasSalida = (): NotaSalida[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as NotaSalida[];
  } catch {
    return [];
  }
};

export const guardarNotasSalida = (notas: NotaSalida[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(notas));
    window.dispatchEvent(new Event(NOTAS_SALIDA_CHANGED_EVENT));
  } catch {
    // ignorar cuota
  }
};

export const agregarOActualizarNS = (nota: NotaSalida): void => {
  const notas = cargarNotasSalida();
  const idx = notas.findIndex(n => n.id === nota.id);
  if (idx >= 0) {
    notas[idx] = nota;
  } else {
    notas.unshift(nota);
  }
  guardarNotasSalida(notas);
};

export const eliminarNSDelStorage = (notaId: string): void => {
  const notas = cargarNotasSalida();
  guardarNotasSalida(notas.filter(n => n.id !== notaId));
};
