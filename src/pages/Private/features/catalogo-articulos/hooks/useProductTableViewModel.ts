import { useMemo, useCallback } from 'react';
import type { Product, FilterOptions } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/models/Establishment';

export interface ProductEstablishmentRow extends Product {
  _establishmentId: string;
  _establishmentCode: string;
  _establishmentName: string;
}

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
  const rows = useMemo<ProductEstablishmentRow[]>(() => {
    const expanded: ProductEstablishmentRow[] = [];

    products.forEach(product => {
      let targetEstablishments: Establishment[] = [];

      if (product.disponibleEnTodos) {
        targetEstablishments = establishments.filter(est => est.isActive);
      } else if (product.establecimientoIds && product.establecimientoIds.length > 0) {
        targetEstablishments = establishments.filter(
          est => product.establecimientoIds?.includes(est.id) && est.isActive
        );
      } else {
        expanded.push({
          ...product,
          _establishmentId: 'UNASSIGNED',
          _establishmentCode: '—',
          _establishmentName: 'Sin asignar'
        });
        return;
      }

      targetEstablishments.forEach(est => {
        expanded.push({
          ...product,
          _establishmentId: est.id,
          _establishmentCode: est.code,
          _establishmentName: est.name
        });
      });
    });

    if (establishmentScope !== 'ALL') {
      return expanded.filter(row => row._establishmentId === establishmentScope);
    }

    return expanded;
  }, [products, establishments, establishmentScope]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectedProductsChange(new Set(products.map(p => p.id)));
      } else {
        onSelectedProductsChange(new Set());
      }
    },
    [onSelectedProductsChange, products]
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
    () => selectedProducts.size === products.length && products.length > 0,
    [products.length, selectedProducts]
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
