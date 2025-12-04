/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// PRODUCT FIELDS CONFIGURATION PANEL
// Componente para configurar campos de la tabla de productos
// ===================================================================

import React from 'react';
import { Package, Eye, EyeOff, ChevronRight } from 'lucide-react';
import type { ProductFieldsConfiguration } from '../../models/VoucherDesignUnified';

interface ProductFieldsConfigPanelProps {
  config: ProductFieldsConfiguration;
  onChange: (config: ProductFieldsConfiguration) => void;
}

export const ProductFieldsConfigPanel: React.FC<ProductFieldsConfigPanelProps> = ({
  config,
  onChange
}) => {
  const fields = Object.keys(config) as Array<keyof ProductFieldsConfiguration>;

  const toggleField = (fieldKey: keyof ProductFieldsConfiguration) => {
    const newVisible = !config[fieldKey].visible;
    const visibleCount = fields.filter(k => config[k].visible).length;

    // Validación: al menos una columna debe estar visible
    if (!newVisible && visibleCount <= 1) {
      alert('Debe haber al menos una columna visible en la tabla de productos');
      return;
    }

    // Validación: máximo 7 columnas visibles
    if (newVisible && visibleCount >= 7) {
      alert('Máximo 7 columnas visibles permitidas. Desactiva una columna antes de activar otra.');
      return;
    }

    onChange({
      ...config,
      [fieldKey]: {
        ...config[fieldKey],
        visible: newVisible,
      },
    });
  };

  const updateLabel = (fieldKey: keyof ProductFieldsConfiguration, label: string) => {
    onChange({
      ...config,
      [fieldKey]: {
        ...config[fieldKey],
        label,
      },
    });
  };

  const updateWidth = (fieldKey: keyof ProductFieldsConfiguration, width: number) => {
    onChange({
      ...config,
      [fieldKey]: {
        ...config[fieldKey],
        width,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Columnas de Productos</h4>
          <p className="text-xs text-gray-600">
            Configura qué columnas mostrar en la tabla de productos
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-xs text-emerald-800 flex items-start gap-2">
          <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Máximo 7 columnas visibles.</strong> Las columnas por defecto (N°, Cantidad, Descripción, U.M., P. Unitario, Total) mantienen el orden óptimo.
            Puedes agregar 1 columna adicional desactivando otra.
          </span>
        </p>
      </div>

      {/* Fields List */}
      <div className="space-y-2">
        {fields.map((fieldKey) => {
          const field = config[fieldKey];
          const isVisible = field.visible;
          const isDefault = ['numero', 'cantidad', 'descripcion', 'unidadMedida', 'precioUnitario', 'total'].includes(fieldKey);
          const visibleCount = fields.filter(k => config[k].visible).length;

          return (
            <div
              key={fieldKey}
              className={`group relative border-2 rounded-lg transition-all ${
                isVisible
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  {/* Toggle Visibility */}
                  <button
                    onClick={() => toggleField(fieldKey)}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      isVisible
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {isVisible ? (
                      <Eye className="w-5 h-5" />
                    ) : (
                      <EyeOff className="w-5 h-5" />
                    )}
                  </button>

                  {/* Field Info */}
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateLabel(fieldKey, e.target.value)}
                      disabled={!isVisible}
                      className={`w-full text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0 ${
                        isVisible
                          ? 'text-gray-900'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      placeholder="Nombre de la columna"
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Campo: {fieldKey}
                      {isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                          Por Defecto
                        </span>
                      )}
                      {visibleCount >= 7 && !isVisible && (
                        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                          Límite alcanzado
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isVisible
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isVisible ? 'Visible' : 'Oculto'}
                  </span>
                </div>

                {/* Width Control - Only shown when visible */}
                {isVisible && (
                  <div className="flex items-center gap-3 ml-[52px] pt-3 border-t border-emerald-200">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <ChevronRight className="w-4 h-4 text-emerald-600" />
                      <label className="text-xs font-medium text-gray-700">
                        Ancho:
                      </label>
                      <span className="text-xs font-semibold text-emerald-600 min-w-[40px]">
                        {field.width}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="400"
                      step="10"
                      value={field.width}
                      onChange={(e) => updateWidth(fieldKey, parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            const allVisible: ProductFieldsConfiguration = {} as any;
            fields.forEach((key) => {
              allVisible[key] = { ...config[key], visible: true };
            });
            onChange(allVisible);
          }}
          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          Mostrar Todas
        </button>
        <button
          onClick={() => {
            const onlyDefaults: ProductFieldsConfiguration = {} as any;
            fields.forEach((key) => {
              const isDefault = ['numero', 'cantidad', 'descripcion', 'unidadMedida', 'precioUnitario', 'total'].includes(key);
              onlyDefaults[key] = { ...config[key], visible: isDefault };
            });
            onChange(onlyDefaults);
          }}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Restaurar Por Defecto
        </button>
        <button
          onClick={() => {
            alert('Debe haber al menos una columna visible. Use "Restaurar Por Defecto" para volver a la configuración inicial.');
          }}
          disabled
          className="flex-1 px-4 py-2.5 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium text-sm"
          title="No se puede ocultar todas las columnas"
        >
          Ocultar Todas
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-emerald-600">
            {fields.filter((k) => config[k].visible).length}
          </span>
          {' '}de{' '}
          <span className="font-semibold">
            {fields.length}
          </span>
          {' '}columnas visibles
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Ancho total aproximado:{' '}
          <span className="font-semibold text-emerald-600">
            {fields
              .filter((k) => config[k].visible)
              .reduce((sum, k) => sum + config[k].width, 0)}px
          </span>
        </p>
      </div>
    </div>
  );
};
