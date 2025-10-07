import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

// Hook consolidado para manejar el estado del comprobante
export const useComprobanteState = () => {
  // Obtener formas de pago desde ConfigurationContext
  const { state } = useConfigurationContext();
  const { paymentMethods } = state;
  
  // Obtener el primer método de pago activo (o 'pm-efectivo' por defecto)
  const defaultPaymentMethod = useMemo(() => {
    // Verificar si hay una forma de pago recién creada en sessionStorage
    const lastCreatedId = sessionStorage.getItem('lastCreatedPaymentMethod');
    if (lastCreatedId) {
      const lastCreated = paymentMethods.find(pm => pm.id === lastCreatedId && pm.isActive);
      if (lastCreated) {
        // Limpiar el sessionStorage después de usarlo
        sessionStorage.removeItem('lastCreatedPaymentMethod');
        return lastCreated.id;
      }
    }
    
    // Si no hay forma recién creada, usar el método por defecto
    const activePaymentMethods = paymentMethods.filter(pm => pm.isActive);
    if (activePaymentMethods.length > 0) {
      // Buscar el método por defecto o el primero
      const defaultPm = activePaymentMethods.find(pm => pm.isDefault) || activePaymentMethods[0];
      return defaultPm.id;
    }
    return 'pm-efectivo'; // Fallback
  }, [paymentMethods]);
  
  // UI State
  const [viewMode, setViewMode] = useState<'form' | 'pos'>('form');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [notaInterna, setNotaInterna] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [formaPago, setFormaPago] = useState(defaultPaymentMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Actualizar formaPago cuando cambie defaultPaymentMethod (ej: después de crear una nueva)
  useEffect(() => {
    setFormaPago(defaultPaymentMethod);
  }, [defaultPaymentMethod]);

  // Navigation and external state
  const navigate = useNavigate();
  const { status: cajaStatus } = useCaja();

  // Computed states
  const isCajaOpen = useMemo(() => cajaStatus !== 'cerrada', [cajaStatus]);
  const canProcess = useMemo(() => !isProcessing && isCajaOpen, [isProcessing, isCajaOpen]);

  // Convertir forma de pago a formato para mostrar usando el contexto
  const getPaymentMethodLabel = useCallback((formaPagoId: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.id === formaPagoId);
    if (paymentMethod) {
      return paymentMethod.name.toUpperCase();
    }
    // Fallback para compatibilidad con valores antiguos
    const legacyPaymentMethods: { [key: string]: string } = {
      'contado': 'CONTADO',
      'deposito': 'DEPÓSITO EN CUENTA',
      'efectivo': 'EFECTIVO',
      'plin': 'PLIN',
      'tarjeta': 'TARJETA',
      'transferencia': 'TRANSFERENCIA',
      'yape': 'YAPE'
    };
    return legacyPaymentMethods[formaPagoId] || 'CONTADO';
  }, [paymentMethods]);

  // Reset form state
  const resetForm = useCallback(() => {
    setObservaciones('');
    setNotaInterna('');
    setReceivedAmount('');
    setFormaPago(defaultPaymentMethod);
    setShowOptionalFields(false);
  }, [defaultPaymentMethod]);

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