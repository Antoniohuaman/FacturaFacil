// src/features/configuration/components/business/CurrenciesSection.tsx
import { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle, History } from 'lucide-react';
import { Button } from '@/contasis';
import type { Currency, ExchangeRate } from '../../models/Currency';
import { DefaultSelector } from '../common/DefaultSelector';
import { ConfigurationCard } from '../common/ConfigurationCard';
import { useCurrencyManager } from '@/shared/currency';
import type { CurrencyCode } from '@/shared/currency';

interface CurrenciesSectionProps {
  currencies: Currency[];
  exchangeRates?: ExchangeRate[];
  onUpdateCurrencies: (currencies: Currency[]) => Promise<void>;
  isLoading?: boolean;
}

export function CurrenciesSection({ 
  currencies, 
  exchangeRates = [],
  onUpdateCurrencies, 
  isLoading = false 
}: CurrenciesSectionProps) {
  const { baseCurrency, setBaseCurrency } = useCurrencyManager();
  const [showRateHistory, setShowRateHistory] = useState<string | null>(null);

  const setDefaultCurrency = async (currencyId: string) => {
    const currency = currencies.find((item) => item.id === currencyId);
    if (!currency) {
      return;
    }

    if (!currency.isBaseCurrency) {
      const updatedCurrencies = currencies.map((item) => ({
        ...item,
        isBaseCurrency: item.id === currencyId,
      }));
      await onUpdateCurrencies(updatedCurrencies);
    }

    setBaseCurrency(currency.code as CurrencyCode);
  };

  const getLatestExchangeRate = (currencyCode: string): ExchangeRate | undefined => {
    return exchangeRates
      .filter(rate => rate.fromCurrency === currencyCode)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const getCurrencyHistory = (currencyCode: string): ExchangeRate[] => {
    return exchangeRates
      .filter(rate => rate.fromCurrency === currencyCode)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 rates
  };

  const formatRate = (rate: number): string => {
    return rate.toFixed(4);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const calculateTrend = (currencyCode: string): 'up' | 'down' | 'stable' | null => {
    const rates = getCurrencyHistory(currencyCode);
    if (rates.length < 2) return null;

    const latest = rates[0].rate;
    const previous = rates[1].rate;
    
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Monedas y Tipos de Cambio</h3>
      </div>

      {/* Currencies List */}
      <div className="space-y-4">
        {currencies.map((currency) => {
          const latestRate = getLatestExchangeRate(currency.code);
          const trend = calculateTrend(currency.code);
          const hasHistory = getCurrencyHistory(currency.code).length > 0;
          
          return (
            <div key={currency.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Currency Info */}
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    currency.isBaseCurrency 
                      ? 'bg-green-50 border-2 border-green-200' 
                      : 'bg-gray-50 border-2 border-gray-200'
                  }`}>
                    <DollarSign className={`w-6 h-6 ${
                      currency.isBaseCurrency ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-3">
                      <h4 className="font-semibold text-gray-900 text-lg">
                        {currency.name}
                      </h4>
                      <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                        {currency.code}
                      </span>
                      <span className="text-lg font-mono font-bold text-gray-700">
                        {currency.symbol}
                      </span>
                    </div>
                    
                    {/* Exchange Rate Info */}
                    {!currency.isBaseCurrency && (
                      <div className="flex items-center space-x-4 mt-2">
                        {latestRate ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                              1 {currency.code} = {formatRate(latestRate.rate)} {baseCurrency.code}
                            </span>
                            
                            {trend && (
                              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                trend === 'up' 
                                  ? 'bg-green-100 text-green-800' 
                                  : trend === 'down' 
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}>
                                {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '➡️'}
                                <span>{trend === 'up' ? 'Subió' : trend === 'down' ? 'Bajó' : 'Estable'}</span>
                              </div>
                            )}
                            
                            <span className="text-xs text-gray-500">
                              {formatDate(latestRate.date)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm text-amber-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>Sin tipo de cambio configurado</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3">
                  {/* Default Selector */}
                  <DefaultSelector
                    isDefault={currency.isBaseCurrency}
                    onSetDefault={() => { void setDefaultCurrency(currency.id); }}
                    label="Base"
                  />

                  {/* Exchange Rate Actions */}
                  {!currency.isBaseCurrency && hasHistory && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<History />}
                        iconPosition="left"
                        onClick={() => setShowRateHistory(
                          showRateHistory === currency.code ? null : currency.code
                        )}
                      >
                        Historial
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Exchange Rate History */}
              {showRateHistory === currency.code && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <h5 className="font-medium text-gray-900">Historial de Tipos de Cambio</h5>
                  </div>
                  
                  <div className="overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {getCurrencyHistory(currency.code).map((rate) => (
                        <div key={rate.id} className="bg-gray-50 rounded-lg p-3 text-center">
                          <div className="font-mono font-semibold text-gray-900">
                            {formatRate(rate.rate)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(rate.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <ConfigurationCard
        title="Información sobre Tipos de Cambio"
        description="Cómo funcionan las monedas en el sistema"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Moneda Base</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                La moneda base es la moneda principal de tu empresa y se usa como referencia 
                para todos los cálculos. Debe coincidir con la moneda base configurada en los datos de empresa.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tipos de Cambio</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Los tipos de cambio se usan para convertir precios y montos entre diferentes monedas. 
                Actualízalos regularmente para mantener la precisión en tus transacciones.
              </p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Importante</h4>
                <p className="text-sm text-blue-800 mt-1">
                  Los tipos de cambio afectan la facturación en monedas extranjeras. 
                  Asegúrate de mantenerlos actualizados según las tasas oficiales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ConfigurationCard>
    </div>
  );
}