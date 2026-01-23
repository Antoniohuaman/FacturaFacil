import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Toast } from './types';

interface ToastNotificationsProps {
  toasts: Toast[];
}

export function ToastNotifications({ toasts }: ToastNotificationsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${
            toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
