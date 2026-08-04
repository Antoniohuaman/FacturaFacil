// shared/series/expenseSeries.ts
//
// Mismo patrón que `collectionSeries.ts` (el único mecanismo genuinamente
// central de consumo de correlativo de Series ya existente en el
// codebase, usado por Cobranzas vía `useSeriesCommands().incrementSeriesCorrelative`)
// aplicado al tipo documental "Gasto" (código central "GTO"). Nunca escanea
// gastos existentes para calcular el próximo número: el correlativo vive
// ÚNICAMENTE en `Series.correlativeNumber`, reservado aquí como previsualización
// pura y confirmado recién cuando `ContextoGastos.tsx` efectivamente registra
// el gasto (mismo momento en que Cobranzas confirma su propio documento).

import type { Series } from '../../pages/Private/features/configuracion-sistema/modelos/Series';

export const EXPENSE_DOCUMENT_CODE = 'GTO';

export const isExpenseSeries = (series: Series): boolean => {
  return series.documentType.code === EXPENSE_DOCUMENT_CODE;
};

/** Series de Gasto activas — filtradas opcionalmente por establecimiento operativo (nunca por el campo "Establecimiento" de asignación del propio gasto, que es un dato distinto). */
export const filterExpenseSeries = (
  seriesList: Series[],
  EstablecimientoId?: string | null,
): Series[] => {
  return seriesList.filter((series) => {
    if (!isExpenseSeries(series)) {
      return false;
    }

    const matchesEstablecimiento =
      !EstablecimientoId || series.EstablecimientoId === EstablecimientoId;

    return (
      matchesEstablecimiento &&
      series.isActive &&
      series.status === 'ACTIVE'
    );
  });
};

export const formatExpenseCorrelative = (series: Series, correlative: number): string => {
  const digits = series.configuration.minimumDigits || series.documentType.seriesConfiguration.correlativeLength || 8;
  return String(correlative).padStart(digits, '0');
};

export const getNextExpenseDocument = (series: Series) => {
  const correlative = series.correlativeNumber + 1;
  const correlativeStr = formatExpenseCorrelative(series, correlative);

  return {
    seriesId: series.id,
    seriesCode: series.series,
    correlative,
    fullNumber: `${series.series}-${correlativeStr}`,
  };
};
