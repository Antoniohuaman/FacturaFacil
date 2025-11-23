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
  const [day, month] = value.split('/');
  if (!day || !month) return value;
  return `${day} ${monthShortcuts[month] ?? month}`;
};

export const formatRangeLabel = (range: DateRange) => {
  const start = periodFormatter.format(range.startDate);
  const end = periodFormatter.format(range.endDate);
  return `${start} – ${end}`;
};
