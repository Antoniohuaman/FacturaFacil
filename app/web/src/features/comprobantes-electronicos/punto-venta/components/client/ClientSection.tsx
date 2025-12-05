import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit, User, X } from 'lucide-react';
import ClienteForm from '../../../../gestion-clientes/components/ClienteForm.tsx';

export interface ClientePOS {
  id: number;
  nombre: string;
  tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
  documento: string;
  direccion: string;
}

interface ClientSectionProps {
  clienteSeleccionado: ClientePOS | null;
  setClienteSeleccionado: (cliente: ClientePOS | null) => void;
}

export const ClientSection: React.FC<ClientSectionProps> = ({
  clienteSeleccionado,
  setClienteSeleccionado,
}) => {
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clienteFormData, setClienteFormData] = useState({
    documentNumber: '',
    legalName: '',
    address: '',
    gender: '',
    phone: '',
    email: '',
    additionalData: '',
  });
  const [clienteDocumentType, setClienteDocumentType] = useState('DNI');
  const [clienteType, setClienteType] = useState('Cliente');

  const documentTypes = [
    { value: 'RUC', label: 'RUC' },
    { value: 'DNI', label: 'DNI' },
    { value: 'SIN_DOCUMENTO', label: 'SIN DOCUMENTO' },
    { value: 'NO_DOMICILIADO', label: 'NO DOMICILIADO' },
    { value: 'PASAPORTE', label: 'PASAPORTE' },
    { value: 'CARNET_EXTRANJERIA', label: 'CARNET EXTRANJERÍA' },
    { value: 'CARNET_IDENTIDAD', label: 'CARNET DE IDENTIDAD' },
    { value: 'DOC_IDENTIF_PERS_NAT_NO_DOM', label: 'DOC.IDENTIF.PERS.NAT.NO DOM.' },
    { value: 'TAM_TARJETA_ANDINA', label: 'TAM - TARJETA ANDINA DE MIGRACIÓN' },
    { value: 'CARNET_PERMISO_TEMP_PERMANENCIA', label: 'CARNET PERMISO TEMP.PERMANENCIA' },
  ];

  const clientTypes = [
    { value: 'Cliente', label: 'Cliente' },
    { value: 'Proveedor', label: 'Proveedor' },
  ];

  const getClientesFromLocalStorage = (): ClientePOS[] => {
    try {
      const stored = localStorage.getItem('clientes');
      if (stored) {
        type StoredClienteLite = {
          id: number;
          name: string;
          document?: string;
          address?: string;
        };

        const parsed: StoredClienteLite[] = JSON.parse(stored);
        return parsed.map((cliente) => ({
          id: cliente.id,
          nombre: cliente.name,
          tipoDocumento: cliente.document?.includes('RUC') ? 'RUC' as const :
            cliente.document?.includes('DNI') ? 'DNI' as const :
            'Sin documento' as const,
          documento: cliente.document?.replace('RUC ', '').replace('DNI ', '').replace('Sin documento', '') ?? '',
          direccion: cliente.address || 'Dirección no definida',
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading clientes from localStorage:', error);
      return [];
    }
  };

  const mockClientes: ClientePOS[] = useMemo(getClientesFromLocalStorage, []);

  const clientesFiltrados = mockClientes.filter((c: ClientePOS) =>
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.documento.includes(searchQuery),
  );

  const handleClienteInputChange = (field: string, value: string) => {
    setClienteFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNuevoCliente = () => {
    setEditingCliente(false);
    setClienteFormData({
      documentNumber: '',
      legalName: '',
      address: '',
      gender: '',
      phone: '',
      email: '',
      additionalData: '',
    });
    setClienteDocumentType('DNI');
    setShowClienteForm(true);
  };

  const handleEditarCliente = () => {
    if (!clienteSeleccionado) return;

    setEditingCliente(true);
    setClienteFormData({
      documentNumber: clienteSeleccionado.documento,
      legalName: clienteSeleccionado.nombre,
      address: clienteSeleccionado.direccion,
      gender: '',
      phone: '',
      email: '',
      additionalData: '',
    });
    setClienteDocumentType(clienteSeleccionado.tipoDocumento === 'RUC' ? 'RUC' : 'DNI');
    setShowClienteForm(true);
  };

  const handleSaveCliente = () => {
    try {
      const clientesLS = localStorage.getItem('clientes');
      type StoredCliente = {
        id: number;
        name: string;
        document: string;
        type: string;
        address?: string;
        phone?: string;
        enabled: boolean;
      };

      const clientesActuales: StoredCliente[] = clientesLS ? JSON.parse(clientesLS) : [];

      const documentoFormateado = clienteDocumentType !== 'SIN_DOCUMENTO'
        ? `${clienteDocumentType} ${clienteFormData.documentNumber.trim()}`
        : 'Sin documento';

      const newId = clientesActuales.length > 0
        ? Math.max(...clientesActuales.map((c) => c.id)) + 1
        : 1;

      const nuevoCliente = {
        id: newId,
        name: clienteFormData.legalName.trim(),
        document: documentoFormateado,
        type: clienteType,
        address: clienteFormData.address.trim() || 'Sin dirección',
        phone: clienteFormData.phone.trim() || 'Sin teléfono',
        enabled: true,
      };

      clientesActuales.unshift(nuevoCliente);
      localStorage.setItem('clientes', JSON.stringify(clientesActuales));

      setClienteSeleccionado({
        id: nuevoCliente.id,
        nombre: nuevoCliente.name,
        tipoDocumento: clienteDocumentType === 'SIN_DOCUMENTO' ? 'Sin documento' : (clienteDocumentType === 'RUC' ? 'RUC' : 'DNI'),
        documento: clienteFormData.documentNumber,
        direccion: nuevoCliente.address,
      });

      setShowClienteForm(false);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
  };

  const handleSeleccionarCliente = (cliente: ClientePOS) => {
    setClienteSeleccionado(cliente);
    setSearchQuery('');
  };

  const selectedClientName: string = clienteSeleccionado ? clienteSeleccionado.nombre : '';

  return (
    <div className="p-2.5 bg-white border-b border-gray-200">
      {!clienteSeleccionado ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
              <User className="h-2.5 w-2.5" />
              DNI / RUC
            </label>
            <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
              <User className="h-2.5 w-2.5" />
              Nombre
            </label>
          </div>

          <div className="grid grid-cols-[120px_1fr_auto] gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="08661829"
              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px] font-medium"
            />
            <input
              type="text"
              value={selectedClientName}
              readOnly
              placeholder="NOMBRE DEL CLIENTE"
              className="px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-[11px] text-gray-600 uppercase"
            />
            <button
              className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
              title="Buscar cliente"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {searchQuery && (
            <div className="border border-blue-200 rounded max-h-28 overflow-y-auto bg-white">
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => handleSeleccionarCliente(cliente)}
                    className="w-full text-left p-1.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-semibold text-[10px] text-gray-900">{cliente.nombre}</div>
                    <div className="text-[9px] text-gray-600">
                      {cliente.tipoDocumento}: {cliente.documento}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-2 text-center text-[10px] text-gray-500">Sin resultados</div>
              )}
            </div>
          )}

          <button
            onClick={handleNuevoCliente}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded hover:from-teal-600 hover:to-cyan-700 transition-all text-[11px] font-bold shadow-sm"
          >
            <Plus className="h-3 w-3" />
            Nuevo
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded p-2 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[11px] text-gray-900 truncate">{clienteSeleccionado.nombre}</div>
              <div className="text-[10px] text-gray-700 font-medium">
                {clienteSeleccionado.tipoDocumento}: {clienteSeleccionado.documento}
              </div>
            </div>
            <button
              onClick={() => setClienteSeleccionado(null)}
              className="p-0.5 text-red-500 hover:bg-red-100 rounded transition-colors flex-shrink-0"
              title="Quitar"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleEditarCliente}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold text-blue-600 bg-white hover:bg-blue-50 rounded border border-blue-200 transition-colors"
            >
              <Edit className="h-2.5 w-2.5" />
              Editar
            </button>
            <button
              onClick={() => setClienteSeleccionado(null)}
              className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[10px] font-bold text-gray-600 bg-white hover:bg-gray-100 rounded border border-gray-300 transition-colors"
            >
              <Search className="h-2.5 w-2.5" />
              Cambiar
            </button>
          </div>
        </div>
      )}

      {showClienteForm && (
        <ClienteForm
          formData={clienteFormData}
          documentType={clienteDocumentType}
          clientType={clienteType}
          documentTypes={documentTypes}
          clientTypes={clientTypes}
          onInputChange={handleClienteInputChange}
          onDocumentTypeChange={setClienteDocumentType}
          onClientTypeChange={setClienteType}
          onSave={handleSaveCliente}
          onCancel={() => setShowClienteForm(false)}
          isEditing={editingCliente}
        />
      )}
    </div>
  );
};
