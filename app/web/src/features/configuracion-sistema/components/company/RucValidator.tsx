// src/features/configuration/components/company/RucValidator.tsx
import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Search, Building2 } from 'lucide-react';

interface RucValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (result: { isValid: boolean; message: string; data?: any }) => void;
  disabled?: boolean;
}

export function RucValidator({ value, onChange, onValidation, disabled = false }: RucValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const [lastValidatedRuc, setLastValidatedRuc] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);

  // Mock SUNAT validation
  const validateRuc = async (ruc: string): Promise<{ isValid: boolean; message: string; data?: any }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Basic RUC validation
    if (ruc.length !== 11) {
      return { isValid: false, message: 'El RUC debe tener 11 dígitos' };
    }
    
    if (!/^\d+$/.test(ruc)) {
      return { isValid: false, message: 'El RUC solo debe contener números' };
    }

    // Mock different scenarios based on RUC
    const lastDigit = parseInt(ruc.slice(-1));
    
    if (lastDigit === 0) {
      return { 
        isValid: false, 
        message: 'RUC no encontrado en SUNAT. Verifica que esté correctamente escrito.' 
      };
    }
    
    if (lastDigit === 1) {
      return { 
        isValid: false, 
        message: 'Error de conexión con SUNAT. Intenta nuevamente en unos momentos.' 
      };
    }

    // Successful validation with mock data
    const mockCompanies = {
      '20123456789': {
        businessName: 'EMPRESA EJEMPLO S.A.C.',
        fiscalAddress: 'JR. LOS EJEMPLOS 123, LIMA, LIMA, LIMA',
        ubigeo: '150101'
      },
      '20111111112': {
        businessName: 'COMERCIAL DEMO EIRL',
        fiscalAddress: 'AV. DEMO 456, SAN ISIDRO, LIMA, LIMA',
        ubigeo: '150127'
      }
    };

    const mockData = mockCompanies[ruc as keyof typeof mockCompanies] || {
      businessName: 'EMPRESA VALIDADA S.A.C.',
      fiscalAddress: 'AV. PRINCIPAL 789, MIRAFLORES, LIMA, LIMA',
      ubigeo: '150122'
    };

    return {
      isValid: true,
      message: 'RUC válido. Datos completados automáticamente desde SUNAT.',
      data: mockData
    };
  };

  // Handle RUC input change
  const handleRucChange = (inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, '').slice(0, 11);
    onChange(numericValue);

    // Reset validation if RUC changed
    if (validation && numericValue !== lastValidatedRuc) {
      setValidation(null);
      onValidation({ isValid: false, message: 'RUC modificado, necesita validación' });
    }

    // Show suggestion when has 11 digits but not validated
    setShowSuggestion(numericValue.length === 11 && numericValue !== lastValidatedRuc);
  };

  const handleValidate = async () => {
    if (value.length !== 11 || isValidating) return;

    setIsValidating(true);
    setValidation(null);
    setShowSuggestion(false);

    try {
      const result = await validateRuc(value);
      setValidation(result);
      setLastValidatedRuc(value);
      onValidation(result);
    } catch (error) {
      const errorResult = {
        isValid: false,
        message: 'Error al conectar con SUNAT. Intenta nuevamente.'
      };
      setValidation(errorResult);
      onValidation(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetry = () => {
    setValidation(null);
    setLastValidatedRuc('');
    handleValidate();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        RUC <span className="text-red-500">*</span>
      </label>

      {/* Input with Validation Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => handleRucChange(e.target.value)}
            disabled={disabled || isValidating}
            placeholder="Ingresa el RUC de 11 dígitos"
            className={`
              w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-all duration-200 font-mono text-base
              ${disabled || isValidating
                ? 'bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-gray-400'
              }
              ${validation?.isValid
                ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                : validation?.isValid === false
                  ? 'border-red-400 bg-red-50 ring-2 ring-red-200'
                  : ''
              }
            `}
            maxLength={11}
          />

          {/* Status Icon in Input */}
          {validation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validation.isValid ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
            </div>
          )}
        </div>

        {/* Validate Button */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={value.length !== 11 || isValidating || disabled || (validation?.isValid && value === lastValidatedRuc)}
          className={`
            px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap
            ${value.length === 11 && !validation?.isValid && !isValidating
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105'
              : validation?.isValid && value === lastValidatedRuc
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isValidating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Consultando...</span>
            </>
          ) : validation?.isValid && value === lastValidatedRuc ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Validado</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Consultar SUNAT</span>
            </>
          )}
        </button>
      </div>

      {/* Character Counter */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {value.length}/11 dígitos
        </div>
        {validation?.isValid === false && (
          <button
            type="button"
            onClick={handleRetry}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Search className="w-3 h-3" />
            Intentar nuevamente
          </button>
        )}
      </div>

      {/* Suggestion Alert */}
      {showSuggestion && !validation && !isValidating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <Search className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">RUC completo detectado</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Haz clic en "Consultar SUNAT" para validar y obtener los datos de tu empresa automáticamente
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Success Message */}
      {validation?.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900">✓ RUC Validado Correctamente</p>
              <p className="text-xs text-green-700 mt-1">{validation.message}</p>
              {validation.data && (
                <div className="mt-2 pt-2 border-t border-green-200">
                  <p className="text-xs font-medium text-green-800">Datos obtenidos de SUNAT:</p>
                  <p className="text-xs text-green-700 mt-1">• {validation.data.businessName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {validation?.isValid === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">Error de Validación</p>
              <p className="text-xs text-red-700 mt-1">{validation.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!validation && !showSuggestion && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700">¿Cómo funciona?</p>
              <p>1. Ingresa el RUC de 11 dígitos de tu empresa</p>
              <p>2. Haz clic en "Consultar SUNAT" para validar</p>
              <p>3. Los datos se completarán automáticamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}