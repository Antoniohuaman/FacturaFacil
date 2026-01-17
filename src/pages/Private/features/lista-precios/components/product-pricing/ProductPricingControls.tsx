import React from 'react';
import { Search, X } from 'lucide-react';

interface ProductPricingControlsProps {
  searchSKU: string;
  onSearchChange: (value: string) => void;
  filteredProductsCount: number;
}

export const ProductPricingControls: React.FC<ProductPricingControlsProps> = ({
  searchSKU,
  onSearchChange,
  filteredProductsCount
}) => {
  const pluralSuffix = filteredProductsCount === 1 ? '' : 's';
  const showResults = Boolean(searchSKU);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchSKU}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-10 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {searchSKU && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>
      {showResults && (
        <div>
          {filteredProductsCount > 0 ? (
            <div className="text-xs text-green-600">
              ✓ {filteredProductsCount} producto{pluralSuffix} encontrado{pluralSuffix} para "{searchSKU}"
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              No se encontraron productos que coincidan con "{searchSKU}". Intenta con términos más generales.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
