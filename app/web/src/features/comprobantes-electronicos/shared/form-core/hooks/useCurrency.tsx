/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useConfigurationContext } from '../../../../configuracion-sistema/context/ConfigurationContext';
import type { Currency } from '../../../models/comprobante.types';
import { CURRENCIES, DEFAULT_CURRENCY } from '../../../models/constants';

export const useCurrency = () => {
  const { state } = useConfigurationContext();
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  
  // Crear exchange rates desde configuración o usar fallback
  const exchangeRates = useMemo(() => {
    if (state.currencies.length > 0) {
      // Convertir currencies de configuración al formato esperado
      const rates: Record<string, any> = {};
      state.currencies.forEach(currency => {
        rates[currency.code] = {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          rate: currency.exchangeRate
        };
      });
      return rates;
    }
    // Fallback a constantes
    return CURRENCIES;
  }, [state.currencies]);
  
  // Sincronizar moneda por defecto cuando cambie la configuración
  useEffect(() => {
    if (state.currencies.length > 0) {
      const baseCurrency = state.currencies.find(c => c.isBaseCurrency);
      if (baseCurrency && baseCurrency.code !== currentCurrency) {
        setCurrentCurrency(baseCurrency.code as Currency);
      }
    }
  }, [state.currencies, currentCurrency]);

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

  // Actualizar tipo de cambio - DEPRECATED: Los tipos de cambio se manejan en configuración
  const updateExchangeRate = useCallback((_currency: Currency, _rate: number) => {
    console.warn('updateExchangeRate is deprecated. Update exchange rates via Configuration module.');
    // No-op: exchange rates are now managed via ConfigurationContext
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