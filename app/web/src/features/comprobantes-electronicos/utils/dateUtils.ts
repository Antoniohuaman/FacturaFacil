/**
 * Utilidades para manejo de fechas en comprobantes
 * Centraliza toda la lógica de parseo y formateo de fechas
 */

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
    const month = SPANISH_MONTHS_SHORT[monthKey];
    const year = parseInt(parts[2], 10);

    if (Number.isNaN(day) || Number.isNaN(year) || month === undefined) {
      return null;
    }

    // Hora opcional (formato HH:mm)
    let hours = 0;
    let minutes = 0;
    if (parts[3]) {
      const timePart = parts[3];
      const [hoursRaw, minutesRaw] = timePart.split(':');
      hours = parseInt(hoursRaw || '0', 10) || 0;
      minutes = parseInt(minutesRaw || '0', 10) || 0;
    }

    return new Date(year, month, day, hours, minutes);
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
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${months[d.getMonth()]}. ${d.getFullYear()}`;
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
    if (isNaN(d.getTime())) return '';

    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${d.getDate()} ${months[d.getMonth()]}. ${d.getFullYear()} ${hours}:${minutes}`;
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
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

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
  return new Date().toISOString().slice(0, 10);
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

  const from = fromDate ? new Date(fromDate + 'T00:00:00') : null;
  const to = toDate ? new Date(toDate + 'T23:59:59.999') : null;

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
    const today = getTodayISO();
    return { from: today, to: today };
  },
  yesterday: () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    return { from: dateStr, to: dateStr };
  },
  last7days: () => {
    const today = new Date();
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    return {
      from: last7.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10)
    };
  },
  last30days: () => {
    const today = new Date();
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    return {
      from: last30.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10)
    };
  },
  thisMonth: () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      from: firstDay.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10)
    };
  },
  lastMonth: () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      from: firstDay.toISOString().slice(0, 10),
      to: lastDay.toISOString().slice(0, 10)
    };
  }
} as const;
