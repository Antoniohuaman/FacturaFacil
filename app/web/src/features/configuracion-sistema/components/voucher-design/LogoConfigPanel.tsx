// ===================================================================
// LOGO CONFIGURATION PANEL - Rediseñado con Sliders
// ===================================================================

import React, { useRef } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';
import type { LogoConfiguration } from '../../models/VoucherDesignExtended';

interface LogoConfigPanelProps {
  config: LogoConfiguration;
  onChange: (config: LogoConfiguration) => void;
}

export const LogoConfigPanel: React.FC<LogoConfigPanelProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB');
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...config, url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onChange({ ...config, url: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Logo de la Empresa</h4>
          <p className="text-xs text-gray-600">
            Personaliza el logo que aparecerá en tus comprobantes
          </p>
        </div>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900">Mostrar Logo</p>
          <p className="text-xs text-gray-500">Incluir logo en el comprobante</p>
        </div>
        <button
          onClick={() => onChange({ ...config, enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            config.enabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {config.enabled && (
        <>
          {/* Layout Selector */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Diseño del Encabezado
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => onChange({ ...config, layout: 'horizontal' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  (config.layout || 'horizontal') === 'horizontal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div className="text-center">
                  <p className="text-sm font-medium">Horizontal</p>
                  <p className="text-xs text-gray-500 mt-1">3 columnas</p>
                </div>
              </button>
              <button
                onClick={() => onChange({ ...config, layout: 'vertical-logo-top' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  config.layout === 'vertical-logo-top'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div className="text-center">
                  <p className="text-sm font-medium">Logo Arriba</p>
                  <p className="text-xs text-gray-500 mt-1">Logo + Empresa</p>
                </div>
              </button>
              <button
                onClick={() => onChange({ ...config, layout: 'vertical-logo-bottom' })}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  config.layout === 'vertical-logo-bottom'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div className="text-center">
                  <p className="text-sm font-medium">Logo Abajo</p>
                  <p className="text-xs text-gray-500 mt-1">Empresa + Logo</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {(config.layout || 'horizontal') === 'horizontal'
                ? 'El logo se coloca en una de las tres columnas del encabezado'
                : 'El logo y la información de la empresa se apilan verticalmente ocupando más espacio horizontal'
              }
            </p>
          </div>

          {/* Upload Image */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Imagen del Logo
            </label>

            {config.url ? (
              <div className="relative">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border-2 border-blue-200">
                  <img
                    src={config.url}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain bg-white rounded border border-gray-200"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Logo cargado</p>
                    <p className="text-xs text-gray-500">Haz clic en cambiar para reemplazar</p>
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  Cambiar imagen
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Cargar logo</p>
                  <p className="text-xs text-gray-500">PNG, JPG hasta 2MB</p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="sr-only"
            />
          </div>

          {/* Width Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Ancho del Logo
              </label>
              <span className="text-sm font-semibold text-blue-600">
                {config.width}px
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="200"
              step="5"
              value={config.width}
              onChange={(e) => onChange({ ...config, width: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>40px</span>
              <span>120px</span>
              <span>200px</span>
            </div>
          </div>

          {/* Height Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Alto del Logo
              </label>
              <span className="text-sm font-semibold text-blue-600">
                {config.height}px
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="200"
              step="5"
              value={config.height}
              onChange={(e) => onChange({ ...config, height: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>40px</span>
              <span>120px</span>
              <span>200px</span>
            </div>
          </div>

          {/* Position */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {(config.layout || 'horizontal') === 'horizontal'
                ? 'Posición del Logo'
                : 'Posición del Bloque'
              }
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['left', 'center', 'right'] as const).map((position) => {
                const labels = { left: 'Izquierda', center: 'Centro', right: 'Derecha' };
                const isSelected = config.position === position;
                return (
                  <button
                    key={position}
                    onClick={() => onChange({ ...config, position })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}
                  >
                    <span className="text-sm font-medium">{labels[position]}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">
              {(config.layout || 'horizontal') === 'horizontal'
                ? 'En modo horizontal, determina en qué columna aparece el logo'
                : 'En modo vertical, determina si el bloque aparece a la izquierda o derecha del documento'
              }
            </p>
          </div>

          {/* Preview */}
          {config.url && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-3">Vista previa del logo:</p>
              <div className="bg-white p-4 rounded border border-gray-200 flex justify-center">
                <img
                  src={config.url}
                  alt="Logo preview"
                  style={{
                    width: `${config.width}px`,
                    height: `${config.height}px`,
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
