// shared/series/guiaRemisionSeries.ts
//
// Mismo patrón que `expenseSeries.ts`/`collectionSeries.ts` (el único mecanismo genuinamente
// central de consumo de correlativo de Series ya existente en el codebase, usado por
// Gastos/Cobranzas vía `useSeriesCommands().incrementSeriesCorrelative`) aplicado a Guías de
// Remisión (GRE-P1-002). El correlativo vive ÚNICAMENTE en `Series.correlativeNumber` — nunca se
// escanean guías existentes para calcularlo (ese era el defecto que desincronizaba GRE de
// Configuración → Series).

import type { Series } from '../../pages/Private/features/configuracion-sistema/modelos/Series';

export const formatGuiaRemisionCorrelative = (series: Series, correlative: number): string => {
  const digits = series.configuration.minimumDigits || series.documentType.seriesConfiguration.correlativeLength || 8;
  return String(correlative).padStart(digits, '0');
};

export const getNextGuiaRemisionDocument = (series: Series) => {
  const correlative = series.correlativeNumber + 1;
  const correlativeStr = formatGuiaRemisionCorrelative(series, correlative);

  return {
    seriesId: series.id,
    seriesCode: series.series,
    correlative,
    fullNumber: `${series.series}-${correlativeStr}`,
    correlativeStr,
  };
};
