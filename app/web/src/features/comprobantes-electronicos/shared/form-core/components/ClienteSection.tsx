/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import React, { useState } from 'react';
import { Search, Plus, Edit, User } from 'lucide-react';
import ClienteForm from '../../../../gestion-clientes/components/ClienteForm';
import { ConfigurationCard } from './ConfigurationCard';

interface ClienteTradicional {
  id: number;
  tipoPersona: 'natural' | 'juridica';
  tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
  numeroDocumento: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  direccion: string;
  telefono?: string;
  email?: string;
}

interface ClienteSectionProps {
  clienteSeleccionado?: {
    nombre: string;
    dni: string;
    direccion: string;
  };
}

const ClienteSection: React.FC<ClienteSectionProps> = ({ clienteSeleccionado }) => {
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

  // Tipos de documento y cliente
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

  // Cargar clientes desde localStorage
  const getClientesFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem('clientes');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((cliente: any) => {
          const isRUC = cliente.document?.includes('RUC');
          const isDNI = cliente.document?.includes('DNI');
          const documento = cliente.document?.replace('RUC ', '').replace('DNI ', '').replace('Sin documento', '');

          return {
            id: String(cliente.id),
            tipoDocumento: isRUC ? 'RUC' : isDNI ? 'DNI' : 'Sin documento',
            numeroDocumento: documento || '',
            tipoPersona: isRUC ? 'juridica' : 'natural',
            nombres: !isRUC ? cliente.name : '',
            apellidos: '',
            razonSocial: isRUC ? cliente.name : '',
            direccion: cliente.address || 'Dirección no definida',
            telefono: cliente.phone || '',
            email: ''
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Error loading clientes from localStorage:', error);
      return [];
    }
  };

  const mockClientes: ClienteTradicional[] = getClientesFromLocalStorage();

  // Filtrar clientes por búsqueda
  const clientesFiltrados = mockClientes.filter((cliente: ClienteTradicional) => {
    const searchLower = searchQuery.toLowerCase();
    const nombreCompleto = cliente.tipoPersona === 'natural'
      ? `${cliente.nombres} ${cliente.apellidos}`.toLowerCase()
      : cliente.razonSocial!.toLowerCase();
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
    if (!clienteSeleccionadoLocal) return;

    const cliente = mockClientes.find((c: ClienteTradicional) => c.numeroDocumento === clienteSeleccionadoLocal.dni);
    if (cliente) {
      setIsEditing(true);
      setDocumentType(cliente.tipoDocumento);
      setClientType(cliente.tipoPersona);

      const nombreCompleto = cliente.tipoPersona === 'natural'
        ? `${cliente.nombres} ${cliente.apellidos}`
        : cliente.razonSocial || '';

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
    try {
      const clientesLS = localStorage.getItem('clientes');
      const clientesActuales = clientesLS ? JSON.parse(clientesLS) : [];

      const documentTypeMap: { [key: string]: string } = {
        'DNI': 'DNI',
        'RUC': 'RUC',
        'CE': 'CARNET_EXTRANJERIA',
        'PAS': 'PASAPORTE'
      };

      const docTypeFormatted = documentTypeMap[documentType] || documentType;
      const documentoFormateado = `${docTypeFormatted} ${formData.documentNumber.trim()}`;

      const newId = clientesActuales.length > 0
        ? Math.max(...clientesActuales.map((c: any) => c.id)) + 1
        : 1;

      const nuevoCliente = {
        id: newId,
        name: formData.legalName.trim(),
        document: documentoFormateado,
        type: clientType === 'natural' ? 'Cliente' : 'Cliente',
        address: formData.address.trim() || 'Sin dirección',
        phone: formData.phone.trim() || 'Sin teléfono',
        enabled: true
      };

      clientesActuales.unshift(nuevoCliente);
      localStorage.setItem('clientes', JSON.stringify(clientesActuales));

      setClienteSeleccionadoLocal({
        nombre: nuevoCliente.name,
        dni: formData.documentNumber,
        direccion: nuevoCliente.address
      });

      setShowClienteForm(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
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
    <>
      <ConfigurationCard
        title="Cliente"
        description="Busca o registra el cliente para el comprobante"
        icon={User}
        helpText="Para factura es obligatorio que el cliente tenga RUC. Para boleta puede ser DNI o sin documento."
      >
        {!clienteSeleccionadoLocal ? (
          <div className="space-y-4">
            {/* Búsqueda de cliente */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre o documento..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Resultados de búsqueda */}
            {searchQuery && (
              <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-lg shadow-sm">
                {clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((cliente: ClienteTradicional) => (
                    <button
                      key={cliente.id}
                      onClick={() => handleSeleccionarCliente(cliente)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {cliente.tipoPersona === 'natural'
                          ? `${cliente.nombres} ${cliente.apellidos}`
                          : cliente.razonSocial}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                        <span className="inline-flex px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                          {cliente.tipoDocumento}
                        </span>
                        {cliente.numeroDocumento}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-500 mb-2">No se encontraron clientes</p>
                    <p className="text-xs text-gray-400">Intenta con otro término o crea uno nuevo</p>
                  </div>
                )}
              </div>
            )}

            {/* Botón crear nuevo cliente */}
            <button
              className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium w-full py-3 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200"
              onClick={handleNuevoCliente}
            >
              <Plus className="w-5 h-5" />
              <span>Crear Nuevo Cliente</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cliente seleccionado */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Cliente Seleccionado</p>
                    <p className="text-lg font-bold text-gray-900">{clienteSeleccionadoLocal.nombre}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs font-medium text-gray-500 block mb-1">Documento</span>
                  <p className="text-sm font-semibold text-gray-900">{clienteSeleccionadoLocal.dni}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <span className="text-xs font-medium text-gray-500 block mb-1">Dirección</span>
                  <p className="text-sm font-medium text-gray-700">{clienteSeleccionadoLocal.direccion}</p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex space-x-3">
              <button
                className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium px-4 py-2 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200"
                onClick={handleEditarCliente}
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
              <button
                className="flex-1 text-gray-700 hover:text-gray-900 text-sm font-medium px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                onClick={() => {
                  setClienteSeleccionadoLocal(null);
                  setSearchQuery('');
                }}
              >
                Cambiar cliente
              </button>
            </div>
          </div>
        )}
      </ConfigurationCard>

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
    </>
  );
};

export default ClienteSection;
