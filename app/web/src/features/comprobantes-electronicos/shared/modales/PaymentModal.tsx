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
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {activeStep === 'document' ? (
                  <FileText className="h-5 w-5 text-blue-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {activeStep === 'document' ? 'Confirmando datos ingresados' : 'Procesar Pago'}
                </h2>
                <p className="text-sm text-gray-600">
                  {activeStep === 'document' 
                    ? 'Define el tipo de comprobante y cliente'
                    : `Total a pagar: ${formatPrice(totals.total, currency)}`
                  }
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                activeStep === 'document' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  activeStep === 'document' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                1. Comprobante
              </div>
              
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                activeStep === 'payment' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  activeStep === 'payment' ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                2. Pago
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeStep === 'document' ? (
              /* STEP 1: DOCUMENT CONFIGURATION */
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
                
                {/* Resumen de productos */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Resumen de la Orden
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {cartItems.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.name}</span>
                          <div className="text-gray-500 text-xs">
                            {item.quantity} cant. × {formatPrice(item.price, currency)}
                          </div>
                        </div>
                        <span className="font-medium ml-2">
                          {formatPrice(item.price * item.quantity, currency)}
                        </span>
                      </div>
                    ))}
                    
                    {cartItems.length > 3 && (
                      <div className="text-center text-sm text-gray-500">
                        +{cartItems.length - 3} productos más
                      </div>
                    )}
                    
                    <div className="border-t border-gray-200 pt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatPrice(totals.subtotal, currency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>IGV (18%)</span>
                        <span>{formatPrice(totals.igv, currency)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                        <span>Total</span>
                        <span>{formatPrice(totals.total, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuración del documento */}
                <div className="space-y-6">
                  
                  {/* Tipo de comprobante */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Tipo de Comprobante</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleTipoComprobanteChange('boleta')}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          tipoComprobante === 'boleta'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Boleta</div>
                        <div className="text-xs text-gray-500 mt-1">Para consumidores finales</div>
                      </button>
                      
                      <button
                        onClick={() => handleTipoComprobanteChange('factura')}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          tipoComprobante === 'factura'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Factura</div>
                        <div className="text-xs text-gray-500 mt-1">Para empresas</div>
                        <div className="text-xs text-red-600 font-medium mt-1">⚠️ Requiere RUC</div>
                      </button>
                    </div>
                  </div>

                  {/* Moneda */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Moneda</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleCurrencyChange('PEN')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          currency === 'PEN'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">S/ Soles</div>
                      </button>
                      
                      <button
                        onClick={() => handleCurrencyChange('USD')}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          currency === 'USD'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">$ Dólares</div>
                      </button>
                    </div>
                  </div>

                  {/* Datos del cliente */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Datos del Cliente
                    </h4>
                    
                    {!clienteSeleccionado ? (
                      /* Sin cliente seleccionado - Mostrar búsqueda */
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre o documento..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>

                        {/* Resultados de búsqueda */}
                        {searchQuery && (
                          <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                            {clientesFiltrados.length > 0 ? (
                              clientesFiltrados.map((cliente: ClientePOS) => (
                                <button
                                  key={cliente.id}
                                  onClick={() => handleSeleccionarCliente(cliente)}
                                  className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-sm">{cliente.nombre}</div>
                                  <div className="text-xs text-gray-500">
                                    {cliente.tipoDocumento}: {cliente.documento}
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-sm text-gray-500">
                                No se encontraron clientes
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={handleNuevoCliente}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Crear Nuevo Cliente
                        </button>
                      </div>
                    ) : (
                      /* Cliente seleccionado - Mostrar datos */
                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{clienteSeleccionado.nombre}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {clienteSeleccionado.tipoDocumento}: {clienteSeleccionado.documento}
                            </div>
                            <div className="text-sm text-gray-600">
                              {clienteSeleccionado.direccion}
                            </div>
                          </div>
                          <button
                            onClick={() => setClienteSeleccionado(null)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleEditarCliente}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => setClienteSeleccionado(null)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
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

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            {activeStep === 'document' ? (
              <div className="flex justify-between">
                <button
                  onClick={onViewFullForm}
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Ir a Formulario Completo
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleContinueToPayment}
                    className="px-6 py-2 text-white rounded-lg font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#1478D4' }}
                  >
                    Continuar al Pago
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between">
                <button
                  onClick={handleBackToDocument}
                  className="px-4 py-2 text-gray-700 hover:text-gray-800 font-medium transition-colors"
                >
                  ← Volver
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleProcessPayment}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      getRemaining() <= 0 && !isProcessing
                        ? 'bg-green-600 hover:bg-green-700 text-white'
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
                      'Completar Venta'
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