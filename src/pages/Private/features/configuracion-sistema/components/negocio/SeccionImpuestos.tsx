// src/features/configuration/components/negocio/TaxesSection.tsx
import { useMemo, useState } from 'react';
import { Receipt, Calculator, AlertCircle, Info, Settings } from 'lucide-react';
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

  const getExampleCalculation = () => {
    const basePrice = 100;
    const igvRate = 0.18; // 18%

    if (pricesIncludeTax) {
      // Prices include IGV
      const priceWithIgv = basePrice;
      const priceWithoutIgv = basePrice / (1 + igvRate);
      const igvAmount = priceWithIgv - priceWithoutIgv;

      return {
        display: `S/ ${basePrice.toFixed(2)}`,
        breakdown: `Base: S/ ${priceWithoutIgv.toFixed(2)} + IGV: S/ ${igvAmount.toFixed(2)} = S/ ${priceWithIgv.toFixed(2)}`
      };
    } else {
      // Prices don't include IGV
      const priceWithoutIgv = basePrice;
      const igvAmount = priceWithoutIgv * igvRate;
      const priceWithIgv = priceWithoutIgv + igvAmount;

      return {
        display: `S/ ${priceWithoutIgv.toFixed(2)}`,
        breakdown: `Base: S/ ${priceWithoutIgv.toFixed(2)} + IGV: S/ ${igvAmount.toFixed(2)} = S/ ${priceWithIgv.toFixed(2)}`
      };
    }
  };

  const example = getExampleCalculation();

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
        description="Define si los precios de tus productos incluyen o no el IGV"
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
                  <p className="text-sm text-gray-600 mt-1">
                    Los precios que ingresas ya incluyen el IGV (18%)
                  </p>
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-500">Ejemplo:</p>
                    <p className="font-mono text-sm text-gray-900">
                      Precio ingresado: S/ 100.00 (incluye IGV)
                    </p>
                  </div>
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
                  <p className="text-sm text-gray-600 mt-1">
                    Los precios que ingresas no incluyen IGV, se calcula automáticamente
                  </p>
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-500">Ejemplo:</p>
                    <p className="font-mono text-sm text-gray-900">
                      Precio base: S/ 100.00 + IGV: S/ 18.00 = S/ 118.00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Ejemplo de Cálculo</h4>
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-600">Precio mostrado al cliente:</span>
                <span className="ml-2 font-mono font-semibold">{example.display}</span>
              </p>
              <p className="text-xs text-gray-500">{example.breakdown}</p>
            </div>
          </div>
        </div>
      </TarjetaConfiguracion>

      {/* Tax Affectations */}
      <TarjetaConfiguracion
        title="Afectaciones Tributarias"
        description="Configura los tipos de afectación fiscal disponibles para tus productos"
        icon={Settings}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              Define aquí los impuestos disponibles y cuál será el predeterminado.
            </p>
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Estado de impuestos</h4>
                <p className="text-sm text-blue-800 mt-1">
                  <span className="font-semibold">Visible</span> controla qué impuestos aparecen
                  como opciones en los desplegables de productos y ventas.
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  El impuesto marcado como <span className="font-semibold">por defecto</span> es
                  la selección inicial sugerida en esos desplegables y siempre debe estar visible.
                </p>
              </div>
            </div>
          </div>
        </div>
      </TarjetaConfiguracion>

      {/* Help and Documentation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Importante sobre Configuración Fiscal</h4>
            <ul className="text-sm text-amber-800 mt-2 space-y-1">
              <li>• La configuración de precios afecta cómo se muestran y calculan los importes en todo el sistema</li>
              <li>• Siempre debe existir exactamente un impuesto marcado como por defecto y este debe estar visible</li>
              <li>• Visible define qué impuestos aparecen en los desplegables; ocultar uno lo quita de esas opciones</li>
              <li>• Cambiar el impuesto por defecto no modifica comprobantes ya emitidos, solo nuevas operaciones</li>
              <li>• Consulta con un contador si no estás seguro de la configuración fiscal correcta</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}