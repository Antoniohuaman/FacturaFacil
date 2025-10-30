/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// ===================================================================
// COMPONENTE MODAL PARA PROCESAR PAGOS (MODO POS)
// ===================================================================

import React, { useState } from 'react';
import { X, CreditCard, FileText, User, Calculator, Search, Plus, Edit, Building2, Smartphone, Banknote, DollarSign, Trash2 } from 'lucide-react';
import type { PaymentModalProps } from '../../models/comprobante.types';
import { useCurrency } from '../form-core/hooks/useCurrency';
import ClienteForm from '../../../gestion-clientes/components/ClienteForm';

// Interfaz para cliente en formato POS
interface ClientePOS {
  id: number;
  nombre: string;
  tipoDocumento: 'DNI' | 'RUC' | 'Sin documento';
  documento: string;
  direccion: string;
}

// Interfaz para líneas de pago múltiples
interface PaymentLine {
  id: string;
  method: string;
  amount: string;
  reference?: string;
  bank?: string;
  cardLastDigits?: string;
  operationNumber?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  totals,
  tipoComprobante,
  setTipoComprobante,
  onPaymentComplete,
  onViewFullForm,
  currency = 'PEN',
  onCurrencyChange
}) => {
  const { formatPrice, changeCurrency } = useCurrency();

  const [activeStep, setActiveStep] = useState<'document' | 'payment'>('document');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Sistema de pagos múltiples
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: '1', method: 'efectivo', amount: '', bank: 'Caja general' }
  ]);
  const [showMethodSelector, setShowMethodSelector] = useState(false);

  // Estados para gestión de clientes
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  
  // Estados del formulario de cliente (replicando la estructura del módulo)
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

  // Tipos de documento y cliente (mismo que en módulo de clientes)
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

  // Métodos de pago disponibles con diseño moderno
  const paymentMethods = [
    {
      id: 'efectivo',
      name: 'Efectivo',
      icon: Banknote,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-700',
      hoverBg: 'hover:bg-green-100',
      description: 'Pago en efectivo'
    },
    {
      id: 'yape',
      name: 'Yape',
      icon: Smartphone,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-700',
      hoverBg: 'hover:bg-purple-100',
      description: 'Transferencia Yape'
    },
    {
      id: 'plin',
      name: 'Plin',
      icon: Smartphone,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-700',
      hoverBg: 'hover:bg-blue-100',
      description: 'Transferencia Plin'
    },
    {
      id: 'tarjeta_credito',
      name: 'Tarjeta Crédito',
      icon: CreditCard,
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-700',
      hoverBg: 'hover:bg-orange-100',
      description: 'Visa, Mastercard'
    },
    {
      id: 'tarjeta_debito',
      name: 'Tarjeta Débito',
      icon: CreditCard,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-500',
      textColor: 'text-indigo-700',
      hoverBg: 'hover:bg-indigo-100',
      description: 'Débito bancario'
    },
    {
      id: 'transferencia',
      name: 'Transferencia',
      icon: Building2,
      color: 'teal',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-500',
      textColor: 'text-teal-700',
      hoverBg: 'hover:bg-teal-100',
      description: 'Transferencia bancaria'
    },
    {
      id: 'deposito',
      name: 'Depósito',
      icon: Building2,
      color: 'cyan',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-500',
      textColor: 'text-cyan-700',
      hoverBg: 'hover:bg-cyan-100',
      description: 'Depósito en cuenta'
    },
    {
      id: 'credito',
      name: 'Crédito',
      icon: DollarSign,
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-500',
      textColor: 'text-amber-700',
      hoverBg: 'hover:bg-amber-100',
      description: 'Pago a crédito'
    }
  ];

  // Cargar clientes desde localStorage (mismo sistema que ClientesPage)
  const getClientesFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem('clientes');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convertir al formato esperado por el componente
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
      // Fallback a mock data si no hay nada en localStorage
      return [
        {
          id: 1,
          nombre: "FLORES CANALES CARMEN ROSA",
          tipoDocumento: "DNI" as const,
          documento: "09661829",
          direccion: "Dirección no definida"
        },
        {
          id: 2,
          nombre: "PLUSMEDIA S.A.C.",
          tipoDocumento: "RUC" as const,
          documento: "20608822658",
          direccion: "AV. HÉROES NRO. 280 - LIMA LIMA SAN JUAN DE MIRAFLORES"
        }
      ];
    } catch (error) {
      console.error('Error loading clientes from localStorage:', error);
      return [];
    }
  };

  const mockClientes: ClientePOS[] = getClientesFromLocalStorage();

  if (!isOpen) return null;

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
    // Guardar cliente en localStorage con el mismo formato que ClientesPage
    try {
      const clientesLS = localStorage.getItem('clientes');
      const clientesActuales = clientesLS ? JSON.parse(clientesLS) : [];
      
      // Formatear documento según tipo (igual que ClientesPage línea 309)
      const documentoFormateado = clienteDocumentType !== 'SIN_DOCUMENTO' 
        ? `${clienteDocumentType} ${clienteFormData.documentNumber.trim()}`
        : 'Sin documento';
      
      // Calcular ID igual que ClientesPage (línea 299)
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
      
      // Agregar al inicio del array (igual que ClientesPage línea 311)
      clientesActuales.unshift(nuevoCliente);
      localStorage.setItem('clientes', JSON.stringify(clientesActuales));
      
      // Actualizar cliente seleccionado para la factura actual
      setClienteSeleccionado({
        id: nuevoCliente.id,
        nombre: nuevoCliente.name,
        tipoDocumento: clienteDocumentType as 'DNI' | 'RUC' | 'Sin documento',
        documento: clienteFormData.documentNumber,
        direccion: nuevoCliente.address
      });
      
      setShowClienteForm(false);
      console.log('✅ Cliente guardado en localStorage:', nuevoCliente);
      console.log('📊 Total de clientes:', clientesActuales.length);
    } catch (error) {
      console.error('❌ Error al guardar cliente:', error);
    }
  };

  const handleSeleccionarCliente = (cliente: any) => {
    setClienteSeleccionado(cliente);
    setSearchQuery('');
  };

  // ============================================
  // FUNCIONES PARA SISTEMA DE PAGOS MÚLTIPLES
  // ============================================

  const getTotalReceived = () => {
    return paymentLines.reduce((sum, line) => {
      const amount = parseFloat(line.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const getRemaining = () => {
    return totals.total - getTotalReceived();
  };

  const addPaymentLine = (methodId: string) => {
    const remaining = getRemaining();
    const newLine: PaymentLine = {
      id: Date.now().toString(),
      method: methodId,
      amount: remaining > 0 ? remaining.toFixed(2) : '',
      bank: methodId === 'efectivo' ? 'Caja general' : ''
    };
    setPaymentLines([...paymentLines, newLine]);
    setShowMethodSelector(false);
  };

  const removePaymentLine = (id: string) => {
    if (paymentLines.length === 1) return; // Mantener al menos una línea
    setPaymentLines(paymentLines.filter(line => line.id !== id));
  };

  const updatePaymentLine = (id: string, field: keyof PaymentLine, value: string) => {
    setPaymentLines(paymentLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const getMethodConfig = (methodId: string) => {
    return paymentMethods.find(m => m.id === methodId);
  };

  // Lista de bancos/cajas disponibles
  const bankOptions = [
    'Caja general',
    'BCP',
    'BBVA',
    'Interbank',
    'Scotiabank',
    'Banco de la Nación',
    'Banco Pichincha',
    'Otro'
  ];

  // Manejar cambio de tipo de comprobante con validación
  const handleTipoComprobanteChange = (nuevoTipo: 'boleta' | 'factura') => {
    // Si se cambia a FACTURA, validar que el cliente tiene RUC
    if (nuevoTipo === 'factura') {
      if (clienteSeleccionado) {
        // Hay un cliente seleccionado, verificar que tenga RUC
        if (clienteSeleccionado.tipoDocumento !== 'RUC') {
          const confirmar = window.confirm(
            `⚠️ ADVERTENCIA: Para emitir FACTURA el cliente debe tener RUC.\n\n` +
            `Cliente seleccionado: ${clienteSeleccionado.nombre}\n` +
            `Tipo de documento actual: ${clienteSeleccionado.tipoDocumento}\n\n` +
            `¿Deseas cambiar a FACTURA de todas formas?\n` +
            `(Deberás seleccionar o crear un cliente con RUC antes de continuar)`
          );
          
          if (!confirmar) {
            return; // No cambiar el tipo de comprobante
          }
        }
      } else {
        // No hay cliente seleccionado, solo mostrar info
        alert(
          `ℹ️ RECUERDA: Para emitir FACTURA necesitarás seleccionar un cliente con RUC.\n\n` +
          `Asegúrate de tener un cliente con RUC antes de continuar al pago.`
        );
      }
    }
    
    // Realizar el cambio
    setTipoComprobante(nuevoTipo);
  };

  const handleContinueToPayment = () => {
    // VALIDACIÓN CRÍTICA: Si es FACTURA, el cliente DEBE tener RUC
    if (tipoComprobante === 'factura') {
      // Verificar que hay un cliente seleccionado
      if (!clienteSeleccionado) {
        alert('⚠️ Para emitir una FACTURA es obligatorio seleccionar un cliente con RUC.\n\nPor favor, selecciona o crea un cliente con RUC.');
        return;
      }
      
      // Verificar que el cliente tiene tipo de documento RUC
      if (clienteSeleccionado.tipoDocumento !== 'RUC') {
        alert(`⚠️ Para emitir una FACTURA el cliente debe tener RUC.\n\nCliente actual: ${clienteSeleccionado.nombre}\nTipo de documento: ${clienteSeleccionado.tipoDocumento}\n\nPor favor, selecciona un cliente con RUC o edita este cliente para agregar su RUC.`);
        return;
      }
      
      // Verificar que el RUC tiene 11 dígitos
      if (!clienteSeleccionado.documento || clienteSeleccionado.documento.length !== 11) {
        alert(`⚠️ El RUC del cliente no es válido.\n\nCliente: ${clienteSeleccionado.nombre}\nRUC: ${clienteSeleccionado.documento || 'No especificado'}\n\nEl RUC debe tener exactamente 11 dígitos. Por favor, edita el cliente para corregir el RUC.`);
        return;
      }
    }
    
    // Si pasa todas las validaciones, continuar al pago
    setActiveStep('payment');
  };

  const handleBackToDocument = () => {
    setActiveStep('document');
  };

  const handleProcessPayment = async () => {
    // Validar que el pago esté completo (remaining <= 0)
    if (getRemaining() > 0) {
      console.warn('Pago incompleto. Falta:', getRemaining());
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Aquí se enviarían los datos de paymentLines al backend
      console.log('Pagos procesados:', paymentLines);
      
      onPaymentComplete();
      onClose();
    } catch (error) {
      console.error('Error procesando pago:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCurrencyChange = (newCurrency: 'PEN' | 'USD') => {
    changeCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header Mejorado */}
          <div className="flex items-center justify-between p-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg">
                {activeStep === 'document' ? (
                  <FileText className="h-6 w-6 text-white" />
                ) : (
                  <CreditCard className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {activeStep === 'document' ? 'Forma de Pago para ' + (tipoComprobante === 'boleta' ? 'BOLETA' : 'FACTURA') : 'Procesar Pago'}
                </h2>
                <p className="text-sm text-blue-100">
                  {activeStep === 'document'
                    ? 'Configura el tipo de documento y cliente'
                    : `Total a cobrar: ${formatPrice(totals.total, currency)}`
                  }
                </p>
              </div>
            </div>

            {/* Progress Steps y Close */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                activeStep === 'document'
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 text-white'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  activeStep === 'document' ? 'bg-blue-600' : 'bg-white'
                }`} />
                Datos
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                activeStep === 'payment'
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 text-white'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  activeStep === 'payment' ? 'bg-blue-600' : 'bg-white'
                }`} />
                Pago
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors ml-2"
                title="Cerrar"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeStep === 'document' ? (
              /* STEP 1: DOCUMENT CONFIGURATION */
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">

                {/* Lista de productos compacta */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      Lista de productos
                    </h3>
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 space-y-2 max-h-[400px] overflow-y-auto">
                    {cartItems.map((item, index) => (
                      <div key={item.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900 leading-tight mb-1">
                              {item.name}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{formatPrice(item.price, currency)} x {item.quantity} {(item as any).unit ?? 'Und.'}</span>
                              <span className="font-bold text-blue-600">
                                {formatPrice(item.price * item.quantity, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Totales dentro del listado */}
                    <div className="bg-white rounded-lg p-3 border-2 border-blue-300 mt-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Gravado:</span>
                          <span className="font-semibold text-gray-900">{formatPrice(totals.subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">IGV (18%):</span>
                          <span className="font-semibold text-gray-900">{formatPrice(totals.igv, currency)}</span>
                        </div>
                        <div className="border-t-2 border-blue-200 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-bold text-gray-900">Total a Pagar:</span>
                            <span className="text-xl font-bold text-blue-600">{formatPrice(totals.total, currency)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuración del documento - Más compacto */}
                <div className="space-y-4">

                  {/* Tipo de Comprobante - Dropdown estilo */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Tipo de Comprobante
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleTipoComprobanteChange('boleta')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          tipoComprobante === 'boleta'
                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                      >
                        <div className="font-bold text-sm">Boleta</div>
                        <div className={`text-xs mt-0.5 ${tipoComprobante === 'boleta' ? 'text-blue-100' : 'text-gray-500'}`}>
                          B001
                        </div>
                      </button>

                      <button
                        onClick={() => handleTipoComprobanteChange('factura')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          tipoComprobante === 'factura'
                            ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                      >
                        <div className="font-bold text-sm">Factura</div>
                        <div className={`text-xs mt-0.5 ${tipoComprobante === 'factura' ? 'text-blue-100' : 'text-gray-500'}`}>
                          F001 - Req. RUC
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Moneda - Más compacto */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Moneda
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCurrencyChange('PEN')}
                        className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                          currency === 'PEN'
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg'
                            : 'border-gray-300 bg-white hover:border-emerald-400'
                        }`}
                      >
                        <div className="font-bold text-sm">S/ Soles</div>
                      </button>

                      <button
                        onClick={() => handleCurrencyChange('USD')}
                        className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                          currency === 'USD'
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg'
                            : 'border-gray-300 bg-white hover:border-emerald-400'
                        }`}
                      >
                        <div className="font-bold text-sm">$ Dólares</div>
                      </button>
                    </div>
                  </div>

                  {/* Datos del cliente - Estilo mejorado */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Cliente
                    </label>

                    {!clienteSeleccionado ? (
                      /* Sin cliente seleccionado - Búsqueda compacta */
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="N° de D.N.I., RUC o nombre..."
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>

                        {/* Resultados de búsqueda compactos */}
                        {searchQuery && (
                          <div className="border-2 border-blue-200 rounded-lg max-h-36 overflow-y-auto bg-white">
                            {clientesFiltrados.length > 0 ? (
                              clientesFiltrados.map((cliente: ClientePOS) => (
                                <button
                                  key={cliente.id}
                                  onClick={() => handleSeleccionarCliente(cliente)}
                                  className="w-full text-left p-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-semibold text-sm text-gray-900">{cliente.nombre}</div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    {cliente.tipoDocumento}: {cliente.documento}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-sm text-gray-500">
                                Sin resultados
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={handleNuevoCliente}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-md"
                        >
                          <Plus className="h-4 w-4" />
                          Nuevo Cliente
                        </button>
                      </div>
                    ) : (
                      /* Cliente seleccionado - Card elegante */
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 mb-1">{clienteSeleccionado.nombre}</div>
                            <div className="text-sm text-gray-700 font-medium">
                              N° {clienteSeleccionado.documento}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {clienteSeleccionado.tipoDocumento}
                            </div>
                          </div>
                          <button
                            onClick={() => setClienteSeleccionado(null)}
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                            title="Quitar cliente"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleEditarCliente}
                            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => setClienteSeleccionado(null)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 px-3 text-xs font-bold text-gray-600 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                          >
                            <Search className="h-3 w-3" />
                            Cambiar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: PAYMENT PROCESSING */
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="max-w-md mx-auto">
                  
                  {/* Total destacado */}
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatPrice(totals.total, currency)}
                    </div>
                    <div className="text-gray-600">
                      {tipoComprobante === 'boleta' ? 'Boleta' : 'Factura'} 
                      {clienteSeleccionado && ` • ${clienteSeleccionado.nombre}`}
                    </div>
                  </div>

                  {/* Sistema de Pagos Múltiples */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Métodos de Pago</h4>
                      {paymentLines.length > 0 && (
                        <button
                          onClick={() => setShowMethodSelector(!showMethodSelector)}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Agregar método
                        </button>
                      )}
                    </div>

                    {/* Selector de métodos (modal inline) */}
                    {showMethodSelector && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Selecciona un método de pago:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {paymentMethods.map((method) => {
                            const Icon = method.icon;
                            return (
                              <button
                                key={method.id}
                                onClick={() => addPaymentLine(method.id)}
                                className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${method.borderColor} ${method.bgColor} ${method.hoverBg}`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${method.textColor}`} />
                                  <span className={`text-sm font-medium ${method.textColor}`}>{method.name}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setShowMethodSelector(false)}
                          className="mt-3 w-full text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {/* Botones de pago rápido */}
                    {paymentLines.length === 1 && paymentLines[0].method === 'efectivo' && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">💵 Pago Rápido en Efectivo</h5>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          <button
                            onClick={() => updatePaymentLine(paymentLines[0].id, 'amount', totals.total.toFixed(2))}
                            className="p-3 rounded-lg border-2 border-green-500 bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-all hover:scale-105"
                          >
                            {formatPrice(totals.total, currency)}
                            <div className="text-xs text-green-600">Exacto</div>
                          </button>
                          <button
                            onClick={() => {
                              const current = parseFloat(paymentLines[0].amount) || 0;
                              updatePaymentLine(paymentLines[0].id, 'amount', (current + 20).toFixed(2));
                            }}
                            className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                          >
                            + S/ 20.00
                          </button>
                          <button
                            onClick={() => {
                              const current = parseFloat(paymentLines[0].amount) || 0;
                              updatePaymentLine(paymentLines[0].id, 'amount', (current + 50).toFixed(2));
                            }}
                            className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                          >
                            + S/ 50.00
                          </button>
                          <button
                            onClick={() => {
                              const current = parseFloat(paymentLines[0].amount) || 0;
                              updatePaymentLine(paymentLines[0].id, 'amount', (current + 100).toFixed(2));
                            }}
                            className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                          >
                            + S/ 100.00
                          </button>
                          <button
                            onClick={() => {
                              const current = parseFloat(paymentLines[0].amount) || 0;
                              updatePaymentLine(paymentLines[0].id, 'amount', (current + 200).toFixed(2));
                            }}
                            className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                          >
                            + S/ 200.00
                          </button>
                          <button
                            onClick={() => {
                              const current = parseFloat(paymentLines[0].amount) || 0;
                              updatePaymentLine(paymentLines[0].id, 'amount', (current + 500).toFixed(2));
                            }}
                            className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                          >
                            + S/ 500.00
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-600">Haz clic para sumar al monto</p>
                          <button
                            onClick={() => updatePaymentLine(paymentLines[0].id, 'amount', '0.00')}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Líneas de pago activas */}
                    <div className="space-y-3">
                      {paymentLines.map((line) => {
                        const methodConfig = getMethodConfig(line.method);
                        if (!methodConfig) return null;
                        
                        const Icon = methodConfig.icon;
                        
                        return (
                          <div key={line.id} className={`p-4 rounded-lg border-2 ${methodConfig.borderColor} ${methodConfig.bgColor}`}>
                            {/* Header de la línea */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${methodConfig.textColor}`} />
                                <span className={`font-medium ${methodConfig.textColor}`}>
                                  {methodConfig.name}
                                </span>
                              </div>
                              {paymentLines.length > 1 && (
                                <button
                                  onClick={() => removePaymentLine(line.id)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Campos del método de pago */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Monto */}
                              <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Monto *
                                </label>
                                <input
                                  type="number"
                                  value={line.amount}
                                  onChange={(e) => updatePaymentLine(line.id, 'amount', e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  step="0.01"
                                  min="0"
                                />
                              </div>

                              {/* Banco/Caja */}
                              <div className="col-span-2 sm:col-span-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Banco/Caja
                                </label>
                                <select
                                  value={line.bank || ''}
                                  onChange={(e) => updatePaymentLine(line.id, 'bank', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                >
                                  {bankOptions.map(bank => (
                                    <option key={bank} value={bank}>{bank}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Campos adicionales según el método */}
                              {(line.method === 'yape' || line.method === 'plin' || line.method === 'transferencia' || line.method === 'deposito') && (
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Nº de Operación
                                  </label>
                                  <input
                                    type="text"
                                    value={line.operationNumber || ''}
                                    onChange={(e) => updatePaymentLine(line.id, 'operationNumber', e.target.value)}
                                    placeholder="Número de operación"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                </div>
                              )}

                              {(line.method === 'tarjeta_credito' || line.method === 'tarjeta_debito') && (
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Últimos 4 dígitos
                                  </label>
                                  <input
                                    type="text"
                                    value={line.cardLastDigits || ''}
                                    onChange={(e) => updatePaymentLine(line.id, 'cardLastDigits', e.target.value.slice(0, 4))}
                                    placeholder="****"
                                    maxLength={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                  />
                                </div>
                              )}

                              {/* Referencia/Nota opcional */}
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Referencia (opcional)
                                </label>
                                <input
                                  type="text"
                                  value={line.reference || ''}
                                  onChange={(e) => updatePaymentLine(line.id, 'reference', e.target.value)}
                                  placeholder="Nota o referencia"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resumen de pago */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total a pagar:</span>
                        <span className="font-bold text-gray-900">{formatPrice(totals.total, currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total recibido:</span>
                        <span className="font-bold text-blue-600">{formatPrice(getTotalReceived(), currency)}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2">
                        {getRemaining() > 0 ? (
                          <div className="flex justify-between text-base font-bold text-red-600">
                            <span>Falta:</span>
                            <span>{formatPrice(getRemaining(), currency)}</span>
                          </div>
                        ) : getRemaining() < 0 ? (
                          <div className="flex justify-between text-base font-bold text-orange-600">
                            <span>Vuelto:</span>
                            <span>{formatPrice(Math.abs(getRemaining()), currency)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            <span>Pago completo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions - Mejorado */}
          <div className="p-5 border-t-2 border-gray-200 bg-gray-50">
            {activeStep === 'document' ? (
              <div className="flex justify-between items-center">
                <button
                  onClick={onViewFullForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-blue-600 font-semibold transition-colors underline"
                >
                  Usar Formulario Completo
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleContinueToPayment}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold transition-all shadow-lg hover:shadow-xl"
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <button
                  onClick={handleBackToDocument}
                  className="px-4 py-2.5 text-gray-700 hover:text-gray-900 font-semibold transition-colors flex items-center gap-1"
                >
                  ← Volver
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-lg font-semibold transition-colors"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleProcessPayment}
                    className={`px-8 py-2.5 rounded-lg font-bold transition-all shadow-lg ${
                      getRemaining() <= 0 && !isProcessing
                        ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white hover:shadow-xl'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={getRemaining() > 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      'PROCESAR VENTA'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Cliente (superpuesto) */}
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