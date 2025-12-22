import React from 'react';
import { Percent } from 'lucide-react';
import type { ProductFormData } from '../../models/types';

interface ProductPricingSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductPricingSection: React.FC<ProductPricingSectionProps> = ({
  formData,
  setFormData,
  isFieldVisible,
  isFieldRequired
}) => {
  const impuestoVisible = isFieldVisible('impuesto');
  if (!impuestoVisible) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label htmlFor="impuesto" className="block text-xs font-medium text-gray-700 mb-1">
        Impuesto
        {isFieldRequired('impuesto') && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <select
          id="impuesto"
          value={formData.impuesto}
          onChange={(e) => setFormData(prev => ({ ...prev, impuesto: e.target.value }))}
          className="w-full h-10 pl-9 pr-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
        >
          <option value="IGV (18.00%)">IGV (18.00%)</option>
          <option value="IGV (10.00%)">IGV (10.00%)</option>
          <option value="Exonerado (0.00%)">Exonerado (0.00%)</option>
          <option value="Inafecto (0.00%)">Inafecto (0.00%)</option>
        </select>
      </div>
    </div>
  );
};
