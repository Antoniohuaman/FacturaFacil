import { SUNAT_DOCUMENT_TYPES, type DocumentType, type Series } from "../models/Series";

export type SeriesVoucherType =
  | "INVOICE"
  | "RECEIPT"
  | "SALE_NOTE"
  | "QUOTE"
  | "COLLECTION";

const VOUCHER_TYPES_FOR_SEED: SeriesVoucherType[] = [
  "INVOICE",
  "RECEIPT",
  "SALE_NOTE",
  "QUOTE",
  "COLLECTION",
];

const VOUCHER_TYPE_TO_CODE: Record<SeriesVoucherType, string> = {
  INVOICE: "01",
  RECEIPT: "03",
  SALE_NOTE: "NV",
  QUOTE: "COT",
  COLLECTION: "RC",
};

export const getDocumentTypeForVoucherType = (
  voucherType: SeriesVoucherType,
): DocumentType => {
  const code = VOUCHER_TYPE_TO_CODE[voucherType];
  const documentType = SUNAT_DOCUMENT_TYPES.find((dt) => dt.code === code);

  if (!documentType) {
    throw new Error(
      `[seriesDefaults] DocumentType not found for voucherType=${voucherType} (code=${code})`,
    );
  }

  return documentType;
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
  establishmentId: string;
  environmentType: "TESTING" | "PRODUCTION";
  existingSeries: Series[];
}

export const buildMissingDefaultSeries = ({
  establishmentId,
  environmentType,
  existingSeries,
}: BuildMissingDefaultSeriesParams): Series[] => {
  const now = new Date();

  const seeds: Series[] = [];

  VOUCHER_TYPES_FOR_SEED.forEach((voucherType) => {
    const documentType = getDocumentTypeForVoucherType(voucherType);

    const alreadyHasSeriesForType = existingSeries.some(
      (series) =>
        series.establishmentId === establishmentId &&
        series.documentType.code === documentType.code,
    );

    if (alreadyHasSeriesForType) return;

    const seriesCode = generateInitialSeriesCode(documentType);

    const minimumDigits = documentType.seriesConfiguration.correlativeLength || 8;

    const isElectronic = documentType.properties.isElectronic;

    // En tu modelo es obligatorio siempre -> mantenemos el mismo environment del workspace
    const maxDaysToReport = isElectronic
      ? documentType.code === "01"
        ? 1
        : 7
      : 0;

    const allowZeroAmount = !documentType.properties.affectsTaxes;
    const requireCustomer = documentType.properties.requiresCustomerName;

    // Más robusto para futuro (si mañana agregas FE02/BE02, etc.)
    const id = `series-${documentType.code.toLowerCase()}-${seriesCode.toLowerCase()}-${establishmentId}`;

    const seed: Series = {
      id,
      establishmentId,
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
      status: "ACTIVE",
      isDefault: true,
      statistics: {
        documentsIssued: 0,
        averageDocumentsPerDay: 0,
      },
      validation: {
        allowZeroAmount,
        requireCustomer,
      },
      notes: undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      isActive: true,
    };

    seeds.push(seed);
  });

  return seeds;
};
