// src/features/configuration/components/comunes/DefaultSelector.tsx
import { Check, Star } from 'lucide-react';

interface DefaultSelectorProps {
  isDefault: boolean;
  onSetDefault: () => void;
  label?: string;
  disabled?: boolean;
  variant?: 'button' | 'badge' | 'star';
  size?: 'sm' | 'md';
}

export function SelectorPredeterminado({ 
  isDefault, 
  onSetDefault, 
  label = 'Por defecto',
  disabled = false,
  variant = 'button',
  size = 'md'
}: DefaultSelectorProps) {
  
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  if (variant === 'badge') {
    if (!isDefault) return null;
    
    return (
      <span className={`
        inline-flex items-center space-x-1 rounded-md font-medium
        bg-green-50 text-green-700 border border-green-200
        ${sizeClasses[size]}
      `}>
        <Check className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }

  if (variant === 'star') {
    return (
      <button
        type="button"
        onClick={onSetDefault}
        disabled={disabled || isDefault}
        className={`
          p-2 rounded-lg transition-colors
          ${isDefault 
            ? 'text-yellow-600 bg-yellow-50' 
            : disabled
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
          }
        `}
        title={isDefault ? 'Es el predeterminado' : 'Establecer como predeterminado'}
      >
        <Star className={`w-4 h-4 ${isDefault ? 'fill-current' : ''}`} />
      </button>
    );
  }

  // Default button variant
  return (
    <button
      type="button"
      onClick={onSetDefault}
      disabled={disabled || isDefault}
      className={`
        inline-flex items-center space-x-1.5 rounded-md font-medium transition-all duration-200
        ${sizeClasses[size]}
        ${isDefault 
          ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm' 
          : disabled
            ? 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed opacity-50'
            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 hover:shadow-sm'
        }
      `}
      title={isDefault ? 'Ya es el predeterminado' : `Establecer como ${label.toLowerCase()}`}
    >
      <Check className={`w-3 h-3 transition-colors ${isDefault ? 'text-green-600' : 'text-transparent'}`} />
      <span>{label}</span>
      
      {isDefault && (
        <div className="flex">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </button>
  );
}