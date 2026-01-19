import React, { forwardRef, InputHTMLAttributes } from 'react';

/**
 * RadioButton Props
 * @property {boolean} checked - Estado checked del radio button
 * @property {string} label - Texto del label
 * @property {string} helperText - Texto de ayuda debajo del radio button
 * @property {string} name - Nombre del grupo de radios (requerido para agrupar)
 * @property {string | number} value - Valor del radio button
 * @property {boolean} disabled - Estado deshabilitado
 */
export interface RadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean;
  label?: string;
  helperText?: string;
  name: string;
  value: string | number;
  disabled?: boolean;
}

/**
 * RadioButton Component - Contasis Design System
 * 
 * Componente de radio button siguiendo los tokens del Contasis Design System:
 * - Tamaño: 20px × 20px (circular)
 * - Dot interno: 10px × 10px
 * - Color primary: #0050CB
 * - Font: Inter Medium (500) 14px
 */
export const RadioButton = forwardRef<HTMLInputElement, RadioButtonProps>(
  (
    {
      checked,
      label,
      helperText,
      name,
      value,
      disabled = false,
      className = '',
      onChange,
      ...props
    },
    ref
  ) => {
    // Clases base del radio visual
    const baseClasses = `
      relative inline-flex items-center justify-center
      w-5 h-5 
      border-2 rounded-full
      transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
      flex-shrink-0
      bg-surface-0
    `.trim().replace(/\s+/g, ' ');

    // Clases según estado
    const getRadioClasses = () => {
      if (disabled) {
        return `${baseClasses} opacity-50 cursor-not-allowed border-strong`;
      }

      if (checked) {
        return `${baseClasses} border-brand hover:shadow-[0_0_0_4px_rgba(0,80,203,0.08)]`;
      }

      return `${baseClasses} border-strong hover:border-brand hover:shadow-[0_0_0_4px_rgba(0,80,203,0.08)]`;
    };

    // Clases del dot interno
    const dotClasses = `
      absolute w-2.5 h-2.5 rounded-full
      transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]
      ${checked ? 'scale-100 bg-brand' : 'scale-0 bg-transparent'}
      ${!disabled && checked ? 'group-hover:bg-brand-hover' : ''}
    `.trim().replace(/\s+/g, ' ');

    // Clases del label
    const labelClasses = `
      font-sans text-ui-base font-medium text-tertiary
      select-none
    `.trim().replace(/\s+/g, ' ');

    // Clases del helper text
    const helperTextClasses = `
      text-ui-sm font-normal text-secondary mt-1 leading-[1.4]
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className={className}>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none group">
          {/* Input hidden (mantiene funcionalidad nativa) */}
          <input
            ref={ref}
            type="radio"
            name={name}
            value={value}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="absolute opacity-0 w-0 h-0"
            {...props}
          />

          {/* Radio visual */}
          <span className={getRadioClasses()}>
            {/* Dot interno */}
            <span className={dotClasses} />
          </span>

          {/* Label */}
          {label && <span className={labelClasses}>{label}</span>}
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

RadioButton.displayName = 'RadioButton';
