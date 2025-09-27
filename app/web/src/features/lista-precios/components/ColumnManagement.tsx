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
}

export const ColumnManagement: React.FC<ColumnManagementProps> = ({
  columns,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onToggleVisibility,
  onSetBaseColumn
}) => {
  const handleMoveUp = (columnId: string) => {
    // TODO: Implement column reordering
    console.log('Move up:', columnId);
  };

  const handleMoveDown = (columnId: string) => {
    // TODO: Implement column reordering
    console.log('Move down:', columnId);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Plantilla de columnas</h3>
              <p className="text-sm text-gray-600">
                Máximo 10 columnas · Debe existir una sola columna Base · Al menos una visible.
              </p>
            </div>
            <button
              onClick={onAddColumn}
              disabled={columns.length >= 10}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} className="mr-2" />
              Agregar columna
            </button>
          </div>

          {/* Columns Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">COLUMNA</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">NOMBRE VISIBLE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">MODO DE VALORIZACIÓN</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">BASE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">VISIBLE</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">ORDEN</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((column) => (
                  <tr key={column.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {column.id}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-900 font-medium">
                      {column.name}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        column.mode === 'fixed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {column.mode === 'fixed' ? 'Fijo' : 'Matriz por volumen'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {column.isBase ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <Check size={12} className="mr-1" />
                          Base
                        </span>
                      ) : (
                        <button
                          onClick={() => onSetBaseColumn(column.id)}
                          className="text-xs text-gray-500 hover:text-blue-600 hover:underline transition-colors"
                        >
                          Establecer como base
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => onToggleVisibility(column.id)}
                        className={`p-1 rounded transition-colors ${
                          column.visible 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={column.visible ? 'Ocultar columna' : 'Mostrar columna'}
                      >
                        {column.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => handleMoveUp(column.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Mover arriba"
                        >
                          ▲
                        </button>
                        <span className="text-sm text-gray-600 min-w-[20px] text-center">
                          {column.order}
                        </span>
                        <button 
                          onClick={() => handleMoveDown(column.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Mover abajo"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditColumn(column)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Editar columna"
                        >
                          <Edit2 size={14} />
                        </button>
                        {!column.isBase && (
                          <button
                            onClick={() => onDeleteColumn(column.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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

          {columns.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No hay columnas configuradas</p>
              <p className="text-sm">Agrega tu primera columna para comenzar</p>
            </div>
          )}

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