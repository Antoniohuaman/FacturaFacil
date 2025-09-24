// ===================================================================
// COMPONENTE HEADER DEL COMPROBANTE
// ===================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, List, Grid3X3 } from 'lucide-react';
import type { ViewMode } from '../models/comprobante.types';

export interface ComprobantHeaderProps {
  // Estados del modo de vista
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Configuración opcional
  title?: string;
  showViewToggle?: boolean;
  backRoute?: string;
}

export const ComprobantHeader: React.FC<ComprobantHeaderProps> = ({
  viewMode,
  onViewModeChange,
  title = 'Nuevo comprobante',
  showViewToggle = true,
  backRoute = '/comprobantes'
}) => {
  const navigate = useNavigate();

  // ===================================================================
  // FUNCIONES DE NAVEGACIÓN
  // ===================================================================

  /**
   * Navegar de regreso a la ruta especificada
   */
  const handleBackClick = () => {
    navigate(backRoute);
  };

  /**
   * Cambiar modo de vista
   */
  const handleViewModeChange = (mode: ViewMode) => {
    onViewModeChange(mode);
  };

  // ===================================================================
  // RENDERIZADO
  // ===================================================================

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center space-x-4">
        {/* Botón de regreso */}
        <button 
          className="text-gray-500 hover:text-gray-700" 
          onClick={handleBackClick}
          title="Volver a lista de comprobantes"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {/* Título */}
        <h1 className="text-xl font-semibold text-gray-900">
          {title}
        </h1>
        
        {/* Toggle de vista (POS/Form) */}
        {showViewToggle && (
          <div className="flex items-center space-x-2 ml-8">
            {/* Botón vista formulario */}
            <button
              onClick={() => handleViewModeChange('form')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'form' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vista formulario"
            >
              <List className="w-5 h-5" />
            </button>
            
            {/* Botón vista POS */}
            <button
              onClick={() => handleViewModeChange('pos')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'pos' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vista punto de venta"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            
            {/* Etiqueta del modo actual */}
            <span className="text-sm text-gray-600 ml-2">
              {viewMode === 'pos' ? 'Punto de Venta' : 'Formulario'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};