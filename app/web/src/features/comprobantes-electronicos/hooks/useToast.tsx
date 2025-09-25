import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      duration: 4000,
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string, action?: ToastMessage['action']) => {
    return showToast({ type: 'success', title, message, action });
  }, [showToast]);

  const error = useCallback((title: string, message?: string, action?: ToastMessage['action']) => {
    return showToast({ type: 'error', title, message, action, duration: 6000 });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string, action?: ToastMessage['action']) => {
    return showToast({ type: 'warning', title, message, action });
  }, [showToast]);

  const info = useCallback((title: string, message?: string, action?: ToastMessage['action']) => {
    return showToast({ type: 'info', title, message, action });
  }, [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
};