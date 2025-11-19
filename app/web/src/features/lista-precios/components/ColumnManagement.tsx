import React from 'react';
import { Plus, Eye, EyeOff, Edit2, Trash2, Check, Info } from 'lucide-react';
import type { Column } from '../models/PriceTypes';

interface ColumnManagementProps {
  columns: Column[];
  onAddColumn: () => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleVisibility: (columnId: string) => void;
  onSetBaseColumn: (columnId: string) => void;
  onUpdateColumn: (columnId: string, updates: Partial<Column>) => void;
}

export const ColumnManagement: React.FC<ColumnManagementProps> = ({
  columns,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onToggleVisibility,
  onSetBaseColumn,
  onUpdateColumn
}) => {
  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Plantilla de columnas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Máximo 10 columnas · Debe existir una sola columna Base · Al menos una visible.
              </p>
            </div>
            <button
              onClick={onAddColumn}
              disabled={columns.length >= 10}
              className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              style={columns.length < 10 ? { backgroundColor: '#1478D4' } : {}}
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
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">MODO DE VALORIZACIÓN</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">REGLA DESDE BASE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">BASE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">VISIBLE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column) => (
                  <tr key={column.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                        {column.id}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-900 dark:text-white font-medium">
                      {column.name}
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
                      {column.isBase ? (
                        <span className="text-xs text-gray-500">Manual</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={column.calculationMode ?? 'manual'}
                            onChange={(e) => onUpdateColumn(column.id, { calculationMode: e.target.value as 'manual' | 'percentOverBase' | 'fixedOverBase' })}
                            className="px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400"
                          >
                            <option value="manual">Manual</option>
                            <option value="percentOverBase">% base</option>
                            <option value="fixedOverBase">Monto base</option>
                          </select>
                          {column.calculationMode !== 'manual' && (
                            <input
                              type="number"
                              step="0.01"
                              value={column.calculationValue ?? ''}
                              onChange={(e) => onUpdateColumn(column.id, {
                                calculationValue: e.target.value === '' ? null : Number(e.target.value)
                              })}
                              className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-400"
                              placeholder="0"
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {column.isBase ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                          <Check size={12} className="mr-1" />
                          Base
                        </span>
                      ) : (
                        <button
                          onClick={() => onSetBaseColumn(column.id)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                        >
                          Establecer como base
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {column.isBase ? (
                        <div
                          className="inline-flex items-center p-1 rounded text-blue-600/70 cursor-not-allowed"
                          title="La columna base siempre está visible"
                        >
                          <Eye size={16} />
                        </div>
                      ) : (
                        <button
                          onClick={() => onToggleVisibility(column.id)}
                          className={`p-1 rounded transition-colors ${
                            column.visible 
                              ? 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20' 
                              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          title={column.visible ? 'Ocultar columna' : 'Mostrar columna'}
                        >
                          {column.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      )}
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
                        {column.isBase ? (
                          <span
                            className="text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            title="No se puede eliminar la columna base"
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex">
              <Info size={16} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Columna Base:</strong> Define el precio de referencia principal (ej: P1) que se usa 
                al emitir comprobantes. No se puede eliminar y debe existir al menos una.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};