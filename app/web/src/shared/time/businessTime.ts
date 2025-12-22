/**
 * Utilidades centrales para manejar la hora de negocio (America/Lima).
 * Todo el frontend debe usar estas funciones como única fuente de verdad
 * cuando necesite fechas/horas de negocio, evitando new Date() directos.
 */

export const BUSINESS_TIMEZONE = 'America/Lima';
export const BUSINESS_TIMEZONE_OFFSET = '-05:00';

export interface BusinessDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export type BusinessDayBoundary = 'start' | 'end' | 'mid';

const BUSINESS_LOCAL_DATETIME_REGEX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

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

const businessIsoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
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

export function getBusinessDateParts(date: Date = new Date()): BusinessDateParts {
  return extractBusinessParts(date);
}

export function formatDateToBusinessIso(date: Date): string {
  const parts = businessIsoFormatter.formatToParts(date);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';
  return `${lookup('year')}-${lookup('month')}-${lookup('day')}`;
}

function boundarySuffix(boundary: BusinessDayBoundary): string {
  if (boundary === 'start') {
    return 'T00:00:00.000';
  }
  if (boundary === 'end') {
    return 'T23:59:59.999';
  }
  return 'T12:00:00.000';
}

export function toBusinessDate(
  businessDateIso: string,
  boundary: BusinessDayBoundary = 'mid',
): Date | null {
  if (!ISO_DATE_REGEX.test(businessDateIso)) {
    return null;
  }
  return new Date(`${businessDateIso}${boundarySuffix(boundary)}${BUSINESS_TIMEZONE_OFFSET}`);
}

export function assertBusinessDate(
  businessDateIso: string,
  boundary: BusinessDayBoundary = 'mid',
): Date {
  const parsed = toBusinessDate(businessDateIso, boundary);
  if (!parsed) {
    throw new Error(`Fecha de negocio inválida: ${businessDateIso}`);
  }
  return parsed;
}

export function shiftBusinessDate(businessDateIso: string, offsetDays: number): string {
  const baseDate = assertBusinessDate(businessDateIso, 'start');
  baseDate.setUTCDate(baseDate.getUTCDate() + offsetDays);
  return formatDateToBusinessIso(baseDate);
}

export function shiftBusinessDateByYears(businessDateIso: string, offsetYears: number): string {
  const baseDate = assertBusinessDate(businessDateIso, 'start');
  baseDate.setUTCFullYear(baseDate.getUTCFullYear() + offsetYears);
  return formatDateToBusinessIso(baseDate);
}

export function formatBusinessDateTimeIso(date: Date = new Date()): string {
  const { year, month, day, hour, minute, second } = extractBusinessParts(date);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.000${BUSINESS_TIMEZONE_OFFSET}`;
}

export function getBusinessDefaultValidityRange(yearsAhead = 1): { validFrom: string; validUntil: string } {
  const validFrom = getBusinessTodayISODate();
  const validUntil = shiftBusinessDateByYears(validFrom, yearsAhead);
  return { validFrom, validUntil };
}

export function ensureBusinessDateIso(input?: string | Date): string {
  if (!input) {
    return getBusinessTodayISODate();
  }
  if (typeof input === 'string') {
    if (ISO_DATE_REGEX.test(input)) {
      return input;
    }
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateToBusinessIso(parsed);
    }
    return getBusinessTodayISODate();
  }
  if (Number.isNaN(input.getTime())) {
    return getBusinessTodayISODate();
  }
  return formatDateToBusinessIso(input);
}

export function formatBusinessDateTimeLocal(date: Date = new Date()): string {
  const { year, month, day, hour, minute } = extractBusinessParts(date);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

export function parseBusinessDateTimeLocal(input: string): Date | null {
  const match = BUSINESS_LOCAL_DATETIME_REGEX.exec(input);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match;
  const isoCandidate = `${year}-${month}-${day}T${hour}:${minute}:00.000${BUSINESS_TIMEZONE_OFFSET}`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Combina una fecha de negocio (YYYY-MM-DD) con la hora actual de negocio
 * para preservar el instante real de emisión.
 */
export function composeBusinessDateTime(
  businessDateIso: string,
  timeSource: Date = new Date(),
): Date {
  assertBusinessDate(businessDateIso, 'start');
  const { hour, minute, second } = extractBusinessParts(timeSource);
  const isoCandidate = `${businessDateIso}T${pad(hour)}:${pad(minute)}:${pad(second)}.000${BUSINESS_TIMEZONE_OFFSET}`;
  const composed = new Date(isoCandidate);
  if (Number.isNaN(composed.getTime())) {
    throw new Error(`No se pudo componer fecha de negocio ${businessDateIso} con la hora actual`);
  }
  return composed;
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

  const startUtc = new Date(`${isoPrefix}T00:00:00${BUSINESS_TIMEZONE_OFFSET}`).toISOString();
  const endUtc = new Date(`${isoPrefix}T23:59:59.999${BUSINESS_TIMEZONE_OFFSET}`).toISOString();
  return { startUtc, endUtc };
}

/**
 * Formatea una fecha de negocio (YYYY-MM-DD) al estilo "11 dic. 2025".
 */
export function formatBusinessDateShort(businessDateIso: string): string {
  if (!ISO_DATE_REGEX.test(businessDateIso)) {
    return businessDateIso;
  }

  const date = new Date(`${businessDateIso}T00:00:00${BUSINESS_TIMEZONE_OFFSET}`);

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
