import { getConfiguredPaymentMeans, type PaymentMeanOption } from '@/shared/payments/paymentMeans';
import type { CobranzaPaymentLineSnapshot } from '../models/cobranzas.types';

export interface CobranzaPaymentMeansDetail {
  code: string;
  label: string;
  amount: number;
  operationNumber?: string;
}

export interface CobranzaPaymentMeansSummary {
  summaryLabel: string;
  detailLines: CobranzaPaymentMeansDetail[];
  codes: string[];
  hasDetails: boolean;
}

export type CobranzaPaymentMeansSource = {
  paymentLines?: CobranzaPaymentLineSnapshot[];
  medioPago?: string;
};

const DEFAULT_LABEL = 'Sin medio';

const buildCatalogMap = (options?: PaymentMeanOption[]) => {
  const catalog = options ?? getConfiguredPaymentMeans();
  return new Map(catalog.map((option) => [option.code, option]));
};

export const resolveCobranzaPaymentMeans = (
  source: CobranzaPaymentMeansSource,
  options?: PaymentMeanOption[],
): CobranzaPaymentMeansSummary => {
  const paymentLines = source.paymentLines ?? [];
  const catalogMap = buildCatalogMap(options);

  const detailLines: CobranzaPaymentMeansDetail[] = paymentLines
    .map((line) => {
      const code = line.method ?? '';
      const option = code ? catalogMap.get(code) : undefined;
      const label = option?.label || line.methodLabel || line.method || source.medioPago || DEFAULT_LABEL;
      return {
        code,
        label: label || DEFAULT_LABEL,
        amount: Number(line.amount ?? 0),
        operationNumber: line.operationNumber,
      };
    })
    .filter((detail) => detail.label.trim().length > 0);

  const hasDetails = detailLines.length > 0;
  const uniqueCodes = Array.from(new Set(detailLines.map((detail) => detail.code).filter((code) => Boolean(code)))) as string[];
  const uniqueLabels = new Set(detailLines.map((detail) => detail.label));

  const summaryLabel = (() => {
    if (!hasDetails) {
      return source.medioPago?.trim() || DEFAULT_LABEL;
    }

    if (detailLines.length > 1 && uniqueLabels.size > 1) {
      return 'Mixto';
    }

    return detailLines[0].label;
  })();

  return {
    summaryLabel,
    detailLines,
    codes: uniqueCodes,
    hasDetails,
  };
};

export const formatCobranzaPaymentMeansDetail = (
  detailLines: CobranzaPaymentMeansDetail[],
  formatAmount: (amount: number) => string,
): string => {
  if (!detailLines.length) {
    return '';
  }
  return detailLines.map((detail) => `${detail.label}: ${formatAmount(detail.amount)}`).join(' | ');
};

export const matchesPaymentMeansFilter = (
  summary: CobranzaPaymentMeansSummary,
  filterCode: string,
  options?: PaymentMeanOption[],
): boolean => {
  if (!filterCode || filterCode === 'todos') {
    return true;
  }

  if (summary.codes.length > 0) {
    return summary.codes.includes(filterCode);
  }

  const catalogMap = buildCatalogMap(options);
  const option = catalogMap.get(filterCode);
  if (!option) {
    return false;
  }

  return summary.summaryLabel.toLowerCase() === option.label.toLowerCase();
};
