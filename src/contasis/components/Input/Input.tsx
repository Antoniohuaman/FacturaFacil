import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

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
  leftIcon?: ReactNode;
  /**
   * Icono a mostrar a la derecha del input
   */
  rightIcon?: ReactNode;
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
  /**
   * Variante de input validado
   */
  variant?: 'default' | 'validated-editable' | 'validated-readonly';
  /**
   * Mensaje de confirmación para variante validada
   */
  validationMessage?: {
    title: string;
    description?: string;
  };
  /**
   * Si se debe mostrar el mensaje de validación expandido
   */
  showValidationMessage?: boolean;
  /**
   * Callback cuando el usuario modifica el valor (para resetear validación)
   */
  onValueChange?: (value: string) => void;
}

/**
 * Componente Input reutilizable
 * 
 * Campo de entrada de datos con soporte para validaciones, iconos y diferentes estados.
 * Compatible con dark mode mediante CSS variables.
 * 
 * @example
 * ```tsx
 * // Input básico
 * <Input
 *   label="Nombre"
 *   placeholder="Ingrese su nombre"
 *   required
 *   error="Este campo es requerido"
 * />
 * 
 * // Input validado editable (RUC)
 * <Input
 *   label="RUC"
 *   value="20508997567"
 *   variant="validated-editable"
 *   validationMessage={{
 *     title: "RUC Validado Correctamente",
 *     description: "Datos completados desde SUNAT"
 *   }}
 *   showValidationMessage
 *   onValueChange={(value) => resetValidation()}
 * />
 * 
 * // Input validado readonly (Razón Social)
 * <Input
 *   label="Razón Social"
 *   value="CONTASIS S.A.C."
 *   variant="validated-readonly"
 *   helperText="Auto-completado desde SUNAT"
 *   readOnly
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
  variant = 'default',
  validationMessage,
  showValidationMessage = false,
  onValueChange,
  onChange,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [inputId] = useState(() => id || `input-${Math.random().toString(36).substr(2, 9)}`);
  
  // Determinar si es un input de password y agregar el icono de toggle
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  
  // Verificar si es variante validada
  const isValidated = variant === 'validated-editable' || variant === 'validated-readonly';
  
  // Clases para el tamaño
  const sizeClasses = {
    small: 'h-8 text-ui-sm leading-8',
    medium: 'h-10 text-ui-base leading-10',
    large: 'h-12 text-body leading-[3rem]'
  };
  
  // Clases de padding según iconos y variante
  const paddingLeft = leftIcon ? 'pl-11' : 'px-4';
  const paddingRight = isValidated ? 'pr-11' : (rightIcon || isPassword ? 'pr-11' : 'px-4');
  
  // Manejar cambios en el input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(e.target.value);
  };
  
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
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isValidated ? 'text-success' : 'text-tertiary'
          }`}>
            {leftIcon}
          </span>
        )}
        
        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          disabled={disabled}
          onChange={handleChange}
          className={`w-full ${sizeClasses[size]} ${paddingLeft} ${paddingRight} font-sans rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed text-primary ${
            isValidated ? 
              variant === 'validated-editable' ?
                'border-2 border-success bg-surface-1 cursor-text hover:border-success/80' :
                'border-2 border-success/40 bg-surface-2 cursor-default select-all text-secondary' :
            error ? 'border border-error bg-surface-1 hover:border-strong' : 
            'border border-strong bg-surface-1 hover:border-strong'
          } ${className}`}
          aria-label={label || props['aria-label']}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : 
            (showValidationMessage && validationMessage) ? `${inputId}-validation` :
            helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {/* Right: Validated Check or Icons */}
        {isValidated ? (
          <CheckCircle 
            size={variant === 'validated-readonly' ? 18 : 20} 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-success pointer-events-none" 
          />
        ) : isPassword ? (
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
      
      {/* Mensaje de Validación Completo (Solo para validated-editable) */}
      {!error && variant === 'validated-editable' && showValidationMessage && validationMessage && (
        <div 
          className="mt-3 p-3 bg-success/10 border-l-4 border-success rounded" 
          id={`${inputId}-validation`}
        >
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-ui-sm font-semibold text-success mb-0.5">
                {validationMessage.title}
              </p>
              {validationMessage.description && (
                <p className="text-caption text-success/80">
                  {validationMessage.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
