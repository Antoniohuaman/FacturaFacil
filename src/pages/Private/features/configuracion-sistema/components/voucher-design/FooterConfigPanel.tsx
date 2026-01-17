// ===================================================================
// FOOTER CONFIGURATION PANEL
// Componente para configurar el pie de página del comprobante
// ===================================================================

import React from 'react';
import { FileText } from 'lucide-react';
import type { FooterConfiguration } from '../../models/VoucherDesignUnified';

interface FooterConfigPanelProps {
  config: FooterConfiguration;
  onChange: (config: FooterConfiguration) => void;
}

export const FooterConfigPanel: React.FC<FooterConfigPanelProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            config.enabled ? 'bg-green-100' : 'bg-gray-200'
          }`}>
            <FileText className={`w-5 h-5 ${config.enabled ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Pie de Página</h4>
            <p className="text-xs text-gray-500">Mostrar pie de página personalizado</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Mostrar Texto Personalizado */}
          <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <label className="text-sm font-medium text-gray-700">
              Mostrar Texto Personalizado
            </label>
            <input
              type="checkbox"
              checked={config.showCustomText}
              onChange={(e) => onChange({ ...config, showCustomText: e.target.checked })}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
          </div>

          {config.showCustomText && (
            <>
              {/* Texto Personalizado */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Texto del Pie de Página
                </label>
                <textarea
                  value={config.customText}
                  onChange={(e) => onChange({ ...config, customText: e.target.value })}
                  rows={3}
                  placeholder="Ej: Gracias por su preferencia..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500">
                  Este texto aparecerá al final del comprobante
                </p>
              </div>

              {/* Alineación */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Alineación del Texto
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['left', 'center', 'right'] as const).map((alignment) => (
                    <button
                      key={alignment}
                      onClick={() => onChange({ ...config, textAlignment: alignment })}
                      className={`p-3 border-2 rounded-lg transition-all text-center ${
                        config.textAlignment === alignment
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {alignment === 'left' ? 'Izquierda' : alignment === 'center' ? 'Centro' : 'Derecha'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tamaño de Fuente */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Tamaño de Fuente
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => onChange({ ...config, fontSize: size })}
                      className={`p-3 border-2 rounded-lg transition-all text-center ${
                        config.fontSize === size
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <p className={`font-medium ${
                        size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'
                      }`}>
                        {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Peso de Fuente */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Estilo del Texto
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['normal', 'bold'] as const).map((weight) => (
                    <button
                      key={weight}
                      onClick={() => onChange({ ...config, fontWeight: weight })}
                      className={`p-3 border-2 rounded-lg transition-all text-center ${
                        config.fontWeight === weight
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <p className={`text-sm ${weight === 'bold' ? 'font-bold' : 'font-normal'}`}>
                        {weight === 'normal' ? 'Normal' : 'Negrita'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colores (Opcional) */}
              <details className="border border-gray-200 rounded-lg">
                <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-medium text-sm text-gray-700">
                  Colores Personalizados (Opcional)
                </summary>
                <div className="p-4 border-t border-gray-200 space-y-4">
                  {/* Color de Fondo */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">
                      Color de Fondo
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.backgroundColor || '#ffffff'}
                        onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.backgroundColor || '#ffffff'}
                        onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      />
                    </div>
                  </div>

                  {/* Color de Texto */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">
                      Color de Texto
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.textColor || '#000000'}
                        onChange={(e) => onChange({ ...config, textColor: e.target.value })}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.textColor || '#000000'}
                        onChange={(e) => onChange({ ...config, textColor: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {/* Espaciado */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Espaciado Interno (Padding)
                  </label>
                  <span className="text-sm font-semibold text-green-600">
                    {config.padding}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="5"
                  value={config.padding}
                  onChange={(e) => onChange({ ...config, padding: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
