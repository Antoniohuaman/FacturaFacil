/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// FORMULARIO COMPACTO DE DOCUMENTO
// Reorganiza los campos para reducir scroll manteniendo toda la lógica
// ===================================================================

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ChevronDown,
  Calendar,
  Hash,
  DollarSign,
  CreditCard,
  User,
  Search,
  Plus,
  Edit,
  MapPin,
  Truck,
  FileText as FileIcon,
  Mail,
  Building2,
  Eye
} from 'lucide-react';
import { ConfigurationCard } from './ConfigurationCard';
import { useConfigurationContext } from '../../../../configuracion-sistema/context/ConfigurationContext';
import { useFieldsConfiguration } from '../contexts/FieldsConfigurationContext';
import ClienteForm from '../../../../gestion-clientes/components/ClienteForm';
import { IconPersonalizeTwoSliders } from './IconPersonalizeTwoSliders';

interface CompactDocumentFormProps {
  // Tipo de Comprobante
  tipoComprobante: 'factura' | 'boleta';
  setTipoComprobante: (value: 'factura' | 'boleta') => void;
  
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
  onVistaPrevia?: () => void;

  // Cliente
  clienteSeleccionado?: {
    nombre: string;
    dni: string;
    direccion: string;
  };
  // Callbacks para elevar datos al padre (EmisionTradicional)
  onClienteChange?: (cliente: { nombre: string; dni: string; direccion: string; email?: string } | null) => void;
  fechaEmision?: string;
  onFechaEmisionChange?: (value: string) => void;
  onOptionalFieldsChange?: (fields: Record<string, any>) => void;
}

const CompactDocumentForm: React.FC<CompactDocumentFormProps> = ({
  tipoComprobante,
  setTipoComprobante,
  serieSeleccionada,
  setSerieSeleccionada,
  seriesFiltradas,
  moneda = "PEN",
  setMoneda,
  formaPago = "contado",
  setFormaPago,
  onNuevaFormaPago,
  onOpenFieldsConfig,
  onVistaPrevia,
  clienteSeleccionado,
  onClienteChange,
  fechaEmision,
  onFechaEmisionChange,
  onOptionalFieldsChange,
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
  // Optional fields local state to notify parent
  const [localFechaEmision, setLocalFechaEmision] = useState<string>(fechaEmision || new Date().toISOString().split('T')[0]);
  const [localFechaVencimiento, setLocalFechaVencimiento] = useState<string>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [localDireccion, setLocalDireccion] = useState<string>('');
  const [localDireccionEnvio, setLocalDireccionEnvio] = useState<string>('');
  const [localCorreo, setLocalCorreo] = useState<string>('');
  const [localOrdenCompra, setLocalOrdenCompra] = useState<string>('');
  const [localGuiaRemision, setLocalGuiaRemision] = useState<string>('');
  const [localCentroCosto, setLocalCentroCosto] = useState<string>('');
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

      // Notify parent about new client
      onClienteChange?.({ nombre: nuevoCliente.name, dni: formData.documentNumber, direccion: nuevoCliente.address, email: formData.email || '' });

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

    // Notify parent
    onClienteChange?.({ nombre: nombreCompleto, dni: cliente.numeroDocumento, direccion: cliente.direccion || 'Dirección no definida' });

    setSearchQuery('');
  };

  // Notify parent about initial values so the parent has the same view
  useEffect(() => {
    // On mount, push current values to parent so fields that are not
    // explicitly edited still get sent (e.g., fechaVencimiento default)
    onFechaEmisionChange?.(localFechaEmision);
    onOptionalFieldsChange?.({
      fechaEmision: localFechaEmision,
      fechaVencimiento: localFechaVencimiento,
      direccion: localDireccion,
      direccionEnvio: localDireccionEnvio,
      correo: localCorreo,
      ordenCompra: localOrdenCompra,
      guiaRemision: localGuiaRemision,
      centroCosto: localCentroCosto
    });

    if (clienteSeleccionadoLocal) {
      onClienteChange?.(clienteSeleccionadoLocal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ConfigurationCard
        title="Información del Comprobante"
        description="Datos del documento, cliente y configuración"
        icon={FileText}
        helpText="Completa la información del comprobante electrónico siguiendo las normas de SUNAT"
        contentClassName="p-4"
        actions={
          <div className="flex items-center gap-2">
            {/* Pill buttons para tipo de comprobante (estado) */}
            <div className="flex items-center gap-1.5">
              <button
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  tipoComprobante === 'factura'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setTipoComprobante('factura')}
                data-active={tipoComprobante === 'factura'}
              >
                Factura
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  tipoComprobante === 'boleta'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
                onClick={() => setTipoComprobante('boleta')}
                data-active={tipoComprobante === 'boleta'}
              >
                Boleta
              </button>
              {/* Botón + otros tipos (icon-only sin pill) */}
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                title="Otros tipos de comprobantes"
              >
                <Plus className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            
            {/* Separador visual */}
            <div className="h-6 w-px bg-slate-200"></div>
            
            {/* Icon-only actions: Vista previa + Personalizar (sin bordes) */}
            {onVistaPrevia && (
              <button
                aria-label="Vista previa"
                title="Vista previa"
                onClick={onVistaPrevia}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <Eye className="h-[18px] w-[18px] text-slate-600" />
              </button>
            )}
            {onOpenFieldsConfig && (
              <button
                aria-label="Personalizar campos"
                title="Personalizar campos"
                onClick={onOpenFieldsConfig}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              >
                <IconPersonalizeTwoSliders className="text-slate-600" />
              </button>
            )}
          </div>
        }
      >
        {/* ========== GRID OPTIMIZADO: Proporciones ~42/34/24 ========== */}
        <div className="grid grid-cols-12 gap-3 text-[13px]">

          {/* COLUMNA 1: Cliente/Dirección/Email/Envío (~42% → xl:col-span-5) */}
          <div className="col-span-12 xl:col-span-5 space-y-3">
            {/* Cliente (reducido ~10-12%, lupa compacta) */}
            {!clienteSeleccionadoLocal ? (
              <div>
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="cliente-buscar">
                  <User className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Cliente<span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="relative max-w-[88%]">
                  <Search className="absolute left-2.5 top-2.5 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o documento..."
                    id="cliente-buscar"
                    className="h-9 w-full pl-9 pr-10 rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm text-[13px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {/* Search button inside input (compacto) */}
                  <button
                    type="button"
                    aria-label="Buscar cliente"
                    className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-300 transition-colors"
                    title="Buscar cliente"
                    onClick={() => {/* Trigger search */}}
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Resultados de búsqueda */}
                {searchQuery && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente: any) => (
                        <button
                          key={cliente.id}
                          onClick={() => handleSeleccionarCliente(cliente)}
                          className="w-full text-left px-3 py-2 hover:bg-violet-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <p className="text-xs font-semibold text-gray-900">
                            {cliente.tipoPersona === 'natural'
                              ? `${cliente.nombres} ${cliente.apellidos}`
                              : cliente.razonSocial}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            <span className="inline-flex px-1 py-0.5 bg-gray-100 rounded text-[10px] font-medium mr-1">
                              {cliente.tipoDocumento}
                            </span>
                            {cliente.numeroDocumento}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-center">
                        <p className="text-[12px] text-gray-500">No se encontraron clientes</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Link "Nuevo Cliente" */}
                <p 
                  className="mt-1 text-[12px] text-primary hover:underline cursor-pointer font-medium"
                  onClick={handleNuevoCliente}
                >
                  + Nuevo Cliente
                </p>
              </div>
            ) : (
              <div>
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1">
                  <User className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Cliente Seleccionado
                </label>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 border border-violet-200 shadow-sm">
                  <p className="text-[13px] font-semibold text-gray-900 mb-1.5">{clienteSeleccionadoLocal.nombre}</p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="bg-white rounded px-2 py-1 border border-violet-100">
                      <span className="font-medium text-gray-500 block">Doc:</span>
                      <p className="font-semibold text-gray-900">{clienteSeleccionadoLocal.dni}</p>
                    </div>
                    <div className="bg-white rounded px-2 py-1 border border-violet-100">
                      <span className="font-medium text-gray-500 block">Dir:</span>
                      <p className="font-medium text-gray-700 truncate">{clienteSeleccionadoLocal.direccion}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      className="flex items-center justify-center gap-1 text-primary text-[11px] font-medium px-2 py-1 border border-slate-300 rounded hover:bg-slate-50"
                      onClick={handleEditarCliente}
                    >
                      <Edit className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      className="flex-1 text-gray-700 text-[11px] font-medium px-2 py-1 border border-slate-300 rounded hover:bg-gray-50"
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

            {/* Dirección */}
            {config.optionalFields.direccion.visible && (
              <div>
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="direccion">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Dirección
                  {config.optionalFields.direccion.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={config.optionalFields.direccion.required}
                  value={localDireccion}
                  onChange={(e) => { setLocalDireccion(e.target.value); onOptionalFieldsChange?.({ direccion: e.target.value }); }}
                  id="direccion"
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm text-[13px]"
                  placeholder="Dirección del cliente"
                />
              </div>
            )}

            {/* Email (ahora w-full sin max-w) */}
            {config.optionalFields.correo.visible && (
              <div>
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="email">
                  <Mail className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Email
                  {config.optionalFields.correo.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  required={config.optionalFields.correo.required}
                  value={localCorreo}
                  onChange={(e) => { setLocalCorreo(e.target.value); onOptionalFieldsChange?.({ correo: e.target.value }); }}
                  id="email"
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm text-[13px]"
                  placeholder="cliente@empresa.com"
                />
              </div>
            )}

            {/* Dirección de Envío */}
            {config.optionalFields.direccionEnvio.visible && (
              <div>
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="direccion-envio">
                  <Truck className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Dirección de Envío
                  {config.optionalFields.direccionEnvio.required && <span className="ml-0.5 text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={config.optionalFields.direccionEnvio.required}
                  value={localDireccionEnvio}
                  onChange={(e) => { setLocalDireccionEnvio(e.target.value); onOptionalFieldsChange?.({ direccionEnvio: e.target.value }); }}
                  id="direccion-envio"
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm text-[13px]"
                  placeholder="Ej: Av. Principal 123, Lima"
                />
              </div>
            )}
          </div>

          {/* COLUMNA 2: Serie → Emisión → Forma → Moneda → Vencimiento (~34% → xl:col-span-4) */}
          <div className="col-span-12 xl:col-span-4 xl:border-s xl:border-slate-200/60 xl:ps-3">
            <div className="grid grid-cols-12 gap-x-3 gap-y-3 items-end">
              {/* Fila 1: Serie + Fecha Emisión */}
              <div className="col-span-6">
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="serie">
                  <Hash className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Serie<span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="relative">
                  {seriesFiltradas.length > 0 ? (
                    <>
                      <select
                        id="serie"
                        className="h-9 w-full max-w-[240px] px-3 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white appearance-none cursor-pointer shadow-sm text-[13px]"
                        value={serieSeleccionada}
                        onChange={e => setSerieSeleccionada(e.target.value)}
                      >
                        {seriesFiltradas.map(serie => (
                          <option key={serie} value={serie}>{serie}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full h-9 px-3 flex items-center border border-amber-300 rounded-xl bg-amber-50 text-[12px] font-medium text-amber-700">
                      ⚠️ Sin series
                    </div>
                  )}
                </div>
                <div className="min-h-[20px]"></div>
              </div>
              <div className="col-span-6">
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="fecha-emision">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Fecha de Emisión<span className="ml-0.5 text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={localFechaEmision}
                  onChange={(e) => {
                    setLocalFechaEmision(e.target.value);
                    onFechaEmisionChange?.(e.target.value);
                    onOptionalFieldsChange?.({ fechaEmision: e.target.value, fechaVencimiento: localFechaVencimiento, direccion: localDireccion, direccionEnvio: localDireccionEnvio, correo: localCorreo, ordenCompra: localOrdenCompra, guiaRemision: localGuiaRemision, centroCosto: localCentroCosto });
                  }}
                  id="fecha-emision"
                  className="h-9 w-full max-w-[240px] px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-[13px]"
                />
                <div className="min-h-[20px]"></div>
              </div>
              
              {/* Fila 2: Forma de Pago + Moneda (perfectamente alineados) */}
              <div className="col-span-6">
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="forma-pago">
                  <CreditCard className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  Forma de Pago
                </label>
                <select
                  id="forma-pago"
                  className="h-9 w-full max-w-[240px] px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white shadow-sm text-[13px]"
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
                  <a 
                    className="mt-1 block text-[12px] text-slate-500 hover:text-slate-700 cursor-pointer"
                    onClick={onNuevaFormaPago}
                  >
                    + Nueva forma de pago
                  </a>
                )}
              </div>
              <div className="col-span-6">
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="moneda">
                  <DollarSign className="w-3.5 h-3.5 mr-1 text-green-600" />
                  Moneda
                </label>
                <select
                  id="moneda"
                  className="h-9 w-full max-w-[240px] px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white shadow-sm text-[13px]"
                  value={moneda}
                  onChange={e => setMoneda?.(e.target.value)}
                >
                  <option value="PEN">PEN - Soles</option>
                  <option value="USD">USD - Dólares</option>
                </select>
                <div className="min-h-[20px]"></div>
              </div>

              {/* Fila 3: Fecha Vencimiento + Placeholder */}
              {config.optionalFields.fechaVencimiento.visible && (
                <div className="col-span-6">
                  <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="fecha-vencimiento">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-violet-600" />
                    Fecha de Vencimiento
                    {config.optionalFields.fechaVencimiento.required && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    required={config.optionalFields.fechaVencimiento.required}
                    value={localFechaVencimiento}
                    onChange={(e) => { setLocalFechaVencimiento(e.target.value); onOptionalFieldsChange?.({ fechaVencimiento: e.target.value }); }}
                    id="fecha-vencimiento"
                    className="h-9 w-full max-w-[240px] px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-[13px]"
                  />
                  <div className="min-h-[20px]"></div>
                </div>
              )}
              <div className="col-span-6" aria-hidden="true">
                <div className="h-9"></div>
              </div>
            </div>
          </div>

          {/* COLUMNA 3: Vendedor → OC → (Guía + Centro en misma fila) (~24% → xl:col-span-3) */}
          <div className="col-span-12 xl:col-span-3 xl:border-s xl:border-slate-200/60 xl:ps-3">
            <div className="space-y-3">
              {/* Vendedor (select simple 1 línea, 36px) */}
              <div>
                <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="vendedor">
                  <User className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Vendedor
                </label>
                <select 
                  id="vendedor" 
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option>Javier Masías Loza — ID: 001</option>
                </select>
              </div>

              {/* Orden de Compra (full-width) */}
              {config.optionalFields.ordenCompra.visible && (
                <div>
                  <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="orden-compra">
                    <FileIcon className="w-3.5 h-3.5 mr-1 text-violet-600" />
                    Orden de Compra
                    {config.optionalFields.ordenCompra.required && <span className="ml-0.5 text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={config.optionalFields.ordenCompra.required}
                    value={localOrdenCompra}
                    onChange={(e) => { setLocalOrdenCompra(e.target.value); onOptionalFieldsChange?.({ ordenCompra: e.target.value }); }}
                    id="orden-compra"
                    className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm text-[13px]"
                    placeholder="Ej: OC01-0000236"
                  />
                </div>
              )}

              {/* Fila compartida: Guía + Centro (col-span-6 cada uno) */}
              <div className="grid grid-cols-12 gap-x-2 gap-y-3 items-end">
                {/* Guía de Remisión */}
                {config.optionalFields.guiaRemision.visible && (
                  <div className="col-span-12 md:col-span-6">
                    <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="guia-remision">
                      <Truck className="w-3.5 h-3.5 mr-1 text-violet-600" />
                      N° Guía
                      {config.optionalFields.guiaRemision.required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={config.optionalFields.guiaRemision.required}
                      value={localGuiaRemision}
                      onChange={(e) => { setLocalGuiaRemision(e.target.value); onOptionalFieldsChange?.({ guiaRemision: e.target.value }); }}
                      id="guia-remision"
                      className="h-9 w-full rounded-xl border border-slate-300 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-[13px]"
                      placeholder="T001-000256"
                    />
                  </div>
                )}

                {/* Centro de Costo */}
                {config.optionalFields.centroCosto.visible && (
                  <div className="col-span-12 md:col-span-6">
                    <label className="flex items-center text-[12px] font-medium text-slate-600 mb-1" htmlFor="centro-costo">
                      <Building2 className="w-3.5 h-3.5 mr-1 text-violet-600" />
                      Centro
                      {config.optionalFields.centroCosto.required && <span className="ml-0.5 text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      required={config.optionalFields.centroCosto.required}
                      value={localCentroCosto}
                      onChange={(e) => { setLocalCentroCosto(e.target.value); onOptionalFieldsChange?.({ centroCosto: e.target.value }); }}
                      id="centro-costo"
                      className="h-9 w-full rounded-xl border border-slate-300 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm text-[13px]"
                      placeholder="CC-001"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
