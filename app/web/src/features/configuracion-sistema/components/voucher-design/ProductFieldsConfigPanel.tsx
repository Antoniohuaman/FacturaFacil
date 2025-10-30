/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// PRODUCT FIELDS CONFIGURATION PANEL
// Componente para configurar campos de la tabla de productos
// ===================================================================

import React from 'react';
import { Package, Eye, EyeOff, ChevronRight } from 'lucide-react';
import type { ProductFieldsConfiguration } from '../../models/VoucherDesignExtended';

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
    onChange({
      ...config,
      [fieldKey]: {
        ...config[fieldKey],
        visible: !config[fieldKey].visible,
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
            Selecciona las columnas a mostrar y ajusta sus anchos. Las columnas básicas
            (Descripción, Cantidad, P. Unitario, Total) se recomiendan mantener siempre visibles.
          </span>
        </p>
      </div>

      {/* Fields List */}
      <div className="space-y-2">
        {fields.map((fieldKey) => {
          const field = config[fieldKey];
          const isVisible = field.visible;
          const isEssential = ['descripcion', 'cantidad', 'precioUnitario', 'total'].includes(fieldKey);

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
                      {isEssential && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium">
                          Recomendado
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
            const onlyEssential: ProductFieldsConfiguration = {} as any;
            fields.forEach((key) => {
              const isEssential = ['descripcion', 'cantidad', 'precioUnitario', 'total'].includes(key);
              onlyEssential[key] = { ...config[key], visible: isEssential };
            });
            onChange(onlyEssential);
          }}
          className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
        >
          Solo Esenciales
        </button>
        <button
          onClick={() => {
            const allHidden: ProductFieldsConfiguration = {} as any;
            fields.forEach((key) => {
              allHidden[key] = { ...config[key], visible: false };
            });
            onChange(allHidden);
          }}
          className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
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
