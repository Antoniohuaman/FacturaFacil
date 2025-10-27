// ===================================================================
// COMPONENTE UNIFICADO: CARRITO + CONFIGURACIÓN DE DOCUMENTO
// Fusiona CartSidebar con selección de Boleta/Factura y Cliente
// ===================================================================

import React, { useState } from 'react';
import {
  ShoppingCart,
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
  Building2
} from 'lucide-react';
import type { CartSidebarProps, Product } from '../../models/comprobante.types';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';
import { UI_MESSAGES } from '../../models/constants';
import ClienteForm from '../../../gestion-clientes/components/ClienteForm';

interface CartCheckoutPanelProps extends CartSidebarProps {
  onAddProduct?: (product: Product) => void;
  onUpdatePrice?: (id: string, newPrice: number) => void;
  currency?: 'PEN' | 'USD';
  tipoComprobante: 'boleta' | 'factura';
  setTipoComprobante: (tipo: 'boleta' | 'factura') => void;
  onCurrencyChange?: (currency: 'PEN' | 'USD') => void;
  clienteSeleccionado: any | null;
  setClienteSeleccionado: (cliente: any | null) => void;
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
  onViewFullForm,
  cashBoxStatus = 'unknown',
  isProcessing = false,
  currency = 'PEN',
  tipoComprobante,
  setTipoComprobante,
  onCurrencyChange,
  clienteSeleccionado,
  setClienteSeleccionado
}) => {
  const { formatPrice, changeCurrency } = useCurrency();

  // Estados para gestión de clientes
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeSelector, setShowTypeSelector] = useState(false);

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
  const canProcessSale = !isProcessing && cartItems.length > 0 && !isCashBoxClosed;

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
    if (nuevoTipo === 'factura') {
      if (clienteSeleccionado && clienteSeleccionado.tipoDocumento !== 'RUC') {
        const confirmar = window.confirm(
          `⚠️ ADVERTENCIA: Para emitir FACTURA el cliente debe tener RUC.\n\n` +
          `Cliente seleccionado: ${clienteSeleccionado.nombre}\n` +
          `Tipo de documento actual: ${clienteSeleccionado.tipoDocumento}\n\n` +
          `¿Deseas cambiar a FACTURA de todas formas?\n` +
          `(Deberás seleccionar o crear un cliente con RUC antes de continuar)`
        );

        if (!confirmar) return;
      }
    }

    setTipoComprobante(nuevoTipo);
    setShowTypeSelector(false);
  };

  const handleCurrencyChange = (newCurrency: 'PEN' | 'USD') => {
    changeCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  const handleProceedToPayment = () => {
    // Validación para FACTURA
    if (tipoComprobante === 'factura') {
      if (!clienteSeleccionado) {
        alert('⚠️ Para emitir una FACTURA es obligatorio seleccionar un cliente con RUC.\n\nPor favor, selecciona o crea un cliente con RUC.');
        return;
      }

      if (clienteSeleccionado.tipoDocumento !== 'RUC') {
        alert(`⚠️ Para emitir una FACTURA el cliente debe tener RUC.\n\nCliente actual: ${clienteSeleccionado.nombre}\nTipo de documento: ${clienteSeleccionado.tipoDocumento}\n\nPor favor, selecciona un cliente con RUC o edita este cliente para agregar su RUC.`);
        return;
      }

      if (!clienteSeleccionado.documento || clienteSeleccionado.documento.length !== 11) {
        alert(`⚠️ El RUC del cliente no es válido.\n\nCliente: ${clienteSeleccionado.nombre}\nRUC: ${clienteSeleccionado.documento || 'No especificado'}\n\nEl RUC debe tener exactamente 11 dígitos. Por favor, edita el cliente para corregir el RUC.`);
        return;
      }
    }

    // Si pasa validaciones, proceder al pago
    onConfirmSale();
  };

  return (
    <div className="w-[480px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Carrito de Venta</h3>
              <p className="text-xs text-gray-600">
                {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          {cartItems.length > 0 && (
            <button
              onClick={onClearCart}
              className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors"
              disabled={isProcessing}
              title="Vaciar carrito"
            >
              Limpiar
            </button>
          )}
        </div>
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
        {/* Header compacto: Tipo de Comprobante + Moneda */}
        <div className="p-3 bg-white border-b border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            {/* Tipo de Comprobante */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1.5">
                <FileText className="h-3 w-3 text-gray-600" />
                Boleta
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTypeSelector(!showTypeSelector)}
                  className="w-full px-2.5 py-2 bg-white border-2 border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-blue-400 transition-all text-xs font-medium"
                >
                  <span className="text-gray-900 truncate">
                    {tipoComprobante === 'boleta' ? 'Boleta' : 'Factura'}
                  </span>
                  <svg className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ml-1 ${showTypeSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown de tipos */}
                {showTypeSelector && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-20 min-w-[240px]">
                    <button
                      onClick={() => handleTipoComprobanteChange('factura')}
                      className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 flex items-center gap-2"
                    >
                      <FileText className="h-3 w-3 text-purple-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-purple-900">Factura Electrónica</div>
                        <div className="text-xs text-purple-600">Para empresas con RUC</div>
                      </div>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex-shrink-0">F001</span>
                    </button>
                    <button
                      onClick={() => handleTipoComprobanteChange('boleta')}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 flex items-center gap-2"
                    >
                      <Receipt className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-blue-900">Boleta de Venta</div>
                        <div className="text-xs text-blue-600">Para personas naturales</div>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">B001</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTypeSelector(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Receipt className="h-3 w-3 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-gray-900">Nota de Venta</div>
                        <div className="text-xs text-gray-600">Comprobante interno</div>
                      </div>
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">NV01</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Moneda - Dropdown */}
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1.5">
                <span className="text-gray-600">{currency === 'PEN' ? 'S/.' : '$'}</span>
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as 'PEN' | 'USD')}
                className="w-full px-2.5 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 hover:border-blue-400 transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PEN">Soles</option>
                <option value="USD">Dólares</option>
              </select>
            </div>
          </div>

          {/* IGV */}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">IGV:</span>
            <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">18%</span>
          </div>
        </div>

        {/* Cliente - En una fila */}
        <div className="p-3 bg-white border-b border-gray-200">
          {!clienteSeleccionado ? (
            <div className="space-y-2">
              {/* Labels */}
              <div className="grid grid-cols-2 gap-2 mb-1">
                <label className="flex items-center gap-1 text-xs font-bold text-gray-700">
                  <User className="h-3 w-3 text-blue-600" />
                  Número de D.N.I.
                </label>
                <label className="flex items-center gap-1 text-xs font-bold text-gray-700">
                  <User className="h-3 w-3 text-blue-600" />
                  Nombre
                </label>
              </div>

              {/* Inputs en la misma fila */}
              <div className="grid grid-cols-[140px_1fr_auto] gap-2">
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="08661829"
                    className="w-full pl-8 pr-2 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                </div>
                <input
                  type="text"
                  value={clienteSeleccionado?.nombre || ''}
                  readOnly
                  placeholder="CARMEN ROSA FLORES CANALI"
                  className="px-2 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-xs text-gray-700"
                />
                <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                  <Search className="h-4 w-4" />
                </button>
              </div>

              {searchQuery && (
                <div className="border-2 border-blue-200 rounded-lg max-h-32 overflow-y-auto bg-white">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map((cliente: ClientePOS) => (
                      <button
                        key={cliente.id}
                        onClick={() => handleSeleccionarCliente(cliente)}
                        className="w-full text-left p-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-semibold text-xs text-gray-900">{cliente.nombre}</div>
                        <div className="text-xs text-gray-600">
                          {cliente.tipoDocumento}: {cliente.documento}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-gray-500">Sin resultados</div>
                  )}
                </div>
              )}

              <button
                onClick={handleNuevoCliente}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-md"
              >
                <Plus className="h-4 w-4" />
                Nuevo Cliente
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-bold text-sm text-gray-900 mb-1">{clienteSeleccionado.nombre}</div>
                  <div className="text-xs text-gray-700 font-medium">
                    N° {clienteSeleccionado.documento}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{clienteSeleccionado.tipoDocumento}</div>
                </div>
                <button
                  onClick={() => setClienteSeleccionado(null)}
                  className="p-1 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  title="Quitar cliente"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleEditarCliente}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </button>
                <button
                  onClick={() => setClienteSeleccionado(null)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-bold text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                >
                  <Search className="h-3 w-3" />
                  Cambiar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de productos - Diseño compacto en fila */}
        <div className="p-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <Package className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-xs font-semibold text-gray-700 mb-1">{UI_MESSAGES.EMPTY_CART}</p>
              <p className="text-xs text-center text-gray-500 px-4">
                Busca y selecciona productos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors p-2.5">
                  {/* TODO EN UNA FILA: Nombre / Controles / Precio */}
                  <div className="flex items-center gap-2">
                    {/* Nombre del producto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                        <h4 className="font-semibold text-xs text-gray-900 truncate">{item.name}</h4>
                      </div>
                      <p className="text-xs text-gray-500">{formatPrice(item.price, currency)} x {(item as any).unit || 'Und.'}</p>
                    </div>

                    {/* Controles de cantidad */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        disabled={item.quantity <= 1 || isProcessing}
                      >
                        <Minus className="h-3 w-3 text-gray-600" />
                      </button>

                      <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>

                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={isProcessing}
                      >
                        <Plus className="h-3 w-3 text-gray-600" />
                      </button>
                    </div>

                    {/* Precio total */}
                    <div className="text-right min-w-[80px]">
                      <div className="text-sm font-bold text-gray-900">
                        {formatPrice(item.price * item.quantity, currency)}
                      </div>
                    </div>

                    {/* Botón eliminar */}
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                      disabled={isProcessing}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Descuento - Compacto */}
        {cartItems.length > 0 && (
          <div className="px-3 pb-3">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Descuento</label>
            <div className="flex gap-1.5">
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs">
                S/.
              </button>
              <button className="px-3 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-bold text-xs hover:border-blue-400 transition-colors">
                %
              </button>
              <input
                type="number"
                placeholder="S/. 0"
                className="flex-1 px-2.5 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        )}
      </div>

      {/* Total Section */}
      {cartItems.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-4">
            <button
              onClick={handleProceedToPayment}
              disabled={!canProcessSale}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                canProcessSale
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.01]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {UI_MESSAGES.CART_LOADING}
                </span>
              ) : (
                `VENDER TOTAL: ${formatPrice(totals.total, currency)}`
              )}
            </button>
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>{cartItems.length} Producto{cartItems.length !== 1 ? 's' : ''}</span>
              <button
                onClick={onClearCart}
                className="text-blue-600 hover:text-blue-800 font-medium underline"
                disabled={isProcessing}
              >
                Eliminar Items
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
