import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ResumenCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  variant: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  subtitle?: string;
  className?: string;
}

const variantStyles = {
  primary: {
    bg: 'from-blue-50 to-blue-100',
    border: 'border-blue-200',
    text: 'text-blue-700',
    amount: 'text-blue-900',
    icon: 'text-blue-600',
    subtitle: 'text-blue-600'
  },
  success: {
    bg: 'from-green-50 to-green-100',
    border: 'border-green-200',
    text: 'text-green-700',
    amount: 'text-green-900',
    icon: 'text-green-600',
    subtitle: 'text-green-600'
  },
  danger: {
    bg: 'from-red-50 to-red-100',
    border: 'border-red-200',
    text: 'text-red-700',
    amount: 'text-red-900',
    icon: 'text-red-600',
    subtitle: 'text-red-600'
  },
  warning: {
    bg: 'from-yellow-50 to-yellow-100',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    amount: 'text-yellow-900',
    icon: 'text-yellow-600',
    subtitle: 'text-yellow-600'
  },
  info: {
    bg: 'from-purple-50 to-purple-100',
    border: 'border-purple-200',
    text: 'text-purple-700',
    amount: 'text-purple-900',
    icon: 'text-purple-600',
    subtitle: 'text-purple-600'
  }
};

export const ResumenCard: React.FC<ResumenCardProps> = ({
  title,
  amount,
  icon: Icon,
  variant,
  subtitle,
  className = ''
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={`bg-gradient-to-br ${styles.bg} border ${styles.border} rounded-lg p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-medium ${styles.text} uppercase tracking-wide`}>{title}</p>
        <Icon className={`w-5 h-5 ${styles.icon}`} />
      </div>
      <p className={`text-2xl font-bold ${styles.amount}`}>S/ {amount.toFixed(2)}</p>
      {subtitle && (
        <p className={`text-xs ${styles.subtitle} mt-1`}>{subtitle}</p>
      )}
    </div>
  );
};
