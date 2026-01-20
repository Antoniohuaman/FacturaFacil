import { useCallback } from 'react';
import type { DateRange } from '../models/dateRange';
import { useIndicadoresFiltersStore } from '../store/indicadoresFiltersStore';

export const useIndicadoresFilters = () => {
  const dateRange = useIndicadoresFiltersStore((state) => state.dateRange);
  const EstablecimientoId = useIndicadoresFiltersStore((state) => state.EstablecimientoId);
  const setDateRange = useIndicadoresFiltersStore((state) => state.setDateRange);
  const setEstablecimientoId = useIndicadoresFiltersStore((state) => state.setEstablecimientoId);
  const reset = useIndicadoresFiltersStore((state) => state.reset);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, [setDateRange]);

  const handleEstablecimientoChange = useCallback((id: string) => {
    setEstablecimientoId(id);
  }, [setEstablecimientoId]);

  return {
    dateRange,
    EstablecimientoId,
    setDateRange: handleDateRangeChange,
    setEstablecimientoId: handleEstablecimientoChange,
    resetFilters: reset
  };
};
