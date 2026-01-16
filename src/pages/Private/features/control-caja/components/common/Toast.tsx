import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      title: 'text-green-900',
      message: 'text-green-700',
      close: 'text-green-600 hover:text-green-800'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      title: 'text-red-900',
      message: 'text-red-700',
      close: 'text-red-600 hover:text-red-800'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      title: 'text-yellow-900',
      message: 'text-yellow-700',
      close: 'text-yellow-600 hover:text-yellow-800'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      title: 'text-blue-900',
      message: 'text-blue-700',
      close: 'text-blue-600 hover:text-blue-800'
    }
  };

  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <div className={`${colorScheme.bg} ${colorScheme.border} border rounded-lg shadow-lg p-4 mb-3 animate-slideInRight`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${colorScheme.title}`}>{title}</h4>
          <p className={`text-sm ${colorScheme.message} mt-1`}>{message}</p>
        </div>
        <button
          onClick={() => onClose(id)}
          className={`${colorScheme.close} transition-colors flex-shrink-0`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  // ✅ FIX: Portal local para evitar insertBefore errors durante navegación
  return createPortal(
    <div
      data-app-toast-portal
      className="fixed top-4 right-4 z-50 w-full max-w-sm pointer-events-none print:hidden"
    >
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </div>
    </div>,
    document.body
  );
}
