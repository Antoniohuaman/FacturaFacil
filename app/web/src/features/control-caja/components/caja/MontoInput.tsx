import React from 'react';

interface MontoInputProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur: (numericValue: number) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MontoInput: React.FC<MontoInputProps> = ({
  label,
  value,
  onValueChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder = '0.00',
  className = ''
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9.]/g, '');
    onValueChange(v);
  };

  const handleBlur = () => {
    const n = Number(value || 0);
    onBlur(n);
    onValueChange(n.toFixed(2));
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        required={required}
        disabled={disabled}
      />
    </div>
  );
};
