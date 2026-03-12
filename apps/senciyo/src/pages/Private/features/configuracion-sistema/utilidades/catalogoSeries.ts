import { SUNAT_DOCUMENT_TYPES, type DocumentType, type Series } from '../modelos/Series';

export type SeriesVoucherType =
  | 'INVOICE'
  | 'RECEIPT'
  | 'CREDIT_NOTE'
  | 'SALE_NOTE'
  | 'QUOTE'
  | 'COLLECTION';

export const SERIES_VOUCHER_TYPE_TO_DOCUMENT_CODE: Record<SeriesVoucherType, string> = {
  INVOICE: '01',
  RECEIPT: '03',
  CREDIT_NOTE: '07',
  SALE_NOTE: 'NV',
  QUOTE: 'COT',
  COLLECTION: 'RC',
};

export const CREDIT_NOTE_DEFAULT_SERIES_CODES = ['FNC1', 'BNC1'] as const;

export const normalizeSeriesCode = (seriesCode: string): string => seriesCode.trim().toUpperCase();

export const getDocumentTypeForVoucherType = (
  voucherType: SeriesVoucherType,
): DocumentType => {
  const code = SERIES_VOUCHER_TYPE_TO_DOCUMENT_CODE[voucherType];
  const documentType = SUNAT_DOCUMENT_TYPES.find((dt) => dt.code === code);

  if (!documentType) {
    throw new Error(
      `[seriesCatalog] DocumentType not found for voucherType=${voucherType} (code=${code})`,
    );
  }

  return documentType;
};

export const isCreditNoteSeriesCode = (seriesCode: string): boolean => {
  const normalized = normalizeSeriesCode(seriesCode);
  return /^[FB][A-Z0-9]{3}$/.test(normalized);
};

export const isSuggestedCreditNoteSeriesCode = (seriesCode: string): boolean => {
  const normalized = normalizeSeriesCode(seriesCode);
  return /^[FB]NC[A-Z0-9]$/.test(normalized);
};

export const getVoucherTypeFromSeries = (
  series: Pick<Series, 'series' | 'documentType'>,
): SeriesVoucherType => {
  const normalizedSeries = normalizeSeriesCode(series.series);

  if (series.documentType.code === '07' || series.documentType.category === 'CREDIT_NOTE') {
    return 'CREDIT_NOTE';
  }

  if (series.documentType.code === '03' || series.documentType.category === 'RECEIPT') {
    return 'RECEIPT';
  }

  if (series.documentType.code === '01' || series.documentType.category === 'INVOICE') {
    return 'INVOICE';
  }

  if (series.documentType.code === 'RC' || series.documentType.category === 'COLLECTION') {
    return 'COLLECTION';
  }

  if (series.documentType.code === 'NV' || series.documentType.name.includes('Nota de Venta')) {
    return 'SALE_NOTE';
  }

  if (series.documentType.code === 'COT' || series.documentType.name.includes('Cotización')) {
    return 'QUOTE';
  }

  return normalizedSeries.startsWith('B') ? 'RECEIPT' : 'INVOICE';
};

const pickPreferredRecoveryCandidate = (candidates: Series[], preferredCode: string): Series | undefined => {
  return candidates.find((series) => normalizeSeriesCode(series.series) === preferredCode) ?? candidates[0];
};

export const repairMisclassifiedDefaultInvoiceAndReceiptSeries = (seriesList: Series[]): Series[] => {
  const invoiceDocumentType = getDocumentTypeForVoucherType('INVOICE');
  const receiptDocumentType = getDocumentTypeForVoucherType('RECEIPT');
  const replacements = new Map<string, DocumentType>();

  const groupedByEstablecimiento = new Map<string, Series[]>();
  seriesList.forEach((series) => {
    const current = groupedByEstablecimiento.get(series.EstablecimientoId) ?? [];
    current.push(series);
    groupedByEstablecimiento.set(series.EstablecimientoId, current);
  });

  groupedByEstablecimiento.forEach((seriesGroup) => {
    const hasInvoiceSeries = seriesGroup.some((series) => series.documentType.code === '01');
    const hasReceiptSeries = seriesGroup.some((series) => series.documentType.code === '03');
    const hasSuggestedCreditNoteSeries = seriesGroup.some(
      (series) => series.documentType.code === '07' && isSuggestedCreditNoteSeriesCode(series.series),
    );

    if (!hasSuggestedCreditNoteSeries) {
      return;
    }

    if (!hasInvoiceSeries) {
      const invoiceCandidate = pickPreferredRecoveryCandidate(
        seriesGroup.filter(
          (series) =>
            series.documentType.code === '07' &&
            series.isDefault &&
            normalizeSeriesCode(series.series).startsWith('F') &&
            !isSuggestedCreditNoteSeriesCode(series.series),
        ),
        'FE01',
      );

      if (invoiceCandidate) {
        replacements.set(invoiceCandidate.id, invoiceDocumentType);
      }
    }

    if (!hasReceiptSeries) {
      const receiptCandidate = pickPreferredRecoveryCandidate(
        seriesGroup.filter(
          (series) =>
            series.documentType.code === '07' &&
            series.isDefault &&
            normalizeSeriesCode(series.series).startsWith('B') &&
            !isSuggestedCreditNoteSeriesCode(series.series),
        ),
        'BE01',
      );

      if (receiptCandidate) {
        replacements.set(receiptCandidate.id, receiptDocumentType);
      }
    }
  });

  if (!replacements.size) {
    return seriesList;
  }

  return seriesList.map((series) => {
    const replacementDocumentType = replacements.get(series.id);
    if (!replacementDocumentType) {
      return series;
    }

    return {
      ...series,
      documentType: replacementDocumentType,
      updatedAt: new Date(),
    };
  });
};

export const validateSeriesCodeForVoucherType = (
  voucherType: SeriesVoucherType,
  seriesCode: string,
): boolean => {
  const normalized = normalizeSeriesCode(seriesCode);

  if (normalized.length !== 4) {
    return false;
  }

  switch (voucherType) {
    case 'INVOICE':
      return /^F[A-Z0-9]{3}$/.test(normalized);
    case 'RECEIPT':
      return /^B[A-Z0-9]{3}$/.test(normalized);
    case 'CREDIT_NOTE':
      return /^[FB][A-Z0-9]{3}$/.test(normalized);
    case 'COLLECTION':
      return /^C[A-Z0-9]{3}$/.test(normalized);
    case 'SALE_NOTE':
    case 'QUOTE':
      return /^[A-Z0-9]{4}$/.test(normalized);
    default:
      return false;
  }
};

export const validateSeriesCodeForDocumentType = (
  documentTypeCode: string,
  seriesCode: string,
): boolean => {
  if (documentTypeCode === '08') {
    return /^[FB][A-Z0-9]{3}$/.test(normalizeSeriesCode(seriesCode));
  }

  const voucherTypeByCode = Object.entries(SERIES_VOUCHER_TYPE_TO_DOCUMENT_CODE).find(
    ([, code]) => code === documentTypeCode,
  )?.[0] as SeriesVoucherType | undefined;

  if (!voucherTypeByCode) {
    return false;
  }

  return validateSeriesCodeForVoucherType(voucherTypeByCode, seriesCode);
};

const generatePrefixedSeriesSuggestion = (
  prefix: string,
  existingSeries: string[],
  firstSuggestion?: string,
): string => {
  const normalizedSeries = existingSeries.map(normalizeSeriesCode);

  if (firstSuggestion && !normalizedSeries.includes(firstSuggestion)) {
    return firstSuggestion;
  }

  const nextNumber =
    normalizedSeries
      .filter((currentSeries) => new RegExp(`^${prefix}\\d{3}$`).test(currentSeries))
      .map((currentSeries) => parseInt(currentSeries.slice(1), 10))
      .reduce((max, current) => Math.max(max, current), 0) + 1;

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
};

const generateCreditNoteSeriesSuggestion = (existingSeries: string[]): string => {
  const normalizedSeries = existingSeries.map(normalizeSeriesCode);
  const suffixes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'A', 'B', 'C', 'D', 'E', 'F'];

  for (const suffix of suffixes) {
    for (const prefix of ['FNC', 'BNC']) {
      const candidate = `${prefix}${suffix}`;
      if (!normalizedSeries.includes(candidate)) {
        return candidate;
      }
    }
  }

  return CREDIT_NOTE_DEFAULT_SERIES_CODES[0];
};

export const generateSeriesSuggestion = (
  voucherType: SeriesVoucherType,
  existingSeries: string[] = [],
): string => {
  switch (voucherType) {
    case 'INVOICE':
      return generatePrefixedSeriesSuggestion('F', existingSeries, 'FE01');
    case 'RECEIPT':
      return generatePrefixedSeriesSuggestion('B', existingSeries, 'BE01');
    case 'CREDIT_NOTE':
      return generateCreditNoteSeriesSuggestion(existingSeries);
    case 'COLLECTION':
      return generatePrefixedSeriesSuggestion('C', existingSeries, 'C001');
    case 'SALE_NOTE':
    case 'QUOTE':
      return '';
    default:
      return '';
  }
};