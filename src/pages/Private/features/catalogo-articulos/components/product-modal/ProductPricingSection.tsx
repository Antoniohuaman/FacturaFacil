import React, { useMemo } from 'react';
import { Percent } from 'lucide-react';
import type { ProductFormData } from '../../models/types';

interface ProductPricingSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
  taxOptions: { id: string; code: string; value: string; label: string }[];
}

export const ProductPricingSection: React.FC<ProductPricingSectionProps> = ({
  formData,
  setFormData,
  isFieldVisible,
  isFieldRequired,
  taxOptions,
}) => {
  const optionsWithLegacy = useMemo(() => {
    const trimmedValue = formData.impuesto?.trim();
    if (!trimmedValue) return taxOptions;

    const existsInVisible = taxOptions.some(option => option.value === trimmedValue);
    if (existsInVisible) return taxOptions;

    // Producto con impuesto ya guardado que ahora no es visible en la configuración
    return [
      {
        id: 'legacy-impuesto',
        code: 'LEGACY',
        value: trimmedValue,
        label: `${trimmedValue} (no visible)`,
      },
      ...taxOptions,
    ];
  }, [formData.impuesto, taxOptions]);

  const impuestoVisible = isFieldVisible('impuesto');
  if (!impuestoVisible) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="impuesto" className="block text-xs font-medium text-gray-700">
        Impuesto
        {isFieldRequired('impuesto') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <select
          id="impuesto"
          value={formData.impuesto}
          onChange={(e) => setFormData(prev => ({ ...prev, impuesto: e.target.value }))}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
        >
          {optionsWithLegacy.map(option => (
            <option key={option.id} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
