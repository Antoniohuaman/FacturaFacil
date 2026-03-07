import { create } from 'zustand';
import type { DateRange } from '../models/dateRange';
import { createCurrentMonthRange } from '../models/dateRange';

interface IndicadoresFiltersState {
  dateRange: DateRange;
  EstablecimientoId: string;
  setDateRange: (range: DateRange) => void;
  setEstablecimientoId: (id: string) => void;
  reset: () => void;
}

export const useIndicadoresFiltersStore = create<IndicadoresFiltersState>((set) => ({
  dateRange: createCurrentMonthRange(),
  EstablecimientoId: 'Todos',
  setDateRange: (range) => set({ dateRange: range }),
  setEstablecimientoId: (id) => set({ EstablecimientoId: id }),
  reset: () => set({ dateRange: createCurrentMonthRange(), EstablecimientoId: 'Todos' })
}));
