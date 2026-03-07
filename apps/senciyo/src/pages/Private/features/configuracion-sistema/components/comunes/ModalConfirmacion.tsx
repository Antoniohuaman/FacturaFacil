// src/features/configuration/components/comunes/ConfirmationModal.tsx
import { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'warning' | 'danger' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ModalConfirmacion({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  showCloseButton = true,
  size = 'md'
}: ConfirmationModalProps) {
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, isLoading, onClose]);

  const icons = {
    warning: AlertTriangle,
    danger: XCircle,
    info: Info,
    success: CheckCircle
  };

  const iconStyles = {
    warning: 'text-yellow-600 bg-yellow-100',
    danger: 'text-red-600 bg-red-100',
    info: 'text-blue-600 bg-blue-100',
    success: 'text-green-600 bg-green-100'
  };

  const buttonStyles = {
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
  };

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg'
  };

  if (!isOpen) return null;

  const Icon = icons[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={!isLoading ? onClose : undefined}
        />
        
        {/* Modal */}
        <div className={`
          relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all
          w-full ${sizeClasses[size]} sm:my-8
        `}>
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="bg-white px-6 py-6">
            <div className="sm:flex sm:items-start">
              {/* Icon */}
              <div className={`
                mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10
                ${iconStyles[type]}
              `}>
                <Icon className="h-6 w-6" />
              </div>

              {/* Content */}
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3 className="text-lg font-semibold leading-6 text-gray-900 pr-8">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`
                inline-flex w-full justify-center items-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm
                sm:ml-3 sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${buttonStyles[type]}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="
                mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300
                hover:bg-gray-50 sm:mt-0 sm:w-auto transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}