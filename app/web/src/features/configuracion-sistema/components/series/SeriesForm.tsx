// src/features/configuration/components/series/SeriesForm.tsx
import { useState, useEffect } from 'react';
import { X, FileText, Receipt, Clipboard, MessageSquare, Building2, Hash, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { Series } from '../../models/Series';
import type { Establishment } from '../../models/Establishment';
import { SettingsToggle } from '../common/SettingsToggle';

type VoucherType = 'INVOICE' | 'RECEIPT' | 'SALE_NOTE' | 'QUOTE';

interface SeriesFormData {
  type: VoucherType;
  series: string;
  establishmentId: string;
  initialNumber: number;
  currentNumber: number;
  isDefault: boolean;
  isActive: boolean;
}

interface SeriesFormProps {
  series?: Series;
  establishments: Establishment[];
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
  }
};

export function SeriesForm({
  series,
  establishments,
  existingSeries,
  onSubmit,
  onCancel,
  isLoading = false
}: SeriesFormProps) {
  const [formData, setFormData] = useState<SeriesFormData>({
    type: 'INVOICE',
    series: '',
    establishmentId: '',
    initialNumber: 1,
    currentNumber: 1,
    isDefault: false,
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (series) {
      setFormData({
        type: series.documentType.category as VoucherType,
        series: series.series,
        establishmentId: series.establishmentId,
        initialNumber: series.configuration.startNumber,
        currentNumber: series.correlativeNumber,
        isDefault: series.isDefault,
        isActive: series.isActive
      });
    } else {
      // Auto-generate series code for new series
      handleTypeChange('INVOICE');
    }
  }, [series, existingSeries]);

  const generateSeriesCode = (type: VoucherType): string => {
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
  };

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
        
        const config = voucherTypeConfig[formData.type];
        
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
          s.establishmentId === formData.establishmentId && 
          s.id !== series?.id
        );
        
        if (isDuplicate) {
          return 'Ya existe una serie con este código en el establecimiento seleccionado';
        }
        break;
      
      case 'establishmentId':
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
    const error = validateField(field, formData[field as keyof SeriesFormData]);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  const isFormValid = () => {
    const requiredFields = ['series', 'establishmentId', 'initialNumber'];
    
    for (const field of requiredFields) {
      const error = validateField(field, formData[field as keyof SeriesFormData]);
      if (error) return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = ['series', 'establishmentId', 'initialNumber'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof SeriesFormData]);
      if (error) newErrors[field] = error;
    });
    
    setErrors(newErrors);
    setTouchedFields(new Set(fieldsToValidate));
    
    if (Object.keys(newErrors).some(key => newErrors[key])) {
      return;
    }

    await onSubmit(formData);
  };

  const getEstablishmentName = (establishmentId: string) => {
    return establishments.find(est => est.id === establishmentId);
  };

  const hasDefaultInEstablishment = () => {
    return existingSeries.some(s => 
      s.documentType.category === formData.type && 
      s.establishmentId === formData.establishmentId && 
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Voucher Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Comprobante *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(voucherTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                const isSelected = formData.type === type;
                
                return (
                  <div key={type}>
                    <input
                      type="radio"
                      id={type}
                      name="type"
                      checked={isSelected}
                      onChange={() => handleTypeChange(type as VoucherType)}
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor={type}
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
                        <Icon className={`w-5 h-5 ${
                          isSelected ? `text-${config.color}-600` : 'text-gray-500'
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Serie *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.series}
                  onChange={(e) => handleFieldChange('series', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('series')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                    errors.series && touchedFields.has('series')
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder={voucherTypeConfig[formData.type].examples[0]}
                  maxLength={4}
                  disabled={isLoading}
                />
              </div>
              
              {errors.series && touchedFields.has('series') && (
                <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.series}</span>
                </p>
              )}
              
              <div className="mt-2">
                <p className="text-xs text-gray-600">{voucherTypeConfig[formData.type].rules}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ejemplos: {voucherTypeConfig[formData.type].examples.join(', ')}
                </p>
              </div>
            </div>

            {/* Establishment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Establecimiento *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <select
                  value={formData.establishmentId}
                  onChange={(e) => handleFieldChange('establishmentId', e.target.value)}
                  onBlur={() => handleBlur('establishmentId')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.establishmentId && touchedFields.has('establishmentId')
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                >
                  <option value="">Seleccionar establecimiento</option>
                  {establishments
                    .filter(est => est.isActive)
                    .map(est => (
                      <option key={est.id} value={est.id}>
                        {est.code} - {est.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {errors.establishmentId && touchedFields.has('establishmentId') && (
                <p className="text-sm text-red-600 mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.establishmentId}</span>
                </p>
              )}
            </div>
          </div>

          {/* Correlative Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número Inicial *
              </label>
              <input
                type="number"
                value={formData.initialNumber}
                onChange={(e) => handleFieldChange('initialNumber', parseInt(e.target.value) || 1)}
                onBlur={() => handleBlur('initialNumber')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                  errors.initialNumber && touchedFields.has('initialNumber')
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                min="1"
                max="99999999"
                disabled={isLoading}
              />
              
              {errors.initialNumber && touchedFields.has('initialNumber') && (
                <p className="text-sm text-red-600 mt-1">{errors.initialNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número Actual
              </label>
              <input
                type="number"
                value={formData.currentNumber}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                {series ? 'No se puede modificar en series existentes' : 'Se ajusta automáticamente al número inicial'}
              </p>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <SettingsToggle
                enabled={formData.isDefault}
                onToggle={(enabled) => handleFieldChange('isDefault', enabled)}
                label="Serie por Defecto"
                description={`Se selecciona automáticamente para ${voucherTypeConfig[formData.type].label} en este establecimiento`}
                disabled={isLoading || (!formData.establishmentId)}
              />
              
              {hasDefaultInEstablishment() && formData.isDefault && (
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
                enabled={formData.isActive}
                onToggle={(enabled) => handleFieldChange('isActive', enabled)}
                label="Serie Activa"
                description="Solo las series activas pueden usarse para emitir documentos"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Preview */}
          {formData.series && formData.establishmentId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Vista Previa de la Serie</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700"><strong>Serie completa:</strong></p>
                  <p className="font-mono text-lg font-bold text-blue-900">
                    {formData.series}-{formData.currentNumber.toString().padStart(8, '0')}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700"><strong>Establecimiento:</strong></p>
                  <p className="text-blue-900">
                    {getEstablishmentName(formData.establishmentId)?.name || 'No seleccionado'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
            >
              {isLoading && (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{series ? 'Actualizar Serie' : 'Crear Serie'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}