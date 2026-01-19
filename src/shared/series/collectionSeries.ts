import type { Series } from '../../pages/Private/features/configuracion-sistema/modelos/Series';

export const COLLECTION_DOCUMENT_CODE = 'RC';

export const isCollectionSeries = (series: Series): boolean => {
  return (
    series.documentType.code === COLLECTION_DOCUMENT_CODE ||
    series.documentType.category === 'COLLECTION'
  );
};

export const filterCollectionSeries = (
  seriesList: Series[],
  establishmentId?: string
): Series[] => {
  return seriesList.filter((series) => {
    if (!isCollectionSeries(series)) {
      return false;
    }

    const matchesEstablishment =
      !establishmentId || series.establishmentId === establishmentId;

    return (
      matchesEstablishment &&
      series.isActive &&
      series.status === 'ACTIVE'
    );
  });
};

export const formatCollectionCorrelative = (series: Series, correlative: number): string => {
  const digits = series.configuration.minimumDigits || series.documentType.seriesConfiguration.correlativeLength || 8;
  return String(correlative).padStart(digits, '0');
};

export const getNextCollectionDocument = (series: Series) => {
  const correlative = series.correlativeNumber + 1;
  const correlativeStr = formatCollectionCorrelative(series, correlative);

  return {
    seriesId: series.id,
    seriesCode: series.series,
    correlative,
    fullNumber: `${series.series}-${correlativeStr}`,
  };
};
