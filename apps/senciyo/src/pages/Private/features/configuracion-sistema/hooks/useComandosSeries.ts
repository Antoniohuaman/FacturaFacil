import { useCallback } from 'react';
import type { Series } from '../modelos/Series';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';

export function useSeriesCommands() {
  const { state, dispatch } = useConfigurationContext();

  const incrementSeriesCorrelative = useCallback(
    (seriesId: string, nextCorrelative: number) => {
      const target = state.series.find((series) => series.id === seriesId);
      if (!target) {
        return null;
      }

      const updatedSeries: Series = {
        ...target,
        correlativeNumber: nextCorrelative,
        statistics: {
          ...target.statistics,
          documentsIssued: (target.statistics.documentsIssued ?? 0) + 1,
          lastUsedDate: new Date(),
        },
        updatedAt: new Date(),
      };

      dispatch({ type: 'UPDATE_SERIES', payload: updatedSeries });
      return updatedSeries;
    },
    [state.series, dispatch]
  );

  return {
    incrementSeriesCorrelative,
  };
}
