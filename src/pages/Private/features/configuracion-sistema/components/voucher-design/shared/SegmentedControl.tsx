export interface SegmentedControlOption<T> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
