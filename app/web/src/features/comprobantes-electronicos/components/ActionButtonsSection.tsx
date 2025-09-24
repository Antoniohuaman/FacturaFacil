import React from 'react';
import { Eye, CreditCard } from 'lucide-react';

interface ActionButtonsSectionProps {
  onVistaPrevia?: () => void;
  onCancelar: () => void;
  onGuardarBorrador: () => void;
  onCrearComprobante?: () => void;
  isCartEmpty?: boolean;
}

const ActionButtonsSection: React.FC<ActionButtonsSectionProps> = ({
  onVistaPrevia,
  onCancelar,
  onGuardarBorrador,
  onCrearComprobante,
  isCartEmpty = false,
}) => {
  return (
    <div className="flex items-center space-x-4 mt-6">
      <button 
        className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onVistaPrevia}
        disabled={isCartEmpty}
      >
        <Eye className="h-4 w-4" />
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
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onCrearComprobante}
          disabled={isCartEmpty}
        >
          <CreditCard className="h-4 w-4" />
          Crear comprobante
        </button>
      </div>
    </div>
  );
};

export default ActionButtonsSection;