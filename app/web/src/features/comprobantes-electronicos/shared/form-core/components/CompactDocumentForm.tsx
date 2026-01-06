/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// FORMULARIO COMPACTO DE DOCUMENTO
// Reorganiza los campos para reducir scroll manteniendo toda la lógica
// ===================================================================

import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  X
} from 'lucide-react';
import { ConfigurationCard } from './ConfigurationCard';
import { useConfigurationContext } from '../../../../configuracion-sistema/context/ConfigurationContext';
import { useFieldsConfiguration } from '../contexts/FieldsConfigurationContext';
import ClienteForm from '../../../../gestion-clientes/components/ClienteForm.tsx';
import type { TipoComprobante, Currency } from '../../../models/comprobante.types';
import { lookupEmpresaPorRuc, lookupPersonaPorDni } from '../../clienteLookup/clienteLookupService';
import { IconPersonalizeTwoSliders } from './IconPersonalizeTwoSliders.tsx';
import { getBusinessTodayISODate, shiftBusinessDate } from '@/shared/time/businessTime';
import { normalizeKey } from '@/features/gestion-clientes/utils/documents';
import { usePriceProfilesCatalog } from '../../../../lista-precios/hooks/usePriceProfilesCatalog';

import {
  buildClientDocKey,
  detectDocumentTypeFromDigits,
  formatDocumentLabel,
  loadNormalizedClientesFromStorage,
  type NormalizedClienteRecord,
  type NormalizedDocumentType,
  normalizeClienteRecord,
  normalizeDocumentNumber as normalizeDocNumber,
  normalizeDocumentType,
  normalizedTypeToSunatCode,
  persistLegacyClientes,
  readLegacyClientes,
  sunatCodeToNormalizedType,
} from '../utils/clientNormalization';

type SelectedCliente = {
  nombre: string;
  dni: string;
  direccion: string;
  tipoDocumento: NormalizedDocumentType;
  email?: string;
  sunatCode?: string;
  priceProfileId?: string;
};


const inferDocumentTypeFromNumber = (value: string): NormalizedDocumentType => detectDocumentTypeFromDigits(value);

const mapSelectedClienteFromProps = (
  cliente?: {
    nombre: string;
    dni: string;
    direccion: string;
    tipoDocumento?: NormalizedDocumentType;
    email?: string;
    priceProfileId?: string;
  } | null,
): SelectedCliente | null => {
  if (!cliente) {
    return null;
  }

  const tipoDocumento = cliente.tipoDocumento
    ? normalizeDocumentType(cliente.tipoDocumento)
    : inferDocumentTypeFromNumber(cliente.dni);

  const numeroDocumento = tipoDocumento === 'RUC' || tipoDocumento === 'DNI'
    ? normalizeDocNumber(cliente.dni)
    : (cliente.dni || '').trim();

  return {
    nombre: cliente.nombre,
    dni: numeroDocumento,
    direccion: cliente.direccion,
    tipoDocumento,
    email: cliente.email,
    sunatCode: normalizedTypeToSunatCode(tipoDocumento),
    priceProfileId: cliente.priceProfileId,
  };
};

const resolveSunatLegacyToken = (code?: string): string => {
  if (!code) {
    return 'OTROS';
  }

  const upperCased = code.toString().trim().toUpperCase();
  switch (upperCased) {
    case '1':
      return 'DNI';
    case '6':
      return 'RUC';
    case '0':
      return 'SIN_DOCUMENTO';
    case '4':
      return 'CE';
    case '7':
      return 'PAS';
    default:
      return upperCased;
  }
};

interface CompactDocumentFormProps {
  // Tipo de Comprobante
  tipoComprobante: TipoComprobante;
  setTipoComprobante: (value: TipoComprobante) => void;
  
  // Serie y Fecha
  serieSeleccionada: string;
  setSerieSeleccionada: (value: string) => void;
  seriesFiltradas: string[];

  // Moneda y Forma de Pago
  moneda?: Currency;
  setMoneda?: (value: Currency) => void;
  currencyOptions?: Array<{ code: Currency; name: string; symbol: string; rate?: number }>;
  baseCurrencyCode?: Currency;
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
    tipoDocumento?: NormalizedDocumentType;
    email?: string;
    priceProfileId?: string;
  };
  // Callbacks para elevar datos al padre (EmisionTradicional)
  onClienteChange?: (
    cliente:
      | { nombre: string; dni: string; direccion: string; email?: string; tipoDocumento?: NormalizedDocumentType; priceProfileId?: string }
      | null
  ) => void;
  fechaEmision?: string;
  onFechaEmisionChange?: (value: string) => void;
  onOptionalFieldsChange?: (fields: Record<string, any>) => void;

  // Señalizar al contenedor si el cliente actual proviene de lookup externo
  onLookupClientSelected?: (client: { data: { nombre: string; documento: string; tipoDocumento: string; direccion?: string; email?: string }; origen: 'RENIEC' | 'SUNAT' }) => void;
}

const CompactDocumentForm: React.FC<CompactDocumentFormProps> = ({
  tipoComprobante,
  setTipoComprobante,
  serieSeleccionada,
  setSerieSeleccionada,
  seriesFiltradas,
  moneda = 'PEN' as Currency,
  setMoneda,
  currencyOptions = [],
  baseCurrencyCode,
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
  onLookupClientSelected,
}) => {
  const { resolveProfileId } = usePriceProfilesCatalog();
  const { state } = useConfigurationContext();
  const { paymentMethods } = state;
  const { config } = useFieldsConfiguration();

  // Estados para cliente
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteSeleccionadoLocal, setClienteSeleccionadoLocal] = useState<SelectedCliente | null>(
    () => mapSelectedClienteFromProps(clienteSeleccionado)
  );
  // Optional fields local state to notify parent
  const [localFechaEmision, setLocalFechaEmision] = useState<string>(fechaEmision || getBusinessTodayISODate());
  const [localFechaVencimiento, setLocalFechaVencimiento] = useState<string>(shiftBusinessDate(getBusinessTodayISODate(), 30));
  const [localDireccion, setLocalDireccion] = useState<string>('');
  const [localDireccionEnvio, setLocalDireccionEnvio] = useState<string>('');
  const [localCorreo, setLocalCorreo] = useState<string>('');
  const [localOrdenCompra, setLocalOrdenCompra] = useState<string>('');
  const [localGuiaRemision, setLocalGuiaRemision] = useState<string>('');
  const [localCentroCosto, setLocalCentroCosto] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [clientDocError, setClientDocError] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [documentType, setDocumentType] = useState('1');
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

  useEffect(() => {
    const mapped = mapSelectedClienteFromProps(clienteSeleccionado);
    setClienteSeleccionadoLocal((prev) => {
      if (!mapped && !prev) {
        return prev;
      }
      if (!mapped || !prev) {
        return mapped;
      }
      if (
        prev.dni === mapped.dni &&
        prev.nombre === mapped.nombre &&
        prev.direccion === mapped.direccion &&
        prev.tipoDocumento === mapped.tipoDocumento &&
        prev.email === mapped.email &&
        prev.sunatCode === mapped.sunatCode
      ) {
        return prev;
      }
      return mapped;
    });
  }, [clienteSeleccionado]);

  // Tipos de documento y cliente
  const documentTypes = [
    { value: '1', label: 'DNI' },
    { value: '6', label: 'RUC' },
    { value: '0', label: 'Sin documento' },
    { value: '4', label: 'Carnet de Extranjería' },
    { value: '7', label: 'Pasaporte' }
  ];

  const clientTypes = [
    { value: 'natural', label: 'Persona Natural' },
    { value: 'juridica', label: 'Persona Jurídica' }
  ];

  const fallbackCurrencyOptions = useMemo(
    () => [
      { code: 'PEN' as Currency, name: 'Sol Peruano', symbol: 'S/', rate: 1 },
      { code: 'USD' as Currency, name: 'Dólar Estadounidense', symbol: '$', rate: 3.75 },
    ],
    [],
  );
  const selectableCurrencies = currencyOptions.length ? currencyOptions : fallbackCurrencyOptions;
  const selectedCurrencyDescriptor = selectableCurrencies.find((option) => option.code === moneda);
  const baseCurrencyDescriptor = baseCurrencyCode
    ? selectableCurrencies.find((option) => option.code === baseCurrencyCode)
    : undefined;
  const showExchangeRateBanner = Boolean(
    baseCurrencyCode && moneda && baseCurrencyCode !== moneda && selectedCurrencyDescriptor,
  );

  const clientesDisponibles = loadNormalizedClientesFromStorage();

  const searchLower = searchQuery.trim().toLowerCase();
  const searchDigits = normalizeDocNumber(searchQuery);

  const clientesFiltrados = clientesDisponibles.filter((cliente) => {
    const matchName = searchLower ? cliente.nombreLower.includes(searchLower) : false;
    const matchDocument = searchDigits ? cliente.numeroDocumento.includes(searchDigits) : false;
    return matchName || matchDocument;
  });

  // Handlers para cliente

  const handleEditarCliente = () => {
    if (!clienteSeleccionadoLocal) return;

    const docKey = buildClientDocKey(clienteSeleccionadoLocal.tipoDocumento, clienteSeleccionadoLocal.dni);
    const cliente = clientesDisponibles.find((item) => item.docKey === docKey);
    if (!cliente) {
      return;
    }

    setIsEditing(true);

    const docCodeForForm = cliente.sunatCode ?? normalizedTypeToSunatCode(cliente.tipoDocumento);
    const normalizedDocType = sunatCodeToNormalizedType(docCodeForForm);

    setDocumentType(docCodeForForm);
    setClientType(normalizedDocType === 'RUC' ? 'juridica' : 'natural');

    setFormData({
      documentNumber: cliente.numeroDocumento,
      legalName: cliente.nombre,
      address: cliente.direccion || '',
      gender: 'M',
      phone: cliente.telefono || '',
      email: cliente.email || '',
      additionalData: ''
    });
    setShowClienteForm(true);
  };

  const handleSaveCliente = () => {
    try {
      const normalizedType = sunatCodeToNormalizedType(documentType);
      const rawDocumentInput = formData.documentNumber.trim();
      const normalizedNumber =
        normalizedType === 'RUC' || normalizedType === 'DNI'
          ? normalizeDocNumber(rawDocumentInput)
          : rawDocumentInput;

      const docNumberForKey = normalizedNumber || rawDocumentInput;

      const candidateDocKey =
        normalizedType === 'SIN_DOCUMENTO'
          ? `${normalizedType}:${normalizeKey(formData.legalName.trim() || 'cliente')}`
          : buildClientDocKey(normalizedType, docNumberForKey);

      const clientesActuales = readLegacyClientes();

      let matchedIndex = -1;
      for (let index = 0; index < clientesActuales.length; index += 1) {
        const normalized = normalizeClienteRecord(clientesActuales[index]);
        if (normalized.docKey === candidateDocKey) {
          matchedIndex = index;
          break;
        }
      }

      const nextNumericId = (() => {
        const numericIds = clientesActuales
          .map((cliente: any) => Number(cliente?.id))
          .filter((id) => Number.isFinite(id));
        const maxId = numericIds.length ? Math.max(...numericIds) : 0;
        return maxId + 1;
      })();

      const persistedNumeroDocumento =
        normalizedType === 'RUC' || normalizedType === 'DNI'
          ? normalizedNumber
          : rawDocumentInput;

      const tipoDocumentoPersistido =
        normalizedType === 'OTROS' ? resolveSunatLegacyToken(documentType) : normalizedType;

      const legacyBase = matchedIndex >= 0 ? clientesActuales[matchedIndex] : {};
      const legacyDocumentToken =
        normalizedType === 'OTROS' ? resolveSunatLegacyToken(documentType) : normalizedType;
      const documentValue =
        normalizedType === 'SIN_DOCUMENTO' || !persistedNumeroDocumento
          ? 'Sin documento'
          : `${legacyDocumentToken} ${persistedNumeroDocumento}`.trim();

      const nuevoCliente = {
        ...legacyBase,
        id: matchedIndex >= 0 ? legacyBase.id : nextNumericId,
        name: formData.legalName.trim(),
        document: documentValue,
        type: clientType === 'natural' ? 'Cliente' : 'Cliente',
        address: formData.address.trim() || 'Sin dirección',
        phone: formData.phone.trim() || 'Sin teléfono',
        enabled: legacyBase.enabled ?? true,
        tipoDocumento: tipoDocumentoPersistido,
        tipoDocumentoCodigoSunat: documentType,
        documentCode: documentType,
        numeroDocumento: persistedNumeroDocumento,
        direccion: formData.address.trim() || 'Sin dirección',
        telefono: formData.phone.trim() || 'Sin teléfono',
        email: formData.email.trim() || undefined,
      };

      if (matchedIndex >= 0) {
        clientesActuales[matchedIndex] = nuevoCliente;
      } else {
        clientesActuales.unshift(nuevoCliente);
      }

      persistLegacyClientes(clientesActuales);

      const selected: SelectedCliente = {
        nombre: nuevoCliente.name,
        dni: persistedNumeroDocumento,
        direccion: nuevoCliente.address,
        tipoDocumento: normalizedType,
        email: nuevoCliente.email,
        sunatCode: documentType,
        priceProfileId: undefined,
      };

      setClienteSeleccionadoLocal(selected);

      onClienteChange?.({
        nombre: selected.nombre,
        dni: selected.dni,
        direccion: selected.direccion,
        email: selected.email,
        tipoDocumento: selected.tipoDocumento,
        priceProfileId: selected.priceProfileId,
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

  const handleSeleccionarCliente = (cliente: NormalizedClienteRecord) => {
    const priceProfileId = resolveProfileId(cliente.priceProfileIdHint);
    const selected: SelectedCliente = {
      nombre: cliente.nombre,
      dni: cliente.numeroDocumento,
      direccion: cliente.direccion || 'Dirección no definida',
      tipoDocumento: cliente.tipoDocumento,
      email: cliente.email,
      sunatCode: cliente.sunatCode ?? normalizedTypeToSunatCode(cliente.tipoDocumento),
      priceProfileId,
    };

    setClienteSeleccionadoLocal(selected);

    onClienteChange?.({
      nombre: selected.nombre,
      dni: selected.dni,
      direccion: selected.direccion,
      email: selected.email,
      tipoDocumento: selected.tipoDocumento,
      priceProfileId: selected.priceProfileId,
    });

    setSearchQuery('');
    setClientDocError(null);
  };

  const isValidDocumentForLookup = () => {
    const digitsOnly = normalizeDocNumber(searchQuery);
    if (!digitsOnly) {
      return false;
    }

    if (tipoComprobante === 'factura') {
      if (digitsOnly.length !== 11) {
        setClientDocError('El RUC debe tener 11 dígitos');
        return false;
      }
      setClientDocError(null);
      return true;
    }

    if (digitsOnly.length !== 8) {
      setClientDocError('El DNI debe tener 8 dígitos');
      return false;
    }
    setClientDocError(null);
    return true;
  };

  const handleLookupClick = async () => {
    if (!isValidDocumentForLookup()) {
      return;
    }

    const digitsOnly = normalizeDocNumber(searchQuery);
    const expectedType: NormalizedDocumentType = tipoComprobante === 'factura' ? 'RUC' : 'DNI';
    setIsLookupLoading(true);
    try {
      // 1) Buscar en clientes locales existentes
      const existing = clientesDisponibles.find(
        (cliente) => cliente.tipoDocumento === expectedType && cliente.numeroDocumento === digitsOnly,
      );
      if (existing) {
        handleSeleccionarCliente(existing);
        return;
      }

      // 2) Lookup simulado RENIEC/SUNAT
      const fromLookup = expectedType === 'RUC'
        ? await lookupEmpresaPorRuc(digitsOnly)
        : await lookupPersonaPorDni(digitsOnly);

      if (!fromLookup) {
        setClientDocError('No se encontraron datos para este documento');
        return;
      }

      const lookupType = normalizeDocumentType(fromLookup.tipoDocumento);
      const normalizedLookupNumber =
        lookupType === 'RUC' || lookupType === 'DNI'
          ? normalizeDocNumber(fromLookup.documento)
          : fromLookup.documento;

      const selectedClient: SelectedCliente = {
        nombre: fromLookup.nombre,
        dni: normalizedLookupNumber,
        direccion: fromLookup.direccion || 'Dirección no definida',
        email: fromLookup.email,
        tipoDocumento: lookupType,
        sunatCode: normalizedTypeToSunatCode(lookupType),
        priceProfileId: undefined,
      };

      setClienteSeleccionadoLocal(selectedClient);
      onClienteChange?.({
        nombre: selectedClient.nombre,
        dni: selectedClient.dni,
        direccion: selectedClient.direccion,
        email: selectedClient.email,
        tipoDocumento: selectedClient.tipoDocumento,
        priceProfileId: selectedClient.priceProfileId,
      });
      onLookupClientSelected?.({
        data: {
          nombre: fromLookup.nombre,
          documento: selectedClient.dni,
          tipoDocumento: selectedClient.tipoDocumento,
          direccion: fromLookup.direccion,
          email: fromLookup.email,
        },
        origen: fromLookup.origen,
      });
      setSearchQuery(selectedClient.dni);
      setClientDocError(null);
    } finally {
      setIsLookupLoading(false);
    }
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
      onClienteChange?.({
        nombre: clienteSeleccionadoLocal.nombre,
        dni: clienteSeleccionadoLocal.dni,
        direccion: clienteSeleccionadoLocal.direccion,
        email: clienteSeleccionadoLocal.email,
        tipoDocumento: clienteSeleccionadoLocal.tipoDocumento,
        priceProfileId: clienteSeleccionadoLocal.priceProfileId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ConfigurationCard
        title=""
        description=""
        icon={FileText}
        helpText="Completa la información del comprobante electrónico siguiendo las normas de SUNAT"
        contentClassName="p-4"
        actions={
          <div className="flex items-center gap-2">
            {/* Pill buttons para tipo de comprobante (estado) */}
            <div className="flex items-center gap-1.5">
              <button
                className={`px-3 py-1 rounded-full text-[13px] font-medium transition-all ${
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
                className={`px-3 py-1 rounded-full text-[13px] font-medium transition-all ${
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
        <div className="grid grid-cols-12 gap-2 text-[13px]">

          {/* COLUMNA 1: Cliente/Dirección/Email/Envío (~42% → xl:col-span-5) */}
          <div className="col-span-12 xl:col-span-5 space-y-2">
            {/* Cliente (reducido ~10-12%, lupa compacta) */}
            {!clienteSeleccionadoLocal ? (
              <div>
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="cliente-buscar">
                  <User className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Cliente<span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="flex w-full items-center gap-3 relative">
                  <Search className="absolute left-2.5 top-2.5 text-gray-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o documento..."
                    id="cliente-buscar"
                    className="h-9 flex-1 w-full pl-9 pr-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-[13px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {/* Search button aligned center and same height as input */}
                  <button
                    type="button"
                    aria-label={tipoComprobante === 'factura' ? 'Buscar en SUNAT' : 'Buscar en RENIEC'}
                    className="inline-flex h-9 px-3 items-center justify-center rounded-lg bg-indigo-500 text-white hover:opacity-90 focus:ring-2 focus:ring-indigo-300 transition-colors text-[11px] font-medium gap-2 shrink-0 whitespace-nowrap"
                    title={tipoComprobante === 'factura' ? 'Buscar en SUNAT' : 'Buscar en RENIEC'}
                    onClick={handleLookupClick}
                    disabled={isLookupLoading}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{tipoComprobante === 'factura' ? 'SUNAT' : 'RENIEC'}</span>
                  </button>
                </div>

                {clientDocError && (
                  <p className="mt-1 text-xs text-red-600">{clientDocError}</p>
                )}

                {/* Resultados de búsqueda */}
                {searchQuery && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((cliente) => (
                        <button
                          key={cliente.docKey}
                          onClick={() => handleSeleccionarCliente(cliente)}
                          className="w-full text-left px-3 py-2 hover:bg-violet-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <p className="text-xs font-semibold text-gray-900">
                            {cliente.nombre}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {cliente.documentLabel}
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

                {/* '+ Nuevo Cliente' intentionally removed — creation handled elsewhere */}
              </div>
            ) : (
              <div>
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5">
                  <User className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Cliente Seleccionado
                </label>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg px-3 py-2.5 border border-violet-200">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1 text-[13px]">
                      <span className="inline-flex items-center rounded-full border border-violet-100 bg-white/70 px-2 py-0.5 text-[12px] font-semibold text-violet-700">
                        {formatDocumentLabel(clienteSeleccionadoLocal.tipoDocumento, clienteSeleccionadoLocal.dni)}
                      </span>
                      <span
                        className="font-semibold text-gray-900 truncate"
                        title={clienteSeleccionadoLocal.nombre}
                      >
                        {clienteSeleccionadoLocal.nombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 transition"
                        onClick={handleEditarCliente}
                        title="Editar cliente"
                        aria-label="Editar cliente"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition"
                        onClick={() => {
                          setClienteSeleccionadoLocal(null);
                          setSearchQuery('');
                        }}
                        title="Cambiar cliente"
                        aria-label="Cambiar cliente"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dirección */}
            {config.optionalFields.direccion.visible && (
              <div>
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="direccion">
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
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-[13px]"
                  placeholder="Dirección del cliente"
                />
              </div>
            )}

            {/* Email (ahora w-full sin max-w) */}
            {config.optionalFields.correo.visible && (
              <div>
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="email">
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
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-[13px]"
                  placeholder="cliente@empresa.com"
                />
              </div>
            )}

            {/* Dirección de Envío */}
            {config.optionalFields.direccionEnvio.visible && (
              <div>
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="direccion-envio">
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
                  className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-[13px]"
                  placeholder="Ej: Av. Principal 123, Lima"
                />
              </div>
            )}
          </div>

          {/* COLUMNA 2: Serie → Emisión → Forma → Moneda → Vencimiento (~34% → xl:col-span-4) */}
          <div className="col-span-12 xl:col-span-4 xl:border-s xl:border-slate-200/60 xl:ps-3">
            <div className="grid grid-cols-12 gap-x-2 gap-y-2 items-end">
              {/* Fila 1: Serie + Fecha Emisión */}
              <div className="col-span-6">
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="serie">
                  <Hash className="w-3.5 h-3.5 mr-1 text-violet-600" />
                  Serie<span className="ml-0.5 text-red-500">*</span>
                </label>
                <div className="relative">
                  {seriesFiltradas.length > 0 ? (
                    <>
                      <select
                        id="serie"
                        className="h-9 w-full max-w-[240px] px-3 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white appearance-none cursor-pointer text-[13px]"
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
              </div>
              <div className="col-span-6">
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="fecha-emision">
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
                  className="h-9 w-full max-w-[240px] px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px]"
                />
              </div>
              
              {/* Fila 2: Forma de Pago + Moneda (perfectamente alineados) */}
              <div className="col-span-6">
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="forma-pago">
                  <CreditCard className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  Forma de Pago
                </label>
                <div className="relative">
                  <select
                    id="forma-pago"
                    className="h-9 w-full max-w-[240px] px-3 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[13px] appearance-none"
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
                  <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
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
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="moneda">
                  <DollarSign className="w-3.5 h-3.5 mr-1 text-green-600" />
                  Moneda
                </label>
                <div className="relative">
                  <select
                    id="moneda"
                    className="h-9 w-full max-w-[240px] px-3 pr-8 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white text-[13px] appearance-none"
                    value={moneda}
                    onChange={(e) => setMoneda?.(e.target.value as Currency)}
                  >
                    {selectableCurrencies.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {showExchangeRateBanner && selectedCurrencyDescriptor && (
                  <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-900">
                    <p className="font-semibold text-blue-900">Tipo de cambio (solo lectura)</p>
                    <p className="mt-1">
                      1 {selectedCurrencyDescriptor.code} ={' '}
                      {(selectedCurrencyDescriptor.rate ?? 1).toFixed(4)}{' '}
                      {baseCurrencyDescriptor?.code ?? baseCurrencyCode}
                    </p>
                    <p className="text-[11px] text-blue-700">Actualiza el tipo de cambio en Configuración → Monedas.</p>
                  </div>
                )}
              </div>

              {/* Fila 3: Fecha Vencimiento + Placeholder */}
              {config.optionalFields.fechaVencimiento.visible && (
                <div className="col-span-6">
                  <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="fecha-vencimiento">
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
                    className="h-9 w-full max-w-[240px] px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px]"
                  />
                </div>
              )}
              <div className="col-span-6" aria-hidden="true">
                <div className="h-9"></div>
              </div>
            </div>
          </div>

          {/* COLUMNA 3: Vendedor → OC → (Guía + Centro en misma fila) (~24% → xl:col-span-3) */}
          <div className="col-span-12 xl:col-span-3 xl:border-s xl:border-slate-200/60 xl:ps-3">
            <div className="space-y-2">
              {/* Vendedor (select simple 1 línea, 36px) */}
              <div>
                <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="vendedor">
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
                  <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="orden-compra">
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
                    className="h-9 w-full rounded-xl border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-[13px]"
                    placeholder="Ej: OC01-0000236"
                  />
                </div>
              )}

              {/* Fila compartida: Guía + Centro (col-span-6 cada uno) */}
              <div className="grid grid-cols-12 gap-x-2 gap-y-2 items-end">
                {/* Guía de Remisión */}
                {config.optionalFields.guiaRemision.visible && (
                  <div className="col-span-12 md:col-span-6">
                    <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="guia-remision">
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
                      className="h-9 w-full rounded-xl border border-slate-300 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px]"
                      placeholder="T001-000256"
                    />
                  </div>
                )}

                {/* Centro de Costo */}
                {config.optionalFields.centroCosto.visible && (
                  <div className="col-span-12 md:col-span-6">
                    <label className="flex items-center text-[11px] font-medium text-slate-600 mb-0.5" htmlFor="centro-costo">
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
                      className="h-9 w-full rounded-xl border border-slate-300 px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 text-[13px]"
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

