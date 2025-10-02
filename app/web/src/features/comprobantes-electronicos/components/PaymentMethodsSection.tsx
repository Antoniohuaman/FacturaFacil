import React, { useState } from 'react';
import { Search, Plus, Edit } from 'lucide-react';
import type { TipoComprobante } from '../models/comprobante.types';
import ClienteForm from '../../gestion-clientes/components/ClienteForm';

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
  clienteSeleccionado,
  onNuevaFormaPago,
}) => {
  // Estado para gestión de clientes
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteSeleccionadoLocal, setClienteSeleccionadoLocal] = useState<{
    nombre: string;
    dni: string;
    direccion: string;
  } | null>(clienteSeleccionado || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado para el formulario de cliente
  const [documentType, setDocumentType] = useState('DNI');
  const [clientType, setClientType] = useState('natural');
  const [formData, setFormData] = useState({
    documentNumber: '',
    legalName: '',
    address: '',
    gender: 'M',
    phone: '',
    email: '',
    additionalData: ''
  });

  // Tipos de documento y cliente (mismo que gestion-clientes)
  const documentTypes = [
    { value: 'DNI', label: 'DNI' },
    { value: 'RUC', label: 'RUC' },
    { value: 'CE', label: 'Carnet de Extranjería' },
    { value: 'PAS', label: 'Pasaporte' }
  ];

  const clientTypes = [
    { value: 'natural', label: 'Persona Natural' },
    { value: 'juridica', label: 'Persona Jurídica' }
  ];

  // Mock de clientes (integrar con store real)
  const mockClientes = [
    {
      id: '1',
      tipoDocumento: 'DNI',
      numeroDocumento: '09661829',
      tipoPersona: 'natural',
      nombres: 'CARMEN ROSA',
      apellidos: 'FLORES CANALES',
      razonSocial: '',
      direccion: 'Dirección no definida',
      telefono: '',
      email: ''
    },
    {
      id: '2',
      tipoDocumento: 'RUC',
      numeroDocumento: '20123456789',
      tipoPersona: 'juridica',
      nombres: '',
      apellidos: '',
      razonSocial: 'EMPRESA SAC',
      direccion: 'Av. Principal 123',
      telefono: '987654321',
      email: 'contacto@empresa.com'
    }
  ];

  // Filtrar clientes por búsqueda
  const clientesFiltrados = mockClientes.filter(cliente => {
    const searchLower = searchQuery.toLowerCase();
    const nombreCompleto = cliente.tipoPersona === 'natural' 
      ? `${cliente.nombres} ${cliente.apellidos}`.toLowerCase()
      : cliente.razonSocial.toLowerCase();
    return nombreCompleto.includes(searchLower) || 
           cliente.numeroDocumento.includes(searchLower);
  });

  // Handlers
  const handleNuevoCliente = () => {
    setIsEditing(false);
    setDocumentType('DNI');
    setClientType('natural');
    setFormData({
      documentNumber: '',
      legalName: '',
      address: '',
      gender: 'M',
      phone: '',
      email: '',
      additionalData: ''
    });
    setShowClienteForm(true);
  };

  const handleEditarCliente = () => {
    // Buscar el cliente seleccionado en la lista mock
    if (!clienteSeleccionadoLocal) return;
    
    const cliente = mockClientes.find(c => c.numeroDocumento === clienteSeleccionadoLocal.dni);
    if (cliente) {
      setIsEditing(true);
      setDocumentType(cliente.tipoDocumento);
      setClientType(cliente.tipoPersona);
      
      const nombreCompleto = cliente.tipoPersona === 'natural'
        ? `${cliente.nombres} ${cliente.apellidos}`
        : cliente.razonSocial;
      
      setFormData({
        documentNumber: cliente.numeroDocumento,
        legalName: nombreCompleto,
        address: cliente.direccion || '',
        gender: 'M',
        phone: cliente.telefono || '',
        email: cliente.email || '',
        additionalData: ''
      });
      setShowClienteForm(true);
    }
  };

  const handleSaveCliente = () => {
    console.log('Cliente guardado:', { documentType, clientType, formData });
    // TODO: Integrar con store/API real
    
    // Actualizar cliente seleccionado
    setClienteSeleccionadoLocal({
      nombre: formData.legalName,
      dni: formData.documentNumber,
      direccion: formData.address || 'Dirección no definida'
    });
    
    setShowClienteForm(false);
    setSearchQuery('');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSeleccionarCliente = (cliente: any) => {
    const nombreCompleto = cliente.tipoPersona === 'natural'
      ? `${cliente.nombres} ${cliente.apellidos}`
      : cliente.razonSocial;
    
    setClienteSeleccionadoLocal({
      nombre: nombreCompleto,
      dni: cliente.numeroDocumento,
      direccion: cliente.direccion || 'Dirección no definida'
    });
    
    setSearchQuery('');
  };

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

      {/* Client Selection - Versión mejorada */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Cliente</h3>
        
        {!clienteSeleccionadoLocal ? (
          <>
            {/* Búsqueda de cliente */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar cliente por nombre o documento..." 
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Resultados de búsqueda */}
            {searchQuery && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md mb-3">
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => handleSeleccionarCliente(cliente)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {cliente.tipoPersona === 'natural' 
                          ? `${cliente.nombres} ${cliente.apellidos}`
                          : cliente.razonSocial}
                      </p>
                      <p className="text-xs text-gray-500">{cliente.numeroDocumento}</p>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No se encontraron clientes
                  </div>
                )}
              </div>
            )}

            {/* Botón crear nuevo cliente */}
            <button 
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm w-full justify-center py-2 border border-blue-200 rounded-md hover:bg-blue-50"
              onClick={handleNuevoCliente}
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Cliente</span>
            </button>
          </>
        ) : (
          <>
            {/* Cliente seleccionado */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500">Nombre</span>
                  <p className="text-sm font-medium text-gray-900">{clienteSeleccionadoLocal.nombre}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Documento</span>
                  <p className="text-sm text-gray-700">{clienteSeleccionadoLocal.dni}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500">Dirección</span>
                  <p className="text-sm text-gray-700">{clienteSeleccionadoLocal.direccion}</p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-2">
              <button 
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm px-3 py-1.5 border border-blue-200 rounded-md hover:bg-blue-50"
                onClick={handleEditarCliente}
              >
                <Edit className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button 
                className="flex-1 text-gray-600 hover:text-gray-700 text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setClienteSeleccionadoLocal(null);
                  setSearchQuery('');
                }}
              >
                Cambiar cliente
              </button>
            </div>
          </>
        )}
      </div>

      {/* Vendor Info */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-sm">
          <span className="font-medium text-gray-700">Vendedor: </span>
          <span className="text-gray-900">Javier Masías Loza - 001</span>
        </div>
      </div>

      {/* Modal para crear/editar cliente */}
      {showClienteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <ClienteForm
            formData={formData}
            documentType={documentType}
            clientType={clientType}
            documentTypes={documentTypes}
            clientTypes={clientTypes}
            onInputChange={handleInputChange}
            onDocumentTypeChange={setDocumentType}
            onClientTypeChange={setClientType}
            onSave={handleSaveCliente}
            onCancel={() => setShowClienteForm(false)}
            isEditing={isEditing}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsSection;