import type { DateRange } from '../models/dateRange';
import { BUSINESS_TIMEZONE, assertBusinessDate } from '@/shared/time/businessTime';

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const periodFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: BUSINESS_TIMEZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  timeZone: BUSINESS_TIMEZONE,
});

const monthShortcuts: Record<string, string> = {
  '01': 'Ene',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dic'
};

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const formatShortLabelFromString = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      const parsed = assertBusinessDate(value, 'mid');
      return shortDateFormatter.format(parsed);
    } catch {
      // fallthrough to legacy parsing
    }
  }

  const [day, month] = value.split('/');
  if (!day || !month) return value;
  return `${day} ${monthShortcuts[month] ?? month}`;
};

export const formatRangeLabel = (range: DateRange) => {
  const start = periodFormatter.format(assertBusinessDate(range.startDate, 'mid'));
  const end = periodFormatter.format(assertBusinessDate(range.endDate, 'mid'));
  return `${start} – ${end}`;
};

export const formatPercentage = (value: number, digits = 1) => {
  const formatted = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
};
