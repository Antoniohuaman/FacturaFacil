import { useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE } from './constants';
import { loadCurrencyState, persistCurrencyState } from './currencyStorage';
import type { CurrencyStorageState } from './currencyStorage';
import type {
  CurrencyCode,
  CurrencyDescriptor,
  CurrencyManagerSnapshot,
  CurrencyUpdate,
} from './types';

type Listener = () => void;

const clamp = (value: number, decimals: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

class CurrencyManager {
  private snapshot: CurrencyManagerSnapshot;

  private listeners = new Set<Listener>();

  private formatterCache = new Map<string, Intl.NumberFormat>();

  constructor() {
    this.snapshot = this.buildSnapshot(loadCurrencyState());
  }

  private buildSnapshot(state: CurrencyStorageState): CurrencyManagerSnapshot {
    const normalized = this.normalizeCurrencies(state.currencies, state.baseCurrencyCode);
    const baseCurrency = normalized.find((currency) => currency.isBaseCurrency) ?? normalized[0];
    const documentCurrency =
      normalized.find((currency) => currency.code === state.documentCurrencyCode && currency.isActive) ?? baseCurrency;
    return {
      baseCurrency,
      documentCurrency,
      currencies: normalized,
    };
  }

  private normalizeCurrencies(currencies: CurrencyDescriptor[], baseCurrencyCode: CurrencyCode): CurrencyDescriptor[] {
    if (!currencies.length) {
      return [];
    }

    const normalized = currencies.map((currency) => ({
      ...currency,
      isBaseCurrency: currency.code === baseCurrencyCode,
      lastUpdated: currency.lastUpdated instanceof Date ? currency.lastUpdated : new Date(currency.lastUpdated),
    }));

    if (!normalized.some((currency) => currency.isBaseCurrency)) {
      normalized[0] = {
        ...normalized[0],
        isBaseCurrency: true,
      };
    }

    return normalized.sort((a, b) => {
      if (a.isBaseCurrency) return -1;
      if (b.isBaseCurrency) return 1;
      return a.code.localeCompare(b.code);
    });
  }

  private resolveDocumentCurrencyCode(
    candidate: CurrencyCode | undefined,
    currencies: CurrencyDescriptor[],
    baseCurrencyCode: CurrencyCode,
  ): CurrencyCode {
    if (candidate) {
      const match = currencies.find((currency) => currency.code === candidate && currency.isActive);
      if (match) {
        return candidate;
      }
    }
    const firstActive = currencies.find((currency) => currency.isActive);
    return firstActive?.code ?? baseCurrencyCode;
  }

  private commit(nextCurrencies: CurrencyDescriptor[], baseCurrencyCode: CurrencyCode, documentCurrencyCode?: CurrencyCode) {
    const resolvedDocumentCode = this.resolveDocumentCurrencyCode(
      documentCurrencyCode ?? this.snapshot.documentCurrency.code,
      nextCurrencies,
      baseCurrencyCode,
    );
    this.snapshot = this.buildSnapshot({
      baseCurrencyCode,
      documentCurrencyCode: resolvedDocumentCode,
      currencies: nextCurrencies,
    });
    persistCurrencyState({
      baseCurrencyCode: this.snapshot.baseCurrency.code,
      documentCurrencyCode: this.snapshot.documentCurrency.code,
      currencies: this.snapshot.currencies,
    });
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[currencyManager] listener error', error);
      }
    });
  }

  getSnapshot(): CurrencyManagerSnapshot {
    return this.snapshot;
  }

  getActiveCurrencies(): CurrencyDescriptor[] {
    return this.snapshot.currencies.filter((currency) => currency.isActive);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrency(code?: CurrencyCode | null): CurrencyDescriptor | undefined {
    if (!code) {
      return undefined;
    }
    return this.snapshot.currencies.find((currency) => currency.code === code);
  }

  setCurrencies(currencies: CurrencyDescriptor[]) {
    const flaggedBase = currencies.find((currency) => currency.isBaseCurrency)?.code;
    const baseCode = flaggedBase ?? this.snapshot.baseCurrency.code;
    this.commit(currencies, baseCode);
  }

  updateCurrency(update: CurrencyUpdate) {
    const currencies = this.snapshot.currencies.map((currency) =>
      currency.code === update.code ? { ...currency, ...update } : currency,
    );
    const baseCode = update.isBaseCurrency ? update.code : this.snapshot.baseCurrency.code;
    this.commit(currencies, baseCode);
  }

  setBaseCurrency(code: CurrencyCode) {
    if (this.snapshot.baseCurrency.code === code) {
      return;
    }
    const currencies = this.snapshot.currencies.map((currency) => ({
      ...currency,
      isBaseCurrency: currency.code === code,
    }));
    const shouldSyncDocument = this.snapshot.documentCurrency.code === this.snapshot.baseCurrency.code;
    const documentCode = shouldSyncDocument ? code : this.snapshot.documentCurrency.code;
    this.commit(currencies, code, documentCode);
  }

  setDocumentCurrency(code: CurrencyCode) {
    if (this.snapshot.documentCurrency.code === code) {
      return;
    }
    const exists = this.snapshot.currencies.find((currency) => currency.code === code && currency.isActive);
    const targetCode = exists?.code ?? this.snapshot.baseCurrency.code;
    this.commit(this.snapshot.currencies, this.snapshot.baseCurrency.code, targetCode);
  }

  getRate(from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) {
      return 1;
    }
    const base = this.snapshot.baseCurrency;
    const fromCurrency = this.getCurrency(from) ?? base;
    const toCurrency = this.getCurrency(to) ?? base;
    if (fromCurrency.code === base.code) {
      return toCurrency.code === base.code ? 1 : 1 / toCurrency.exchangeRate;
    }
    const amountInBase = fromCurrency.exchangeRate;
    if (toCurrency.code === base.code) {
      return amountInBase;
    }
    return amountInBase / toCurrency.exchangeRate;
  }

  convert(amount: number, from: CurrencyCode, to: CurrencyCode, rateOverride?: number): number {
    if (from === to) {
      const currency = this.getCurrency(to) ?? this.snapshot.baseCurrency;
      return clamp(amount, currency.decimalPlaces);
    }
    const rate = typeof rateOverride === 'number' ? rateOverride : this.getRate(from, to);
    const targetCurrency = this.getCurrency(to) ?? this.snapshot.baseCurrency;
    return clamp(amount * rate, targetCurrency.decimalPlaces);
  }

  formatMoney(amount: number, currencyCode?: CurrencyCode, options?: { showSymbol?: boolean; trimDecimals?: boolean }): string {
    const currency = this.getCurrency(currencyCode) ?? this.snapshot.baseCurrency;
    const decimals = currency.decimalPlaces;
    const formatterKey = `${decimals}-${options?.trimDecimals ? 'trim' : 'full'}`;
    let formatter = this.formatterCache.get(formatterKey);
    if (!formatter) {
      formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
        minimumFractionDigits: options?.trimDecimals ? 0 : decimals,
        maximumFractionDigits: decimals,
      });
      this.formatterCache.set(formatterKey, formatter);
    }
    const formatted = formatter.format(amount);
    if (options?.showSymbol === false) {
      return formatted;
    }
    return currency.symbolPosition === 'BEFORE'
      ? `${currency.symbol}\u00A0${formatted}`
      : `${formatted}\u00A0${currency.symbol}`;
  }
}

export const currencyManager = new CurrencyManager();

export const formatMoney = (
  amount: number,
  currencyCode?: CurrencyCode,
  options?: { showSymbol?: boolean; trimDecimals?: boolean },
) => currencyManager.formatMoney(amount, currencyCode, options);

export const convertMoney = (amount: number, from: CurrencyCode, to: CurrencyCode, rateOverride?: number) =>
  currencyManager.convert(amount, from, to, rateOverride);

export const getRate = (from: CurrencyCode, to: CurrencyCode) => currencyManager.getRate(from, to);

export const useCurrencyManager = () => {
  const snapshot = useSyncExternalStore(
    (listener) => currencyManager.subscribe(listener),
    () => currencyManager.getSnapshot(),
  );

  return {
    ...snapshot,
    formatMoney: (amount: number, currencyCode?: CurrencyCode, options?: { showSymbol?: boolean; trimDecimals?: boolean }) =>
      currencyManager.formatMoney(amount, currencyCode, options),
    convert: (amount: number, from: CurrencyCode, to: CurrencyCode, rateOverride?: number) =>
      currencyManager.convert(amount, from, to, rateOverride),
    getRate: (from: CurrencyCode, to: CurrencyCode) => currencyManager.getRate(from, to),
    setBaseCurrency: (code: CurrencyCode) => currencyManager.setBaseCurrency(code),
    setDocumentCurrency: (code: CurrencyCode) => currencyManager.setDocumentCurrency(code),
    setCurrencies: (currencies: CurrencyDescriptor[]) => currencyManager.setCurrencies(currencies),
    updateCurrency: (currency: CurrencyUpdate) => currencyManager.updateCurrency(currency),
  } as const;
};