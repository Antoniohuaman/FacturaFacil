import type { ReactNode } from 'react';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  helper?: string;
  required?: boolean;
}

export function FormField({ label, children, helper, required }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  );
}
