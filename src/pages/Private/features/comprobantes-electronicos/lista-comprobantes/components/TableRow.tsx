/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/**
 * TableRow - Componente de fila de tabla de comprobantes
 * Maneja la visualización de cada comprobante y sus acciones
 */

import { MoreHorizontal, Eye, Edit2, Copy, Share2, Printer, XCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import type { ColumnConfig } from './TableHeader';

interface Comprobante {
  id: string;
  type: string;
  clientDoc: string;
  client: string;
  date: string;
  vendor: string;
  total: number;
  status: string;
  statusColor: 'blue' | 'green' | 'red' | 'orange';
  currency?: string;
  paymentMethod?: string;
  [key: string]: any;
}

interface TableRowProps {
  invoice: Comprobante;
  visibleColumns: ColumnConfig[];
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (invoice: Comprobante) => void;
  onEdit: (invoice: Comprobante) => void;
  onDuplicate: (invoice: Comprobante) => void;
  onShare: (invoice: Comprobante) => void;
  onPrint: (invoice: Comprobante) => void;
  onVoid: (invoice: Comprobante) => void;
  getStatusBadge: (status: string) => ReactElement;
}

export const TableRow: React.FC<TableRowProps> = ({
  invoice,
  visibleColumns,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDuplicate,
  onShare,
  onPrint,
  onVoid,
  getStatusBadge
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
      setShowMenu(!showMenu);
    }
  };

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const renderCellContent = (column: ColumnConfig) => {
    const value = invoice[column.key];

    // Casos especiales
    if (column.key === 'status') {
      return getStatusBadge(invoice.status);
    }

    if (column.key === 'total') {
      const symbol = invoice.currency === 'USD' ? '$' : 'S/';
      return (
        <span className="font-semibold text-gray-900 dark:text-white">
          {symbol} {typeof value === 'number' ? value.toFixed(2) : '0.00'}
        </span>
      );
    }

    if (column.key === 'actions') {
      return (
        <div className="flex items-center justify-end space-x-1">
          <button
            onClick={() => onView(invoice)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Ver"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(invoice)}
            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            ref={buttonRef}
            onClick={handleMenuClick}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Más opciones"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      );
    }

    // Texto normal
    if (column.truncate && typeof value === 'string' && value.length > 30) {
      return (
        <span className="truncate block" title={value}>
          {value}
        </span>
      );
    }

    return value || '-';
  };

  return (
    <>
      <tr
        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
      >
        {/* Checkbox */}
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(invoice.id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500"
          />
        </td>

        {/* Columnas dinámicas */}
        {visibleColumns.map((column) => (
          <td
            key={column.id}
            className={`px-6 py-4 whitespace-nowrap text-sm ${
              column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'
            } ${column.key === 'id' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {renderCellContent(column)}
          </td>
        ))}
      </tr>

      {/* Menú contextual */}
      {showMenu && menuPosition && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left - 180}px`
            }}
          >
            <button
              onClick={() => { onDuplicate(invoice); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicar</span>
            </button>
            <button
              onClick={() => { onShare(invoice); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </button>
            <button
              onClick={() => { onPrint(invoice); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <hr className="my-1 border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => { onVoid(invoice); setShowMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Anular</span>
            </button>
          </div>
        </>
      )}
    </>
  );
};
