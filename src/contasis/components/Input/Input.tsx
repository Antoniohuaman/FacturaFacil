import React, { useState, forwardRef, InputHTMLAttributes } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Etiqueta del input
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
   * Texto de ayuda debajo del input
   */
  helperText?: string;
  /**
   * Icono a mostrar a la izquierda del input
   */
  leftIcon?: React.ReactNode;
  /**
   * Icono a mostrar a la derecha del input
   */
  rightIcon?: React.ReactNode;
  /**
   * Tamaño del input
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
 * Componente Input reutilizable
 * 
 * Campo de entrada de datos con soporte para validaciones, iconos y diferentes estados.
 * Compatible con dark mode mediante CSS variables.
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Nombre"
 *   placeholder="Ingrese su nombre"
 *   required
 *   error="Este campo es requerido"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  required = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'medium',
  containerClassName = '',
  className = '',
  type = 'text',
  id,
  disabled,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [inputId] = useState(() => id || `input-${Math.random().toString(36).substr(2, 9)}`);
  
  // Determinar si es un input de password y agregar el icono de toggle
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  
  // Clases para el tamaño
  const sizeClasses = {
    small: 'h-8 text-ui-sm leading-8',
    medium: 'h-10 text-ui-base leading-10',
    large: 'h-12 text-body leading-[3rem]'
  };
  
  // Clases de padding según iconos
  const paddingLeft = leftIcon ? 'pl-11' : 'px-4';
  const paddingRight = rightIcon || isPassword ? 'pr-11' : 'px-4';
  
  return (
    <div className={containerClassName}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-ui-base font-medium mb-2 text-tertiary"
        >
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary">
            {leftIcon}
          </span>
        )}
        
        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          disabled={disabled}
          className={`w-full ${sizeClasses[size]} ${paddingLeft} ${paddingRight} font-sans border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary hover:border-strong disabled:opacity-50 disabled:cursor-not-allowed bg-surface-1 text-primary ${
            error ? 'border-error' : 'border-strong'
          } ${className}`}
          aria-label={label || props['aria-label']}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        
        {/* Right Icon or Password Toggle */}
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary">
            {rightIcon}
          </span>
        ) : null}
      </div>
      
      {/* Error Message */}
      {error && (
        <div 
          className="flex items-center gap-1.5 text-caption text-error mt-2" 
          id={`${inputId}-error`}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {/* Helper Text */}
      {!error && helperText && (
        <div 
          className="text-caption mt-2 text-tertiary" 
          id={`${inputId}-helper`}
        >
          {helperText}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
