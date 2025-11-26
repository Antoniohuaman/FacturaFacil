import React from 'react';
import { Boxes } from 'lucide-react';
import type { ProductType } from '../../hooks/useProductForm';

interface ProductTypeSelectorProps {
  productType: ProductType;
  onChange: (type: ProductType) => void;
}

export const ProductTypeSelector: React.FC<ProductTypeSelectorProps> = ({ productType, onChange }) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Boxes className="w-3.5 h-3.5 text-gray-500" />
        <label className="text-xs font-medium text-gray-700">Tipo de producto</label>
      </div>
      <div className="inline-flex rounded-md border border-gray-300 p-0.5 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange('BIEN')}
          className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${
            productType === 'BIEN'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bien
        </button>
        <button
          type="button"
          onClick={() => onChange('SERVICIO')}
          className={`px-4 py-1.5 text-xs font-medium rounded transition-all ${
            productType === 'SERVICIO'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Servicio
        </button>
      </div>
    </div>
  );
};
