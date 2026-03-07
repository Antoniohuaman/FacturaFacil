const DIACRITIC_REGEX = /[\u0300-\u036f]/g;

export const removeDiacritics = (value: string): string => 
  value.normalize('NFD').replace(DIACRITIC_REGEX, '');

export const normalizeValue = (value: string): string => 
  removeDiacritics(value).toLowerCase();

export const normalizeDocumentKey = (value: string): string => 
  value.replace(/[^a-z0-9]/gi, '').toLowerCase();

export const tokenizeQuery = (value: string): string[] => {
  const normalized = normalizeValue(value.trim());
  return normalized.length ? normalized.split(/\s+/).filter(Boolean) : [];
};

export const extractNumericQuery = (value: string): string => 
  value.replace(/[^0-9]/g, '');

export const buildRichHaystack = (...values: Array<string | number | undefined | null>): string => {
  const tokens: string[] = [];
  values.forEach((rawValue) => {
    if (rawValue === undefined || rawValue === null) {
      return;
    }
    const stringValue = typeof rawValue === 'number' ? rawValue.toString() : rawValue;
    const trimmed = stringValue.trim();
    if (!trimmed) {
      return;
    }
    const normalized = normalizeValue(trimmed);
    if (normalized) {
      tokens.push(normalized);
    }
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (digits.length > 0) {
      tokens.push(digits);
    }
  });
  return tokens.join(' ');
};