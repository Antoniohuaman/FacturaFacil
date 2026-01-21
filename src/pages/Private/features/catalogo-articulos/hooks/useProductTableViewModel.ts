import { useMemo, useCallback } from 'react';
import type { Product, FilterOptions } from '../models/types';
import type { Establecimiento } from '../../configuracion-sistema/modelos/Establecimiento';

interface UseProductTableViewModelParams {
  products: Product[];
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  selectedProducts: Set<string>;
  onSelectedProductsChange: (selected: Set<string>) => void;
  EstablecimientoScope?: string;
  Establecimientos: Establecimiento[];
}

export const useProductTableViewModel = ({
  products,
  filters,
  onFiltersChange,
  selectedProducts,
  onSelectedProductsChange,
  EstablecimientoScope = 'ALL',
  Establecimientos
}: UseProductTableViewModelParams) => {
  const activeEstablecimientoIds = useMemo(() => {
    return new Set(
      Establecimientos.filter(est => est.estaActivoEstablecimiento !== false).map(est => est.id)
    );
  }, [Establecimientos]);

  const rows = useMemo<Product[]>(() => {
    if (EstablecimientoScope === 'ALL') {
      return products;
    }

    if (!EstablecimientoScope || !activeEstablecimientoIds.has(EstablecimientoScope)) {
      return [];
    }

    return products.filter(product => {
      if (product.disponibleEnTodos) {
        return true;
      }
      return Boolean(product.establecimientoIds?.includes(EstablecimientoScope));
    });
  }, [activeEstablecimientoIds, EstablecimientoScope, products]);

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
