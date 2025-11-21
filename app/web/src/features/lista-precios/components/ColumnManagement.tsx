import React from 'react';
import { Plus, Eye, EyeOff, Edit2, Trash2, Check, Info, Table } from 'lucide-react';
import type { Column } from '../models/PriceTypes';
import {
  countManualColumns,
  MANUAL_COLUMN_LIMIT,
  isGlobalColumn,
  isProductDiscountColumn,
  isMinAllowedColumn,
  getFixedColumnHelpText,
  getColumnDisplayName,
  isFixedColumn
} from '../utils/priceHelpers';

interface ColumnManagementProps {
  columns: Column[];
  onAddColumn: () => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleVisibility: (columnId: string) => void;
  onToggleTableVisibility: (columnId: string) => void;
}

export const ColumnManagement: React.FC<ColumnManagementProps> = ({
  columns,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onToggleVisibility,
  onToggleTableVisibility
}) => {
  const manualCount = countManualColumns(columns);
  const manualLimitReached = manualCount >= MANUAL_COLUMN_LIMIT;

  const renderKindBadge = (column: Column) => {
    switch (column.kind) {
      case 'base':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Base principal
          </span>
        );
      case 'global-discount':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Descuento global
          </span>
        );
      case 'global-increase':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Recargo global
          </span>
        );
      case 'product-discount':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Precio con descuento
          </span>
        );
      case 'min-allowed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Precio mínimo permitido
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Manual
          </span>
        );
    }
  };

  const renderRuleDescription = (column: Column) => {
    if (column.kind === 'base') {
      return <span className="text-xs text-gray-500">Definición manual</span>;
    }
    if (isGlobalColumn(column)) {
      if (column.globalRuleValue == null) {
        return <span className="text-xs text-gray-500">Configura la regla</span>;
      }
      const sign = column.kind === 'global-discount' ? '-' : '+';
      const formattedValue = column.globalRuleType === 'amount'
        ? `${sign} S/ ${column.globalRuleValue.toFixed(2)}`
        : `${sign}${column.globalRuleValue}%`;
      return (
        <span className="text-xs font-medium text-gray-700">
          {column.globalRuleType === 'amount' ? 'Monto fijo' : 'Porcentaje'} {formattedValue}
        </span>
      );
    }
    if (isProductDiscountColumn(column) || isMinAllowedColumn(column)) {
      return <span className="text-xs text-gray-500">Manual</span>;
    }
    return <span className="text-xs text-gray-500">Manual</span>;
  };

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Plantilla de columnas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Máximo {MANUAL_COLUMN_LIMIT} columnas manuales · Base y reglas globales son obligatorias.
              </p>
            </div>
            <button
              onClick={onAddColumn}
              disabled={manualLimitReached}
              className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              style={!manualLimitReached ? { backgroundColor: '#1478D4' } : {}}
            >
              <Plus size={16} className="mr-2" />
              Agregar columna
            </button>
          </div>

          {/* Columns Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">COLUMNA</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">NOMBRE VISIBLE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">TIPO</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">MODO DE VALORIZACIÓN</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">DETALLE / REGLA</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">BASE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">VISIBLE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">VISIBLE EN TABLA</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column) => {
                  const fixedHelpText = getFixedColumnHelpText(column.id);
                  const displayName = getColumnDisplayName(column);
                  const isTableVisible = column.isVisibleInTable !== false;
                  return (
                    <tr key={column.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                        {column.id}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-900 dark:text-white font-medium">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {displayName}
                        </div>
                        {fixedHelpText && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {fixedHelpText}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {renderKindBadge(column)}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        column.mode === 'fixed' 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' 
                          : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {column.mode === 'fixed' ? 'Precio fijo' : 'Precio por cantidad'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {renderRuleDescription(column)}
                    </td>
                    <td className="py-3 px-2">
                      {column.isBase ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                          <Check size={12} className="mr-1" />
                          Base fija
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => onToggleVisibility(column.id)}
                        className={`p-1 rounded transition-colors ${
                          column.visible 
                            ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20' 
                            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={column.visible ? 'Ocultar en formularios' : 'Mostrar en formularios'}
                      >
                        {column.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => onToggleTableVisibility(column.id)}
                        className={`p-1 rounded transition-colors ${
                          isTableVisible
                            ? 'text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                            : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={isTableVisible ? 'Ocultar en tablas' : 'Mostrar en tablas'}
                      >
                        {isTableVisible ? <Table size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onEditColumn(column)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          title="Editar columna"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isFixedColumn(column) ? (
                          <span
                            className="text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            title="No se puede eliminar esta columna"
                          >
                            <Trash2 size={14} />
                          </span>
                        ) : (
                          <button
                            onClick={() => onDeleteColumn(column.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                            title="Eliminar columna"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex">
              <Info size={16} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  <strong>Columna base:</strong> Define el precio de referencia principal que se usa al emitir comprobantes.
                  Siempre es visible y se edita manualmente.
                </p>
                <p>
                  <strong>Reglas globales:</strong> Las columnas de descuento y recargo calculan valores desde el precio base y son de solo lectura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};