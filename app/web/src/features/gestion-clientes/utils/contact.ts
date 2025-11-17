import type { Telefono } from '../models';
import { onlyDigits } from './documents';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value?: string | null): boolean => {
  if (!value) return false;
  return EMAIL_REGEX.test(value.trim());
};

export const splitEmails = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && EMAIL_REGEX.test(email));
};

export const mergeEmails = (emails?: string[] | null): string[] => {
  if (!emails) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  emails.forEach((email) => {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result.slice(0, 3);
};

export const splitPhones = (value?: string | null): Telefono[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((raw, index) => {
      const digits = onlyDigits(raw);
      if (!digits) return null;
      return {
        numero: digits,
        tipo: index === 0 ? 'Móvil' : 'Alterno',
      } satisfies Telefono;
    })
    .filter((telefono): telefono is Telefono => Boolean(telefono));
};

export const sanitizePhones = (telefonos?: Telefono[] | null): Telefono[] => {
  if (!telefonos) return [];
  return telefonos
    .map((telefono) => ({
      numero: onlyDigits(telefono.numero),
      tipo: telefono.tipo || 'Móvil',
    }))
    .filter((telefono) => telefono.numero.length >= 6 && telefono.numero.length <= 15)
    .slice(0, 3);
};
