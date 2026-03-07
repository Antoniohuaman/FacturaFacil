import { useCallback, useMemo } from 'react';
import { useCurrencyManager } from '@/shared/currency';
import type { Currency } from '../../../models/comprobante.types';

export const useCurrency = () => {
  const {
    baseCurrency,
    documentCurrency,
    currencies,
    formatMoney,
    convert,
    setDocumentCurrency,
  } = useCurrencyManager();

  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.isActive),
    [currencies],
  );

  const currentCurrency = documentCurrency.code as Currency;

  const exchangeRates = useMemo(() => {
    const map: Record<string, { code: Currency; name: string; symbol: string; rate: number }> = {};
    activeCurrencies.forEach((currency) => {
      map[currency.code] = {
        code: currency.code as Currency,
        name: currency.name,
        symbol: currency.symbol,
        rate: currency.code === baseCurrency.code ? 1 : currency.exchangeRate,
      };
    });
    return map;
  }, [activeCurrencies, baseCurrency.code]);

  const availableCurrencies = useMemo(
    () =>
      activeCurrencies.map((currency) => ({
        code: currency.code as Currency,
        name: currency.name,
        symbol: currency.symbol,
        rate: currency.exchangeRate,
        decimalPlaces: currency.decimalPlaces,
      })),
    [activeCurrencies],
  );

  const changeCurrency = useCallback((newCurrency: Currency) => {
    setDocumentCurrency(newCurrency);
  }, [setDocumentCurrency]);

  const convertPrice = useCallback(
    (price: number, fromCurrency: Currency, toCurrency: Currency): number =>
      convert(price, fromCurrency, toCurrency),
    [convert],
  );

  const formatPrice = useCallback(
    (price: number, currency?: Currency): string =>
      formatMoney(price, currency, { showSymbol: true }),
    [formatMoney],
  );

  const updateExchangeRate = useCallback(() => {
    console.warn('updateExchangeRate is deprecated. Update exchange rates via Configuration module.');
  }, []);

  const getExchangeRate = useCallback(
    (currency: Currency): number => {
      if (currency === baseCurrency.code) {
        return 1;
      }
      const descriptor = activeCurrencies.find((item) => item.code === currency);
      return descriptor?.exchangeRate ?? 1;
    },
    [activeCurrencies, baseCurrency.code],
  );

  const isValidCurrency = useCallback(
    (currency: string): currency is Currency =>
      activeCurrencies.some((item) => item.code === currency),
    [activeCurrencies],
  );

  return {
    currentCurrency,
    currencyInfo: exchangeRates[currentCurrency],
    availableCurrencies,
    exchangeRates,
    baseCurrency,
    documentCurrency,
    changeCurrency,
    updateExchangeRate,
    convertPrice,
    formatPrice,
    getExchangeRate,
    isValidCurrency,
  };
};