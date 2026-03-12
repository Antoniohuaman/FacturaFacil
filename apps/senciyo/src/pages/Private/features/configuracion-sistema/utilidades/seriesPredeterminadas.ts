import type { DocumentType, Series } from '../modelos/Series';
import {
  CREDIT_NOTE_DEFAULT_SERIES_CODES,
  getDocumentTypeForVoucherType,
  normalizeSeriesCode,
  type SeriesVoucherType,
} from './catalogoSeries';

const VOUCHER_TYPES_FOR_SEED: SeriesVoucherType[] = [
  'INVOICE',
  'RECEIPT',
  'SALE_NOTE',
  'QUOTE',
  'COLLECTION',
];

const buildSeriesSeed = ({
  EstablecimientoId,
  environmentType,
  documentType,
  seriesCode,
  isDefault,
}: {
  EstablecimientoId: string;
  environmentType: 'TESTING' | 'PRODUCTION';
  documentType: DocumentType;
  seriesCode: string;
  isDefault: boolean;
}): Series => {
  const now = new Date();
  const minimumDigits = documentType.seriesConfiguration.correlativeLength || 8;
  const isElectronic = documentType.properties.isElectronic;
  const maxDaysToReport = isElectronic
    ? documentType.code === '01'
      ? 1
      : 7
    : 0;

  return {
    id: `series-${documentType.code.toLowerCase()}-${seriesCode.toLowerCase()}-${EstablecimientoId}`,
    EstablecimientoId,
    documentType,
    series: seriesCode,
    correlativeNumber: 1,
    configuration: {
      minimumDigits,
      startNumber: 1,
      autoIncrement: true,
      allowManualNumber: false,
      requireAuthorization: false,
    },
    sunatConfiguration: {
      isElectronic,
      environmentType,
      certificateRequired: isElectronic,
      mustReportToSunat: isElectronic,
      maxDaysToReport,
    },
    status: 'ACTIVE',
    isDefault,
    statistics: {
      documentsIssued: 0,
      averageDocumentsPerDay: 0,
    },
    validation: {
      allowZeroAmount: !documentType.properties.affectsTaxes,
      requireCustomer: documentType.properties.requiresCustomerName,
    },
    notes: undefined,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    isActive: true,
  };
};

const generateInitialSeriesCode = (documentType: DocumentType): string => {
  // Mantener FE01 / BE01 como estándar normativo actual
  if (documentType.code === "01") return "FE01";
  if (documentType.code === "03") return "BE01";

  const prefix =
    documentType.seriesConfiguration.defaultPrefix ||
    documentType.code[0] ||
    "X";

  // Siempre 4 caracteres: prefijo + dígitos
  const availableDigits = Math.max(1, 4 - prefix.length);
  const numberPart = "1".padStart(availableDigits, "0");
  const raw = `${prefix}${numberPart}`.toUpperCase();

  // Fallback defensivo en caso de prefijos largos
  return raw.slice(0, 4);
};

export interface BuildMissingDefaultSeriesParams {
  EstablecimientoId: string;
  environmentType: 'TESTING' | 'PRODUCTION';
  existingSeries: Series[];
  isMainEstablecimiento?: boolean;
}

export const buildMissingCreditNoteDefaultSeries = ({
  EstablecimientoId,
  environmentType,
  existingSeries,
  isMainEstablecimiento = false,
}: BuildMissingDefaultSeriesParams): Series[] => {
  if (!isMainEstablecimiento) {
    return [];
  }

  const documentType = getDocumentTypeForVoucherType('CREDIT_NOTE');
  const currentCreditNoteSeries = existingSeries.filter(
    (series) =>
      series.EstablecimientoId === EstablecimientoId &&
      series.documentType.code === documentType.code,
  );

  const hasCustomCreditNoteSeries = currentCreditNoteSeries.some(
    (series) => !CREDIT_NOTE_DEFAULT_SERIES_CODES.includes(normalizeSeriesCode(series.series) as (typeof CREDIT_NOTE_DEFAULT_SERIES_CODES)[number]),
  );

  if (hasCustomCreditNoteSeries) {
    return [];
  }

  return CREDIT_NOTE_DEFAULT_SERIES_CODES
    .filter(
      (seriesCode) =>
        !currentCreditNoteSeries.some((series) => normalizeSeriesCode(series.series) === seriesCode),
    )
    .map((seriesCode) =>
      buildSeriesSeed({
        EstablecimientoId,
        environmentType,
        documentType,
        seriesCode,
        isDefault: false,
      }),
    );
};

export const buildMissingDefaultSeries = ({
  EstablecimientoId,
  environmentType,
  existingSeries,
  isMainEstablecimiento = false,
}: BuildMissingDefaultSeriesParams): Series[] => {

  const seeds: Series[] = [];

  VOUCHER_TYPES_FOR_SEED.forEach((voucherType) => {
    const documentType = getDocumentTypeForVoucherType(voucherType);

    const alreadyHasSeriesForType = existingSeries.some(
      (series) =>
        series.EstablecimientoId === EstablecimientoId &&
        series.documentType.code === documentType.code,
    );

    if (alreadyHasSeriesForType) return;

    const seriesCode = generateInitialSeriesCode(documentType);

    seeds.push(
      buildSeriesSeed({
        EstablecimientoId,
        environmentType,
        documentType,
        seriesCode,
        isDefault: true,
      }),
    );
  });

  return [
    ...seeds,
    ...buildMissingCreditNoteDefaultSeries({
      EstablecimientoId,
      environmentType,
      existingSeries,
      isMainEstablecimiento,
    }),
  ];
};
