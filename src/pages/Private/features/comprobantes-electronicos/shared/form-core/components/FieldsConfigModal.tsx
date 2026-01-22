// ===================================================================
// MODAL DE CONFIGURACIÓN DE CAMPOS
// Permite personalizar qué campos y botones se muestran en el formulario
// ===================================================================

import React from 'react';
import { X, Settings, Eye, EyeOff } from 'lucide-react';
import type { ComponentVisibility } from '../contexts/FieldsConfigurationContext';

interface FieldsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ComponentVisibility;
  onToggleNotesSection: () => void;
  onToggleActionButton: (button: keyof ComponentVisibility['actionButtons']) => void;
  onToggleOptionalField: (field: keyof ComponentVisibility['optionalFields']) => void;
  onToggleOptionalFieldRequired: (field: keyof ComponentVisibility['optionalFields']) => void;
  onResetToDefaults: () => void;
}

const FieldsConfigModal: React.FC<FieldsConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onToggleNotesSection,
  onToggleActionButton,
  onToggleOptionalField,
  onToggleOptionalFieldRequired,
  onResetToDefaults,
}) => {
  if (!isOpen) return null;

  const optionalFieldsLabels: Record<keyof ComponentVisibility['optionalFields'], string> = {
    direccion: 'Dirección',
    fechaVencimiento: 'Fecha de Vencimiento',
    direccionEnvio: 'Dirección de Envío',
    ordenCompra: 'Orden de Compra',
    guiaRemision: 'N° de Guía de Remisión',
    correo: 'Correo Electrónico',
    centroCosto: 'Centro de Costo',
    vendedor: 'Vendedor',
  };

  const actionButtonsLabels: Record<keyof ComponentVisibility['actionButtons'], string> = {
    vistaPrevia: 'Vista Previa',
    cancelar: 'Cancelar',
    guardarBorrador: 'Guardar Borrador',
    crearComprobante: 'Crear Comprobante',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Configuración de Campos</h2>
              <p className="text-sm text-blue-100">Personaliza qué elementos mostrar en el formulario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Sección: Observaciones */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
              Sección de Observaciones
            </h3>
            <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                {config.notesSection ? (
                  <Eye className="w-5 h-5 text-blue-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Observaciones
                  </span>
                  <p className="text-xs text-gray-500">
                    Incluye observaciones (cliente) y observación interna (solo sistema)
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.notesSection}
                onChange={onToggleNotesSection}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>

          {/* Sección: Botones de Acción */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
              Botones de Acción
            </h3>
            <div className="space-y-2">
              {(Object.keys(actionButtonsLabels) as Array<keyof ComponentVisibility['actionButtons']>).map((button) => (
                <label
                  key={button}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {config.actionButtons[button] ? (
                      <Eye className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {actionButtonsLabels[button]}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.actionButtons[button]}
                    onChange={() => onToggleActionButton(button)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Sección: Campos Opcionales */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                Campos Opcionales Adicionales
              </h3>
              <span className="text-xs text-gray-500">
                {Object.values(config.optionalFields).filter(f => f.visible).length} de {Object.keys(config.optionalFields).length} visibles
              </span>
            </div>
            <div className="space-y-2">
              {(Object.keys(optionalFieldsLabels) as Array<keyof ComponentVisibility['optionalFields']>).map((field) => (
                <div
                  key={field}
                  className="p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      {config.optionalFields[field].visible ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {optionalFieldsLabels[field]}
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      {config.optionalFields[field].visible && (
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                          <input
                            type="checkbox"
                            checked={config.optionalFields[field].required}
                            onChange={() => onToggleOptionalFieldRequired(field)}
                            className="w-3.5 h-3.5 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <span className={config.optionalFields[field].required ? 'font-semibold text-orange-600' : ''}>
                            Obligatorio
                          </span>
                        </label>
                      )}
                      <input
                        type="checkbox"
                        checked={config.optionalFields[field].visible}
                        onChange={() => onToggleOptionalField(field)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-800 flex items-start gap-2">
              <Settings className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Tu configuración se guarda automáticamente y se aplicará en todas las futuras emisiones de comprobantes.
                Los campos obligatorios mostrarán un asterisco rojo (*) y deben completarse antes de crear el comprobante.
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between rounded-b-xl">
          <button
            onClick={onResetToDefaults}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium hover:underline"
          >
            Restaurar valores por defecto
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldsConfigModal;
