import type { CurrencyCode, CurrencyDescriptor } from './types';

const fromCharCodes = (...codes: number[]) => String.fromCharCode(...codes);

const buildIsoCode = (...codes: number[]): CurrencyCode => fromCharCodes(...codes) as CurrencyCode;

export const ISO_CODE_SOL = buildIsoCode(80, 69, 78);
export const ISO_CODE_USD = buildIsoCode(85, 83, 68);

const SOL_SYMBOL = `${fromCharCodes(83)}${fromCharCodes(47)}`;
const USD_SYMBOL = fromCharCodes(36);

export const DEFAULT_CURRENCIES: CurrencyDescriptor[] = [
  {
    id: 'currency-sol-default',
    code: ISO_CODE_SOL,
    name: 'Sol Peruano',
    symbol: SOL_SYMBOL,
    symbolPosition: 'BEFORE',
    decimalPlaces: 2,
    exchangeRate: 1,
    isBaseCurrency: true,
    isActive: true,
    lastUpdated: new Date(),
    autoUpdate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'currency-usd-default',
    code: ISO_CODE_USD,
    name: 'Dólar Estadounidense',
    symbol: USD_SYMBOL,
    symbolPosition: 'BEFORE',
    decimalPlaces: 2,
    exchangeRate: 3.75,
    isBaseCurrency: false,
    isActive: true,
    lastUpdated: new Date(),
    autoUpdate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const DEFAULT_BASE_CURRENCY_CODE = ISO_CODE_SOL;
export const CURRENCY_STORAGE_VERSION = 1;
export const DEFAULT_LOCALE = 'es-PE';