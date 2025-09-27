import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Column, NewColumnForm } from '../../models/PriceTypes';

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnData: NewColumnForm) => boolean;
  editingColumn?: Column | null;
  hasBaseColumn: boolean;
}

export const ColumnModal: React.FC<ColumnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingColumn,
  hasBaseColumn
}) => {
  const [formData, setFormData] = useState<NewColumnForm>({
    name: '',
    mode: 'fixed',
    visible: true,
    isBase: false
  });

  useEffect(() => {
    if (editingColumn) {
      setFormData({
        name: editingColumn.name,
        mode: editingColumn.mode,
        visible: editingColumn.visible,
        isBase: editingColumn.isBase
      });
    } else {
      setFormData({
        name: '',
        mode: 'fixed',
        visible: true,
        isBase: false
      });
    }
  }, [editingColumn, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onSave(formData);
    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      mode: 'fixed',
      visible: true,
      isBase: false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingColumn ? 'Editar columna' : 'Agregar nueva columna'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la columna
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej: Precio de venta al público"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modo de valorización
            </label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'fixed' | 'volume' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="fixed">Fijo</option>
              <option value="volume">Matriz por volumen</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.visible}
                onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Visible</span>
            </label>

            {(!hasBaseColumn || (editingColumn && editingColumn.isBase)) && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isBase}
                  onChange={(e) => setFormData({ ...formData, isBase: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Columna base</span>
              </label>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {editingColumn ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};