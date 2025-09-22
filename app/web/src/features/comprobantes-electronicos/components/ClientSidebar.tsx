import React from 'react';
import type { TipoComprobante } from '../models/comprobante.types';

interface ClientSidebarProps {
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (tipo: TipoComprobante) => void;
  clienteSeleccionado?: {
    nombre: string;
    dni: string;
    direccion: string;
  };
  onNuevoCliente?: () => void;
  onEditarCliente?: () => void;
  onSeleccionarCliente?: () => void;
}

const ClientSidebar: React.FC<ClientSidebarProps> = ({
  tipoComprobante,
  setTipoComprobante,
  clienteSeleccionado = {
    nombre: "FLORES CANALES CARMEN ROSA",
    dni: "09661829",
    direccion: "Dirección no definida"
  },
  onNuevoCliente,
  onEditarCliente,
  onSeleccionarCliente,
}) => {
  return (
    <div>
      {/* Selector de tipo de comprobante */}
      <div className="mt-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de comprobante</label>
        <div className="flex space-x-2">
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium border ${
              tipoComprobante === 'boleta' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setTipoComprobante('boleta')}
          >
            Boleta
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium border ${
              tipoComprobante === 'factura' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => setTipoComprobante('factura')}
          >
            Factura
          </button>
        </div>
      </div>

      {/* Campos de cliente según tipo */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Datos del cliente</h4>
        <div className="mb-2">
          <input 
            type="text" 
            placeholder="Seleccionar cliente" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2"
            onClick={onSeleccionarCliente}
            readOnly
          />
          <button 
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-2"
            onClick={onNuevoCliente}
          >
            <span className="inline-flex items-center">
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="lucide lucide-user mr-1"
              >
                <path d="M20 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M4 21v-2a4 4 0 0 1 3-3.87"/>
                <circle cx="12" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </span>
            <span>Nuevo cliente</span>
          </button>
        </div>
        <div className="space-y-1">
          <div className="font-medium text-gray-900 text-sm">Nombre</div>
          <div className="text-sm font-medium text-gray-900">{clienteSeleccionado.nombre}</div>
          <div className="text-xs font-medium text-gray-700 mt-2">Dni</div>
          <div className="text-sm text-gray-700">{clienteSeleccionado.dni}</div>
          <div className="text-xs font-medium text-gray-700 mt-2">Dirección</div>
          <div className="text-sm text-gray-700">{clienteSeleccionado.direccion}</div>
          <button 
            className="text-blue-600 hover:text-blue-700 text-sm mt-2"
            onClick={onEditarCliente}
          >
            Editar cliente
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSidebar;