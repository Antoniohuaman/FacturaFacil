import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Search, Building2 } from 'lucide-react';
import { Button } from '@/contasis';
import {
  servicioConsultaDocumentos,
  type DatosConsultaRuc,
} from '@/shared/documentos/servicioConsultaDocumentos';

interface ResultadoValidacionRuc {
  isValid: boolean;
  message: string;
  data?: DatosConsultaRuc;
}

interface RucValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (result: ResultadoValidacionRuc) => void;
  disabled?: boolean;
}

export function RucValidator({ value, onChange, onValidation, disabled = false }: RucValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<ResultadoValidacionRuc | null>(null);
  const [lastValidatedRuc, setLastValidatedRuc] = useState('');

  const handleRucChange = (inputValue: string) => {
    const numericValue = inputValue.replace(/\D/g, '').slice(0, 11);
    onChange(numericValue);

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
      const response = await servicioConsultaDocumentos.consultarRuc(value);
      const result: ResultadoValidacionRuc = response.success && response.data
        ? {
            isValid: true,
            message: 'RUC válido. Datos completados automáticamente desde SUNAT.',
            data: response.data,
          }
        : {
            isValid: false,
            message: response.message || 'No se pudo obtener información válida desde SUNAT.',
          };

      setValidation(result);
      if (result.isValid) {
        setLastValidatedRuc(value);
      }
      onValidation(result);
    } catch {
      const errorResult: ResultadoValidacionRuc = {
        isValid: false,
        message: 'Error al conectar con SUNAT. Intenta nuevamente.',
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
    void handleValidate();
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        RUC <span className="text-red-500">*</span>
      </label>

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
                : validation?.isValid === false
                  ? 'border-red-400 bg-red-50 ring-2 ring-red-200'
                  : ''
              }
            `}
            maxLength={11}
          />

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

        <Button
          type="button"
          onClick={() => void handleValidate()}
          disabled={value.length !== 11 || disabled || (validation?.isValid && value === lastValidatedRuc)}
          loading={isValidating}
          loadingText="Consultando SUNAT"
          variant={validation?.isValid && value === lastValidatedRuc ? 'secondary' : 'primary'}
          size="md"
          icon={validation?.isValid && value === lastValidatedRuc ? <CheckCircle2 /> : <Search />}
        >
          {validation?.isValid && value === lastValidatedRuc ? 'Validado' : 'Consultar SUNAT'}
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
    </div>
  );
}