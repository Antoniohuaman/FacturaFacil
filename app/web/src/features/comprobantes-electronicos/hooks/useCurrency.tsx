import { useState, useCallback, useMemo } from 'react';
import type { Currency } from '../models/comprobante.types';
import { CURRENCIES, DEFAULT_CURRENCY } from '../models/constants';

export const useCurrency = () => {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [exchangeRates, setExchangeRates] = useState(CURRENCIES);

  // Obtener información de la moneda actual
  const currencyInfo = useMemo(() => {
    return exchangeRates[currentCurrency];
  }, [currentCurrency, exchangeRates]);

  // Cambiar moneda
  const changeCurrency = useCallback((newCurrency: Currency) => {
    setCurrentCurrency(newCurrency);
  }, []);

  // Convertir precio entre monedas
  const convertPrice = useCallback((price: number, fromCurrency: Currency, toCurrency: Currency): number => {
    if (fromCurrency === toCurrency) return price;

    const fromRate = exchangeRates[fromCurrency]?.rate || 1;
    const toRate = exchangeRates[toCurrency]?.rate || 1;

    // Convertir a PEN (base) y luego a la moneda destino
    const priceInPEN = fromCurrency === 'PEN' ? price : price / fromRate;
    const convertedPrice = toCurrency === 'PEN' ? priceInPEN : priceInPEN * toRate;

    return Number(convertedPrice.toFixed(2));
  }, [exchangeRates]);

  // Formatear precio con símbolo de moneda
  const formatPrice = useCallback((price: number, currency?: Currency): string => {
    const currencyToUse = currency || currentCurrency;
    const symbol = exchangeRates[currencyToUse]?.symbol || '';
    return `${symbol} ${price.toFixed(2)}`;
  }, [currentCurrency, exchangeRates]);

  // Obtener todas las monedas disponibles
  const availableCurrencies = useMemo(() => {
    return Object.values(exchangeRates);
  }, [exchangeRates]);

  // Actualizar tipo de cambio (para integración futura con API)
  const updateExchangeRate = useCallback((currency: Currency, rate: number) => {
    setExchangeRates(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        rate
      }
    }));
  }, []);

  // Obtener tipo de cambio actual
  const getExchangeRate = useCallback((currency: Currency): number => {
    return exchangeRates[currency]?.rate || 1;
  }, [exchangeRates]);

  // Validar si una moneda es válida
  const isValidCurrency = useCallback((currency: string): currency is Currency => {
    return Object.keys(exchangeRates).includes(currency);
  }, [exchangeRates]);

  return {
    // Estado
    currentCurrency,
    currencyInfo,
    availableCurrencies,
    exchangeRates,
    
    // Acciones
    changeCurrency,
    updateExchangeRate,
    
    // Utilidades
    convertPrice,
    formatPrice,
    getExchangeRate,
    isValidCurrency
  };
};