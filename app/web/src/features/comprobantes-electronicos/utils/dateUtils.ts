/**
 * Utilidades para manejo de fechas en comprobantes
 * Centraliza toda la lógica de parseo y formateo de fechas
 */

import {
  BUSINESS_TIMEZONE,
  formatBusinessDateShort,
  getBusinessTodayISODate
} from '../../../shared/time/businessTime';

/**
 * Mapeo de meses en español (formato corto con punto)
 */
const SPANISH_MONTHS_SHORT: Record<string, number> = {
  'ene.': 0, 'ene': 0,
  'feb.': 1, 'feb': 1,
  'mar.': 2, 'mar': 2,
  'abr.': 3, 'abr': 3,
  'may.': 4, 'may': 4,
  'jun.': 5, 'jun': 5,
  'jul.': 6, 'jul': 6,
  'ago.': 7, 'ago': 7,
  'set.': 8, 'set': 8, 'sep.': 8, 'sep': 8,
  'oct.': 9, 'oct': 9,
  'nov.': 10, 'nov': 10,
  'dic.': 11, 'dic': 11
};

/**
 * Mapeo de meses en español (formato completo)
 * Reservado para uso futuro en funciones de formateo avanzado
 */
// const SPANISH_MONTHS_FULL: string[] = [
//   'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
//   'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'
// ];

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const BUSINESS_TZ_OFFSET = '-05:00';

const businessIsoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const businessShortFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: '2-digit'
});

const businessLongFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const pad = (value: number) => value.toString().padStart(2, '0');

const formatIsoFromDate = (date: Date): string => {
  const parts = businessIsoFormatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '0';
  return `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
};

const toBusinessDate = (
  businessDateIso: string,
  boundary: 'start' | 'end' | 'mid' = 'mid'
): Date | null => {
  if (!ISO_DATE_REGEX.test(businessDateIso)) {
    return null;
  }
  const suffix = boundary === 'end'
    ? 'T23:59:59.999'
    : boundary === 'start'
    ? 'T00:00:00.000'
    : 'T12:00:00.000';
  return new Date(`${businessDateIso}${suffix}${BUSINESS_TZ_OFFSET}`);
};

const assertBusinessDate = (
  businessDateIso: string,
  boundary: 'start' | 'end' | 'mid' = 'mid'
): Date => {
  const parsed = toBusinessDate(businessDateIso, boundary);
  if (!parsed) {
    throw new Error(`Fecha de negocio inválida: ${businessDateIso}`);
  }
  return parsed;
};

const shiftBusinessDate = (businessDateIso: string, offsetDays: number): string => {
  const baseDate = assertBusinessDate(businessDateIso, 'start');
  baseDate.setUTCDate(baseDate.getUTCDate() + offsetDays);
  return formatIsoFromDate(baseDate);
};

const normalizeDateInput = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (ISO_DATE_REGEX.test(value)) {
    return assertBusinessDate(value);
  }
  return new Date(value);
};

/**
 * Parsea una fecha en formato español "20 ago. 2025 19:17"
 * @param dateStr - String con la fecha en formato español
 * @returns Date object o null si no se puede parsear
 */
export function parseDateSpanish(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  try {
    const parts = dateStr.trim().split(' ').filter(Boolean);
    if (parts.length < 3) return null;

    const day = parseInt(parts[0], 10);
    const monthKey = parts[1].replace('.', '').toLowerCase();
    const monthIndex = SPANISH_MONTHS_SHORT[monthKey];
    const year = parseInt(parts[2], 10);

    if (Number.isNaN(day) || Number.isNaN(year) || monthIndex === undefined) {
      return null;
    }

    let hours = 0;
    let minutes = 0;
    if (parts[3]) {
      const timePart = parts[3];
      const [hoursRaw, minutesRaw] = timePart.split(':');
      hours = parseInt(hoursRaw || '0', 10) || 0;
      minutes = parseInt(minutesRaw || '0', 10) || 0;
    }

    const iso = `${year}-${pad(monthIndex + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00${BUSINESS_TZ_OFFSET}`;
    return new Date(iso);
  } catch (e) {
    console.error('Error parsing spanish date:', dateStr, e);
    return null;
  }
}

/**
 * Formatea una fecha a formato corto español "20 ago. 2025"
 * @param date - Date object o string ISO
 * @returns String con formato español corto
 */
export function formatDateShortSpanish(date: Date | string): string {
  if (!date) return '';

  try {
    if (typeof date === 'string' && ISO_DATE_REGEX.test(date)) {
      return formatBusinessDateShort(date);
    }

    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';

    return businessShortFormatter
      .format(d)
      .replace(',', '')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (e) {
    console.error('Error formatting date:', date, e);
    return '';
  }
}

/**
 * Formatea una fecha a formato largo español con hora "20 ago. 2025 14:30"
 * @param date - Date object o string ISO
 * @returns String con formato español largo
 */
export function formatDateLongSpanish(date: Date | string): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(d.getTime())) return '';

    return businessLongFormatter.format(d);
  } catch (e) {
    console.error('Error formatting date:', date, e);
    return '';
  }
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param date1 - Primera fecha
 * @param date2 - Segunda fecha (por defecto: hoy)
 * @returns Número de días de diferencia (positivo si date1 > date2)
 */
export function daysBetween(date1: Date | string, date2: Date | string = new Date()): number {
  const d1 = normalizeDateInput(date1);
  const d2 = normalizeDateInput(date2);

  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;

  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calcula cuántos días han pasado desde una fecha
 * @param date - Fecha de referencia
 * @returns Número de días transcurridos (positivo si es pasado)
 */
export function daysSince(date: Date | string): number {
  return -daysBetween(date, new Date());
}

/**
 * Obtiene la fecha de hoy en formato ISO "YYYY-MM-DD"
 * @returns String con fecha de hoy
 */
export function getTodayISO(): string {
  return getBusinessTodayISODate();
}

/**
 * Filtra un array por rango de fechas
 * @param items - Array de objetos con propiedad de fecha
 * @param dateGetter - Función que extrae la fecha del objeto
 * @param fromDate - Fecha desde (formato ISO "YYYY-MM-DD")
 * @param toDate - Fecha hasta (formato ISO "YYYY-MM-DD")
 * @returns Array filtrado
 */
export function filterByDateRange<T>(
  items: T[],
  dateGetter: (item: T) => string | undefined,
  fromDate?: string,
  toDate?: string
): T[] {
  if (!fromDate && !toDate) return items;

  const from = fromDate ? toBusinessDate(fromDate, 'start') : null;
  const to = toDate ? toBusinessDate(toDate, 'end') : null;

  return items.filter(item => {
    const dateStr = dateGetter(item);
    if (!dateStr) return true; // Incluir items sin fecha

    const itemDate = parseDateSpanish(dateStr);
    if (!itemDate) return true; // Incluir items con fecha inválida

    if (from && itemDate < from) return false;
    if (to && itemDate > to) return false;

    return true;
  });
}

/**
 * Presets de rangos de fechas comunes
 */
export const DATE_PRESETS = {
  today: () => {
    const today = getBusinessTodayISODate();
    return { from: today, to: today };
  },
  yesterday: () => {
    const today = getBusinessTodayISODate();
    const dateStr = shiftBusinessDate(today, -1);
    return { from: dateStr, to: dateStr };
  },
  last7days: () => {
    const today = getBusinessTodayISODate();
    const last7 = shiftBusinessDate(today, -7);
    return {
      from: last7,
      to: today
    };
  },
  last30days: () => {
    const today = getBusinessTodayISODate();
    const last30 = shiftBusinessDate(today, -30);
    return {
      from: last30,
      to: today
    };
  },
  thisMonth: () => {
    const todayIso = getBusinessTodayISODate();
    const todayStart = assertBusinessDate(todayIso, 'start');
    const firstDay = new Date(todayStart);
    firstDay.setUTCDate(1);
    return {
      from: formatIsoFromDate(firstDay),
      to: todayIso
    };
  },
  lastMonth: () => {
    const todayIso = getBusinessTodayISODate();
    const currentMonthStart = assertBusinessDate(todayIso, 'start');
    currentMonthStart.setUTCDate(1);

    const firstDay = new Date(currentMonthStart);
    firstDay.setUTCMonth(firstDay.getUTCMonth() - 1);

    const lastDay = new Date(currentMonthStart);
    lastDay.setUTCDate(0);
    return {
      from: formatIsoFromDate(firstDay),
      to: formatIsoFromDate(lastDay)
    };
  }
} as const;
