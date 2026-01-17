// src/features/autenticacion/components/EmailInput.tsx
import type { UseFormRegisterReturn } from 'react-hook-form';

interface EmailInputProps {
  label?: string;
  error?: string;
  register: UseFormRegisterReturn;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function EmailInput({
  label = 'Correo electrónico',
  error,
  register,
  placeholder = 'ejemplo@empresa.com',
  autoComplete = 'email',
  disabled = false,
}: EmailInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <input
          type="email"
          {...register}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`
            block w-full pl-10 pr-3 py-2.5 
            border rounded-lg
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            bg-white dark:bg-gray-800
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            ${error 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-gray-300 dark:border-gray-600'
            }
          `}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}