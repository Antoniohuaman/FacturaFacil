// src/features/configuration/components/negocio/TaxesSection.tsx
import { useMemo, useState } from 'react';
import { Receipt, Calculator, Settings } from 'lucide-react';
import { RadioButton } from '@/contasis';
import { InterruptorConfiguracion as SettingsToggle } from '../comunes/InterruptorConfiguracion';
import { SelectorPredeterminado as DefaultSelector } from '../comunes/SelectorPredeterminado';
import { TarjetaConfiguracion } from '../comunes/TarjetaConfiguracion';
import type { Tax } from '../../modelos/Tax';
import { normalizeTaxes } from '../../modelos/Tax';

interface TaxesSectionProps {
  taxes: Tax[];
  pricesIncludeTax: boolean;
  onUpdate: (params: { taxes: Tax[]; pricesIncludeTax: boolean }) => Promise<void>;
  isLoading?: boolean;
}

export function TaxesSection({
  taxes,
  pricesIncludeTax,
  onUpdate,
  isLoading = false
}: TaxesSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const sortedTaxes = useMemo(
    () => {
      const byName = [...taxes].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
      // keep default tax at top if exists
      const defaultIndex = byName.findIndex((tax) => tax.isDefault);
      if (defaultIndex <= 0) return byName;
      const [defaultTax] = byName.splice(defaultIndex, 1);
      return [defaultTax, ...byName];
    },
    [taxes]
  );

  const handlePriceToggle = async (includeTax: boolean) => {
    setIsUpdating(true);
    try {
      await onUpdate({ taxes, pricesIncludeTax: includeTax });
    } finally {
      setIsUpdating(false);
    }
  };

  

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Receipt className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Modo de precios (IGV)</h3>
      </div>

      {/* Price Configuration */}
      <TarjetaConfiguracion
        title="Configuración de Precios"
        icon={Calculator}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* With IGV Option */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${pricesIncludeTax
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              onClick={() => handlePriceToggle(true)}
            >
              <div className="flex items-start space-x-3">
                <RadioButton
                  name="pricesIncludeTax"
                  value="true"
                  checked={pricesIncludeTax}
                  onChange={() => handlePriceToggle(true)}
                  disabled={isUpdating}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Precios con IGV</h4>
                </div>
              </div>
            </div>

            {/* Without IGV Option */}
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${!pricesIncludeTax
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              onClick={() => handlePriceToggle(false)}
            >
              <div className="flex items-start space-x-3">
                <RadioButton
                  name="pricesIncludeTax"
                  value="false"
                  checked={!pricesIncludeTax}
                  onChange={() => handlePriceToggle(false)}
                  disabled={isUpdating}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Precios sin IGV</h4>
                </div>
              </div>
            </div>
          </div>

          
        </div>
      </TarjetaConfiguracion>

      {/* Tax Affectations */}
      <TarjetaConfiguracion
        title="Afectaciones Tributarias"
        icon={Settings}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Impuesto</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Afectación</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Tasa</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Visible</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700">Por defecto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTaxes.map((tax) => {
                  const rateLabel = `${tax.rate.toFixed(2)}%`;
                  const affectationLabel = tax.affectationCode
                    ? `${tax.affectationCode} - ${tax.affectationName ?? ''}`.trim()
                    : tax.category === 'EXEMPTION'
                      ? 'Exonerado / Inafecto'
                      : 'Gravado';

                  const handleToggleActive = async () => {
                    if (isUpdating) return;
                    setIsUpdating(true);
                    try {
                      const nextTaxes = taxes.map((t) =>
                        t.id === tax.id ? { ...t, isActive: !t.isActive } : t
                      );

                      const normalized = normalizeTaxes(nextTaxes);
                      await onUpdate({ taxes: normalized, pricesIncludeTax });
                    } finally {
                      setIsUpdating(false);
                    }
                  };

                  const handleSetDefault = async () => {
                    if (isUpdating) return;
                    setIsUpdating(true);
                    try {
                      const nextTaxes = taxes.map((t) => ({
                        ...t,
                        // Al marcar por defecto, forzamos que sea visible
                        isActive: t.id === tax.id ? true : t.isActive,
                        isDefault: t.id === tax.id,
                      }));

                      const normalized = normalizeTaxes(nextTaxes);
                      await onUpdate({ taxes: normalized, pricesIncludeTax });
                    } finally {
                      setIsUpdating(false);
                    }
                  };

                  return (
                    <tr key={tax.id} className={tax.isDefault ? 'bg-green-50' : ''}>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tax.name}</div>
                            {tax.shortName && (
                              <div className="text-gray-500">{tax.shortName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-gray-700">
                        <div className="font-mono text-gray-500">{tax.sunatCode}</div>
                        <div className="text-gray-600">{affectationLabel}</div>
                      </td>
                      <td className="px-4 py-2 align-middle text-right font-mono text-gray-900">
                        {rateLabel}
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <SettingsToggle
                          enabled={tax.isActive}
                          onToggle={handleToggleActive}
                          label=""
                          disabled={isUpdating}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-2 align-middle text-center">
                        <DefaultSelector
                          isDefault={tax.isDefault}
                          onSetDefault={handleSetDefault}
                          disabled={isUpdating}
                          size="sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </TarjetaConfiguracion>
    </div>
  );
}