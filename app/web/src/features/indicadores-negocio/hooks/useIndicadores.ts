import { useEffect, useState, useCallback } from 'react';
import type { IndicadoresData, IndicadoresFilters } from '../models/indicadores';
import { fetchIndicadores } from '../api/indicadores';

interface UseIndicadoresResult {
  data: IndicadoresData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useIndicadores(filters: IndicadoresFilters): UseIndicadoresResult {
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchIndicadores(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refetch: () => {
      void loadData();
    }
  };
}
