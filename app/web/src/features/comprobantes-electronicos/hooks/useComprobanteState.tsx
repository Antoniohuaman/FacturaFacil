import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCaja } from '../../control-caja/context/CajaContext';

// Hook consolidado para manejar el estado del comprobante
export const useComprobanteState = () => {
  // UI State
  const [viewMode, setViewMode] = useState<'form' | 'pos'>('form');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [notaInterna, setNotaInterna] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [formaPago, setFormaPago] = useState('contado');
  const [isProcessing, setIsProcessing] = useState(false);

  // Navigation and external state
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();

  // Computed states
  const isCajaOpen = useMemo(() => cajaStatus !== 'cerrada', [cajaStatus]);
  const canProcess = useMemo(() => !isProcessing && isCajaOpen, [isProcessing, isCajaOpen]);

  // Convertir forma de pago a formato para mostrar
  const getPaymentMethodLabel = useCallback((formaPago: string) => {
    const paymentMethods: { [key: string]: string } = {
      'contado': 'CONTADO',
      'deposito': 'DEPÓSITO EN CUENTA',
      'efectivo': 'EFECTIVO',
      'plin': 'PLIN',
      'tarjeta': 'TARJETA',
      'transferencia': 'TRANSFERENCIA',
      'yape': 'YAPE'
    };
    return paymentMethods[formaPago] || 'CONTADO';
  }, []);

  // Reset form state
  const resetForm = useCallback(() => {
    setObservaciones('');
    setNotaInterna('');
    setReceivedAmount('');
    setFormaPago('contado');
    setShowOptionalFields(false);
  }, []);

  // Navigation handlers
  const goToComprobantes = useCallback(() => {
    navigate('/comprobantes');
  }, [navigate]);

  const goToNuevoComprobante = useCallback(() => {
    navigate('/comprobantes/nuevo');
  }, [navigate]);

  return {
    // UI State
    viewMode,
    setViewMode,
    showOptionalFields,
    setShowOptionalFields,
    observaciones,
    setObservaciones,
    notaInterna,
    setNotaInterna,
    receivedAmount,
    setReceivedAmount,
    formaPago,
    setFormaPago,
    isProcessing,
    setIsProcessing,

    // Computed
    isCajaOpen,
    canProcess,
    cajaStatus,

    // Utilities
    getPaymentMethodLabel,
    resetForm,
    goToComprobantes,
    goToNuevoComprobante,
  };
};