import React from 'react';

/* ===============================
   TYPES
   =============================== */

type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
type ButtonType = 'button' | 'submit' | 'reset';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant;
  type?: ButtonType;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean; // 👈 NUEVA PROP
  loadingText?: string; // 👈 NUEVA PROP
  className?: string;
  children?: React.ReactNode;
}

/* ===============================
   BASE STYLES
   =============================== */

const baseStyles = `
  inline-flex items-center justify-center
  font-['Inter'] font-medium
  rounded-lg border transition-all duration-200
  cursor-pointer whitespace-nowrap
  focus:outline-none focus:ring-2 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
`;

/* ===============================
   SIZES
   =============================== */

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-ui-sm gap-2',
  md: 'h-10 px-5 text-ui-base gap-2',
  lg: 'h-12 px-7 text-body gap-2',
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  sm: 'w-8 h-8 p-2',
  md: 'w-10 h-10 p-2',
  lg: 'w-12 h-12 p-2',
};

/* ===============================
   VARIANTS (SEMÁNTICOS)
   =============================== */

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-brand
    text-inverse
    dark:text-secondary
    border border-transparent
    
    hover:bg-brand-hover
    hover:text-inverse
    dark:hover:text-secondary
    hover:shadow-lg
    
    active:bg-brand-pressed
    
    focus-visible:ring-2 
    focus-visible:ring-brand
    focus-visible:ring-offset-2
    
    transition-all duration-200
  `,
  secondary: `
    bg-surface-0
    text-brand
    border border-strong
    
    hover:bg-surface-1
    hover:border-focus
    
    active:bg-surface-pressed
    
    focus-visible:ring-2
    focus-visible:ring-brand
    focus-visible:ring-offset-2
    
    dark:text-secondary
    dark:border-strong
    dark:hover:bg-surface-hover
    dark:hover:border-focus
    dark:active:bg-surface-pressed
    
    transition-all duration-200
  `,
  tertiary: `
    bg-transparent
    text-brand
    border-transparent
    hover:bg-brand-light
    
    dark:text-secondary
  `,
};

/* ===============================
   ICON SIZES
   =============================== */

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-[18px] h-[18px]',
  lg: 'w-5 h-5',
};

/* ===============================
   SPINNER COMPONENT (NUEVO)
   =============================== */

const Spinner = ({ size }: { size: ButtonSize }) => {
  const spinnerSize = iconSizes[size];
  
  return (
    <svg
      className={`animate-spin ${spinnerSize}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

/* ===============================
   BUTTON COMPONENT (semántico)
   =============================== */

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      size = 'md',
      variant = 'primary',
      type = 'button',
      icon,
      iconPosition = 'left',
      iconOnly = false,
      disabled = false,
      fullWidth = false,
      loading = false, // 👈 NUEVA PROP
      loadingText, // 👈 NUEVA PROP
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Si está loading, el botón se deshabilita automáticamente
    const isDisabled = disabled || loading;
    
    const classes = [
      baseStyles,
      iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
      variantStyles[variant],
      fullWidth ? 'w-full' : '',
      loading ? 'cursor-wait' : '', // 👈 Cursor de espera cuando está loading
      className,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ');

    const renderIcon = (iconElement: React.ReactNode) => {
      if (!iconElement) return null;
      return (
        <span className={`inline-flex items-center flex-shrink-0 ${iconSizes[size]}`}>
          {iconElement}
        </span>
      );
    };

    // Contenido del botón: muestra spinner y loadingText si está cargando
    const buttonContent = loading ? (
      <>
        <Spinner size={size} />
        {!iconOnly && loadingText && (
          <span className="inline-flex items-center leading-[1]">{loadingText}</span>
        )}
      </>
    ) : (
      <>
        {icon && iconPosition === 'left' && renderIcon(icon)}
        {!iconOnly && <span className="inline-flex items-center leading-[1]">{children}</span>}
        {icon && iconPosition === 'right' && renderIcon(icon)}
      </>
    );

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={classes}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';
