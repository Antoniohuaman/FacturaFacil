import React from 'react';

interface ActionButtonsSectionProps {
  onVistaPrevia?: () => void;
  onCancelar: () => void;
  onGuardarBorrador: () => void;
  onCrearComprobante?: () => void;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onVistaPrevia,
  onCancelar,
  onGuardarBorrador,
  onCrearComprobante,
}) => {
  return (
    <div className="flex items-center space-x-4 mt-6">
      <button 
        className="flex items-center space-x-2 px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm"
        onClick={onVistaPrevia}
      >
        Vista previa
      </button>
      <div className="flex space-x-3">
        <button 
          className="px-6 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm" 
          onClick={onCancelar}
        >
          Cancelar
        </button>
        <button 
          className="px-6 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm" 
          onClick={onGuardarBorrador}
        >
          Guardar borrador
        </button>
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          onClick={onCrearComprobante}
        >
          Crear comprobante
        </button>
      </div>
    </div>
  );
};

export default ActionButtonsSection;