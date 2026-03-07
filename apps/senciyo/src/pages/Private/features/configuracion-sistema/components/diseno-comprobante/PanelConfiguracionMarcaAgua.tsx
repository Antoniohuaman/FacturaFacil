// ===================================================================
// WATERMARK CONFIGURATION PANEL
// Componente para configurar marca de agua del comprobante
// ===================================================================

import React, { useRef } from 'react';
import { Droplet, Upload, X, Type, Image } from 'lucide-react';
import type { WatermarkConfiguration } from '../../modelos/VoucherDesignUnified';
import { Switch } from '@/contasis';

interface WatermarkConfigPanelProps {
  config: WatermarkConfiguration;
  onChange: (config: WatermarkConfiguration) => void;
}

export const WatermarkConfigPanel: React.FC<WatermarkConfigPanelProps> = ({ config, onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      onChange({ ...config, imageUrl, type: 'image' });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Enable/Disable */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            config.enabled ? 'bg-purple-100' : 'bg-gray-200'
          }`}>
            <Droplet className={`w-5 h-5 ${config.enabled ? 'text-purple-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Marca de Agua</h4>
            <p className="text-xs text-gray-500">Agregar marca de agua al comprobante</p>
          </div>
        </div>
        <Switch
          size="md"
          checked={config.enabled}
          onChange={(checked) => onChange({ ...config, enabled: checked })}
        />
      </div>

      {config.enabled && (
        <>
          {/* Tipo de Marca de Agua */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Tipo de Marca de Agua
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onChange({ ...config, type: 'text' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  config.type === 'text'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Type className={`w-6 h-6 mx-auto mb-2 ${
                  config.type === 'text' ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  config.type === 'text' ? 'text-purple-700' : 'text-gray-700'
                }`}>
                  Texto
                </p>
              </button>
              <button
                onClick={() => onChange({ ...config, type: 'image' })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  config.type === 'image'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Image className={`w-6 h-6 mx-auto mb-2 ${
                  config.type === 'image' ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <p className={`text-sm font-medium ${
                  config.type === 'image' ? 'text-purple-700' : 'text-gray-700'
                }`}>
                  Imagen
                </p>
              </button>
            </div>
          </div>

          {/* Configuración según tipo */}
          {config.type === 'text' ? (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Texto de la Marca de Agua
                </label>
                <input
                  type="text"
                  value={config.text || ''}
                  onChange={(e) => onChange({ ...config, text: e.target.value })}
                  placeholder="Ej: COPIA, BORRADOR, etc."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Color del Texto
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={config.color || '#000000'}
                    onChange={(e) => onChange({ ...config, color: e.target.value })}
                    className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.color || '#000000'}
                    onChange={(e) => onChange({ ...config, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Imagen de Marca de Agua
              </label>
              {config.imageUrl ? (
                <div className="relative">
                  <div className="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <img
                      src={config.imageUrl}
                      alt="Marca de agua"
                      className="w-20 h-20 object-contain rounded border border-gray-200"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Imagen cargada</p>
                      <p className="text-xs text-gray-500">Se aplicará con la opacidad configurada</p>
                    </div>
                    <button
                      onClick={() => {
                        onChange({ ...config, imageUrl: undefined });
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-gray-100 group-hover:bg-purple-100 rounded-lg flex items-center justify-center transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-purple-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-purple-600">
                      Cargar imagen de marca de agua
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG con transparencia recomendado (máx. 2MB)</p>
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
          )}

          {/* Opacidad */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Opacidad
              </label>
              <span className="text-sm font-semibold text-purple-600">
                {Math.round(config.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.opacity}
              onChange={(e) => onChange({ ...config, opacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Transparente</span>
              <span>Opaco</span>
            </div>
          </div>

          {/* Rotación */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Rotación
              </label>
              <span className="text-sm font-semibold text-purple-600">
                {config.rotation}°
              </span>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              step="5"
              value={config.rotation}
              onChange={(e) => onChange({ ...config, rotation: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-90°</span>
              <span>0°</span>
              <span>90°</span>
            </div>
          </div>

          {/* Tamaño */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Tamaño
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onChange({ ...config, size })}
                  className={`p-3 border-2 rounded-lg transition-all text-center ${
                    config.size === size
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <p className="text-xs font-medium capitalize">
                    {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Posición */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Posición
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['center', 'diagonal', 'repeat'] as const).map((position) => (
                <button
                  key={position}
                  onClick={() => onChange({ ...config, position })}
                  className={`p-3 border-2 rounded-lg transition-all text-center ${
                    config.position === position
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <p className="text-xs font-medium capitalize">
                    {position === 'center' ? 'Centro' : position === 'diagonal' ? 'Diagonal' : 'Repetida'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
