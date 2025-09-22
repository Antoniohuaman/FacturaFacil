// ===================================================================
// HOOK PARA MANEJO DE PAGOS Y CÁLCULOS FINANCIEROS
// ===================================================================

import { useState, useCallback } from 'react';
import type { CartItem, PaymentTotals } from '../models/comprobante.types';
import { QUICK_PAYMENT_BASE_AMOUNTS, SYSTEM_CONFIG } from '../models/constants';

export interface UsePaymentReturn {
  // Estados de pago
  cashBills: number[];
  receivedAmount: string;
  customAmount: string;
  showPaymentModal: boolean;
  
  // Funciones de pago
  setCashBills: (bills: number[] | ((prev: number[]) => number[])) => void;
  setReceivedAmount: (amount: string | ((prev: string) => string)) => void;
  setCustomAmount: (amount: string) => void;
  setShowPaymentModal: (show: boolean) => void;
  clearPaymentData: () => void;
  
  // Funciones de cálculo
  calculateTotals: (cartItems: CartItem[]) => PaymentTotals;
  calculateChange: (total: number) => number;
  getQuickPaymentAmounts: (total: number) => number[];
  getTotalReceived: () => number;
  
  // Funciones de botones de pago rápido
  addQuickPayment: (amount: number) => void;
  setExactAmount: (amount: number) => void;
  clearReceivedAmount: () => void;
  addToReceivedAmount: (amount: number) => void;
  
  // Estados calculados
  isPaymentSufficient: (total: number) => boolean;
  paymentSummary: (total: number) => {
    amountToPay: number;
    amountReceived: number;
    change: number;
    isExact: boolean;
    isSufficient: boolean;
  };
}

export const usePayment = (): UsePaymentReturn => {
  // ===================================================================
  // ESTADOS DE PAGO
  // ===================================================================
  const [cashBills, setCashBills] = useState<number[]>([]);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // ===================================================================
  // FUNCIONES DE CÁLCULO PRINCIPALES
  // ===================================================================

  /**
   * Calcular totales financieros del carrito
   * Mantiene exactamente la misma lógica del archivo original
   */
  const calculateTotals = useCallback((cartItems: CartItem[]): PaymentTotals => {
    // Calcula usando el IGV actual de cada producto
    const subtotal = cartItems.reduce((sum, item) => {
      const igvPercent = item.igv !== undefined ? item.igv : SYSTEM_CONFIG.DEFAULT_IGV_PERCENT;
      return sum + (item.price * item.quantity) / (1 + igvPercent / 100);
    }, 0);
    
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const igv = total - subtotal;
    
    return { subtotal, igv, total };
  }, []);

  /**
   * Obtener montos de pago rápido
   * Incluye el total como primer elemento + montos base
   */
  const getQuickPaymentAmounts = useCallback((total: number): number[] => {
    return [total, ...QUICK_PAYMENT_BASE_AMOUNTS];
  }, []);

  /**
   * Calcular total recibido
   * Suma billetes seleccionados o monto manual
   */
  const getTotalReceived = useCallback((): number => {
    const fromBills = cashBills.reduce((sum, bill) => sum + bill, 0);
    const fromInput = parseFloat(receivedAmount || customAmount) || 0;
    return fromBills || fromInput;
  }, [cashBills, receivedAmount, customAmount]);

  /**
   * Calcular vuelto
   * Mantiene exactamente la misma lógica del archivo original
   */
  const calculateChange = useCallback((total: number): number => {
    const received = getTotalReceived();
    return received - total;
  }, [getTotalReceived]);

  // ===================================================================
  // FUNCIONES DE BOTONES DE PAGO RÁPIDO
  // ===================================================================

  /**
   * Agregar monto a billetes seleccionados
   */
  const addQuickPayment = useCallback((amount: number) => {
    setCashBills(prev => [...prev, amount]);
    // Limpiar input manual al usar botones
    setReceivedAmount('');
    setCustomAmount('');
  }, []);

  /**
   * Establecer monto exacto (para botón de total exacto)
   */
  const setExactAmount = useCallback((amount: number) => {
    setCashBills([amount]);
    setReceivedAmount('');
    setCustomAmount('');
  }, []);

  /**
   * Limpiar monto recibido
   */
  const clearReceivedAmount = useCallback(() => {
    setReceivedAmount('0');
    setCashBills([]);
    setCustomAmount('');
  }, []);

  /**
   * Agregar cantidad al monto recibido
   * Mantiene exactamente la misma lógica del archivo original
   */
  const addToReceivedAmount = useCallback((amount: number) => {
    setReceivedAmount(prev => ((parseFloat(prev) || 0) + amount).toFixed(2));
    setCashBills([]);
  }, []);

  // ===================================================================
  // FUNCIONES DE GESTIÓN DE ESTADO
  // ===================================================================

  /**
   * Limpiar todos los datos de pago
   */
  const clearPaymentData = useCallback(() => {
    setCashBills([]);
    setReceivedAmount('');
    setCustomAmount('');
    setShowPaymentModal(false);
  }, []);

  // ===================================================================
  // FUNCIONES DE VALIDACIÓN
  // ===================================================================

  /**
   * Verificar si el pago es suficiente
   */
  const isPaymentSufficient = useCallback((total: number): boolean => {
    return getTotalReceived() >= total;
  }, [getTotalReceived]);

  // ===================================================================
  // RESUMEN DE PAGO CALCULADO
  // ===================================================================

  /**
   * Generar resumen completo del pago
   */
  const paymentSummary = useCallback((total: number) => {
    const amountReceived = getTotalReceived();
    const change = amountReceived - total;
    
    return {
      amountToPay: total,
      amountReceived,
      change,
      isExact: Math.abs(change) < 0.01, // Considerando precision de centavos
      isSufficient: amountReceived >= total
    };
  }, [getTotalReceived]);

  // ===================================================================
  // RETORNO DEL HOOK
  // ===================================================================
  return {
    // Estados
    cashBills,
    receivedAmount,
    customAmount,
    showPaymentModal,
    
    // Setters
    setCashBills,
    setReceivedAmount,
    setCustomAmount,
    setShowPaymentModal,
    clearPaymentData,
    
    // Funciones de cálculo
    calculateTotals,
    calculateChange,
    getQuickPaymentAmounts,
    getTotalReceived,
    
    // Funciones de pago rápido
    addQuickPayment,
    setExactAmount,
    clearReceivedAmount,
    addToReceivedAmount,
    
    // Validaciones
    isPaymentSufficient,
    paymentSummary,
  };
};