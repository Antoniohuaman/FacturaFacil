import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Product, FilterOptions } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/models/Establishment';
import {
  AVAILABLE_COLUMNS,
  COLUMN_CONFIG_VERSION,
  COLUMN_GROUP_LABELS,
  type ColumnKey,
  type ColumnConfig
} from '../components/product-table/columnConfig';
import { ensureEmpresaId, lsKey } from '../../../shared/tenant';

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

const getDefaultColumnSet = () =>
  new Set(AVAILABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key));

const migrateLegacyToNamespaced = () => {
  try {
    const empresaId = ensureEmpresaId();
    const markerKey = `${empresaId}:catalog_migrated`;
    const migrated = localStorage.getItem(markerKey);
    if (migrated === 'v1') return;

    const legacyKeys = [
      'catalog_products',
      'catalog_categories',
      'catalog_packages',
      'productTableColumns',
      'productTableColumnsVersion',
      'productFieldsConfig'
    ];

    for (const key of legacyKeys) {
      const namespaced = `${empresaId}:${key}`;
      const hasNamespaced = localStorage.getItem(namespaced) !== null;
      const legacyValue = localStorage.getItem(key);
      if (!hasNamespaced && legacyValue !== null) {
        localStorage.setItem(namespaced, legacyValue);
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(markerKey, 'v1');
  } catch (error) {
    console.warn('Migración legacy->namespaced (ProductTable) omitida por empresaId inválido o error:', error);
  }
};

const loadVisibleColumns = (): Set<ColumnKey> => {
  try {
    migrateLegacyToNamespaced();
  } catch (error) {
    console.warn('ProductTable: persist columns failed', error);
  }

  let saved: string | null = null;
  let savedVersion: string | null = null;
  try {
    saved = localStorage.getItem(lsKey('productTableColumns'));
    savedVersion = localStorage.getItem(lsKey('productTableColumnsVersion'));
  } catch {
    return getDefaultColumnSet();
  }

  if (savedVersion !== COLUMN_CONFIG_VERSION) {
    const defaults = getDefaultColumnSet();
    try {
      localStorage.setItem(lsKey('productTableColumnsVersion'), COLUMN_CONFIG_VERSION);
      localStorage.setItem(lsKey('productTableColumns'), JSON.stringify([...defaults]));
    } catch {
      // noop si empresaId inválido
    }
    return defaults;
  }

  if (saved) {
    try {
      return new Set(JSON.parse(saved));
    } catch {
      return getDefaultColumnSet();
    }
  }

  return getDefaultColumnSet();
};

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

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(loadVisibleColumns);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(lsKey('productTableColumns'), JSON.stringify([...visibleColumns]));
      localStorage.setItem(lsKey('productTableColumnsVersion'), COLUMN_CONFIG_VERSION);
    } catch (error) {
      console.warn('No se pudo persistir preferencias de columnas (empresaId inválido?):', error);
    }
  }, [visibleColumns]);

  const toggleColumn = useCallback((columnKey: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setVisibleColumns(getDefaultColumnSet());
  }, []);

  const showAllColumns = useCallback(() => {
    setVisibleColumns(new Set(AVAILABLE_COLUMNS.map(col => col.key)));
  }, []);

  const hideAllColumns = useCallback(() => {
    setVisibleColumns(new Set());
  }, []);

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

  const columnsByGroup = useMemo(() => {
    return AVAILABLE_COLUMNS.reduce<Record<string, ColumnConfig[]>>((acc, column) => {
      if (!acc[column.group]) acc[column.group] = [];
      acc[column.group].push(column);
      return acc;
    }, {});
  }, []);

  return {
    rows,
    visibleColumns,
    showColumnSelector,
    setShowColumnSelector,
    toggleColumn,
    resetColumns,
    showAllColumns,
    hideAllColumns,
    handleSelectAll,
    handleSelectProduct,
    handleSort,
    getSortState,
    formatCurrency,
    isAllSelected,
    columnsByGroup,
    groupLabels: COLUMN_GROUP_LABELS,
    selectedProducts
  };
};
