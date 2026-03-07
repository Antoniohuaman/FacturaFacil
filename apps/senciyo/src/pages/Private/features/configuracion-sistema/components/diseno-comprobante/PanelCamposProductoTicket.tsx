// ===================================================================
// TICKET PRODUCT FIELDS CONFIGURATION PANEL
// Componente para configurar columnas de productos del Ticket
// ===================================================================

import React from 'react';
import { Package, Eye, EyeOff } from 'lucide-react';
import type { VoucherDesignTicketConfig } from '../../modelos/VoucherDesignUnified';

interface TicketProductFieldsConfigPanelProps {
  config: VoucherDesignTicketConfig['productFields'];
  onChange: (config: VoucherDesignTicketConfig['productFields']) => void;
}

export const TicketProductFieldsConfigPanel: React.FC<TicketProductFieldsConfigPanelProps> = ({
  config,
  onChange,
}) => {
  const fields = Object.keys(config) as Array<keyof VoucherDesignTicketConfig['productFields']>;

  const toggleField = (fieldKey: keyof VoucherDesignTicketConfig['productFields']) => {
    const newVisible = !config[fieldKey].visible;
    const visibleCount = fields.filter((k) => config[k].visible).length;

    if (!newVisible && visibleCount <= 1) {
      alert('Debe haber al menos una columna visible en el ticket');
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

  const updateDescripcionMaxLength = (maxLength: number) => {
    onChange({
      ...config,
      descripcion: {
        ...config.descripcion,
        maxLength,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
        <div className="w-9 h-9 bg-emerald-100 rounded-md flex items-center justify-center">
          <Package className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900">Columnas del Ticket</h4>
          <p className="text-[11px] text-gray-600">
            Activa o desactiva las columnas que aparecerán en el ticket
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-[11px] text-emerald-800 leading-snug">
          Las columnas se adaptan automáticamente al ancho del papel.
          Puedes limitar la longitud de la descripción para evitar cortes.
        </p>
      </div>

      {/* Fields List */}
      <div className="space-y-1.5">
        {fields.map((fieldKey) => {
          const field = config[fieldKey];
          const isVisible = field.visible;

          return (
            <div
              key={fieldKey}
              className={`group relative p-3.5 border rounded-lg transition-all flex items-center gap-3 ${
                isVisible
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <button
                onClick={() => toggleField(fieldKey)}
                className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  isVisible
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-medium ${
                    isVisible ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {fieldKey === 'numero'
                    ? 'N°'
                    : fieldKey === 'codigo'
                    ? 'Código'
                    : fieldKey === 'descripcion'
                    ? 'Descripción'
                    : fieldKey === 'cantidad'
                    ? 'Cantidad'
                    : fieldKey === 'precioUnitario'
                    ? 'Precio Unitario'
                    : fieldKey === 'descuento'
                    ? 'Descuento'
                    : fieldKey === 'total'
                    ? 'Total'
                    : fieldKey === 'codigoBarras'
                    ? 'Código de Barras'
                    : fieldKey === 'marca'
                    ? 'Marca'
                    : fieldKey}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">Campo: {fieldKey}</p>
              </div>

              <span
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isVisible ? 'Visible' : 'Oculto'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Extra config for descripcion */}
      <div className="mt-3 p-3.5 bg-white border border-gray-200 rounded-lg">
        <p className="text-[11px] font-semibold text-gray-700 mb-1.5">Longitud de la descripción</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={60}
            step={2}
            value={config.descripcion.maxLength}
            onChange={(e) => updateDescripcionMaxLength(Number(e.target.value))}
            className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-emerald-600"
          />
          <span className="text-[11px] font-semibold text-emerald-700 min-w-[56px] text-right">
            {config.descripcion.maxLength} carac.
          </span>
        </div>
      </div>
    </div>
  );
};
