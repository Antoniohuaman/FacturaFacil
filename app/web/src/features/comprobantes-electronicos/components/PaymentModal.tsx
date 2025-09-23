// ===================================================================
// COMPONENTE MODAL PARA PROCESAR PAGOS (MODO POS)
// ===================================================================

import React, { useState } from 'react';
import { X, CreditCard, FileText, User, Calculator } from 'lucide-react';
import type { PaymentModalProps } from '../models/comprobante.types';
import { useCurrency } from '../hooks/useCurrency';
import { usePayment } from '../hooks/usePayment';

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
  const {
    customAmount,
    setCustomAmount,
    addQuickPayment,
    formatQuickPaymentAmounts,
    getPaymentSummary
  } = usePayment(currency);

  const [activeStep, setActiveStep] = useState<'document' | 'payment'>('document');
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock client data - en producción vendría del contexto
  const mockClient = {
    nombre: "FLORES CANALES CARMEN ROSA",
    tipoDocumento: "DNI" as const,
    documento: "09661829",
    direccion: "Dirección no definida"
  };

  if (!isOpen) return null;

  const paymentSummary = getPaymentSummary(totals.total);
  const quickAmounts = formatQuickPaymentAmounts(totals.total);

  const handleContinueToPayment = () => {
    setActiveStep('payment');
  };

  const handleBackToDocument = () => {
    setActiveStep('document');
  };

  const handleProcessPayment = async () => {
    if (!paymentSummary.sufficient) return;
    
    setIsProcessing(true);
    
    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
                  {activeStep === 'document' ? 'Configurar Comprobante' : 'Procesar Pago'}
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
                        onClick={() => setTipoComprobante('boleta')}
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
                        onClick={() => setTipoComprobante('factura')}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          tipoComprobante === 'factura'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Factura</div>
                        <div className="text-xs text-gray-500 mt-1">Para empresas</div>
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
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="font-medium text-gray-900">{mockClient.nombre}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {mockClient.tipoDocumento}: {mockClient.documento}
                      </div>
                      <div className="text-sm text-gray-600">
                        {mockClient.direccion}
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2">
                        Cambiar cliente
                      </button>
                    </div>
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
                      {tipoComprobante === 'boleta' ? 'Boleta' : 'Factura'} • {mockClient.nombre}
                    </div>
                  </div>

                  {/* Método de pago */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Método de Pago</h4>
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">Efectivo</span>
                        <span className="text-green-600 ml-auto">
                          {formatPrice(paymentSummary.received, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de pago rápido */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Pago Rápido</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {quickAmounts.slice(0, 6).map((item, index) => (
                        <button
                          key={index}
                          onClick={() => addQuickPayment(item.amount)}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            item.isExact
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="font-medium text-sm">{item.formatted}</div>
                          {item.isExact && (
                            <div className="text-xs text-green-600">Exacto</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monto personalizado */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Monto Recibido</h4>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={`Ingresa el monto en ${currency === 'PEN' ? 'soles' : 'dólares'}`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {/* Resumen de pago */}
                  {paymentSummary.received > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span>Monto a pagar:</span>
                        <span className="font-medium">{paymentSummary.formattedTotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monto recibido:</span>
                        <span className="font-medium">{paymentSummary.formattedReceived}</span>
                      </div>
                      {paymentSummary.change > 0 && (
                        <div className="flex justify-between text-green-600 font-medium border-t border-gray-200 pt-2">
                          <span>Vuelto:</span>
                          <span>{paymentSummary.formattedChange}</span>
                        </div>
                      )}
                    </div>
                  )}
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
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
                      paymentSummary.sufficient && !isProcessing
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!paymentSummary.sufficient || isProcessing}
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
    </div>
  );
};