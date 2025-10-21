// ===================================================================
// HOOK PARA MANEJO DE PAGOS Y CÁLCULOS FINANCIEROS
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import type { CartItem, PaymentTotals, Currency } from '../../../models/comprobante.types';
import { QUICK_PAYMENT_BASE_AMOUNTS } from '../../../models/constants';
import { useCurrency } from './useCurrency';

interface CashBill {
  id: string;
  amount: number;
  quantity: number;
}

export const usePayment = (currency: Currency = 'PEN') => {
  const { formatPrice } = useCurrency();
  
  // Estados existentes
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashBills, setCashBills] = useState<CashBill[]>([]);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');

  // ===================================================================
  // FUNCIONES DE CÁLCULO PRINCIPALES
  // ===================================================================

  /**
   * Función para calcular totales (mejorada con monedas)
   */
  const calculateTotals = useCallback((cartItems: CartItem[]): PaymentTotals => {
    if (!cartItems || cartItems.length === 0) {
      return {
        subtotal: 0,
        igv: 0,
        total: 0,
        currency: currency
      };
    }

    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = item.price * item.quantity;
      // Calcular precio sin IGV según el tipo
      if (item.igvType === 'igv18') {
        return sum + (itemPrice / 1.18);
      } else if (item.igvType === 'igv10') {
        return sum + (itemPrice / 1.10);
      } else {
        // exonerado, inafecto, gratuita
        return sum + itemPrice;
      }
    }, 0);

    const igv = cartItems.reduce((sum, item) => {
      const itemPrice = item.price * item.quantity;
      // Calcular IGV según el tipo
      if (item.igvType === 'igv18') {
        return sum + (itemPrice * 0.18 / 1.18);
      } else if (item.igvType === 'igv10') {
        return sum + (itemPrice * 0.10 / 1.10);
      } else {
        // exonerado, inafecto, gratuita = 0% IGV
        return sum + 0;
      }
    }, 0);

    const total = cartItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      igv: Number(igv.toFixed(2)),
      total: Number(total.toFixed(2)),
      currency: currency
    };
  }, [currency]);

  /**
   * Generar montos de pago rápido basados en el total y moneda
   */
  const getQuickPaymentAmounts = useCallback((total: number): number[] => {
    const baseAmounts = [...QUICK_PAYMENT_BASE_AMOUNTS];
    
    // Agregar el monto exacto al inicio
    const amounts = [total, ...baseAmounts];
    
    // Filtrar duplicados y ordenar
    const uniqueAmounts = Array.from(new Set(amounts))
      .filter(amount => amount >= total)
      .sort((a, b) => a - b)
      .slice(0, 5); // Máximo 5 opciones

    return uniqueAmounts;
  }, []);

  /**
   * Calcular el total recibido
   */
  const getTotalReceived = useCallback((): number => {
    if (customAmount && !isNaN(parseFloat(customAmount))) {
      return parseFloat(customAmount);
    }
    
    return cashBills.reduce((sum, bill) => sum + (bill.amount * bill.quantity), 0);
  }, [cashBills, customAmount]);

  /**
   * Calcular el vuelto
   */
  const calculateChange = useCallback((total: number): number => {
    const received = getTotalReceived();
    return Math.max(0, received - total);
  }, [getTotalReceived]);

  /**
   * Verificar si el pago es suficiente
   */
  const isPaymentSufficient = useCallback((total: number): boolean => {
    return getTotalReceived() >= total;
  }, [getTotalReceived]);

  // ===================================================================
  // FUNCIONES DE BOTONES DE PAGO RÁPIDO
  // ===================================================================

  /**
   * Agregar pago rápido
   */
  const addQuickPayment = useCallback((amount: number) => {
    setCustomAmount(amount.toString());
    setCashBills([]); // Limpiar billetes cuando se usa monto rápido
  }, []);

  /**
   * Establecer monto exacto
   */
  const setExactAmount = useCallback((total: number) => {
    addQuickPayment(total);
  }, [addQuickPayment]);

  /**
   * Limpiar montos recibidos
   */
  const clearReceivedAmount = useCallback(() => {
    setCustomAmount('');
    setCashBills([]);
    setReceivedAmount(0);
  }, []);

  /**
   * Agregar/actualizar billete
   */
  const addCashBill = useCallback((amount: number) => {
    setCashBills(prev => {
      const existingBill = prev.find(bill => bill.amount === amount);
      
      if (existingBill) {
        return prev.map(bill =>
          bill.amount === amount
            ? { ...bill, quantity: bill.quantity + 1 }
            : bill
        );
      } else {
        return [...prev, {
          id: Date.now().toString(),
          amount,
          quantity: 1
        }];
      }
    });
    setCustomAmount(''); // Limpiar monto custom cuando se usan billetes
  }, []);

  /**
   * Remover billete
   */
  const removeCashBill = useCallback((amount: number) => {
    setCashBills(prev => {
      return prev.map(bill =>
        bill.amount === amount && bill.quantity > 0
          ? { ...bill, quantity: bill.quantity - 1 }
          : bill
      ).filter(bill => bill.quantity > 0);
    });
  }, []);

  // ===================================================================
  // FUNCIONES DE GESTIÓN DE ESTADO
  // ===================================================================

  /**
   * Obtener resumen de pago
   */
  const getPaymentSummary = useCallback((total: number) => {
    const received = getTotalReceived();
    const change = calculateChange(total);
    const sufficient = isPaymentSufficient(total);

    return {
      total: Number(total.toFixed(2)),
      received: Number(received.toFixed(2)),
      change: Number(change.toFixed(2)),
      sufficient,
      currency: currency,
      formattedTotal: formatPrice(total, currency),
      formattedReceived: formatPrice(received, currency),
      formattedChange: formatPrice(change, currency)
    };
  }, [getTotalReceived, calculateChange, isPaymentSufficient, currency, formatPrice]);

  /**
   * Formatear montos de pago rápido
   */
  const formatQuickPaymentAmounts = useCallback((total: number) => {
    const amounts = getQuickPaymentAmounts(total);
    return amounts.map(amount => ({
      amount,
      formatted: formatPrice(amount, currency),
      isExact: amount === total
    }));
  }, [getQuickPaymentAmounts, formatPrice, currency]);

  /**
   * Procesar pago
   */
  const processPayment = useCallback(async (
    cartItems: CartItem[],
    tipoComprobante: 'boleta' | 'factura',
    clientData?: any
  ) => {
    const totals = calculateTotals(cartItems);
    const paymentSummary = getPaymentSummary(totals.total);

    if (!paymentSummary.sufficient) {
      throw new Error('Monto insuficiente para completar la venta');
    }

    // Aquí iría la lógica de integración con caja y backend
    const paymentData = {
      cartItems,
      totals,
      paymentSummary,
      tipoComprobante,
      clientData,
      timestamp: new Date().toISOString()
    };

    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Limpiar después del pago exitoso
    clearReceivedAmount();
    setShowPaymentModal(false);

    return paymentData;
  }, [calculateTotals, getPaymentSummary, clearReceivedAmount]);

  // Estados computados
  const paymentMethods = useMemo(() => ({
    cash: {
      name: 'Efectivo',
      bills: cashBills,
      customAmount: customAmount,
      total: getTotalReceived()
    }
  }), [cashBills, customAmount, getTotalReceived]);

  return {
    // Estados
    showPaymentModal,
    setShowPaymentModal,
    cashBills,
    receivedAmount,
    customAmount,
    setCustomAmount,
    paymentMethods,

    // Cálculos
    calculateTotals,
    getTotalReceived,
    calculateChange,
    isPaymentSufficient,
    getPaymentSummary,

    // Acciones de pago rápido
    addQuickPayment,
    setExactAmount,
    getQuickPaymentAmounts,
    formatQuickPaymentAmounts,

    // Manejo de billetes
    addCashBill,
    removeCashBill,

    // Utilidades
    clearReceivedAmount,
    processPayment
  };
};