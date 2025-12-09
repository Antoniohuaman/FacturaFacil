import React, { useMemo, useState } from 'react';
import { Search, Edit, User, X } from 'lucide-react';
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
    setSearchQuery(cliente.documento);
  };

  const selectedClientName: string = clienteSeleccionado ? clienteSeleccionado.nombre : '';

  const handleDocumentInputChange = (value: string) => {
    if (clienteSeleccionado) {
      setClienteSeleccionado(null);
    }
    setSearchQuery(value);
  };

  const handleQuickSearch = () => {
    if (clientesFiltrados.length === 1) {
      handleSeleccionarCliente(clientesFiltrados[0]);
    }
  };

  const handleEditAction = () => {
    if (clienteSeleccionado) {
      handleEditarCliente();
    } else {
      handleNuevoCliente();
    }
  };

  return (
    <div className="p-2.5 bg-white border-b border-gray-200">
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
            <User className="h-2.5 w-2.5" />
            Número de documento
          </label>
          <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide">
            <User className="h-2.5 w-2.5" />
            Nombre
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleDocumentInputChange(e.target.value)}
              placeholder="08661874"
              className="flex-1 px-3 py-1.5 text-[12px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleQuickSearch}
              className="w-10 flex items-center justify-center bg-slate-200/40 text-slate-600 hover:text-slate-900 transition"
              title="Buscar cliente"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden">
            <input
              type="text"
              value={selectedClientName}
              readOnly
              placeholder="Nombre del cliente"
              className="flex-1 px-3 py-1.5 text-[12px] font-semibold text-slate-800 uppercase placeholder:normal-case placeholder:text-slate-400 bg-transparent"
            />
            <button
              type="button"
              onClick={handleEditAction}
              className="w-10 flex items-center justify-center bg-indigo-200/60 text-indigo-700 hover:bg-indigo-200 transition"
              title={clienteSeleccionado ? 'Editar cliente' : 'Crear cliente'}
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {searchQuery && !clienteSeleccionado && (
        <div className="mt-2 border border-slate-200 rounded-xl max-h-28 overflow-y-auto bg-white shadow-sm">
          {clientesFiltrados.length > 0 ? (
            clientesFiltrados.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => handleSeleccionarCliente(cliente)}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <div className="font-semibold text-[11px] text-slate-900 truncate">{cliente.nombre}</div>
                <div className="text-[10px] text-slate-600">
                  {cliente.tipoDocumento}: {cliente.documento}
                </div>
              </button>
            ))
          ) : (
            <div className="p-2 text-center text-[10px] text-slate-500">Sin resultados</div>
          )}
        </div>
      )}

      {clienteSeleccionado && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-semibold text-slate-600">
            {clienteSeleccionado.tipoDocumento}: {clienteSeleccionado.documento}
          </span>
          <button
            type="button"
            onClick={() => {
              setClienteSeleccionado(null);
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 hover:text-red-600 hover:border-red-200 transition"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
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
