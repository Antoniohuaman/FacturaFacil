import { lsKey } from '@/shared/tenant';
import { CURRENCY_STORAGE_VERSION, DEFAULT_BASE_CURRENCY_CODE, DEFAULT_CURRENCIES } from './constants';
import type { CurrencyDescriptor, CurrencyPersistenceShape, CurrencyCode, PersistedCurrency } from './types';

interface CurrencyStorageState {
  baseCurrencyCode: CurrencyCode;
  documentCurrencyCode: CurrencyCode;
  currencies: CurrencyDescriptor[];
}

const STORAGE_BASE_KEY = 'ff_currency_state_v1';

const getStorageKey = (): string => {
  try {
    return lsKey(STORAGE_BASE_KEY);
  } catch {
    return STORAGE_BASE_KEY;
  }
};

const serializeCurrency = (currency: CurrencyDescriptor): PersistedCurrency => ({
  ...currency,
  lastUpdated: currency.lastUpdated.toISOString(),
  createdAt: currency.createdAt.toISOString(),
  updatedAt: currency.updatedAt.toISOString(),
});

const deserializeCurrency = (currency: PersistedCurrency): CurrencyDescriptor => ({
  ...currency,
  lastUpdated: new Date(currency.lastUpdated),
  createdAt: new Date(currency.createdAt),
  updatedAt: new Date(currency.updatedAt),
});

const buildDefaultState = (): CurrencyStorageState => ({
  baseCurrencyCode: DEFAULT_BASE_CURRENCY_CODE,
  documentCurrencyCode: DEFAULT_BASE_CURRENCY_CODE,
  currencies: DEFAULT_CURRENCIES.map((currency) => ({
    ...currency,
    lastUpdated: new Date(currency.lastUpdated),
  })),
});

export const loadCurrencyState = (): CurrencyStorageState => {
  if (typeof window === 'undefined') {
    return buildDefaultState();
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey());
    if (!raw) {
      return buildDefaultState();
    }
    const parsed = JSON.parse(raw) as CurrencyPersistenceShape;
    if (!parsed || parsed.version !== CURRENCY_STORAGE_VERSION) {
      return buildDefaultState();
    }
    const currencies = parsed.currencies.map(deserializeCurrency);
    if (currencies.length === 0) {
      return buildDefaultState();
    }
    return {
      baseCurrencyCode: parsed.baseCurrencyCode,
      documentCurrencyCode: parsed.documentCurrencyCode ?? parsed.baseCurrencyCode,
      currencies,
    };
  } catch {
    return buildDefaultState();
  }
};

export const persistCurrencyState = (state: CurrencyStorageState) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: CurrencyPersistenceShape = {
    version: CURRENCY_STORAGE_VERSION,
    baseCurrencyCode: state.baseCurrencyCode,
    documentCurrencyCode: state.documentCurrencyCode,
    currencies: state.currencies.map(serializeCurrency),
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(payload));
  } catch (error) {
    console.error('[currencyStorage] No se pudo persistir el estado de monedas', error);
  }
};

export type { CurrencyStorageState };