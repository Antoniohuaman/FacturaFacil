import { useEffect, useState, useCallback } from 'react';
import type { IndicadoresData, IndicadoresFilters } from '../models/indicadores';
import { fetchIndicadoresFromApi, fetchIndicadoresFromFixtures } from '../api/indicadores';

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
    setLoading(true);
    setError(null);
    try {
      const response = await fetchIndicadoresFromApi(filters);
      setData(response);
      return;
    } catch (apiError) {
      console.warn('[indicadores-negocio] fallo al consumir la API real, usando fixtures.', apiError);
      try {
        const fallbackResponse = await fetchIndicadoresFromFixtures(filters);
        setData(fallbackResponse);
        return;
      } catch (fallbackError) {
        setError(fallbackError instanceof Error ? fallbackError.message : 'Error desconocido');
      }
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
