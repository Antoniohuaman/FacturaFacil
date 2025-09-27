// src/features/configuration/components/business/ExchangeRateModal.tsx
import { useState, useEffect } from 'react';
import { X, Calculator, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import type { Currency } from '../../models/Currency';

interface ExchangeRateModalProps {
  currency: Currency;
  onSave: (rate: number) => Promise<void>;
  onClose: () => void;
}

export function ExchangeRateModal({ currency, onSave, onClose }: ExchangeRateModalProps) {
  const [rate, setRate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock function to fetch current exchange rate from external API
  const fetchCurrentRate = async (): Promise<number> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock exchange rates (in real implementation, you'd call a real API)
    const mockRates: Record<string, number> = {
      'USD': 3.7500,
      'EUR': 4.1200,
      'GBP': 4.7800,
      'JPY': 0.0234,
      'BRL': 0.7650
    };

    const mockRate = mockRates[currency.code];
    if (!mockRate) {
      throw new Error('No se pudo obtener el tipo de cambio actual');
    }

    // Add small random variation to simulate real market fluctuation
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    return parseFloat((mockRate * (1 + variation)).toFixed(4));
  };

  const handleFetchRate = async () => {
    setIsFetchingRate(true);
    setError(null);
    
    try {
      const fetchedRate = await fetchCurrentRate();
      setSuggestedRate(fetchedRate);
      setRate(fetchedRate.toString());
    } catch (error) {
      setError('No se pudo obtener el tipo de cambio. Ingresa manualmente.');
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericRate = parseFloat(rate);
    
    // Validation
    if (isNaN(numericRate) || numericRate <= 0) {
      setError('Ingresa un tipo de cambio válido mayor a 0');
      return;
    }
    
    if (numericRate > 1000) {
      setError('El tipo de cambio parece muy alto. Verifica el valor.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(numericRate);
    } catch (error) {
      setError('Error al guardar el tipo de cambio. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateChange = (value: string) => {
    // Allow only numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 4
    if (parts.length === 2 && parts[1].length > 4) {
      return;
    }
    
    setRate(numericValue);
    setError(null);
  };

  const getExampleCalculation = () => {
    const numericRate = parseFloat(rate);
    if (isNaN(numericRate) || numericRate <= 0) return null;
    
    return {
      foreign: 100,
      local: (100 * numericRate).toFixed(2)
    };
  };

  const example = getExampleCalculation();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Nuevo Tipo de Cambio
                </h3>
                <p className="text-sm text-gray-500">
                  {currency.name} ({currency.code})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fetch Current Rate */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Tipo de Cambio Actual</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Obtén el tipo de cambio actual desde fuentes externas
                </p>
              </div>
              <button
                type="button"
                onClick={handleFetchRate}
                disabled={isFetchingRate}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isFetchingRate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Obteniendo...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Obtener</span>
                  </>
                )}
              </button>
            </div>
            
            {suggestedRate && (
              <div className="mt-3 p-3 bg-white border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Tipo sugerido:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {suggestedRate.toFixed(4)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rate Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Cambio *
            </label>
            <div className="relative">
              <input
                type="text"
                value={rate}
                onChange={(e) => handleRateChange(e.target.value)}
                className={`w-full px-4 py-3 text-lg font-mono border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="3.7500"
                disabled={isLoading}
                autoFocus
              />
              <div className="absolute right-3 top-3 text-gray-500 font-mono text-sm">
                PEN
              </div>
            </div>
            
            {error && (
              <div className="mt-2 flex items-center space-x-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              1 {currency.code} = ? PEN
            </p>
          </div>

          {/* Example Calculation */}
          {example && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Ejemplo de Conversión</h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {example.foreign} {currency.code}
                </span>
                <span className="text-gray-400">→</span>
                <span className="font-mono font-semibold text-gray-900">
                  S/ {example.local}
                </span>
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900">Importante</h4>
                <ul className="text-sm text-amber-800 mt-1 space-y-1">
                  <li>• El tipo de cambio se aplicará a todas las transacciones futuras</li>
                  <li>• Verifica que el tipo coincida con las tasas oficiales</li>
                  <li>• Se guardará con fecha y hora actual</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !rate || parseFloat(rate) <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Tipo de Cambio</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}