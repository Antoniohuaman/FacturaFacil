import { useEffect, useState, useCallback } from 'react';
import type { IndicadoresData, IndicadoresFilters } from '../models/indicadores';
import { fetchIndicadores } from '../api/indicadores';
import { createEmptyIndicadoresData } from '../models/defaults';

type IndicadoresStatus = 'idle' | 'loading' | 'success' | 'error';
type IndicadoresSource = 'api' | 'dev-local' | 'fallback' | 'none';

interface UseIndicadoresResult {
  data: IndicadoresData;
  status: IndicadoresStatus;
  source: IndicadoresSource;
  error: string | null;
  refetch: () => Promise<void>;
}

const INITIAL_STATE = {
  data: createEmptyIndicadoresData(),
  status: 'idle' as IndicadoresStatus,
  source: 'none' as IndicadoresSource,
  error: null as string | null
};

export function useIndicadores(filters: IndicadoresFilters): UseIndicadoresResult {
  const [state, setState] = useState(INITIAL_STATE);

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const result = await fetchIndicadores(filters);
      setState({ data: result.data, status: 'success', source: result.source, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      setState((prev) => ({ ...prev, status: 'error', error: message, source: 'none' }));
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    data: state.data,
    status: state.status,
    source: state.source,
    error: state.error,
    refetch: () => loadData()
  };
}
