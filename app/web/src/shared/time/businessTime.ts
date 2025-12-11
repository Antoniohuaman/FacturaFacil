/**
 * Utilidades centrales para manejar la hora de negocio (America/Lima).
 * Todo el frontend debe usar estas funciones como única fuente de verdad
 * cuando necesite fechas/horas de negocio, evitando new Date() directos.
 */

export const BUSINESS_TIMEZONE = 'America/Lima';

interface BusinessDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const businessDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const businessDateFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const businessDateTimeTicketFormatter = new Intl.DateTimeFormat('es-PE', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

function extractBusinessParts(date: Date): BusinessDateParts {
  const parts = businessDateTimeFormatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  return {
    year: Number(lookup('year')),
    month: Number(lookup('month')),
    day: Number(lookup('day')),
    hour: Number(lookup('hour')),
    minute: Number(lookup('minute')),
    second: Number(lookup('second')),
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Devuelve un Date que representa el instante actual.
 * La interpretación como hora de negocio (America/Lima)
 * se hace siempre vía extractBusinessParts / Intl con BUSINESS_TIMEZONE.
 */
export function getBusinessNow(): Date {
  return new Date();
}

/**
 * Devuelve la fecha de hoy de negocio en formato YYYY-MM-DD
 * (interpretada en la zona horaria America/Lima).
 */
export function getBusinessTodayISODate(): string {
  const { year, month, day } = extractBusinessParts(new Date());
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * A partir de una fecha de negocio (YYYY-MM-DD), devuelve el rango UTC
 * del día completo en la hora America/Lima.
 */
export function getBusinessDayRangeUtc(
  businessDateIso: string,
): { startUtc: string; endUtc: string } {
  const match = ISO_DATE_REGEX.exec(businessDateIso);
  if (!match) {
    throw new Error(`Fecha de negocio inválida: ${businessDateIso}`);
  }

  const [, yearStr, monthStr, dayStr] = match;
  const isoPrefix = `${yearStr}-${monthStr}-${dayStr}`;

  // Perú está siempre en -05:00 (sin horario de verano)
  const startUtc = new Date(`${isoPrefix}T00:00:00-05:00`).toISOString();
  const endUtc = new Date(`${isoPrefix}T23:59:59.999-05:00`).toISOString();
  return { startUtc, endUtc };
}

/**
 * Formatea una fecha de negocio (YYYY-MM-DD) al estilo "11 dic. 2025".
 */
export function formatBusinessDateShort(businessDateIso: string): string {
  if (!ISO_DATE_REGEX.test(businessDateIso)) {
    return businessDateIso;
  }

  const date = new Date(`${businessDateIso}T00:00:00-05:00`);

  return businessDateFormatter
    .format(date)
    .replace(',', '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formatea un instante (Date o string ISO) en hora de negocio
 * para tickets u otras vistas, ej: "11/12/2025 14:30".
 */
export function formatBusinessDateTimeForTicket(
  input: string | Date,
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return businessDateTimeTicketFormatter.format(date);
}
