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
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const classes = [
      baseStyles,
      iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
      variantStyles[variant],
      fullWidth ? 'w-full' : '',
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

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={classes}
        {...props}
      >
        {icon && iconPosition === 'left' && renderIcon(icon)}
        {!iconOnly && <span className="inline-flex items-center leading-[1]">{children}</span>}
        {icon && iconPosition === 'right' && renderIcon(icon)}
      </button>
    );
  }
);

Button.displayName = 'Button';
