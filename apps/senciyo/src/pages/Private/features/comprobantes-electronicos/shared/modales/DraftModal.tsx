// ===================================================================
// COMPONENTE MODAL PARA GUARDAR BORRADOR
// ===================================================================

import React from 'react';
import { Button, RadioButton } from '@/contasis';
import type { DraftAction } from '../../models/comprobante.types';

export interface DraftModalProps {
  // Control de visibilidad
  show: boolean;
  onClose: () => void;
  
  // Datos del borrador
  draftExpiryDate: string;
  onDraftExpiryDateChange: (date: string) => void;
  
  // Acción post-guardado
  draftAction: DraftAction;
  onDraftActionChange: (action: DraftAction) => void;
  
  // Función de guardado
  onSave: () => void;
  
  // Configuración opcional
  title?: string;
  isLoading?: boolean;
}

export const DraftModal: React.FC<DraftModalProps> = ({
  show,
  onClose,
  draftExpiryDate,
  onDraftExpiryDateChange,
  draftAction,
  onDraftActionChange,
  onSave,
  title = 'Guardar borrador',
  isLoading = false
}) => {

  // ===================================================================
  // OPCIONES DE ACCIÓN POST-GUARDADO
  // ===================================================================

  const actionOptions = [
    {
      value: 'borradores' as DraftAction,
      label: 'Ir a lista de borradores',
      description: 'Navegar a la sección de borradores guardados'
    },
    {
      value: 'continuar' as DraftAction,
      label: 'Continuar emitiendo (formulario vacío)',
      description: 'Limpiar formulario para crear nuevo comprobante'
    },
    {
      value: 'terminar' as DraftAction,
      label: 'Terminar (ir a lista de comprobantes)',
      description: 'Finalizar y volver a la lista principal'
    }
  ];

  // ===================================================================
  // MANEJADORES DE EVENTOS
  // ===================================================================

  /**
   * Manejar cambio de fecha de vencimiento
   */
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDraftExpiryDateChange(e.target.value);
  };

  /**
   * Manejar cambio de acción post-guardado
   */
  const handleActionChange = (action: DraftAction) => {
    onDraftActionChange(action);
  };

  /**
   * Manejar guardado del borrador
   */
  const handleSave = () => {
    onSave();
  };

  /**
   * Manejar cierre del modal
   */
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  /**
   * Manejar clic en el overlay (cerrar modal)
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  // ===================================================================
  // RENDERIZADO
  // ===================================================================

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        {/* Header del modal */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h3>
        
        {/* Campo de fecha de vencimiento */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de vencimiento (opcional)
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={draftExpiryDate}
            onChange={handleExpiryDateChange}
            disabled={isLoading}
          />
        </div>
        
        {/* Opciones de acción post-guardado */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Qué deseas hacer después de guardar?
          </label>
          <div className="space-y-2">
            {actionOptions.map((option) => (
              <RadioButton
                key={option.value}
                name="draftAction"
                value={option.value}
                checked={draftAction === option.value}
                onChange={() => handleActionChange(option.value)}
                disabled={isLoading}
                label={option.label}
              />
            ))}
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading && (
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span>{isLoading ? 'Guardando...' : 'Guardar borrador'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};