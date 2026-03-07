export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  placeholder,
}: NumberInputProps) {
  const manejarCambio = (e: { target: { value: string } }) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <input
      type="number"
      value={value}
      onChange={manejarCambio}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  );
}

