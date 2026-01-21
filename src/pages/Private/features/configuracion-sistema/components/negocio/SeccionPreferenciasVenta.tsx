import { useState } from 'react';
import { Package } from 'lucide-react';
import { ConfigurationCard } from '../comunes/TarjetaConfiguracion';
import { Switch } from '@/contasis';

export type SalesPreferences = {
  allowNegativeStock: boolean;
};

interface SalesPreferencesSectionProps {
  preferences: SalesPreferences;
  onUpdate: (preferences: SalesPreferences) => Promise<void>;
  isLoading?: boolean;
}

export function SalesPreferencesSection({
  preferences,
  onUpdate,
  isLoading = false
}: SalesPreferencesSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isStrictModeEnabled = !preferences.allowNegativeStock;

  const handleStrictStockToggle = async (enabled: boolean) => {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate({
        ...preferences,
        allowNegativeStock: !enabled,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-24 rounded-lg bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <ConfigurationCard
      title="Control de stock en ventas"
      description="Bloquea la venta de productos sin stock."
      icon={Package}
    >
      <div className="space-y-3">
        <Switch
          checked={isStrictModeEnabled}
          onChange={handleStrictStockToggle}
          label="Stock estricto"
          disabled={isUpdating}
          size="md"
        />

        <p className="text-sm text-gray-600">
          {isStrictModeEnabled
            ? 'Activado: no podrás vender productos agotados.'
            : 'Desactivado: podrás vender aunque esté agotado.'}
        </p>
      </div>
    </ConfigurationCard>
  );
}
