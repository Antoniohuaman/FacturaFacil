import React from 'react';
import type { Product } from '../../models/types';
import type { ColumnKey } from './columnConfig';
import type { FilterOptions } from '../../models/types';
import type { ProductTableColumnState } from '../../hooks/useProductColumnsManager';

interface ProductTableHeaderProps {
  columns: ProductTableColumnState[];
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

const renderHeaderCell = (
  columnKey: ColumnKey,
  onSort: (field: keyof Product) => void,
  getSortState: (field: keyof Product) => FilterOptions['direccion'] | null
): React.ReactElement | null => {
  switch (columnKey) {
    case 'codigo':
      return (
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
      );
    case 'nombre':
      return (
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
      );
    case 'establecimiento':
      return (
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
      );
    case 'imagen':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Imagen
        </th>
      );
    case 'unidad':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Unidad
        </th>
      );
    case 'categoria':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Categoría
        </th>
      );
    case 'descripcion':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Descripción
        </th>
      );
    case 'impuesto':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Impuesto
        </th>
      );
    case 'disponibleEnTodos':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Disponible en todos
        </th>
      );
    case 'alias':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Alias
        </th>
      );
    case 'precioCompra':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Precio Compra
        </th>
      );
    case 'porcentajeGanancia':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          % Ganancia
        </th>
      );
    case 'codigoBarras':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Código Barras
        </th>
      );
    case 'codigoFabrica':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Código Fábrica
        </th>
      );
    case 'codigoSunat':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Código SUNAT
        </th>
      );
    case 'descuentoProducto':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          % Descuento
        </th>
      );
    case 'marca':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Marca
        </th>
      );
    case 'modelo':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Modelo
        </th>
      );
    case 'peso':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Peso (kg)
        </th>
      );
    case 'tipoExistencia':
      return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Tipo de Existencia
        </th>
      );
    case 'fechaCreacion':
      return (
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          onClick={() => onSort('fechaCreacion')}
        >
          <div className="flex items-center space-x-1">
            <span>Fecha Creación</span>
            <SortIcon state={getSortState('fechaCreacion')} />
          </div>
        </th>
      );
    case 'fechaActualizacion':
      return (
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          onClick={() => onSort('fechaActualizacion')}
        >
          <div className="flex items-center space-x-1">
            <span>Última Actualización</span>
            <SortIcon state={getSortState('fechaActualizacion')} />
          </div>
        </th>
      );
    default:
      return null;
  }
};

export const ProductTableHeader: React.FC<ProductTableHeaderProps> = ({
  columns,
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

        {columns.map(column => {
          const cell = renderHeaderCell(column.key, onSort, getSortState);
          if (!cell) {
            return null;
          }
          return React.cloneElement(cell, { key: column.key });
        })}

        <th scope="col" className="relative px-6 py-3">
          <span className="sr-only">Acciones</span>
        </th>
      </tr>
    </thead>
  );
};
