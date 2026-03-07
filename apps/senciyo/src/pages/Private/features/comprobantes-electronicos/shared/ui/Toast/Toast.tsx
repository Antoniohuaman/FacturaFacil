// ===================================================================
// COMPONENTE TOAST DE NOTIFICACIONES
// ===================================================================

import React from 'react';
import { CheckCircle, X, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  // Estado de visibilidad
  show: boolean;
  onClose: () => void;
  
  // Contenido del toast
  message: string;
  type?: ToastType;
  
  // Configuración opcional
  autoClose?: boolean;
  autoCloseDelay?: number;
  showCloseButton?: boolean;
  position?: 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';
}

export const Toast: React.FC<ToastProps> = ({
  show,
  onClose,
  message,
  type = 'success',
  autoClose = true,
  autoCloseDelay = 2500,
  showCloseButton = true,
  position = 'top-center'
}) => {
  
  // ===================================================================
  // CONFIGURACIÓN POR TIPO DE TOAST
  // ===================================================================

  const getToastConfig = (toastType: ToastType) => {
    switch (toastType) {
      case 'success':
        return {
          bgColor: 'bg-green-600',
          textColor: 'text-white',
          icon: CheckCircle
        };
      case 'error':
        return {
          bgColor: 'bg-red-600',
          textColor: 'text-white',
          icon: AlertCircle
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-600',
          textColor: 'text-white',
          icon: AlertTriangle
        };
      case 'info':
        return {
          bgColor: 'bg-blue-600',
          textColor: 'text-white',
          icon: Info
        };
      default:
        return {
          bgColor: 'bg-green-600',
          textColor: 'text-white',
          icon: CheckCircle
        };
    }
  };

  const getPositionClasses = (pos: string) => {
    switch (pos) {
      case 'top-center':
        return 'top-6 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-6 right-6';
      case 'bottom-center':
        return 'bottom-6 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-6 right-6';
      default:
        return 'top-6 left-1/2 transform -translate-x-1/2';
    }
  };

  // ===================================================================
  // AUTO-CLOSE EFFECT
  // ===================================================================

  React.useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoClose, autoCloseDelay, onClose]);

  // ===================================================================
  // CONFIGURACIÓN DEL TOAST
  // ===================================================================

  const config = getToastConfig(type);
  const IconComponent = config.icon;
  const positionClasses = getPositionClasses(position);

  // ===================================================================
  // RENDERIZADO
  // ===================================================================

  if (!show) return null;

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      <div className={`${config.bgColor} ${config.textColor} px-6 py-3 rounded shadow-lg flex items-center space-x-2 animate-fade-in`}>
        {/* Icono */}
        <IconComponent 
          className="w-5 h-5 flex-shrink-0" 
          strokeWidth={2}
        />
        
        {/* Mensaje */}
        <span className="flex-1">{message}</span>
        
        {/* Botón de cerrar */}
        {showCloseButton && (
          <button 
            className={`ml-4 ${config.textColor}/80 hover:${config.textColor} transition-colors`}
            onClick={onClose}
            title="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ===================================================================
// COMPONENTE ESPECÍFICO PARA BORRADOR GUARDADO
// ===================================================================

export interface DraftToastProps {
  show: boolean;
  onClose: () => void;
  message?: string;
}

export const DraftToast: React.FC<DraftToastProps> = ({
  show,
  onClose,
  message = 'Borrador guardado exitosamente'
}) => {
  return (
    <Toast
      show={show}
      onClose={onClose}
      message={message}
      type="success"
      autoClose={true}
      autoCloseDelay={2500}
      showCloseButton={true}
      position="top-center"
    />
  );
};