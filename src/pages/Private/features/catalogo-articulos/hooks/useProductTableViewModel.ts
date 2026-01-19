import { useMemo, useCallback } from 'react';
import type { Product, FilterOptions } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/modelos/Establishment';

interface UseProductTableViewModelParams {
  products: Product[];
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  selectedProducts: Set<string>;
  onSelectedProductsChange: (selected: Set<string>) => void;
  establishmentScope?: string;
  establishments: Establishment[];
}

export const useProductTableViewModel = ({
  products,
  filters,
  onFiltersChange,
  selectedProducts,
  onSelectedProductsChange,
  establishmentScope = 'ALL',
  establishments
}: UseProductTableViewModelParams) => {
  const activeEstablishmentIds = useMemo(() => {
    return new Set(establishments.filter(est => est.isActive).map(est => est.id));
  }, [establishments]);

  const rows = useMemo<Product[]>(() => {
    if (establishmentScope === 'ALL') {
      return products;
    }

    if (!establishmentScope || !activeEstablishmentIds.has(establishmentScope)) {
      return [];
    }

    return products.filter(product => {
      if (product.disponibleEnTodos) {
        return true;
      }
      return Boolean(product.establecimientoIds?.includes(establishmentScope));
    });
  }, [activeEstablishmentIds, establishmentScope, products]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectedProductsChange(new Set(rows.map(p => p.id)));
      } else {
        onSelectedProductsChange(new Set());
      }
    },
    [onSelectedProductsChange, rows]
  );

  const handleSelectProduct = useCallback(
    (productId: string, checked: boolean) => {
      const next = new Set(selectedProducts);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      onSelectedProductsChange(next);
    },
    [onSelectedProductsChange, selectedProducts]
  );

  const handleSort = useCallback(
    (field: keyof Product) => {
      const newDirection =
        filters.ordenarPor === field && filters.direccion === 'asc' ? 'desc' : 'asc';

      onFiltersChange({
        ordenarPor: field as FilterOptions['ordenarPor'],
        direccion: newDirection
      });
    },
    [filters.direccion, filters.ordenarPor, onFiltersChange]
  );

  const getSortState = useCallback(
    (field: keyof Product) => {
      if (filters.ordenarPor !== field) return null;
      return filters.direccion;
    },
    [filters]
  );

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }, []);

  const isAllSelected = useMemo(
    () => rows.length > 0 && rows.every(product => selectedProducts.has(product.id)),
    [rows, selectedProducts]
  );

  return {
    rows,
    handleSelectAll,
    handleSelectProduct,
    handleSort,
    getSortState,
    formatCurrency,
    isAllSelected,
    selectedProducts
  };
};
