// Panel lateral para configurar campos del formulario de productos
import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { ProductFieldConfig } from '../hooks/useProductFieldsConfig';

interface FieldsConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  fieldsConfig: ProductFieldConfig[];
  onToggleVisibility: (fieldId: string) => void;
  onToggleRequired: (fieldId: string) => void;
  onReset: () => void;
}

export const FieldsConfigPanel: React.FC<FieldsConfigPanelProps> = ({
  isOpen,
  onClose,
  fieldsConfig,
  onToggleVisibility,
  onToggleRequired,
  onReset
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    if (confirm('¿Estás seguro de restablecer la configuración a los valores por defecto?')) {
      onReset();
    }
  };

  const systemRequiredFields = fieldsConfig.filter(f => f.isSystemRequired);
  const customizableFields = fieldsConfig.filter(f => !f.isSystemRequired);

  return (
    <>
      {/* Overlay/Backdrop - más oscuro para mejor contraste */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-40 z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Panel lateral deslizante */}
      <div className="fixed right-0 top-0 h-full w-[450px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col">
        
        {/* Header del panel */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configurar Campos</h3>
              <p className="text-xs text-gray-600">Personaliza tu formulario de productos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          
          {/* Campos obligatorios del sistema */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-red-500 rounded"></div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Campos Obligatorios del Sistema
              </h4>
            </div>
            <p className="text-xs text-gray-600 mb-3 bg-red-50 border-l-4 border-red-500 p-2 rounded">
              Estos campos son necesarios y no se pueden deshabilitar
            </p>
            <div className="space-y-2">
              {systemRequiredFields.map(field => (
                <div 
                  key={field.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{field.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{field.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                      OBLIGATORIO
                    </span>
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 my-6"></div>

          {/* Campos personalizables */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-blue-500 rounded"></div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Campos Personalizables
              </h4>
            </div>
            <p className="text-xs text-gray-600 mb-4 bg-blue-50 border-l-4 border-blue-500 p-2 rounded">
              Activa los campos que necesites y marca como obligatorios según tu negocio
            </p>

            <div className="space-y-4">
              {customizableFields.map(field => (
                <div 
                  key={field.id}
                  className={`
                    p-3 rounded-lg border-2 transition-all
                    ${field.visible 
                      ? 'bg-white border-blue-200 shadow-sm' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{field.icon}</span>
                      <span className={`text-sm font-medium ${field.visible ? 'text-gray-900' : 'text-gray-500'}`}>
                        {field.label}
                      </span>
                    </div>
                    
                    {/* Toggle Mostrar */}
                    <button
                      onClick={() => onToggleVisibility(field.id)}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${field.visible ? 'bg-blue-600' : 'bg-gray-300'}
                      `}
                    >
                      <span className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${field.visible ? 'translate-x-6' : 'translate-x-1'}
                      `} />
                    </button>
                  </div>

                  {/* Toggle Obligatorio (solo si está visible) */}
                  {field.visible && (
                    <div className="flex items-center justify-between pl-7 mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="text-red-500">*</span>
                        Marcar como obligatorio
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={() => onToggleRequired(field.id)}
                          className="sr-only peer"
                        />
                        <div className={`
                          w-9 h-5 rounded-full peer transition-colors
                          ${field.required ? 'bg-red-600' : 'bg-gray-300'}
                          peer-focus:ring-2 peer-focus:ring-red-300
                        `}>
                          <div className={`
                            absolute top-0.5 left-0.5 bg-white border border-gray-300 rounded-full h-4 w-4 transition-transform
                            ${field.required ? 'translate-x-4' : 'translate-x-0'}
                          `} />
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restablecer
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
