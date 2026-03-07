import type { HighlightPart } from '../types/search.types';
import { normalizeValue } from './searchAlgorithm';

export const highlightParts = (value: string, query: string): HighlightPart[] => {
  if (!value) {
    return [];
  }
  const normalizedQuery = normalizeValue(query.trim());
  if (!normalizedQuery) {
    return [{ text: value, match: false }];
  }
  const normalizedValue = normalizeValue(value);
  const startIndex = normalizedValue.indexOf(normalizedQuery);
  if (startIndex === -1) {
    return [{ text: value, match: false }];
  }
  const endIndex = startIndex + normalizedQuery.length;
  const segments: HighlightPart[] = [];
  if (startIndex > 0) {
    segments.push({ text: value.slice(0, startIndex), match: false });
  }
  segments.push({ text: value.slice(startIndex, endIndex), match: true });
  if (endIndex < value.length) {
    segments.push({ text: value.slice(endIndex), match: false });
  }
  return segments;
};

export const computeTextScore = (value: string | undefined | null, tokens: string[], weight: number, isKey?: boolean): number => {
  if (!value || !tokens.length) {
    return 0;
  }
  const normalizedValue = normalizeValue(value);
  const includesAllTokens = tokens.every((token) => normalizedValue.includes(token));
  if (!includesAllTokens) {
    return 0;
  }
  const startsWith = normalizedValue.startsWith(tokens[0]);
  const base = startsWith ? 140 : 90;
  return base + weight + (isKey ? 40 : 0);
};

export const computeNumericScore = (value: number | undefined | null, numericQuery: string, weight: number): number => {
  if (!value && value !== 0) {
    return 0;
  }
  if (!numericQuery) {
    return 0;
  }
  const digitsFromValue = value.toString().replace(/[^0-9]/g, '');
  if (!digitsFromValue.includes(numericQuery)) {
    return 0;
  }
  return 100 + weight;
};