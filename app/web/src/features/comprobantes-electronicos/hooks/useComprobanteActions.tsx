import { useCallback } from 'react';
import type { CartItem } from '../models/comprobante.types';
import { useToast } from './useToast';

interface ComprobanteData {
  tipoComprobante: string;
  serieSeleccionada: string;
  cartItems: CartItem[];
  totals: {
    subtotal: number;
    igv: number;
    total: number;
  };
  observaciones?: string;
  notaInterna?: string;
  formaPago?: string;
}

export const useComprobanteActions = () => {
  const toast = useToast();

  // Validar datos del comprobante
  const validateComprobanteData = useCallback((data: ComprobanteData): boolean => {
    if (!data.cartItems || data.cartItems.length === 0) {
      toast.error(
        'Productos requeridos',
        'Debe agregar al menos un producto al comprobante',
        {
          label: 'Agregar productos',
          onClick: () => {
            // Focus en el buscador de productos
            const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
            searchInput?.focus();
          }
        }
      );
      return false;
    }

    if (!data.tipoComprobante) {
      toast.error(
        'Tipo de comprobante requerido',
        'Debe seleccionar un tipo de comprobante'
      );
      return false;
    }

    if (!data.serieSeleccionada) {
      toast.error(
        'Serie requerida',
        'Debe seleccionar una serie para el comprobante'
      );
      return false;
    }

    if (data.totals.total <= 0) {
      toast.error(
        'Total inválido',
        'El total del comprobante debe ser mayor a cero'
      );
      return false;
    }

    return true;
  }, [toast]);

  // Crear comprobante
  const createComprobante = useCallback(async (data: ComprobanteData): Promise<boolean> => {
    try {
      // Validar datos
      if (!validateComprobanteData(data)) {
        return false;
      }

      // Simular loading
      toast.info('Procesando...', 'Creando comprobante electrónico');

      // Simular llamada API
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simular respuesta exitosa
      const numeroComprobante = `${data.serieSeleccionada}-${String(Math.floor(Math.random() * 10000)).padStart(8, '0')}`;

      toast.success(
        '¡Comprobante creado!',
        `${data.tipoComprobante} ${numeroComprobante} generado exitosamente`,
        {
          label: 'Ver comprobante',
          onClick: () => {
            // Aquí iría la navegación al detalle del comprobante
            console.log('Navegando a comprobante:', numeroComprobante);
          }
        }
      );

      return true;

    } catch (error) {
      console.error('Error creating comprobante:', error);

      toast.error(
        'Error al crear comprobante',
        'Ocurrió un error inesperado. Por favor, inténtelo nuevamente.',
        {
          label: 'Reintentar',
          onClick: () => createComprobante(data)
        }
      );

      return false;
    }
  }, [toast, validateComprobanteData]);

  // Guardar borrador
  const saveDraft = useCallback(async (data: ComprobanteData, expiryDate?: Date): Promise<boolean> => {
    try {
      if (data.cartItems.length === 0) {
        toast.warning(
          'Borrador vacío',
          'No hay productos para guardar en el borrador'
        );
        return false;
      }

      toast.info('Guardando...', 'Guardando borrador del comprobante');

      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Guardar en localStorage (simulación)
      const draftId = `draft_${Date.now()}`;
      const draftData = {
        id: draftId,
        ...data,
        createdAt: new Date().toISOString(),
        expiryDate: expiryDate?.toISOString(),
      };

      const existingDrafts = JSON.parse(localStorage.getItem('comprobante_drafts') || '[]');
      existingDrafts.push(draftData);
      localStorage.setItem('comprobante_drafts', JSON.stringify(existingDrafts));

      toast.success(
        'Borrador guardado',
        `Se guardó el borrador con ${data.cartItems.length} producto${data.cartItems.length > 1 ? 's' : ''}`,
        {
          label: 'Ver borradores',
          onClick: () => {
            // Aquí iría la navegación a la lista de borradores
            console.log('Navegando a borradores');
          }
        }
      );

      return true;

    } catch (error) {
      console.error('Error saving draft:', error);

      toast.error(
        'Error al guardar',
        'No se pudo guardar el borrador. Inténtelo nuevamente.'
      );

      return false;
    }
  }, [toast]);

  // Procesar pago
  const processPayment = useCallback(async (
    paymentData: {
      amount: number;
      method: string;
      receivedAmount?: number;
    },
    comprobanteData: ComprobanteData
  ): Promise<boolean> => {
    try {
      // Validar monto
      if (paymentData.amount <= 0) {
        toast.error('Monto inválido', 'El monto a pagar debe ser mayor a cero');
        return false;
      }

      // Validar efectivo recibido si es necesario
      if (paymentData.method === 'efectivo' && paymentData.receivedAmount) {
        if (paymentData.receivedAmount < paymentData.amount) {
          toast.error(
            'Efectivo insuficiente',
            `Se necesita S/ ${paymentData.amount.toFixed(2)} pero solo se recibió S/ ${paymentData.receivedAmount.toFixed(2)}`
          );
          return false;
        }
      }

      toast.info('Procesando pago...', 'Validando método de pago y generando comprobante');

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Crear comprobante después del pago exitoso
      const success = await createComprobante(comprobanteData);

      if (success) {
        // Mostrar información adicional del pago
        const change = paymentData.receivedAmount && paymentData.receivedAmount > paymentData.amount
          ? paymentData.receivedAmount - paymentData.amount
          : 0;

        if (change > 0) {
          toast.info(
            'Vuelto',
            `Entregar S/ ${change.toFixed(2)} de vuelto`,
            {
              label: 'Entregado',
              onClick: () => toast.success('Vuelto entregado', 'Transacción completada')
            }
          );
        }
      }

      return success;

    } catch (error) {
      console.error('Error processing payment:', error);

      toast.error(
        'Error en el pago',
        'No se pudo procesar el pago. Verifique la información e inténtelo nuevamente.'
      );

      return false;
    }
  }, [toast, createComprobante]);

  return {
    // Actions
    createComprobante,
    saveDraft,
    processPayment,
    validateComprobanteData,

    // Toast utilities
    ...toast,
  };
};