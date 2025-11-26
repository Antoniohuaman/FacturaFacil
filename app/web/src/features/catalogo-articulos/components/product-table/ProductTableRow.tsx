import React from 'react';
import type { Product } from '../../models/types';
import type { Unit } from '../../../configuracion-sistema/models/Unit';
import type { ColumnKey } from './columnConfig';
import type { ProductEstablishmentRow } from '../../hooks/useProductTableViewModel';

interface ProductTableRowProps {
  row: ProductEstablishmentRow;
  visibleColumns: Set<ColumnKey>;
  selected: boolean;
  onToggleSelect: (productId: string, checked: boolean) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  units: Unit[];
  formatCurrency: (amount: number) => string;
}

const getUnitLabel = (units: Unit[], code?: string) => {
  if (!code) return '';
  const unit = units.find(unitItem => unitItem.code === code);
  return unit ? `${unit.code} - ${unit.name}` : code;
};

const formatDate = (value?: Date | string) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const ProductTableRow: React.FC<ProductTableRowProps> = ({
  row,
  visibleColumns,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  units,
  formatCurrency
}) => {
  return (
    <tr
      className={`
        hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
        ${selected ? 'bg-red-50 dark:bg-red-900/20' : ''}
      `}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
          checked={selected}
          onChange={(event) => onToggleSelect(row.id, event.target.checked)}
        />
      </td>

      {visibleColumns.has('codigo') && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{row.codigo}</div>
        </td>
      )}

      {visibleColumns.has('nombre') && (
        <td className="px-6 py-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{row.nombre}</div>
          {row.descripcion && (
            <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{row.descripcion}</div>
          )}
        </td>
      )}

      {visibleColumns.has('precio') && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(row.precio)}</div>
          {row.impuesto && <div className="text-xs text-gray-500 dark:text-gray-400">{row.impuesto}</div>}
        </td>
      )}

      {visibleColumns.has('establecimiento') && (
        <td className="px-6 py-4 whitespace-nowrap bg-purple-50/50 dark:bg-purple-900/10">
          {row._establishmentId === 'UNASSIGNED' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 italic">
              Sin asignar
            </span>
          ) : (
            <div>
              <div className="text-sm font-semibold text-purple-900 dark:text-purple-300">{row._establishmentCode}</div>
              <div className="text-xs text-purple-600 dark:text-purple-400 truncate max-w-[150px]">{row._establishmentName}</div>
            </div>
          )}
        </td>
      )}

      {visibleColumns.has('imagen') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.imagen ? (
            <img
              src={row.imagen}
              alt={row.nombre}
              className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
              onError={(event) => {
                (event.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect width="24" height="24" fill="%23f3f4f6"/%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </td>
      )}

      {visibleColumns.has('unidad') && (
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {getUnitLabel(units, row.unidad)}
          </span>
        </td>
      )}

      {visibleColumns.has('categoria') && (
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {row.categoria}
          </span>
        </td>
      )}

      {visibleColumns.has('disponibleEnTodos') && (
        <td className="px-6 py-4 whitespace-nowrap">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              row.disponibleEnTodos ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {row.disponibleEnTodos ? 'Sí' : 'No'}
          </span>
        </td>
      )}

      {visibleColumns.has('alias') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.alias ? (
            <div className="text-sm text-gray-900">{row.alias}</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('precioCompra') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.precioCompra ? (
            <div className="text-sm font-medium text-gray-900">{formatCurrency(row.precioCompra)}</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('porcentajeGanancia') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {typeof row.porcentajeGanancia === 'number' ? (
            <div className="text-sm text-gray-900">{row.porcentajeGanancia}%</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('codigoBarras') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.codigoBarras ? (
            <div className="text-sm font-mono text-gray-900">{row.codigoBarras}</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('codigoFabrica') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.codigoFabrica ? (
            <div className="text-sm font-mono text-gray-900">{row.codigoFabrica}</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('codigoSunat') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.codigoSunat ? (
            <div className="text-sm font-mono text-gray-900">{row.codigoSunat}</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('descuentoProducto') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {typeof row.descuentoProducto === 'number' ? (
            <div className="text-sm text-gray-900">{row.descuentoProducto}%</div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('marca') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.marca ? <div className="text-sm text-gray-900">{row.marca}</div> : <span className="text-sm text-gray-400">-</span>}
        </td>
      )}

      {visibleColumns.has('modelo') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.modelo ? <div className="text-sm text-gray-900">{row.modelo}</div> : <span className="text-sm text-gray-400">-</span>}
        </td>
      )}

      {visibleColumns.has('peso') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.peso ? <div className="text-sm text-gray-900">{row.peso} kg</div> : <span className="text-sm text-gray-400">-</span>}
        </td>
      )}

      {visibleColumns.has('tipoExistencia') && (
        <td className="px-6 py-4 whitespace-nowrap">
          {row.tipoExistencia ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {row.tipoExistencia.replace(/_/g, ' ')}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      )}

      {visibleColumns.has('fechaCreacion') && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {formatDate(row.fechaCreacion)}
        </td>
      )}

      {visibleColumns.has('fechaActualizacion') && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {formatDate(row.fechaActualizacion)}
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(row)}
            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-md hover:bg-red-50"
            title="Editar producto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                onDelete(row.id);
              }
            }}
            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-md hover:bg-red-50"
            title="Eliminar producto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <div className="relative">
            <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-50" title="Más opciones">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
