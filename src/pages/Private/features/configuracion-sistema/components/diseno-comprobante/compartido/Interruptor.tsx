import { Switch } from '@/contasis';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <Switch
        size="md"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
