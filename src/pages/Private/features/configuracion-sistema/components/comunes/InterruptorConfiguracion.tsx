// src/features/configuration/components/comunes/SettingsToggle.tsx
interface SettingsToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

export function SettingsToggle({ 
  enabled, 
  onToggle, 
  label, 
  description, 
  disabled = false,
  size = 'md',
  color = 'blue'
}: SettingsToggleProps) {
  
  const sizeClasses = {
    sm: {
      toggle: 'h-5 w-9',
      dot: 'h-3 w-3',
      translate: enabled ? 'translate-x-5' : 'translate-x-1'
    },
    md: {
      toggle: 'h-6 w-11',
      dot: 'h-4 w-4',
      translate: enabled ? 'translate-x-6' : 'translate-x-1'
    },
    lg: {
      toggle: 'h-7 w-12',
      dot: 'h-5 w-5',
      translate: enabled ? 'translate-x-6' : 'translate-x-1'
    }
  };

  const colorClasses = {
    blue: enabled ? 'bg-blue-600' : 'bg-gray-200',
    green: enabled ? 'bg-green-600' : 'bg-gray-200',
    red: enabled ? 'bg-red-600' : 'bg-gray-200',
    yellow: enabled ? 'bg-yellow-600' : 'bg-gray-200'
  };

  const currentSize = sizeClasses[size];
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label 
          className={`block font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'} ${
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'
          }`}
        >
          {label}
        </label>
        {description && (
          <p className={`mt-0.5 ${disabled ? 'text-gray-400' : 'text-gray-500'} ${
            size === 'sm' ? 'text-xs' : 'text-sm'
          }`}>
            {description}
          </p>
        )}
      </div>
      
      <button
        type="button"
        onClick={() => !disabled && onToggle(!enabled)}
        disabled={disabled}
        className={`
          relative inline-flex ${currentSize.toggle} items-center rounded-full transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:ring-offset-2
          ${disabled 
            ? 'bg-gray-200 cursor-not-allowed opacity-50' 
            : `${colorClasses[color]} cursor-pointer hover:shadow-lg`
          }
        `}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`
            inline-block ${currentSize.dot} transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
            ${currentSize.translate}
          `}
        />
      </button>
    </div>
  );
}