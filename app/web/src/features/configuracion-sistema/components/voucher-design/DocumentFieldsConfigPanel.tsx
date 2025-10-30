/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// DOCUMENT FIELDS CONFIGURATION PANEL
// Componente para configurar campos visibles del documento
// ===================================================================

import React from 'react';
import { FileText, Eye, EyeOff } from 'lucide-react';
import type { DocumentFieldsConfiguration } from '../../models/VoucherDesignExtended';

interface DocumentFieldsConfigPanelProps {
  config: DocumentFieldsConfiguration;
  onChange: (config: DocumentFieldsConfiguration) => void;
}

export const DocumentFieldsConfigPanel: React.FC<DocumentFieldsConfigPanelProps> = ({
  config,
  onChange
}) => {
  const fields = Object.keys(config) as Array<keyof DocumentFieldsConfiguration>;

  const toggleField = (fieldKey: keyof DocumentFieldsConfiguration) => {
    onChange({
      ...config,
      [fieldKey]: {
        ...config[fieldKey],
        visible: !config[fieldKey].visible,
      },
    });
  };

  const updateLabel = (fieldKey: keyof DocumentFieldsConfiguration, label: string) => {
    onChange({
      ...config,
      [fieldKey]: {
        ...config[fieldKey],
        label,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Campos del Documento</h4>
          <p className="text-xs text-gray-600">
            Selecciona qué campos mostrar en el comprobante impreso
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800 flex items-start gap-2">
          <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Los campos seleccionados aparecerán en el comprobante impreso.
            Puedes personalizar las etiquetas haciendo clic en editar.
          </span>
        </p>
      </div>

      {/* Fields List */}
      <div className="space-y-2">
        {fields.map((fieldKey) => {
          const field = config[fieldKey];
          const isVisible = field.visible;

          return (
            <div
              key={fieldKey}
              className={`group relative p-4 border-2 rounded-lg transition-all ${
                isVisible
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Toggle Visibility */}
                <button
                  onClick={() => toggleField(fieldKey)}
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isVisible
                      ? 'bg-blue-100 text-blue-600'
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
                    placeholder="Nombre del campo"
                  />
                  <p className="text-xs text-gray-500 mt-0.5">
                    Campo: {fieldKey}
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
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={() => {
            const allVisible: DocumentFieldsConfiguration = {} as any;
            fields.forEach((key) => {
              allVisible[key] = { ...config[key], visible: true };
            });
            onChange(allVisible);
          }}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          Mostrar Todos
        </button>
        <button
          onClick={() => {
            const allHidden: DocumentFieldsConfiguration = {} as any;
            fields.forEach((key) => {
              allHidden[key] = { ...config[key], visible: false };
            });
            onChange(allHidden);
          }}
          className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
        >
          Ocultar Todos
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-blue-600">
            {fields.filter((k) => config[k].visible).length}
          </span>
          {' '}de{' '}
          <span className="font-semibold">
            {fields.length}
          </span>
          {' '}campos visibles
        </p>
      </div>
    </div>
  );
};
