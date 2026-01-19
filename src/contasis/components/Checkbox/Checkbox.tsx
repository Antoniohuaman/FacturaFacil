import React, { forwardRef, InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';

/**
 * Checkbox Props
 * @property {boolean} checked - Estado checked del checkbox
 * @property {boolean} indeterminate - Estado indeterminado (para selecciones parciales)
 * @property {string} label - Texto del label (opcional para tables)
 * @property {string} helperText - Texto de ayuda debajo del checkbox
 * @property {'default' | 'error' | 'success'} variant - Variante semántica
 * @property {'sm' | 'md'} size - Tamaño del checkbox (sm: 16px, md: 20px)
 * @property {boolean} disabled - Estado deshabilitado
 */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  checked?: boolean;
  indeterminate?: boolean;
  label?: string;
  helperText?: string;
  variant?: 'default' | 'error' | 'success';
  size?: 'sm' | 'md';
  disabled?: boolean;
}

/**
 * Checkbox Component - Contasis Design System
 * 
 * Componente de checkbox siguiendo los tokens del Contasis Design System:
 * - Tamaño: 16px × 16px (sm) | 20px × 20px (md, default)
 * - Border-radius: 4px
 * - Color primary: #0050CB
 * - Font: Inter Medium (500) 14px
 * - Iconos: Lucide React (Check, Minus)
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      indeterminate = false,
      label,
      helperText,
      variant = 'default',
      size = 'md',
      disabled = false,
      className = '',
      onChange,
      ...props
    },
    ref
  ) => {
    // Estado interno del checkbox para indeterminate
    const checkboxRef = React.useRef<HTMLInputElement>(null);
    
    React.useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    // Merge refs
    React.useImperativeHandle(ref, () => checkboxRef.current as HTMLInputElement);

    // Clases base del checkbox visual
    const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    const iconSize = size === 'sm' ? 10 : 12;
    
    const baseClasses = `
      relative inline-flex items-center justify-center
      ${sizeClasses}
      border-2 rounded
      transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
      cursor-pointer
      flex-shrink-0
    `.trim().replace(/\s+/g, ' ');

    // Clases según estado y variante
    const getCheckboxClasses = () => {
      if (disabled) {
        return `${baseClasses} opacity-50 cursor-not-allowed border-strong bg-surface-0`;
      }

      if (checked || indeterminate) {
        switch (variant) {
          case 'error':
            return `${baseClasses} bg-error border-error`;
          case 'success':
            return `${baseClasses} bg-success border-success`;
          default:
            return `${baseClasses} bg-brand border-brand`;
        }
      }

      // Estado no checkeado
      switch (variant) {
        case 'error':
          return `${baseClasses} border-error bg-surface-0`;
        case 'success':
          return `${baseClasses} border-success bg-surface-0`;
        default:
          return `${baseClasses} border-strong bg-surface-0 hover:border-brand`;
      }
    };

    // Clases del label (mismo estilo que RadioButton)
    const labelClasses = variant === 'error' 
      ? 'text-ui-base font-medium text-error cursor-pointer' 
      : variant === 'success'
      ? 'text-ui-base font-medium text-success cursor-pointer'
      : 'text-ui-base font-medium text-tertiary cursor-pointer';

    // Clases del helper text
    const helperTextClasses = variant === 'error' 
      ? 'text-ui-sm font-normal text-error mt-1 leading-[1.4]'
      : variant === 'success'
      ? 'text-ui-sm font-normal text-success mt-1 leading-[1.4]'
      : 'text-ui-sm font-normal text-tertiary mt-1 leading-[1.4]';

    return (
      <div className={className}>
        <label className="flex items-center cursor-pointer">
          {/* Input hidden (mantiene funcionalidad nativa) */}
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="sr-only"
            {...props}
          />

          {/* Checkbox visual - tamaño fijo */}
          <span className={getCheckboxClasses()}>
            {indeterminate ? (
              <Minus size={iconSize} strokeWidth={2} className="text-white" />
            ) : checked ? (
              <Check size={iconSize} strokeWidth={2} className="text-white" />
            ) : null}
          </span>

          {/* Label con margen fijo */}
          {label && <span className={`${labelClasses} ml-2`}>{label}</span>}
        </label>

        {/* Helper text */}
        {helperText && (
          <div className={helperTextClasses}>
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
