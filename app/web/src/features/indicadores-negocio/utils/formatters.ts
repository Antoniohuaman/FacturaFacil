import type { DateRange } from '../models/dateRange';

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const periodFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});

const shortDateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short'
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
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return shortDateFormatter.format(parsed);
    }
  }

  const [day, month] = value.split('/');
  if (!day || !month) return value;
  return `${day} ${monthShortcuts[month] ?? month}`;
};

export const formatRangeLabel = (range: DateRange) => {
  const start = periodFormatter.format(range.startDate);
  const end = periodFormatter.format(range.endDate);
  return `${start} – ${end}`;
};

export const formatPercentage = (value: number, digits = 1) => {
  const formatted = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
};
