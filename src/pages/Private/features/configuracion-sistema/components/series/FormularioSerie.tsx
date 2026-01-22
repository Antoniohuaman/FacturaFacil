/* eslint-disable no-case-declarations -- switch con declaraciones; refactor diferido */
/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/components/series/SeriesForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { X, FileText, Receipt, Clipboard, MessageSquare, Hash, CheckCircle, Info, NotebookPen } from 'lucide-react';
import { Input, Button, RadioButton, Select } from '@/contasis';
import type { Series } from '../../modelos/Series';
import type { Establecimiento } from '../../modelos/Establecimiento';
import { InterruptorConfiguracion as SettingsToggle } from '../comunes/InterruptorConfiguracion';

type VoucherType = 'INVOICE' | 'RECEIPT' | 'SALE_NOTE' | 'QUOTE' | 'COLLECTION';

interface SeriesFormData {
  type: VoucherType;
  series: string;
  EstablecimientoId: string;
  initialNumber: number;
  currentNumber: number;
  isDefault: boolean;
  isActive: boolean;
}

interface SeriesFormProps {
  series?: Series;
  Establecimientos: Establecimiento[];
  existingSeries: Series[];
  onSubmit: (data: SeriesFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const voucherTypeConfig = {
  INVOICE: {
    label: 'Factura Electrónica',
    icon: FileText,
    color: 'blue',
    prefix: 'F',
    description: 'Para ventas a empresas con RUC',
    rules: 'Debe comenzar con "F" seguido de 3 dígitos (ej: F001)',
    examples: ['F001', 'F002', 'F010']
  },
  RECEIPT: {
    label: 'Boleta Electrónica',
    icon: Receipt,
    color: 'green',
    prefix: 'B',
    description: 'Para ventas a consumidores finales',
    rules: 'Debe comenzar con "B" seguido de 3 dígitos (ej: B001)',
    examples: ['B001', 'B002', 'B010']
  },
  SALE_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    prefix: '',
    description: 'Documento interno sin validez tributaria',
    rules: 'Código libre de 4 caracteres (letras y números)',
    examples: ['NV01', 'NOTA', 'SN01']
  },
  QUOTE: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    prefix: '',
    description: 'Propuesta comercial para clientes',
    rules: 'Código libre de 4 caracteres (letras y números)',
    examples: ['COT1', 'PRES', 'QT01']
  },
  COLLECTION: {
    label: 'Recibo de Cobranza',
    icon: NotebookPen,
    color: 'cyan',
    prefix: 'C',
    description: 'Pagos registrados en caja',
    rules: 'Debe comenzar con "C" seguido de 3 caracteres',
    examples: ['C001', 'C123', 'CABC']
  }
};

export function SeriesForm({
  series,
  Establecimientos,
  existingSeries,
  onSubmit,
  onCancel,
  isLoading = false
}: SeriesFormProps) {
  const [datosFormulario, setFormData] = useState<SeriesFormData>({
    type: 'INVOICE',
    series: '',
    EstablecimientoId: '',
    initialNumber: 1,
    currentNumber: 1,
    isDefault: false,
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const generateSeriesCode = useCallback((type: VoucherType): string => {
    const config = voucherTypeConfig[type];

    if (!config.prefix) {
      // For SALE_NOTE and QUOTE, suggest a pattern
      const patterns = {
        SALE_NOTE: ['NV01', 'NOTA', 'SN01'],
        QUOTE: ['COT1', 'PRES', 'QT01']
      };
      const suggestions = patterns[type as keyof typeof patterns];

      // Find first available suggestion
      for (const suggestion of suggestions) {
        if (!existingSeries.some(s => s.series === suggestion)) {
          return suggestion;
        }
      }
      return '';
    }

    // For INVOICE and RECEIPT, find next available number
    const existingNumbers = existingSeries
      .filter(s => s.documentType.category === type && s.series.startsWith(config.prefix))
      .map(s => parseInt(s.series.substring(1)) || 0);

    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    return `${config.prefix}${nextNumber.toString().padStart(3, '0')}`;
  }, [existingSeries]);

  useEffect(() => {
    if (series) {
      setFormData({
        type: series.documentType.category as VoucherType,
        series: series.series,
        EstablecimientoId: series.EstablecimientoId,
        initialNumber: series.configuration.startNumber,
        currentNumber: series.correlativeNumber,
        isDefault: series.isDefault,
        isActive: series.isActive
      });
    } else {
      // Auto-generate series code for new series
      setFormData(prev => ({
        ...prev,
        type: 'INVOICE',
        series: generateSeriesCode('INVOICE'),
      }));
    }
  }, [series, generateSeriesCode]);

  const handleTypeChange = (type: VoucherType) => {
    const newSeries = generateSeriesCode(type);
    setFormData(prev => ({
      ...prev,
      type,
      series: newSeries
    }));

    // Clear series-related errors
    const newErrors = { ...errors };
    delete newErrors.series;
    setErrors(newErrors);
  };

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'series':
        if (!value || value.trim() === '') {
          return 'El código de serie es obligatorio';
        }

        const config = voucherTypeConfig[datosFormulario.type];

        // Check prefix for INVOICE/RECEIPT
        if (config.prefix && !value.startsWith(config.prefix)) {
          return `Debe comenzar con "${config.prefix}" para ${config.label}`;
        }

        // Check length for SALE_NOTE/QUOTE
        if (!config.prefix && value.length !== 4) {
          return `Debe tener exactamente 4 caracteres para ${config.label}`;
        }

        // Check for duplicates
        const isDuplicate = existingSeries.some(s =>
          s.series === value &&
          s.EstablecimientoId === datosFormulario.EstablecimientoId &&
          s.id !== series?.id
        );

        if (isDuplicate) {
          return 'Ya existe una serie con este código en el establecimiento seleccionado';
        }
        break;

      case 'EstablecimientoId':
        if (!value) {
          return 'Debe seleccionar un establecimiento';
        }
        break;

      case 'initialNumber':
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Debe ser un número mayor a 0';
        }
        if (num > 99999999) {
          return 'No puede ser mayor a 99,999,999';
        }
        break;
    }

    return null;
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => new Set(prev).add(field));

    // Validate field
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));

    // Special handling for initialNumber change
    if (field === 'initialNumber' && !series) {
      setFormData(prev => ({
        ...prev,
        currentNumber: parseInt(value) || 1
      }));
    }
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
    const error = validateField(field, datosFormulario[field as keyof SeriesFormData]);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const isFormValid = () => {
    const requiredFields = ['series', 'EstablecimientoId', 'initialNumber'];

    for (const field of requiredFields) {
      const error = validateField(field, datosFormulario[field as keyof SeriesFormData]);
      if (error) return false;
    }

    return true;
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = ['series', 'EstablecimientoId', 'initialNumber'];

    fieldsToValidate.forEach(field => {
      const error = validateField(field, datosFormulario[field as keyof SeriesFormData]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    setTouchedFields(new Set(fieldsToValidate));

    if (Object.keys(newErrors).some(key => newErrors[key])) {
      return;
    }

    await onSubmit(datosFormulario);
  };

  const getEstablecimientoName = (EstablecimientoId: string) => {
    return Establecimientos.find(est => est.id === EstablecimientoId);
  };

  const hasDefaultInEstablecimiento = () => {
    return existingSeries.some(s =>
      s.documentType.category === datosFormulario.type &&
      s.EstablecimientoId === datosFormulario.EstablecimientoId &&
      s.isDefault &&
      s.id !== series?.id
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {series ? 'Editar Serie' : 'Nueva Serie'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {series ? 'Modifica los datos de la serie' : 'Crea una nueva serie de comprobantes'}
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={manejarEnvio} className="p-6 space-y-6">
          {/* Voucher Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Comprobante *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(voucherTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                const isSelected = datosFormulario.type === type;

                return (
                  <div key={type}>
                    <label
                      className={`
                        block p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected
                          ? `border-${config.color}-500 bg-${config.color}-50`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioButton
                          name="type"
                          value={type}
                          checked={isSelected}
                          onChange={() => handleTypeChange(type as VoucherType)}
                          disabled={isLoading}
                        />
                        <Icon className={`w-5 h-5 ${isSelected ? `text-${config.color}-600` : 'text-gray-500'
                          }`} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{config.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{config.description}</div>
                        </div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Series Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Series Code */}
            <div>
              <Input
                label="Código de Serie *"
                type="text"
                value={datosFormulario.series}
                onChange={(e) => handleFieldChange('series', e.target.value.toUpperCase())}
                onBlur={() => handleBlur('series')}
                error={errors.series && touchedFields.has('series') ? errors.series : undefined}
                placeholder={voucherTypeConfig[datosFormulario.type].examples[0]}
                maxLength={4}
                disabled={isLoading}
                leftIcon={<Hash />}
                className="font-mono"
              />

              <div className="mt-2">
                <p className="text-xs text-gray-600">{voucherTypeConfig[datosFormulario.type].rules}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplos: {voucherTypeConfig[datosFormulario.type].examples.join(', ')}
                </p>
              </div>
            </div>

            {/* Establecimiento */}
            <Select
              label="Establecimiento *"
              value={datosFormulario.EstablecimientoId}
              onChange={(e) => handleFieldChange('EstablecimientoId', e.target.value)}
              onBlur={() => handleBlur('EstablecimientoId')}
              error={errors.EstablecimientoId && touchedFields.has('EstablecimientoId') ? errors.EstablecimientoId : undefined}
              disabled={isLoading}
              options={[
                { value: '', label: 'Seleccionar establecimiento' },
                ...Establecimientos
                  .filter(est => est.estaActivoEstablecimiento)
                  .map(est => ({
                    value: est.id,
                    label: `${est.codigoEstablecimiento} - ${est.nombreEstablecimiento}`
                  }))
              ]}
            />
          </div>

          {/* Correlative Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número Inicial *"
              type="number"
              value={datosFormulario.initialNumber}
              onChange={(e) => handleFieldChange('initialNumber', parseInt(e.target.value) || 1)}
              onBlur={() => handleBlur('initialNumber')}
              error={errors.initialNumber && touchedFields.has('initialNumber') ? errors.initialNumber : undefined}
              min={1}
              max={99999999}
              disabled={isLoading}
              className="font-mono"
            />

            <Input
              label="Número Actual"
              type="number"
              value={datosFormulario.currentNumber}
              disabled
              className="font-mono"
              helperText={series ? 'No se puede modificar en series existentes' : 'Se ajusta automáticamente al número inicial'}
            />
          </div>

          {/* Configuration Options */}
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <SettingsToggle
                enabled={datosFormulario.isDefault}
                onToggle={(enabled: boolean) => handleFieldChange('isDefault', enabled)}
                label="Serie por Defecto"
                description={`Se selecciona automáticamente para ${voucherTypeConfig[datosFormulario.type].label} en este establecimiento`}
                disabled={isLoading || (!datosFormulario.EstablecimientoId)}
              />

              {hasDefaultInEstablecimiento() && datosFormulario.isDefault && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Al marcar esta serie como por defecto, se desmarcará la serie actual por defecto para este tipo de comprobante.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <SettingsToggle
                enabled={datosFormulario.isActive}
                onToggle={(enabled: boolean) => handleFieldChange('isActive', enabled)}
                label="Serie Activa"
                description="Solo las series activas pueden usarse para emitir documentos"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Preview */}
          {datosFormulario.series && datosFormulario.EstablecimientoId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Vista Previa de la Serie</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700"><strong>Serie completa:</strong></p>
                  <p className="font-mono text-lg font-bold text-blue-900">
                    {datosFormulario.series}-{datosFormulario.currentNumber.toString().padStart(8, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700"><strong>Establecimiento:</strong></p>
                  <p className="text-blue-900">
                    {getEstablecimientoName(datosFormulario.EstablecimientoId)?.nombreEstablecimiento || 'No seleccionado'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || isLoading}
              variant="primary"
            >
              {isLoading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{series ? 'Actualizar' : 'Crear'} Serie</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

