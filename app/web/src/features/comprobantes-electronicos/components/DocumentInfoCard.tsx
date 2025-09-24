import React from 'react';

interface DocumentInfoCardProps {
  serieSeleccionada: string;
  setSerieSeleccionada: (value: string) => void;
  seriesFiltradas: string[];
  showOptionalFields: boolean;
  setShowOptionalFields: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const DocumentInfoCard: React.FC<DocumentInfoCardProps> = ({
  serieSeleccionada,
  setSerieSeleccionada,
  seriesFiltradas,
  showOptionalFields,
  setShowOptionalFields,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">N°</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={serieSeleccionada}
            onChange={e => setSerieSeleccionada(e.target.value)}
          >
            {seriesFiltradas.map(serie => (
              <option key={serie} value={serie}>{serie}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tienda</label>
          <input 
            type="text" 
            value="Gamarra 2" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50"
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Emisión</label>
          <input 
            type="date" 
            value="2025-09-10" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
      
      {/* Botón para mostrar/ocultar campos opcionales */}
      <div className="mt-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          onClick={() => setShowOptionalFields(v => !v)}
        >
          {showOptionalFields ? 'Ocultar campos' : 'Más campos'}
        </button>
      </div>

      {/* Campos opcionales */}
      {showOptionalFields && (
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingrese dirección" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de vencimiento</label>
              <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value="2025-10-09" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección de envío</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingrese centro de costo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Orden de compra</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ejem OC01-0000236" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">N° de guía</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingresa Serie y  N°. Ejem T001-00000256" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
              <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingresa correo electrónico" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Centro de costo</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ingrese centro de costos" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentInfoCard;