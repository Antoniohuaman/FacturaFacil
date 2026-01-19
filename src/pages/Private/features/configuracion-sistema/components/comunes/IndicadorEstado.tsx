// src/features/configuration/components/comunes/StatusIndicator.tsx
import { CheckCircle, XCircle, Clock, Info, AlertTriangle } from 'lucide-react';

type Status = 'success' | 'warning' | 'error' | 'pending' | 'info';

interface StatusIndicatorProps {
  status: Status;
  label: string;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'soft';
  pulse?: boolean;
}

export function StatusIndicator({ 
  status, 
  label, 
  showIcon = true, 
  size = 'sm',
  variant = 'soft',
  pulse = false
}: StatusIndicatorProps) {
  
  const icons = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle,
    pending: Clock,
    info: Info
  };

  const baseStyles = {
    success: {
      solid: 'bg-green-600 text-white',
      outline: 'bg-white text-green-700 border-green-300',
      soft: 'bg-green-50 text-green-700 border-green-200'
    },
    warning: {
      solid: 'bg-yellow-600 text-white',
      outline: 'bg-white text-yellow-700 border-yellow-300',
      soft: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    error: {
      solid: 'bg-red-600 text-white',
      outline: 'bg-white text-red-700 border-red-300',
      soft: 'bg-red-50 text-red-700 border-red-200'
    },
    pending: {
      solid: 'bg-gray-600 text-white',
      outline: 'bg-white text-gray-700 border-gray-300',
      soft: 'bg-gray-50 text-gray-700 border-gray-200'
    },
    info: {
      solid: 'bg-blue-600 text-white',
      outline: 'bg-white text-blue-700 border-blue-300',
      soft: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  };

  const iconStyles = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    pending: 'text-gray-600',
    info: 'text-blue-600'
  };

  const sizeClasses = {
    xs: {
      container: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3'
    },
    sm: {
      container: 'px-2.5 py-1 text-xs',
      icon: 'w-3 h-3'
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4'
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'w-5 h-5'
    }
  };

  const Icon = icons[status];
  const currentSize = sizeClasses[size];
  const currentStyle = baseStyles[status][variant];

  return (
    <div className={`
      inline-flex items-center space-x-1 rounded-full border font-medium
      ${currentStyle} ${currentSize.container}
      ${pulse ? 'animate-pulse' : ''}
      transition-all duration-200
    `}>
      {showIcon && (
        <Icon 
          className={`
            ${currentSize.icon} 
            ${variant === 'solid' ? 'text-current' : iconStyles[status]}
            ${status === 'pending' ? 'animate-spin' : ''}
          `} 
        />
      )}
      <span className="select-none">{label}</span>
    </div>
  );
}