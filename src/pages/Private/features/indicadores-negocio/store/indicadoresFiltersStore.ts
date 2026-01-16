import { create } from 'zustand';
import type { DateRange } from '../models/dateRange';
import { createCurrentMonthRange } from '../models/dateRange';

interface IndicadoresFiltersState {
  dateRange: DateRange;
  establishmentId: string;
  setDateRange: (range: DateRange) => void;
  setEstablishmentId: (id: string) => void;
  reset: () => void;
}

export const useIndicadoresFiltersStore = create<IndicadoresFiltersState>((set) => ({
  dateRange: createCurrentMonthRange(),
  establishmentId: 'Todos',
  setDateRange: (range) => set({ dateRange: range }),
  setEstablishmentId: (id) => set({ establishmentId: id }),
  reset: () => set({ dateRange: createCurrentMonthRange(), establishmentId: 'Todos' })
}));
