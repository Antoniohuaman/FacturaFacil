export type UnitLike = {
  code: string;
  name?: string;
  symbol?: string;
};

type UnitDisplayInput = {
  units?: UnitLike[];
  code?: string;
  fallbackSymbol?: string;
  fallbackName?: string;
};

const normalizeCode = (value?: string): string => (value ?? '').trim().toUpperCase();

const normalizeWhitespace = (value?: string): string => (value ?? '').replace(/\s+/g, ' ').trim();

export const normalizeText = (value?: string): string => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const getUnitByCode = (units: UnitLike[] | undefined, code?: string): UnitLike | undefined => {
  if (!units || !code) {
    return undefined;
  }

  const normalized = normalizeCode(code);
  if (!normalized) {
    return undefined;
  }

  return units.find(unit => normalizeCode(unit.code) === normalized);
};

const resolveUnitFields = (input: UnitDisplayInput) => {
  const resolved = getUnitByCode(input.units, input.code);
  const symbol = normalizeWhitespace(resolved?.symbol || input.fallbackSymbol);
  const name = normalizeWhitespace(resolved?.name || input.fallbackName);
  const code = normalizeCode(input.code);

  return { symbol, name, code };
};

export const getUnitDisplayForUI = (input: UnitDisplayInput): string | undefined => {
  const { symbol, name, code } = resolveUnitFields(input);
  return symbol || name || code || undefined;
};

export const getUnitDisplayForPrint = (
  input: UnitDisplayInput & { format?: 'ticket' | 'hoja' }
): string | undefined => {
  const { format, ...rest } = input;
  const { symbol, name, code } = resolveUnitFields(rest);

  if (format === 'ticket') {
    return symbol || name || code || undefined;
  }

  return name || symbol || code || undefined;
};
