/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/components/empresa/RucValidator.tsx
import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Search, Building2 } from 'lucide-react';
import { Button } from '@/contasis';
import { sunatService } from '@/services/api';
import type { RucValidationResult } from '@/services/api';

interface RucValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (result: { isValid: boolean; message: string; data?: any }) => void;
  disabled?: boolean;
  onToast?: (type: 'success' | 'error' | 'warning', message: string) => void;
  error?: string;
}

export function RucValidator({ value, onChange, onValidation, disabled = false, onToast, error }: RucValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const [lastValidatedRuc, setLastValidatedRuc] = useState('');

  const handleRucChange = (inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, '').slice(0, 11);
    onChange(numericValue);

    if (numericValue === '') {
      setValidation(null);
      setLastValidatedRuc('');
      onValidation({ isValid: false, message: 'El RUC es obligatorio' });
      return;
    }

    if (validation && numericValue !== lastValidatedRuc) {
      setValidation(null);
      onValidation({ isValid: false, message: 'RUC modificado, necesita validación' });
    }
  };

  const handleValidate = async () => {
    if (value.length !== 11 || isValidating) return;

    setIsValidating(true);
    setValidation(null);

    try {
      onToast?.('warning', 'Consultando RUC en SUNAT...');
      
      const result = await sunatService.validateRuc(value);

      if (result.isValid) {
        onToast?.('success', '✓ RUC validado correctamente');
      } else {
        onToast?.('error', result.message);
      }

      setValidation(result);
      setLastValidatedRuc(value);
      onValidation(result);
    } catch {
      const errorResult: RucValidationResult = {
        isValid: false,
        message: 'Error al conectar con SUNAT. Intenta nuevamente.',
      };
      setValidation(errorResult);
      onValidation(errorResult);
      onToast?.('error', 'Error de conexión con SUNAT');
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
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        RUC <span className="text-red-500">*</span>
      </label>

      {/* Input with Validation Button */}
      <div className="flex gap-1">
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
              w-full h-10 pl-10 pr-4 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-all duration-200 font-mono
              ${disabled || isValidating
                ? 'bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-gray-400'
              }
              ${validation?.isValid
                ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                : validation?.isValid === false || error
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
        <Button
          type="button"
          onClick={handleValidate}
          disabled={value.length !== 11 || disabled || (validation?.isValid && value === lastValidatedRuc)}
          loading={isValidating}
          loadingText="Consultando SUNAT"
          variant={validation?.isValid && value === lastValidatedRuc ? "secondary" : "primary"}
          size="md"
          icon={validation?.isValid && value === lastValidatedRuc ? <CheckCircle2 /> : <Search />}
        >
          {validation?.isValid && value === lastValidatedRuc ? "Validado" : "Consultar SUNAT"}
        </Button>
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

      {/* Validation Success Message */}
      {validation?.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-green-900">✓ RUC Validado Correctamente</p>
              <p className="text-xs text-green-700 mt-0.5 leading-tight">{validation.message}</p>
              {validation.data && (
                <p className="text-xs text-green-700 mt-0.5 leading-tight">
                  SUNAT: {validation.data.razonSocial}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {validation?.isValid === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-900">Error de Validación</p>
              <p className="text-xs text-red-700 mt-0.5 leading-tight">{validation.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty RUC Warning */}
      {value === '' && !validation && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 mt-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          El RUC es obligatorio. Ingresa 11 dígitos para continuar
        </p>
      )}
    </div>
  );
}