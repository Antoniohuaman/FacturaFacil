import type { StockAlertType } from '../models';

export interface StockAlertParams {
  disponible: number;
  stockMinimo?: number | null;
  stockMaximo?: number | null;
}

export interface StockAlertEvaluation {
  type: StockAlertType;
  isCritical: boolean;
  missing?: number;
  excess?: number;
}

const sanitizeNumber = (value?: number | null): number | undefined => {
  if (typeof value !== 'number') {
    return undefined;
  }
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return undefined;
  }
  return value;
};

const sanitizeAvailable = (value: number): number => {
  const normalized = sanitizeNumber(value) ?? 0;
  return normalized < 0 ? 0 : normalized;
};

const sanitizeThreshold = (value?: number | null): number | undefined => {
  const normalized = sanitizeNumber(value);
  if (normalized === undefined) {
    return undefined;
  }
  const nonNegative = normalized < 0 ? 0 : normalized;
  return nonNegative > 0 ? nonNegative : undefined;
};

export const getStockAlertType = ({
  disponible,
  stockMinimo,
  stockMaximo
}: StockAlertParams): StockAlertType => {
  const available = sanitizeAvailable(disponible);
  const min = sanitizeThreshold(stockMinimo);
  const max = sanitizeThreshold(stockMaximo);

  if (typeof max === 'number' && available > max) {
    return 'OVER';
  }

  if (typeof min === 'number' && available <= min) {
    return 'LOW';
  }

  return 'OK';
};

export const evaluateStockAlert = (params: StockAlertParams): StockAlertEvaluation => {
  const available = sanitizeAvailable(params.disponible);
  const min = sanitizeThreshold(params.stockMinimo);
  const max = sanitizeThreshold(params.stockMaximo);

  const type = getStockAlertType({
    disponible: available,
    stockMinimo: min,
    stockMaximo: max
  });

  if (type === 'LOW') {
    const missing = typeof min === 'number' ? Math.max(0, min - available) : undefined;
    const isCritical = min !== undefined ? available <= min * 0.5 : available === 0;
    return {
      type,
      isCritical,
      missing
    };
  }

  if (type === 'OVER') {
    const excess = typeof max === 'number' ? Math.max(0, available - max) : undefined;
    return {
      type,
      isCritical: false,
      excess
    };
  }

  return {
    type,
    isCritical: false
  };
};
