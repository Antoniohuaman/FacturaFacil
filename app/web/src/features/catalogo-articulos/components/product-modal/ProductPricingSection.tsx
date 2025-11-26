import React from 'react';
import { Banknote, Percent } from 'lucide-react';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';

interface ProductPricingSectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  errors: FormError;
  precioInput: string;
  setPrecioInput: (value: string) => void;
  isFieldVisible: (fieldId: string) => boolean;
  isFieldRequired: (fieldId: string) => boolean;
}

export const ProductPricingSection: React.FC<ProductPricingSectionProps> = ({
  formData,
  setFormData,
  errors,
  precioInput,
  setPrecioInput,
  isFieldVisible,
  isFieldRequired
}) => {
  return (
    <div className="space-y-4">
      {isFieldVisible('precio') && (
        <div>
          <label htmlFor="precio" className="block text-xs font-medium text-gray-700 mb-1">
            Precio de venta
            {isFieldRequired('precio') && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <div className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">S/</div>
            <input
              type="number"
              id="precio"
              step="0.01"
              min="0"
              value={precioInput}
              onChange={(e) => {
                const inputValue = e.target.value;
                setPrecioInput(inputValue);
                const numericValue = parseFloat(inputValue) || 0;
                setFormData(prev => ({ ...prev, precio: numericValue }));
              }}
              className={`
                w-full h-10 pl-16 pr-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors
                ${errors.precio ? 'border-red-300 bg-red-50' : 'border-gray-300'}
              `}
              placeholder="0.00"
            />
          </div>
          {errors.precio && <p className="text-red-600 text-xs mt-1">{errors.precio}</p>}
        </div>
      )}

      <div>
        <label htmlFor="impuesto" className="block text-xs font-medium text-gray-700 mb-1">
          Impuesto <span className="text-red-500">*</span>
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
    </div>
  );
};
