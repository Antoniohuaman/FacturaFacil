import { useCallback } from 'react';
import type { DateRange } from '../models/dateRange';
import { useIndicadoresFiltersStore } from '../store/indicadoresFiltersStore';

export const useIndicadoresFilters = () => {
  const dateRange = useIndicadoresFiltersStore((state) => state.dateRange);
  const establishmentId = useIndicadoresFiltersStore((state) => state.establishmentId);
  const setDateRange = useIndicadoresFiltersStore((state) => state.setDateRange);
  const setEstablishmentId = useIndicadoresFiltersStore((state) => state.setEstablishmentId);
  const reset = useIndicadoresFiltersStore((state) => state.reset);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, [setDateRange]);

  const handleEstablishmentChange = useCallback((id: string) => {
    setEstablishmentId(id);
  }, [setEstablishmentId]);

  return {
    dateRange,
    establishmentId,
    setDateRange: handleDateRangeChange,
    setEstablishmentId: handleEstablishmentChange,
    resetFilters: reset
  };
};
