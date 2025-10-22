// ===================================================================
// HOOK PARA MANEJO GLOBAL DE TOASTS
// ===================================================================

import { useState, useCallback } from 'react';
import type { ToastMessage } from './ToastContainer';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /**
   * Agregar un nuevo toast
   */
  const addToast = useCallback((
    type: ToastMessage['type'],
    title: string,
    message: string,
    options?: {
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: options?.duration || 4000,
      action: options?.action
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remover después de la duración especificada
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  /**
   * Remover un toast específico
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  /**
   * Limpiar todos los toasts
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  /**
   * Helpers para tipos específicos de toast
   */
  const success = useCallback((title: string, message: string, options?: Parameters<typeof addToast>[3]) => {
    return addToast('success', title, message, options);
  }, [addToast]);

  const error = useCallback((title: string, message: string, options?: Parameters<typeof addToast>[3]) => {
    return addToast('error', title, message, options);
  }, [addToast]);

  const warning = useCallback((title: string, message: string, options?: Parameters<typeof addToast>[3]) => {
    return addToast('warning', title, message, options);
  }, [addToast]);

  const info = useCallback((title: string, message: string, options?: Parameters<typeof addToast>[3]) => {
    return addToast('info', title, message, options);
  }, [addToast]);

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast,
    clearToasts
  };
};
