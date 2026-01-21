import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

/**
 * Switch Component - Toggle interactivo
 * 
 * @example
 * // Básico
 * <Switch checked={value} onChange={setValue} />
 * 
 * @example
 * // Con label
 * <Switch checked={value} onChange={setValue} label="Activar notificaciones" />
 * 
 * @example
 * // Diferentes tamaños
 * <Switch checked={value} onChange={setValue} size="sm" />
 * <Switch checked={value} onChange={setValue} size="md" />
 * <Switch checked={value} onChange={setValue} size="lg" />
 * 
 * @example
 * // Deshabilitado
 * <Switch checked={value} onChange={setValue} disabled />
 */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
  id
}) => {
  // Clases según tamaño del track
  const trackSizeClasses = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-14'
  };

  // Clases según tamaño del thumb
  const thumbSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  // Posición del thumb según estado y tamaño
  const thumbPositionClasses = {
    sm: checked ? 'translate-x-5' : 'translate-x-1',
    md: checked ? 'translate-x-6' : 'translate-x-1',
    lg: checked ? 'translate-x-8' : 'translate-x-1'
  };

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label && id ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex ${trackSizeClasses[size]} items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-success' : 'bg-surface-2'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block ${thumbSizeClasses[size]} transform rounded-full bg-surface-1 shadow-sm transition-transform
            ${thumbPositionClasses[size]}
          `}
        />
      </button>
      {label && (
        <label
          id={id ? `${id}-label` : undefined}
          htmlFor={id}
          className={`text-ui-sm font-medium text-primary ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
          onClick={!disabled ? handleClick : undefined}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Switch;
