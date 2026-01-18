import type { Product, FilterOptions } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/models/Establishment';
import React, { useMemo } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { ProductTableHeader } from './product-table/ProductTableHeader';
import { ProductTableRow } from './product-table/ProductTableRow';
import { ProductTableEmptyState } from './product-table/ProductTableEmptyState';
import { useProductTableViewModel } from '../hooks/useProductTableViewModel';
import type { ProductTableColumnState } from '../hooks/useProductColumnsManager';

interface ProductTableProps {
  products: Product[];
  filters: FilterOptions;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  loading?: boolean;
  selectedProducts: Set<string>;
  onSelectedProductsChange: (selected: Set<string>) => void;
  // ✅ Nuevas props para filtro de establecimiento
  establishmentScope?: string;
  establishments?: Establishment[];
  columns: ProductTableColumnState[];
  onToggleFavorite: (productId: string) => void;
  onRowClick?: (productId: string) => void;
  activeProductId?: string | null;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  filters,
  onFiltersChange,
  onEditProduct,
  onDeleteProduct,
  loading = false,
  selectedProducts,
  onSelectedProductsChange,
  establishmentScope = 'ALL',
  establishments: establishmentsProp,
  columns,
  onToggleFavorite,
  onRowClick,
  activeProductId
}) => {
  const { state: configState } = useConfigurationContext();
  const establishmentsFromContext = configState.establishments || [];
  const establishments = establishmentsProp || establishmentsFromContext;
  const units = configState.units || [];

  const {
    rows,
    handleSelectAll,
    handleSelectProduct,
    handleSort,
    getSortState,
    formatCurrency,
    isAllSelected
  } = useProductTableViewModel({
    products,
    filters,
    onFiltersChange,
    selectedProducts,
    onSelectedProductsChange,
    establishmentScope,
    establishments
  });

  const visibleColumns = useMemo(() => columns.filter(column => column.visible), [columns]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse p-6">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="col-span-6">
                <div className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                {i < 4 && <div className="border-t border-gray-200 mt-4"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Contenedor con scroll horizontal mejorado */}
        <div
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#9CA3AF #F3F4F6' }}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <ProductTableHeader
              columns={visibleColumns}
              onSort={handleSort}
              getSortState={getSortState}
              isAllSelected={isAllSelected}
              onSelectAll={handleSelectAll}
            />

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {rows.map((row, index) => (
                <ProductTableRow
                  key={`${row.id}-${index}`}
                  row={row}
                  columns={visibleColumns}
                  selected={selectedProducts.has(row.id)}
                  onToggleSelect={handleSelectProduct}
                  onToggleFavorite={onToggleFavorite}
                  onEdit={onEditProduct}
                  onDelete={onDeleteProduct}
                  units={units}
                  establishments={establishments}
                  establishmentScope={establishmentScope}
                  formatCurrency={formatCurrency}
                  onRowClick={onRowClick}
                  isActive={activeProductId === row.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length === 0 && <ProductTableEmptyState establishmentScope={establishmentScope} />}
    </>
  );
};

export default ProductTable;