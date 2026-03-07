// src/features/autenticacion/components/RememberMeToggle.tsx
import type { UseFormRegisterReturn } from 'react-hook-form';

interface RememberMeToggleProps {
  register: UseFormRegisterReturn;
  label?: string;
}

export function RememberMeToggle({ 
  register, 
  label = 'Mantener sesión iniciada' 
}: RememberMeToggleProps) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        {...register}
        id="recordarme"
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
      />
      <label 
        htmlFor="recordarme" 
        className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
      >
        {label}
      </label>
    </div>
  );
}