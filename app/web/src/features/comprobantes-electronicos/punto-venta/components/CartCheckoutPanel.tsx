/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// COMPONENTE UNIFICADO: CARRITO + CONFIGURACIÓN DE DOCUMENTO
// Fusiona CartSidebar con selección de Boleta/Factura y Cliente
// ===================================================================

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Package,
  User,
  Search,
  Edit,
  X,
  FileText,
  Receipt,
  CreditCard as CreditCardIcon,
  CalendarClock
} from 'lucide-react';
import type { CartSidebarProps, Product, ComprobanteCreditTerms } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';
import ClienteForm from '../../../gestion-clientes/components/ClienteForm.tsx';
import type { PaymentMethod } from '../../../configuracion-sistema/models/PaymentMethod';
import { CreditScheduleSummaryCard } from '../../shared/payments/CreditScheduleSummaryCard';

interface CartCheckoutPanelProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  currency?: 'PEN' | 'USD';
  tipoComprobante: 'boleta' | 'factura';
  setTipoComprobante: (tipo: 'boleta' | 'factura') => void;
  onCurrencyChange?: (currency: 'PEN' | 'USD') => void;
  clienteSeleccionado: any | null;
  setClienteSeleccionado: (cliente: any | null) => void;
  paymentMethods: PaymentMethod[];
  formaPagoId: string;
  onFormaPagoChange: (paymentMethodId: string) => void;
  onNuevaFormaPago?: () => void;
  isCreditMethod?: boolean;
  onConfigureCreditSchedule?: () => void;
  creditTerms?: ComprobanteCreditTerms;
  creditScheduleErrors?: string[];
  creditPaymentMethodName?: string;
  onEmitWithoutPayment?: () => void;
  onEmitCreditDirect?: () => void;
}

interface ClientePOS {
  id: number;
  nombre: string;
  tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
  documento: string;
  direccion: string;
}

export const CartCheckoutPanel: React.FC<CartCheckoutPanelProps> = ({
  cartItems,
  totals,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onConfirmSale,
  cashBoxStatus = 'unknown',
  isProcessing = false,
  currency = 'PEN',
  tipoComprobante,
  setTipoComprobante,
  onCurrencyChange,
  clienteSeleccionado,
  setClienteSeleccionado,
  paymentMethods,
  formaPagoId,
  onFormaPagoChange,
  onNuevaFormaPago,
  isCreditMethod,
  onConfigureCreditSchedule,
  creditTerms,
  creditScheduleErrors,
  creditPaymentMethodName,
  onEmitWithoutPayment,
  onEmitCreditDirect,
}) => {
  const { formatPrice, changeCurrency } = useCurrency();

  // Estados para gestión de clientes
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Estados para descuentos
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<string>('');

  // Estados del formulario de cliente
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

  // Tipos de documento y cliente
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

  const availablePaymentMethods = useMemo(() => (
    paymentMethods
      .filter((method) => method.isActive && (method.display?.showInPos ?? true))
      .sort((a, b) => (a.display?.displayOrder ?? 0) - (b.display?.displayOrder ?? 0))
  ), [paymentMethods]);

  const selectedPaymentMethod = useMemo(() => (
    availablePaymentMethods.find((method) => method.id === formaPagoId) || availablePaymentMethods[0]
  ), [availablePaymentMethods, formaPagoId]);

  const paymentMethodBadge = selectedPaymentMethod?.type === 'CREDIT'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-100 text-slate-600';
  const selectedPaymentCode = (selectedPaymentMethod?.code || '').toUpperCase();
  const isCreditPaymentSelection = selectedPaymentCode === 'CREDITO';

  // Cargar clientes desde localStorage
  const getClientesFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem('clientes');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((cliente: any) => ({
          id: cliente.id,
          nombre: cliente.name,
          tipoDocumento: cliente.document?.includes('RUC') ? 'RUC' as const :
                        cliente.document?.includes('DNI') ? 'DNI' as const :
                        'Sin documento' as const,
          documento: cliente.document?.replace('RUC ', '').replace('DNI ', '').replace('Sin documento', ''),
          direccion: cliente.address || 'Dirección no definida'
        }));
      }
      return [];
    } catch (error) {
      console.error('Error loading clientes from localStorage:', error);
      return [];
    }
  };

  const mockClientes: ClientePOS[] = getClientesFromLocalStorage();

  // Estado de la caja
  const isCashBoxClosed = cashBoxStatus === 'closed';
  const canProcessSale = !isProcessing && cartItems.length > 0;
  const primaryDisabled = !canProcessSale || (isCreditPaymentSelection ? !onEmitCreditDirect : false);
  const secondaryDisabled = !canProcessSale || (isCreditPaymentSelection ? !onConfirmSale : !onEmitWithoutPayment);
  const primaryLabel = isCreditPaymentSelection ? 'Emitir a crédito' : 'Registrar pago y emitir';
  const secondaryLabel = isCreditPaymentSelection ? 'Emitir y registrar abono' : 'Emitir sin cobrar';

  const handlePrimaryAction = () => {
    if (primaryDisabled) {
      return;
    }
    if (isCreditPaymentSelection) {
      onEmitCreditDirect?.();
      return;
    }
    onConfirmSale();
  };

  const handleSecondaryAction = () => {
    if (secondaryDisabled) {
      return;
    }
    if (isCreditPaymentSelection) {
      onConfirmSale();
      return;
    }
    onEmitWithoutPayment?.();
  };

  // Calcular descuento aplicado
  const calculateDiscount = () => {
    const discountNum = parseFloat(discountValue) || 0;
    if (discountNum <= 0) return 0;

    if (discountType === 'percentage') {
      // Descuento por porcentaje
      const percentDiscount = (totals.total * discountNum) / 100;
      // No permitir descuento mayor al 100%
      return discountNum > 100 ? totals.total : percentDiscount;
    } else {
      // Descuento por importe
      // No permitir descuento mayor al total
      return discountNum > totals.total ? totals.total : discountNum;
    }
  };

  const discountAmount = calculateDiscount();
  const finalTotal = totals.total - discountAmount;

  // Filtrar clientes por búsqueda
  const clientesFiltrados = mockClientes.filter((c: ClientePOS) =>
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.documento.includes(searchQuery)
  );

  // Handlers para gestión de clientes
  const handleClienteInputChange = (field: string, value: string) => {
    setClienteFormData(prev => ({ ...prev, [field]: value }));
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
      const clientesActuales = clientesLS ? JSON.parse(clientesLS) : [];

      const documentoFormateado = clienteDocumentType !== 'SIN_DOCUMENTO'
        ? `${clienteDocumentType} ${clienteFormData.documentNumber.trim()}`
        : 'Sin documento';

      const newId = clientesActuales.length > 0
        ? Math.max(...clientesActuales.map((c: any) => c.id)) + 1
        : 1;

      const nuevoCliente = {
        id: newId,
        name: clienteFormData.legalName.trim(),
        document: documentoFormateado,
        type: clienteType,
        address: clienteFormData.address.trim() || 'Sin dirección',
        phone: clienteFormData.phone.trim() || 'Sin teléfono',
        enabled: true
      };

      clientesActuales.unshift(nuevoCliente);
      localStorage.setItem('clientes', JSON.stringify(clientesActuales));

      setClienteSeleccionado({
        id: nuevoCliente.id,
        nombre: nuevoCliente.name,
        tipoDocumento: clienteDocumentType as 'DNI' | 'RUC' | 'Sin documento',
        documento: clienteFormData.documentNumber,
        direccion: nuevoCliente.address
      });

      setShowClienteForm(false);
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
  };

  const handleSeleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setSearchQuery('');
  };

  const handleTipoComprobanteChange = (nuevoTipo: 'boleta' | 'factura') => {
    setTipoComprobante(nuevoTipo);
    setShowTypeSelector(false);
  };

  const handleCurrencyChange = (newCurrency: 'PEN' | 'USD') => {
    changeCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  return (
    <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header Simplificado - Sin información redundante */}
      <div className="p-2.5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="font-bold text-sm text-gray-900 text-center">Carrito de Venta</h3>
      </div>

      {/* Warning de caja cerrada */}
      {isCashBoxClosed && (
        <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Caja cerrada</p>
              <p className="text-xs text-yellow-600">{UI_MESSAGES.CAJA_CLOSED_WARNING}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Configuración: Tipo Comprobante, Moneda e IGV - TODO EN UNA SECCIÓN COMPACTA */}
        <div className="p-2.5 bg-white border-b border-gray-200">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Tipo de Comprobante */}
            <div className="col-span-2">
              <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                <FileText className="h-2.5 w-2.5" />
                Comprobante
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTypeSelector(!showTypeSelector)}
                  className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded text-left flex items-center justify-between hover:border-blue-400 transition-all text-[11px] font-semibold"
                >
                  <span className="text-gray-900 truncate">
                    {tipoComprobante === 'boleta' ? 'Boleta' : 'Factura'}
                  </span>
                  <svg className={`w-2.5 h-2.5 text-gray-500 transition-transform flex-shrink-0 ml-1 ${showTypeSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown compacto */}
                {showTypeSelector && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20">
                    <button
                      onClick={() => handleTipoComprobanteChange('factura')}
                      className="w-full px-2 py-1.5 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 flex items-center gap-1.5"
                    >
                      <FileText className="h-2.5 w-2.5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[10px] text-purple-900">Factura</div>
                        <div className="text-[9px] text-purple-600">Con RUC</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleTipoComprobanteChange('boleta')}
                      className="w-full px-2 py-1.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                    >
                      <Receipt className="h-2.5 w-2.5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[10px] text-blue-900">Boleta</div>
                        <div className="text-[9px] text-blue-600">Con DNI</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Moneda */}
            <div>
              <label className="flex items-center gap-1 text-[9px] font-bold text-gray-500 mb-1 uppercase tracking-wide">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as 'PEN' | 'USD')}
                className="w-full px-1.5 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-semibold text-gray-900 hover:border-blue-400 transition-all focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PEN">S/.</option>
                <option value="USD">$</option>
              </select>
            </div>
          </div>

          {/* Forma de pago */}
          <div className="mt-2 space-y-1.5">
            <label
              className="flex items-center gap-1 text-[9px] font-bold text-gray-500 uppercase tracking-wide"
              htmlFor="pos-payment-method"
            >
              <CreditCardIcon className="h-3 w-3" />
              Forma de pago
            </label>
            <div className="flex items-center gap-2">
              <select
                id="pos-payment-method"
                value={selectedPaymentMethod?.id || ''}
                onChange={(event) => onFormaPagoChange(event.target.value)}
                className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-semibold text-gray-900 hover:border-blue-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {availablePaymentMethods.length === 0 && (
                  <option value="">Sin métodos disponibles</option>
                )}
                {availablePaymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              {onNuevaFormaPago && (
                <button
                  type="button"
                  onClick={onNuevaFormaPago}
                  className="px-2 py-1 text-[10px] font-semibold text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
                >
                  + Nueva
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${paymentMethodBadge}`}>
                {selectedPaymentMethod?.name || 'Sin selección'}
              </span>
              {isCreditMethod && onConfigureCreditSchedule && (
                <button
                  type="button"
                  onClick={onConfigureCreditSchedule}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200"
                >
                  <CalendarClock className="h-3 w-3" />
                  Cronograma
                </button>
              )}
            </div>
          </div>

          {/* IGV en línea separada pero compacta */}
          <div className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded border border-gray-200">
            <span className="text-[10px] text-gray-600 font-semibold">IGV:</span>
            <span className="text-[11px] font-bold text-gray-900">18%</span>
          </div>
        </div>

        {/* Cliente - Optimizado y compacto */}
        <div className="p-2.5 bg-white border-b border-gray-200">
          {!clienteSeleccionado ? (
            <div className="space-y-2">
              {/* Labels inline en la misma fila */}
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

              {/* Inputs compactos en fila */}
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
                  value={clienteSeleccionado?.nombre || ''}
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

              {/* Resultados de búsqueda */}
              {searchQuery && (
                <div className="border border-blue-200 rounded max-h-28 overflow-y-auto bg-white">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map((cliente: ClientePOS) => (
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
        </div>

        {/* Lista de productos - Diseño Compacto y Profesional */}
        <div className="p-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-2 shadow-sm">
                <Package className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-xs font-semibold text-gray-700 mb-1">{UI_MESSAGES.EMPTY_CART}</p>
              <p className="text-[11px] text-center text-gray-500 px-4 max-w-[180px]">
                Busca y selecciona productos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all duration-150 p-2.5 relative"
                >
                  {/* Indicador lateral sutil */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg" />
                  
                  {/* Header: Número y Nombre - MÁS COMPACTO */}
                  <div className="flex items-center justify-between mb-2 gap-2 pl-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[11px] text-gray-900 truncate leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-[9px] text-gray-500">
                          {(item as any).unit || 'Und.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="flex-shrink-0 p-1 text-red-400 hover:text-white hover:bg-red-500 rounded transition-all"
                      disabled={isProcessing}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Grid Compacto de 3 Columnas */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    {/* CANTIDAD */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                        Cant.
                      </label>
                      <div className="flex items-center bg-gray-50 rounded border border-gray-200 overflow-hidden h-7">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="flex-1 h-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-30 border-r border-gray-200"
                          disabled={item.quantity <= 1 || isProcessing}
                        >
                          <Minus className="h-2.5 w-2.5 text-gray-600" />
                        </button>
                        
                        <div className="flex-1 h-full flex items-center justify-center bg-white">
                          <span className="text-xs font-bold text-gray-900">{item.quantity}</span>
                        </div>
                        
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="flex-1 h-full flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors border-l border-gray-200"
                          disabled={isProcessing}
                        >
                          <Plus className="h-2.5 w-2.5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* PRECIO */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                        Precio
                      </label>
                      {onUpdatePrice ? (
                        <div className="relative h-7">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 z-10">
                            {currency === 'PEN' ? 'S/' : '$'}
                          </span>
                          <input
                            type="number"
                            value={item.price || ''}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              onUpdatePrice(item.id, newPrice);
                            }}
                            onFocus={(e) => e.target.select()}
                            step="0.01"
                            min="0"
                            className="w-full h-full pl-6 pr-1 text-[11px] font-semibold text-right bg-white border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none transition-all"
                            disabled={isProcessing}
                            placeholder="0.00"
                          />
                        </div>
                      ) : (
                        <div className="h-7 px-1.5 flex items-center justify-end bg-gray-50 border border-gray-200 rounded">
                          <span className="text-[11px] font-bold text-gray-900">{formatPrice(item.price, currency)}</span>
                        </div>
                      )}
                    </div>

                    {/* TOTAL */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                        Total
                      </label>
                      <div className="h-7 px-1.5 flex items-center justify-end bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded">
                        <span className="text-[11px] font-bold text-blue-900">
                          {formatPrice(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isCreditMethod && (
          <div className="px-3 pb-3">
            <CreditScheduleSummaryCard
              creditTerms={creditTerms}
              currency={currency}
              total={totals.total}
              onConfigure={onConfigureCreditSchedule}
              errors={creditScheduleErrors}
              paymentMethodName={creditPaymentMethodName || selectedPaymentMethod?.name}
            />
          </div>
        )}

        {/* Sección de Descuento - Compacta y Profesional */}
        {cartItems.length > 0 && (
          <div className="px-3 pb-2">
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 p-2.5">
              <label className="flex items-center gap-1.5 text-[9px] font-bold text-gray-600 mb-2 uppercase tracking-wide">
                <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">%</span>
                </div>
                Descuento
              </label>
              
              <div className="flex gap-1.5">
                {/* Botón Monto */}
                <button 
                  onClick={() => setDiscountType('amount')}
                  className={`px-2.5 py-1.5 rounded font-bold text-[10px] transition-all ${
                    discountType === 'amount' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm scale-105' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  S/.
                </button>
                
                {/* Botón Porcentaje */}
                <button 
                  onClick={() => setDiscountType('percentage')}
                  className={`px-2.5 py-1.5 rounded font-bold text-[10px] transition-all ${
                    discountType === 'percentage' 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm scale-105' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  %
                </button>
                
                {/* Input de Descuento */}
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-full px-2 pr-6 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[11px] font-semibold text-right outline-none transition-all"
                    step="0.01"
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 pointer-events-none">
                    {discountType === 'percentage' ? '%' : currency === 'PEN' ? 'S/' : '$'}
                  </span>
                </div>
              </div>
              
              {/* Indicador Compacto de Descuento */}
              {discountAmount > 0 && (
                <div className="mt-2 flex items-center gap-1.5 p-1.5 bg-green-50 border border-green-200 rounded">
                  <div className="w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[10px] font-bold text-green-700 flex-1">
                    -{formatPrice(discountAmount, currency)} 
                    <span className="font-normal text-green-600 ml-1">
                      ({discountType === 'percentage' ? `${discountValue}%` : 'Importe'})
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sección de Total - Compacta y Profesional */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-300 bg-gradient-to-b from-white to-gray-50">
          <div className="p-3 space-y-2">
            {/* Desglose Compacto si hay descuento */}
            {discountAmount > 0 && (
              <div className="space-y-1 pb-2 border-b border-dashed border-gray-300">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">{formatPrice(totals.total, currency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs bg-green-50 -mx-1 px-1 py-0.5 rounded">
                  <span className="font-semibold text-green-700 text-[11px]">
                    Desc. ({discountType === 'percentage' ? `${discountValue}%` : 'Imp.'}):
                  </span>
                  <span className="font-bold text-green-700">-{formatPrice(discountAmount, currency)}</span>
                </div>
              </div>
            )}
            
            {/* Botón Principal Compacto */}
            <button
              onClick={handlePrimaryAction}
              disabled={primaryDisabled}
              className={`w-full py-3 rounded-lg font-bold text-base shadow-md transition-all ${
                !primaryDisabled
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-sm">{UI_MESSAGES.CART_LOADING}</span>
                </span>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-semibold opacity-90">{primaryLabel}</span>
                  {!isCreditPaymentSelection && (
                    <span className="text-lg font-black">
                      {formatPrice(finalTotal, currency)}
                    </span>
                  )}
                </div>
              )}
            </button>

            {(isCreditPaymentSelection ? onConfirmSale : onEmitWithoutPayment) && (
              <button
                onClick={handleSecondaryAction}
                disabled={secondaryDisabled}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                  !secondaryDisabled ? 'text-blue-700 hover:bg-blue-50' : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {secondaryLabel}
              </button>
            )}
            
            {/* Footer Compacto */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <span className="font-semibold text-gray-700">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <button
                onClick={onClearCart}
                className="group flex items-center gap-1 px-2 py-1 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 rounded font-semibold transition-all"
                disabled={isProcessing}
              >
                <Trash2 className="h-3 w-3" />
                <span className="text-[10px]">Vaciar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cliente */}
      {showClienteForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <ClienteForm
            formData={clienteFormData}
            documentType={clienteDocumentType}
            clientType={clienteType}
            documentTypes={documentTypes}
            clientTypes={clientTypes}
            onInputChange={handleClienteInputChange}
            onDocumentTypeChange={setClienteDocumentType}
            onClientTypeChange={setClienteType}
            onCancel={() => setShowClienteForm(false)}
            onSave={handleSaveCliente}
            isEditing={editingCliente}
          />
        </div>
      )}
    </div>
  );
};
