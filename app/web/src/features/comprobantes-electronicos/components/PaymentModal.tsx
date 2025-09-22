// ===================================================================
// COMPONENTE MODAL PARA PROCESAR PAGOS (MODO POS)
// ===================================================================

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { 
  CartItem, 
  PaymentTotals, 
  TipoComprobante
} from '../models/comprobante.types';

export interface PaymentModalProps {
  // Control de visibilidad
  show: boolean;
  onClose: () => void;
  
  // Datos del carrito
  cartItems: CartItem[];
  totals: PaymentTotals;
  
  // Tipo de comprobante
  tipoComprobante: TipoComprobante;
  onTipoComprobanteChange: (tipo: TipoComprobante) => void;
  
  // Callbacks
  onPaymentComplete: (data: {
    tipoComprobante: TipoComprobante;
    total: number;
    receivedAmount: number;
    change: number;
  }) => void;
  onGoToForm: () => void;
  
  // Cliente (opcional para futuras mejoras)
  cliente?: {
    nombre: string;
    documento: string;
    direccion?: string;
  };
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  onClose,
  cartItems,
  totals,
  tipoComprobante,
  onTipoComprobanteChange,
  onPaymentComplete,
  onGoToForm,
  cliente = {
    nombre: "FLORES CANALES CARMEN ROSA",
    documento: "09661829",
    direccion: "Dirección no definida"
  }
}) => {

  // ===================================================================
  // ESTADOS DEL MODAL DE PAGO
  // ===================================================================
  
  const [cashBills, setCashBills] = useState<number[]>([]);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // ===================================================================
  // CONFIGURACIÓN DE PAGOS RÁPIDOS
  // ===================================================================

  const quickPaymentAmounts = [totals.total, 20.00, 50.00, 100.00, 200.00];

  // ===================================================================
  // CÁLCULOS DE PAGO
  // ===================================================================

  /**
   * Calcular vuelto basado en el monto recibido
   */
  const calculateChange = useCallback((): number => {
    const received = 
      cashBills.reduce((sum, bill) => sum + bill, 0) ||
      parseFloat(receivedAmount || customAmount) || 0;
    return received - totals.total;
  }, [cashBills, receivedAmount, customAmount, totals.total]);

  /**
   * Obtener monto total recibido
   */
  const getTotalReceived = useCallback((): number => {
    return cashBills.reduce((sum, bill) => sum + bill, 0) || 
           parseFloat(receivedAmount || customAmount) || 0;
  }, [cashBills, receivedAmount, customAmount]);

  // ===================================================================
  // MANEJADORES DE EVENTOS
  // ===================================================================

  /**
   * Manejar selección de billetes rápidos
   */
  const handleQuickPayment = (amount: number) => {
    if (amount === totals.total) {
      // Si es el total exacto, limpiar otros montos
      setCashBills([totals.total]);
      setCustomAmount('');
      setReceivedAmount('');
    } else {
      // Agregar billete a la lista
      setCashBills(prev => [...prev, amount]);
      setCustomAmount('');
      setReceivedAmount('');
    }
  };

  /**
   * Manejar cambio en monto personalizado
   */
  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setCashBills([]);
    setReceivedAmount('');
  };

  /**
   * Limpiar todos los montos
   */
  const clearAllAmounts = () => {
    setCashBills([]);
    setReceivedAmount('');
    setCustomAmount('');
  };

  /**
   * Completar la venta
   */
  const handleCompleteSale = () => {
    const change = calculateChange();
    if (change >= 0) {
      onPaymentComplete({
        tipoComprobante,
        total: totals.total,
        receivedAmount: getTotalReceived(),
        change
      });
      
      // Limpiar estado del modal
      clearAllAmounts();
      onClose();
    }
  };

  /**
   * Ir al formulario completo
   */
  const handleGoToForm = () => {
    onGoToForm();
    onClose();
  };

  /**
   * Cerrar modal
   */
  const handleClose = () => {
    clearAllAmounts();
    onClose();
  };

  /**
   * Manejar clic en overlay
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // ===================================================================
  // RENDERIZADO
  // ===================================================================

  if (!show) return null;

  const change = calculateChange();
  const totalReceived = getTotalReceived();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Procesar Pago
            </h2>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex max-h-[calc(90vh-80px)]">
          {/* Left Side - Order Summary */}
          <div className="flex-1 p-6 border-r border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de la Orden</h3>
            
            {/* Products List */}
            <div className="space-y-3 mb-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.code}</p>
                  </div>
                  <div className="text-center mx-4">
                    <span className="text-sm font-medium">{item.quantity}</span>
                    <p className="text-xs text-gray-500">cant.</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">S/ {(item.price * item.quantity).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">S/ {item.price.toFixed(2)} c/u</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">S/ {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IGV (18%)</span>
                <span className="text-gray-900">S/ {totals.igv.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">S/ {totals.total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Selector de tipo de comprobante */}
            <div className="mt-6 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de comprobante</label>
              <div className="flex space-x-2">
                <button
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium border ${
                    tipoComprobante === 'boleta' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onTipoComprobanteChange('boleta')}
                >
                  Boleta
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium border ${
                    tipoComprobante === 'factura' 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onTipoComprobanteChange('factura')}
                >
                  Factura
                </button>
              </div>
            </div>
            
            {/* Datos del cliente */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Datos del cliente</h4>
              <div className="mb-2">
                <input 
                  type="text" 
                  placeholder="Seleccionar cliente" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2" 
                />
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm mb-2">
                  <span className="inline-flex items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user mr-1">
                      <path d="M20 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M4 21v-2a4 4 0 0 1 3-3.87"/>
                      <circle cx="12" cy="7" r="4"/>
                      <line x1="19" y1="8" x2="19" y2="14"/>
                      <line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                  </span>
                  <span>Nuevo cliente</span>
                </button>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-gray-900 text-sm">Nombre</div>
                <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                <div className="text-xs font-medium text-gray-700 mt-2">Dni</div>
                <div className="text-sm text-gray-700">{cliente.documento}</div>
                <div className="text-xs font-medium text-gray-700 mt-2">Dirección</div>
                <div className="text-sm text-gray-700">{cliente.direccion}</div>
                <button className="text-blue-600 hover:text-blue-700 text-sm mt-2">Editar cliente</button>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Methods */}
          <div className="w-96 p-6 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Método de Pago</h3>
            
            {/* Quick Payment Buttons */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Efectivo rápido</h4>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Primer botón: total de la venta */}
                <button
                  className={`px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 ${
                    cashBills.includes(totals.total) 
                      ? 'bg-green-100 border-green-500 text-green-700' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleQuickPayment(totals.total)}
                >
                  S/ {totals.total.toFixed(2)}
                </button>
                
                {/* Billetes comunes */}
                {quickPaymentAmounts.slice(1).map((amount) => (
                  <button
                    key={amount}
                    className={`px-3 py-2 text-sm border rounded-md transition-colors border-gray-300 ${
                      cashBills.includes(amount) 
                        ? 'bg-blue-100 border-blue-500 text-blue-700' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleQuickPayment(amount)}
                  >
                    S/ {amount.toFixed(2)}
                  </button>
                ))}
              </div>
              
              {/* Custom amount input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Monto recibido</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={e => handleCustomAmountChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Ingrese monto personalizado"
                />
              </div>
              
              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Monto a pagar:</span>
                  <span className="font-medium">S/ {totals.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Monto recibido:</span>
                  <span className="font-medium">S/ {totalReceived.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-2">
                  <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {change >= 0 ? 'Vuelto:' : 'Falta:'}
                  </span>
                  <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    S/ {Math.abs(change).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Payment Methods */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Métodos de pago activos</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Efectivo</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">S/ {totalReceived.toFixed(2)}</div>
                      <button 
                        className="text-xs text-gray-500 hover:text-gray-700"
                        onClick={clearAllAmounts}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={handleCompleteSale}
                disabled={change < 0}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                  change >= 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {change >= 0 ? 'Completar Venta' : 'Monto Insuficiente'}
              </button>
              
              <button 
                onClick={handleClose}
                className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              
              <button 
                onClick={handleGoToForm}
                className="w-full px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
              >
                Ir a Formulario Completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};