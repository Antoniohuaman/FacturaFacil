import { forwardRef, useState } from 'react';
import type { ChangeEvent, TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Etiqueta del textarea
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
   * Texto de ayuda debajo del textarea
   */
  helperText?: string;
  /**
   * Mostrar contador de caracteres
   */
  showCharCount?: boolean;
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
 * Componente Textarea reutilizable
 * 
 * Campo de texto multilínea con soporte para validaciones, contador de caracteres y diferentes estados.
 * Compatible con dark mode mediante CSS variables.
 * 
 * @example
 * ```tsx
 * <Textarea
 *   label="Mensaje"
 *   placeholder="Escribe tu mensaje aquí"
 *   maxLength={500}
 *   showCharCount
 *   required
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  required = false,
  error,
  helperText,
  showCharCount = false,
  containerClassName = '',
  className = '',
  id,
  disabled,
  value,
  maxLength,
  onChange,
  ...props
}, ref) => {
  const [charCount, setCharCount] = useState(
    typeof value === 'string' ? value.length : 0
  );
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
    onChange?.(e);
  };
  
  return (
    <div className={containerClassName}>
      {/* Label and Character Count */}
      {(label || showCharCount) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <label 
              htmlFor={textareaId}
              className="block text-ui-base font-medium text-tertiary"
            >
              {label} {required && <span className="text-error">*</span>}
            </label>
          )}
          {showCharCount && maxLength && (
            <span className="text-caption text-tertiary">
              {charCount} / {maxLength}
            </span>
          )}
        </div>
      )}
      
      {/* Textarea */}
      <textarea
        ref={ref}
        id={textareaId}
        disabled={disabled}
        value={value}
        maxLength={maxLength}
        onChange={handleChange}
        className={`w-full min-h-[100px] px-4 py-3 font-sans text-ui-base border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary hover:border-strong resize-y disabled:opacity-50 disabled:cursor-not-allowed bg-surface-1 text-primary ${
          error ? 'border-error' : 'border-strong'
        } ${className}`}
        aria-label={label || props['aria-label']}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
        {...props}
      />
      
      {/* Error Message */}
      {error && (
        <div 
          className="flex items-center gap-1.5 text-caption text-error mt-2" 
          id={`${textareaId}-error`}
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {/* Helper Text */}
      {!error && helperText && (
        <div 
          className="text-caption mt-2 text-tertiary" 
          id={`${textareaId}-helper`}
        >
          {helperText}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
