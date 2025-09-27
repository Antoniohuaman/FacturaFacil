// src/features/configuration/components/company/RucValidator.tsx
import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

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
  };

  // Auto-validate when RUC has 11 digits
  useEffect(() => {
    if (value.length === 11 && value !== lastValidatedRuc && !isValidating) {
      handleValidate();
    }
  }, [value]);

  const handleValidate = async () => {
    if (value.length !== 11 || isValidating) return;
    
    setIsValidating(true);
    setValidation(null);

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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        RUC *
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleRucChange(e.target.value)}
          disabled={disabled || isValidating}
          placeholder="20123456789"
          className={`
            w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            transition-colors
            ${disabled || isValidating 
              ? 'bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300'
            }
            ${validation?.isValid 
              ? 'border-green-300 bg-green-50' 
              : validation?.isValid === false 
                ? 'border-red-300 bg-red-50' 
                : ''
            }
          `}
          maxLength={11}
        />
        
        {/* Loading/Status Icon */}
        <div className="absolute right-3 top-3 flex items-center">
          {isValidating ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : validation?.isValid ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : validation?.isValid === false ? (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <button
                type="button"
                onClick={handleRetry}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="Reintentar validación"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Validation Message */}
      {validation && (
        <div className={`mt-2 flex items-start space-x-2 text-sm ${
          validation.isValid ? 'text-green-600' : 'text-red-600'
        }`}>
          {validation.isValid ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{validation.message}</span>
        </div>
      )}

      {/* Manual Validation Button */}
      {value.length === 11 && !validation && !isValidating && (
        <div className="mt-2">
          <button
            type="button"
            onClick={handleValidate}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Validar con SUNAT
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-2 text-xs text-gray-500">
        <p>• El RUC se valida automáticamente con SUNAT al escribir 11 dígitos</p>
        <p>• Los datos de la empresa se completarán automáticamente</p>
      </div>
    </div>
  );
}