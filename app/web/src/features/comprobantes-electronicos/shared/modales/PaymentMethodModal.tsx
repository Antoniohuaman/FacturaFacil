// ===================================================================
// MODAL SIMPLIFICADO PARA MÉTODOS DE PAGO (SOLO STEP 2)
// Maneja únicamente los métodos de pago y procesamiento
// ===================================================================

import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, Building2, DollarSign, Trash2 } from 'lucide-react';
import { useCurrency } from '../form-core/hooks/useCurrency';

interface PaymentLine {
  id: string;
  method: string;
  amount: string;
  reference?: string;
  bank?: string;
  cardLastDigits?: string;
  operationNumber?: string;
}

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  currency?: 'PEN' | 'USD';
  tipoComprobante: 'boleta' | 'factura';
  clienteNombre?: string;
  onPaymentComplete: () => void;
  isProcessing?: boolean;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  isOpen,
  onClose,
  total,
  currency = 'PEN',
  tipoComprobante,
  clienteNombre,
  onPaymentComplete,
  isProcessing = false
}) => {
    const { formatPrice, documentCurrency } = useCurrency();
    const currencyDecimals = documentCurrency.decimalPlaces ?? 2;

  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([
    { id: '1', method: 'efectivo', amount: '', bank: 'Caja general' }
  ]);
  const [showMethodSelector, setShowMethodSelector] = useState(false);

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

  const getTotalReceived = () => {
    return paymentLines.reduce((sum, line) => {
      const amount = parseFloat(line.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const getRemaining = () => {
    return total - getTotalReceived();
  };

  const addPaymentLine = (methodId: string) => {
    const remaining = getRemaining();
    const newLine: PaymentLine = {
      id: Date.now().toString(),
      method: methodId,
      amount: remaining > 0 ? remaining.toFixed(currencyDecimals) : '',
      bank: methodId === 'efectivo' ? 'Caja general' : ''
    };
    setPaymentLines([...paymentLines, newLine]);
    setShowMethodSelector(false);
  };

  const removePaymentLine = (id: string) => {
    if (paymentLines.length === 1) return;
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

  const handleProcessPayment = () => {
    if (getRemaining() > 0) {
      console.warn('Pago incompleto. Falta:', getRemaining());
      return;
    }

    onPaymentComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Procesar Pago</h2>
                <p className="text-sm text-blue-100">
                  Total a cobrar: {formatPrice(total, currency)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="max-w-md mx-auto">

              {/* Total destacado */}
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatPrice(total, currency)}
                </div>
                <div className="text-gray-600">
                  {tipoComprobante === 'boleta' ? 'Boleta' : 'Factura'}
                  {clienteNombre && ` • ${clienteNombre}`}
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
                      <CreditCard className="w-4 h-4" />
                      Agregar método
                    </button>
                  )}
                </div>

                {/* Selector de métodos */}
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
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Pago Rápido en Efectivo</h5>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <button
                        onClick={() => updatePaymentLine(paymentLines[0].id, 'amount', total.toFixed(currencyDecimals))}
                        className="p-3 rounded-lg border-2 border-green-500 bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-all hover:scale-105"
                      >
                        {formatPrice(total, currency)}
                        <div className="text-xs text-green-600">Exacto</div>
                      </button>
                      <button
                        onClick={() => {
                          const current = parseFloat(paymentLines[0].amount) || 0;
                          updatePaymentLine(paymentLines[0].id, 'amount', (current + 20).toFixed(currencyDecimals));
                        }}
                        className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                      >
                        + {formatPrice(20, currency)}
                      </button>
                      <button
                        onClick={() => {
                          const current = parseFloat(paymentLines[0].amount) || 0;
                          updatePaymentLine(paymentLines[0].id, 'amount', (current + 50).toFixed(currencyDecimals));
                        }}
                        className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                      >
                        + {formatPrice(50, currency)}
                      </button>
                      <button
                        onClick={() => {
                          const current = parseFloat(paymentLines[0].amount) || 0;
                          updatePaymentLine(paymentLines[0].id, 'amount', (current + 100).toFixed(currencyDecimals));
                        }}
                        className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                      >
                        + {formatPrice(100, currency)}
                      </button>
                      <button
                        onClick={() => {
                          const current = parseFloat(paymentLines[0].amount) || 0;
                          updatePaymentLine(paymentLines[0].id, 'amount', (current + 200).toFixed(currencyDecimals));
                        }}
                        className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                      >
                        + {formatPrice(200, currency)}
                      </button>
                      <button
                        onClick={() => {
                          const current = parseFloat(paymentLines[0].amount) || 0;
                          updatePaymentLine(paymentLines[0].id, 'amount', (current + 500).toFixed(currencyDecimals));
                        }}
                        className="p-3 rounded-lg border border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all text-sm font-medium hover:scale-105"
                      >
                        + {formatPrice(500, currency)}
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

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Monto *</label>
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

                          <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Banco/Caja</label>
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

                          {(line.method === 'yape' || line.method === 'plin' || line.method === 'transferencia' || line.method === 'deposito') && (
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">N° de Operación</label>
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">Últimos 4 dígitos</label>
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

                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Referencia (opcional)</label>
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
                    <span className="font-bold text-gray-900">{formatPrice(total, currency)}</span>
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

          {/* Footer Actions */}
          <div className="p-5 border-t-2 border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
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
        </div>
      </div>
    </div>
  );
};
