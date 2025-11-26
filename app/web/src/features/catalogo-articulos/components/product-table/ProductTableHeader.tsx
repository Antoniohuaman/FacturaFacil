import React from 'react';
import type { Product } from '../../models/types';
import type { ColumnKey } from './columnConfig';
import type { FilterOptions } from '../../models/types';

interface ProductTableHeaderProps {
  visibleColumns: Set<ColumnKey>;
  onSort: (field: keyof Product) => void;
  getSortState: (field: keyof Product) => FilterOptions['direccion'] | null;
  isAllSelected: boolean;
  onSelectAll: (checked: boolean) => void;
}

const SortIcon: React.FC<{ state: FilterOptions['direccion'] | null }> = ({ state }) => {
  if (!state) {
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  return state === 'asc' ? (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
};

export const ProductTableHeader: React.FC<ProductTableHeaderProps> = ({
  visibleColumns,
  onSort,
  getSortState,
  isAllSelected,
  onSelectAll
}) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        <th scope="col" className="w-12 px-6 py-3">
          <input
            type="checkbox"
            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
            checked={isAllSelected}
            onChange={(event) => onSelectAll(event.target.checked)}
          />
        </th>

        {visibleColumns.has('codigo') && (
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onSort('codigo')}
          >
            <div className="flex items-center space-x-1">
              <span>Código</span>
              <SortIcon state={getSortState('codigo')} />
            </div>
          </th>
        )}

        {visibleColumns.has('nombre') && (
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onSort('nombre')}
          >
            <div className="flex items-center space-x-1">
              <span>Nombre</span>
              <SortIcon state={getSortState('nombre')} />
            </div>
          </th>
        )}

        {visibleColumns.has('precio') && (
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            onClick={() => onSort('precio')}
          >
            <div className="flex items-center space-x-1">
              <span>Precio</span>
              <SortIcon state={getSortState('precio')} />
            </div>
          </th>
        )}

        {visibleColumns.has('establecimiento') && (
          <th
            scope="col"
            className="px-6 py-3 text-left text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-50 dark:bg-purple-900/20"
          >
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Establecimiento</span>
            </div>
          </th>
        )}

        {visibleColumns.has('imagen') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Imagen
          </th>
        )}

        {visibleColumns.has('unidad') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Unidad
          </th>
        )}

        {visibleColumns.has('categoria') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Categoría
          </th>
        )}

        {visibleColumns.has('alias') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Alias
          </th>
        )}

        {visibleColumns.has('precioCompra') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Precio Compra
          </th>
        )}

        {visibleColumns.has('porcentajeGanancia') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            % Ganancia
          </th>
        )}

        {visibleColumns.has('codigoBarras') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Código Barras
          </th>
        )}

        {visibleColumns.has('codigoFabrica') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Código Fábrica
          </th>
        )}

        {visibleColumns.has('codigoSunat') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Código SUNAT
          </th>
        )}

        {visibleColumns.has('descuentoProducto') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            % Descuento
          </th>
        )}

        {visibleColumns.has('marca') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Marca
          </th>
        )}

        {visibleColumns.has('modelo') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Modelo
          </th>
        )}

        {visibleColumns.has('peso') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Peso (kg)
          </th>
        )}

        {visibleColumns.has('tipoExistencia') && (
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Tipo de Existencia
          </th>
        )}

        <th scope="col" className="relative px-6 py-3">
          <span className="sr-only">Acciones</span>
        </th>
      </tr>
    </thead>
  );
};
