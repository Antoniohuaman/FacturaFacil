import { create } from 'zustand';

type MotivoTransicion = 'login' | 'registro' | 'logout' | null;

interface TransicionIngresoState {
  activa: boolean;
  motivo: MotivoTransicion;
  inicioMs: number | null;
  iniciar: (motivo: Exclude<MotivoTransicion, null>) => void;
  finalizar: () => void;
}

export const useTransicionIngresoStore = create<TransicionIngresoState>((set) => ({
  activa: false,
  motivo: null,
  inicioMs: null,
  iniciar: (motivo) =>
    set({
      activa: true,
      motivo,
      inicioMs: performance.now(),
    }),
  finalizar: () =>
    set({
      activa: false,
      motivo: null,
      inicioMs: null,
    }),
}));
