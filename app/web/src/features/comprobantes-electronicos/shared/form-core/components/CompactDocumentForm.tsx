// ===================================================================
// FORMULARIO COMPACTO DE DOCUMENTO
// Reorganiza los campos para reducir scroll manteniendo toda la lógica
// ===================================================================

import React, { useState } from 'react';
import {
  FileText,
  ChevronDown,
  Calendar,
  Hash,
  DollarSign,
  CreditCard,
  User,
  Settings,
  Search,
  Plus,
  Edit,
  MapPin,
  Truck,
  FileText as FileIcon,
  Mail,
  Building2
} from 'lucide-react';
import { ConfigurationCard } from './ConfigurationCard';
import { useConfigurationContext } from '../../../../configuracion-sistema/context/ConfigurationContext';
import { useFieldsConfiguration } from '../contexts/FieldsConfigurationContext';
import ClienteForm from '../../../../gestion-clientes/components/ClienteForm';

interface CompactDocumentFormProps {
  // Serie y Fecha
  serieSeleccionada: string;
  setSerieSeleccionada: (value: string) => void;
  seriesFiltradas: string[];

  // Moneda y Forma de Pago
  moneda?: string;
  setMoneda?: (value: string) => void;
  formaPago?: string;
  setFormaPago?: (value: string) => void;
  onNuevaFormaPago?: () => void;

  // Modal de configuración
  onOpenFieldsConfig?: () => void;

  // Cliente
  clienteSeleccionado?: {
    nombre: string;
    dni: string;
    direccion: string;
  };
}

const CompactDocumentForm: React.FC<CompactDocumentFormProps> = ({
  serieSeleccionada,
  setSerieSeleccionada,
  seriesFiltradas,
  moneda = "PEN",
  setMoneda,
  formaPago = "contado",
  setFormaPago,
  onNuevaFormaPago,
  onOpenFieldsConfig,
  clienteSeleccionado,
}) => {
  const { state } = useConfigurationContext();
  const { paymentMethods } = state;
  const { config } = useFieldsConfiguration();

  // Estados para cliente
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteSeleccionadoLocal, setClienteSeleccionadoLocal] = useState<{
    nombre: string;
    dni: string;
    direccion: string;
  } | null>(clienteSeleccionado || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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

  const mockClientes = getClientesFromLocalStorage();

  // Filtrar clientes por búsqueda
  const clientesFiltrados = mockClientes.filter((cliente: any) => {
    const searchLower = searchQuery.toLowerCase();
    const nombreCompleto = cliente.tipoPersona === 'natural'
      ? `${cliente.nombres} ${cliente.apellidos}`.toLowerCase()
      : cliente.razonSocial!.toLowerCase();
    return nombreCompleto.includes(searchLower) ||
           cliente.numeroDocumento.includes(searchLower);
  });

  // Handlers para cliente
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

    const cliente = mockClientes.find((c: any) => c.numeroDocumento === clienteSeleccionadoLocal.dni);
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
        title="Información del Comprobante"
        description="Datos del documento, cliente y configuración"
        icon={FileText}
        helpText="Completa la información del comprobante electrónico siguiendo las normas de SUNAT"
        actions={
          onOpenFieldsConfig && (
            <button
              className="inline-flex items-center px-3 py-1.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md text-sm"
              onClick={onOpenFieldsConfig}
              title="Configurar campos visibles y obligatorios"
            >
              <Settings className="w-4 h-4 mr-1.5" />
              Configuración Campos
            </button>
          )
        }
      >
        {/* ========== FILA 1: Cliente + Fecha/Moneda/Forma de Pago ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* IZQUIERDA: RUC/DNI + CLIENTE */}
          <div className="space-y-4">
            {!clienteSeleccionadoLocal ? (
              <>
                {/* Búsqueda de cliente */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1.5 text-blue-600" />
                    Cliente
                  </label>
                  <Search className="absolute left-3 top-11 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre o documento..."
                    className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Resultados de búsqueda */}
                {searchQuery && (
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-lg shadow-sm">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente: any) => (
                        <button
                          key={cliente.id}
                          onClick={() => handleSeleccionarCliente(cliente)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <p className="text-sm font-semibold text-gray-900">
                            {cliente.tipoPersona === 'natural'
                              ? `${cliente.nombres} ${cliente.apellidos}`
                              : cliente.razonSocial}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="inline-flex px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium mr-1">
                              {cliente.tipoDocumento}
                            </span>
                            {cliente.numeroDocumento}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center">
                        <p className="text-sm text-gray-500">No se encontraron clientes</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botón crear nuevo cliente */}
                <button
                  className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium w-full py-2.5 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                  onClick={handleNuevoCliente}
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Cliente</span>
                </button>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1.5 text-blue-600" />
                  Cliente Seleccionado
                </label>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                  <p className="text-base font-bold text-gray-900 mb-2">{clienteSeleccionadoLocal.nombre}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded p-2 border border-blue-100">
                      <span className="font-medium text-gray-500 block">Doc:</span>
                      <p className="font-semibold text-gray-900">{clienteSeleccionadoLocal.dni}</p>
                    </div>
                    <div className="bg-white rounded p-2 border border-blue-100">
                      <span className="font-medium text-gray-500 block">Dir:</span>
                      <p className="font-medium text-gray-700 truncate">{clienteSeleccionadoLocal.direccion}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <button
                      className="flex items-center justify-center space-x-1 text-blue-600 text-xs font-medium px-3 py-1.5 border border-blue-200 rounded hover:bg-blue-50"
                      onClick={handleEditarCliente}
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      className="flex-1 text-gray-700 text-xs font-medium px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
                      onClick={() => {
                        setClienteSeleccionadoLocal(null);
                        setSearchQuery('');
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DERECHA: Fecha Emisión, Moneda, Forma de Pago, Fecha Vencimiento */}
          <div className="space-y-3">
            {/* Fila: Serie, Fecha Emisión, Moneda */}
            <div className="grid grid-cols-3 gap-2">
              {/* Serie */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <Hash className="w-3 h-3 mr-1 text-blue-600" />
                  Serie<span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="relative">
                  {seriesFiltradas.length > 0 ? (
                    <>
                      <select
                        className="w-full px-2 pr-7 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-gray-900 bg-white appearance-none cursor-pointer"
                        value={serieSeleccionada}
                        onChange={e => setSerieSeleccionada(e.target.value)}
                      >
                        {seriesFiltradas.map(serie => (
                          <option key={serie} value={serie}>{serie}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-2.5 w-3 h-3 text-gray-400 pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full px-2 py-2 border-2 border-amber-300 rounded-lg bg-amber-50 text-xs font-medium text-amber-700">
                      ⚠️ Sin series
                    </div>
                  )}
                </div>
              </div>

              {/* Fecha Emisión */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <Calendar className="w-3 h-3 mr-1 text-blue-600" />
                  F. Emisión<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={new Date().toISOString().split('T')[0]}
                  className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-gray-900"
                />
              </div>

              {/* Moneda */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <DollarSign className="w-3 h-3 mr-1 text-green-600" />
                  Moneda
                </label>
                <select
                  className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-gray-900 bg-white"
                  value={moneda}
                  onChange={e => setMoneda?.(e.target.value)}
                >
                  <option value="PEN">PEN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            {/* Fila: Forma de Pago */}
            <div>
              <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                <CreditCard className="w-3 h-3 mr-1 text-purple-600" />
                Forma de Pago
              </label>
              <select
                className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-gray-900 bg-white"
                value={formaPago}
                onChange={e => setFormaPago?.(e.target.value)}
              >
                {paymentMethods.length > 0 ? (
                  paymentMethods
                    .filter(pm => pm.isActive)
                    .sort((a, b) => (a.display?.displayOrder || 999) - (b.display?.displayOrder || 999))
                    .map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))
                ) : (
                  <option value="contado">Contado (por defecto)</option>
                )}
              </select>
              {onNuevaFormaPago && (
                <button
                  type="button"
                  className="mt-1 text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
                  onClick={onNuevaFormaPago}
                >
                  + Nueva Forma de Pago
                </button>
              )}
            </div>

            {/* Fecha de Vencimiento (si visible) */}
            {config.optionalFields.fechaVencimiento.visible && (
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <Calendar className="w-3 h-3 mr-1 text-blue-600" />
                  Fecha de Vencimiento
                  {config.optionalFields.fechaVencimiento.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  required={config.optionalFields.fechaVencimiento.required}
                  className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-gray-900"
                  defaultValue={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                
              </div>
            )}
          </div>
        </div>

        {/* ========== FILA 2: Dirección/Dirección Envío + Vendedor/Centro Costo ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 pt-4 border-t border-gray-200">

          {/* IZQUIERDA: Dirección y Dirección de Envío */}
          <div className="space-y-3">
            {/* Dirección */}
            {config.optionalFields.direccion.visible && (
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 mr-1 text-blue-600" />
                  Dirección
                  {config.optionalFields.direccion.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={config.optionalFields.direccion.required}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder="Dirección del cliente"
                />
              </div>
            )}

            {/* Dirección de Envío */}
            {config.optionalFields.direccionEnvio.visible && (
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <Truck className="w-3 h-3 mr-1 text-blue-600" />
                  Dirección de Envío
                  {config.optionalFields.direccionEnvio.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={config.optionalFields.direccionEnvio.required}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder="Ej: Av. Principal 123, Lima"
                />
              </div>
            )}
          </div>

          {/* DERECHA: Vendedor + Centro de Costo */}
          <div className="space-y-3">
            {/* Vendedor compacto */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <User className="w-3 h-3 inline mr-1 text-blue-600" />
                Vendedor
              </label>
              <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border-2 border-blue-200">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">Javier Masías Loza</p>
                  <p className="text-[10px] text-gray-500">ID: 001</p>
                </div>
              </div>
            </div>

            {/* Centro de Costo */}
            {config.optionalFields.centroCosto.visible && (
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                  <Building2 className="w-3 h-3 mr-1 text-blue-600" />
                  Centro de Costo
                  {config.optionalFields.centroCosto.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={config.optionalFields.centroCosto.required}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  placeholder="Ingrese centro de costos"
                />
              </div>
            )}
          </div>
        </div>

        {/* ========== FILA 3: Referencias (Orden Compra, Correo, Guía) ========== */}
        {(config.optionalFields.ordenCompra.visible || config.optionalFields.correo.visible || config.optionalFields.guiaRemision.visible) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-200">

            {/* IZQUIERDA: Orden de Compra + Correo */}
            <div className="space-y-3">
              {/* Orden de Compra */}
              {config.optionalFields.ordenCompra.visible && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <FileIcon className="w-3 h-3 mr-1 text-blue-600" />
                    Orden de Compra
                    {config.optionalFields.ordenCompra.required && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.ordenCompra.required}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    placeholder="Ej: OC01-0000236"
                  />
                </div>
              )}

              {/* Correo Electrónico */}
              {config.optionalFields.correo.visible && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <Mail className="w-3 h-3 mr-1 text-blue-600" />
                    Correo Electrónico
                    {config.optionalFields.correo.required && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <input
                    type="email"
                    required={config.optionalFields.correo.required}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    placeholder="cliente@empresa.com"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">Para envío automático del PDF</p>
                </div>
              )}
            </div>

            {/* DERECHA: Guía de Remisión */}
            <div>
              {config.optionalFields.guiaRemision.visible && (
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1">
                    <Truck className="w-3 h-3 mr-1 text-blue-600" />
                    N° de Guía de Remisión
                    {config.optionalFields.guiaRemision.required && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.guiaRemision.required}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                    placeholder="Ej: T001-00000256"
                  />
                </div>
              )}
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

export default CompactDocumentForm;
