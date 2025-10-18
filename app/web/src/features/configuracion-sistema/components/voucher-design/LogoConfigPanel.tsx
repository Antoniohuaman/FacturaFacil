// ===================================================================
// LOGO CONFIGURATION PANEL
// Componente para configurar el logo del comprobante
// ===================================================================

import React, { useRef } from 'react';
import { Image, Upload, X, Check } from 'lucide-react';
import type { LogoConfiguration } from '../../models/VoucherDesignExtended';

interface LogoConfigPanelProps {
  config: LogoConfiguration;
  onChange: (config: LogoConfiguration) => void;
}

export const LogoConfigPanel: React.FC<LogoConfigPanelProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño máximo (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB');
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      onChange({ ...config, url: imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    onChange({ ...config, url: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSizeLabel = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 'Pequeño (60×60)';
      case 'medium': return 'Mediano (100×100)';
      case 'large': return 'Grande (150×150)';
    }
  };

  const getOrientationLabel = (orientation: 'square' | 'vertical' | 'horizontal') => {
    switch (orientation) {
      case 'square': return 'Cuadrado (1:1)';
      case 'vertical': return 'Vertical (2:3)';
      case 'horizontal': return 'Horizontal (3:2)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable Logo */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            config.enabled ? 'bg-blue-100' : 'bg-gray-200'
          }`}>
            <Image className={`w-5 h-5 ${config.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Logo de la Empresa</h4>
            <p className="text-xs text-gray-500">Mostrar logo en el comprobante</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Logo Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Imagen del Logo
            </label>

            {config.url ? (
              <div className="relative group">
                <div className="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img
                    src={config.url}
                    alt="Logo"
                    className="w-20 h-20 object-contain rounded border border-gray-200"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Logo cargado</p>
                    <p className="text-xs text-gray-500">Haz clic para cambiar o eliminar</p>
                  </div>
                  <button
                    onClick={handleRemoveLogo}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar logo"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                    Haz clic para cargar logo
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG o SVG (máx. 2MB)
                  </p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Tamaño del Logo */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Tamaño del Logo
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onChange({ ...config, size })}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    config.size === size
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {config.size === size && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className={`mx-auto mb-2 rounded border-2 ${
                      config.size === size ? 'border-blue-500' : 'border-gray-300'
                    }`} style={{
                      width: size === 'small' ? '30px' : size === 'medium' ? '40px' : '50px',
                      height: size === 'small' ? '30px' : size === 'medium' ? '40px' : '50px',
                    }}></div>
                    <p className={`text-xs font-medium ${
                      config.size === size ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {getSizeLabel(size).split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {getSizeLabel(size).split(' ')[1]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Orientación del Logo */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Orientación del Logo
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['square', 'vertical', 'horizontal'] as const).map((orientation) => (
                <button
                  key={orientation}
                  onClick={() => onChange({ ...config, orientation })}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    config.orientation === orientation
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {config.orientation === orientation && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className={`mx-auto mb-2 rounded border-2 ${
                      config.orientation === orientation ? 'border-blue-500' : 'border-gray-300'
                    }`} style={{
                      width: orientation === 'square' ? '40px' : orientation === 'vertical' ? '30px' : '50px',
                      height: orientation === 'square' ? '40px' : orientation === 'vertical' ? '50px' : '30px',
                    }}></div>
                    <p className={`text-xs font-medium ${
                      config.orientation === orientation ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {getOrientationLabel(orientation).split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {getOrientationLabel(orientation).split(' ')[1]}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Posición del Logo */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Posición del Logo
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['left', 'center', 'right'] as const).map((position) => (
                <button
                  key={position}
                  onClick={() => onChange({ ...config, position })}
                  className={`p-3 border-2 rounded-lg transition-all text-center ${
                    config.position === position
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <p className="text-xs font-medium capitalize">
                    {position === 'left' ? 'Izquierda' : position === 'center' ? 'Centro' : 'Derecha'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Tamaño Personalizado (Opcional) */}
          <details className="border border-gray-200 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 font-medium text-sm text-gray-700">
              Tamaño Personalizado (Avanzado)
            </summary>
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Ancho (px)</label>
                  <input
                    type="number"
                    value={config.customWidth || ''}
                    onChange={(e) => onChange({ ...config, customWidth: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alto (px)</label>
                  <input
                    type="number"
                    value={config.customHeight || ''}
                    onChange={(e) => onChange({ ...config, customHeight: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Deja en blanco para usar los tamaños predeterminados
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
};
