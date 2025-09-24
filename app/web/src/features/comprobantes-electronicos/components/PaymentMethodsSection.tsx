import React from 'react';
import type { TipoComprobante } from '../models/comprobante.types';

interface PaymentMethodsSectionProps {
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (tipo: TipoComprobante) => void;
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
  receivedAmount: string;
  setReceivedAmount: (value: string | ((prev: string) => string)) => void;
  moneda?: string;
  setMoneda?: (value: string) => void;
  formaPago?: string;
  setFormaPago?: (value: string) => void;
  clienteSeleccionado?: {
    nombre: string;
    dni: string;
    direccion: string;
  };
  onNuevaFormaPago?: () => void;
  onSeleccionarCliente?: () => void;
  onNuevoCliente?: () => void;
  onEditarCliente?: () => void;
}

const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({
  tipoComprobante,
  setTipoComprobante,
  totals,
  receivedAmount,
  setReceivedAmount,
  moneda = "PEN",
  setMoneda,
  formaPago = "contado",
  setFormaPago,
  clienteSeleccionado = {
    nombre: "FLORES CANALES CARMEN ROSA",
    dni: "09661829",
    direccion: "Dirección no definida"
  },
  onNuevaFormaPago,
  onSeleccionarCliente,
  onNuevoCliente,
  onEditarCliente,
}) => {
  return (
    <div className="w-80 border-l border-gray-200 bg-white p-6 space-y-6">
      {/* Document Type */}
      <div>
        <div className="flex space-x-2 mb-4">
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
              tipoComprobante === 'boleta' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => {
              setTipoComprobante('boleta');
            }}
          >
            Boleta
          </button>
          <button
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
              tipoComprobante === 'factura' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => {
              setTipoComprobante('factura');
            }}
          >
            Factura
          </button>
        </div>
      </div>

      {/* Currency and Payment Method */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
          <select 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={moneda}
            onChange={e => setMoneda?.(e.target.value)}
          >
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
          <select 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={formaPago}
            onChange={e => setFormaPago?.(e.target.value)}
          >
            <option value="contado">Contado</option>
            <option value="deposito">Depósito en cuenta</option>
            <option value="efectivo">Efectivo</option>
            <option value="plin">Plin</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="yape">Yape</option>
          </select>
          <button
            type="button"
            className="mt-2 text-blue-600 hover:underline text-sm"
            onClick={onNuevaFormaPago || (() => alert('Funcionalidad para crear nueva forma de pago'))}
          >
            Nueva Forma de Pago
          </button>
        </div>
      </div>

      {/* Quick Payment Buttons */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="col-span-2 flex justify-end mt-2">
            <button
              className="text-blue-600 hover:text-blue-800 text-sm underline px-2 py-1"
              type="button"
              onClick={() => setReceivedAmount('0')}
            >
              Limpiar
            </button>
          </div>
          <button
            className="px-3 py-2 text-sm border-2 rounded-md transition-colors border-green-500 bg-green-100 text-green-700 font-semibold"
            onClick={() => setReceivedAmount(totals.total.toFixed(2))}
          >
            S/ {totals.total.toFixed(2)}
          </button>
          <button
            className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
            onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 20).toFixed(2))}
          >
            S/ 20.00
          </button>
          <button
            className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
            onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 50).toFixed(2))}
          >
            S/ 50.00
          </button>
          <button
            className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
            onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 100).toFixed(2))}
          >
            S/ 100.00
          </button>
          <button
            className="px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 hover:bg-gray-50"
            onClick={() => setReceivedAmount(prev => ((parseFloat(prev) || 0) + 200).toFixed(2))}
          >
            S/ 200.00
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Monto recibido</label>
          <input
            type="number"
            value={receivedAmount}
            onChange={e => setReceivedAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Ingrese monto personalizado"
          />
          <div className="bg-gray-50 rounded-lg p-4 mt-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Monto a pagar:</span>
              <span className="font-bold text-gray-900">S/ {totals.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Monto recibido:</span>
              <span className="font-bold text-gray-900">S/ {(parseFloat(receivedAmount) || 0).toFixed(2)}</span>
            </div>
            <hr className="my-2" />
            {parseFloat(receivedAmount) >= totals.total ? (
              <div className="flex justify-between text-base font-bold">
                <span className="text-green-600">Vuelto:</span>
                <span className="text-green-600">S/ {(parseFloat(receivedAmount) - totals.total).toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-base font-bold">
                <span className="text-red-600">Falta:</span>
                <span className="text-red-600">S/ {(totals.total - (parseFloat(receivedAmount) || 0)).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="space-y-3">
          {/* Métodos de pago 'Efectivo' y 'Sí.' eliminados según solicitud del usuario */}
        </div>
      </div>

      {/* Client Selection */}
      <div>
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Seleccionar cliente" 
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onSeleccionarCliente}
            readOnly
          />
        </div>
        <button 
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-4"
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
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-medium text-gray-700">Nombre</span>
              </div>
              <p className="text-sm font-medium text-gray-900">{clienteSeleccionado.nombre}</p>
              <div className="flex items-center space-x-2 mt-2 mb-1">
                <span className="text-xs font-medium text-gray-700">Dni</span>
              </div>
              <p className="text-sm text-gray-700">{clienteSeleccionado.dni}</p>
              <div className="flex items-center space-x-2 mt-2 mb-1">
                <span className="text-xs font-medium text-gray-700">Dirección</span>
              </div>
              <p className="text-sm text-gray-700">{clienteSeleccionado.direccion}</p>
            </div>
          </div>
          <button 
            className="text-blue-600 hover:text-blue-700 text-sm"
            onClick={onEditarCliente}
          >
            Editar cliente
          </button>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-sm">
          <span className="font-medium text-gray-700">Vendedor: </span>
          <span className="text-gray-900">Javier Masías Loza - 001</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsSection;