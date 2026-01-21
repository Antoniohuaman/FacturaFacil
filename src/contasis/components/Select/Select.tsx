import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /**
   * Etiqueta del select
   */
  label?: string;
  /**
   * Si el campo es requerido
   */
  required?: boolean;
  /**
   * Mensaje de error a mostrar
   */
  error?: string;
  /**
   * Texto de ayuda debajo del select
   */
  helperText?: string;
  /**
   * Opciones del select
   */
  options?: SelectOption[];
  /**
   * Texto placeholder para primera opción
   */
  placeholder?: string;
  /**
   * Tamaño del select
   */
  size?: 'small' | 'medium' | 'large';
  /**
   * Clases adicionales para el contenedor
   */
  containerClassName?: string;
  /**
   * ID único para accesibilidad
   */
  id?: string;
}

/**
 * Componente Select reutilizable
 * 
 * Campo de selección de opciones con soporte para validaciones y diferentes estados.
 * Compatible con dark mode mediante CSS variables.
 * 
 * @example
 * ```tsx
 * <Select
 *   label="País"
 *   placeholder="Seleccionar país"
 *   options={[
 *     { value: 'pe', label: 'Perú' },
 *     { value: 'cl', label: 'Chile' }
 *   ]}
 *   required
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  required = false,
  error,
  helperText,
  options = [],
  placeholder,
  size = 'medium',
  containerClassName = '',
  className = '',
  id,
  disabled,
  children,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  // Clases para el tamaño - SIN line-height para evitar desalineación
  const sizeClasses = {
    small: 'h-8 text-ui-sm',
    medium: 'h-10 text-ui-base',
    large: 'h-12 text-body'
  };
  
  return (
    <div className={containerClassName}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-ui-base font-medium mb-2 text-tertiary"
        >
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      
      {/* Select Container */}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full ${sizeClasses[size]} pl-4 pr-11 leading-none font-sans border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary hover:border-strong appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-surface-1 text-primary ${
            error ? 'border-error' : 'border-strong'
          } ${className}`}
          aria-label={label || props['aria-label']}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
          {children}
        </select>
        
        {/* Chevron Icon */}
        <ChevronDown 
          size={18} 
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-tertiary"
        />
      </div>
      
      {/* Error Message */}
      {error && (
        <div 
          className="flex items-center gap-1.5 text-caption text-error mt-2" 
          id={`${selectId}-error`}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {/* Helper Text */}
      {!error && helperText && (
        <div 
          className="text-caption mt-2 text-tertiary" 
          id={`${selectId}-helper`}
        >
          {helperText}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';
