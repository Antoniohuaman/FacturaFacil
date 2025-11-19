import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Column, NewColumnForm } from '../../models/PriceTypes';

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnData: NewColumnForm) => boolean | Promise<boolean>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditingBase = Boolean(editingColumn?.isBase);

  useEffect(() => {
    if (editingColumn) {
      setFormData({
        name: editingColumn.name,
        mode: editingColumn.isBase ? 'fixed' : editingColumn.mode,
        visible: editingColumn.isBase ? true : editingColumn.visible,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload: NewColumnForm = {
      ...formData,
      name: formData.name.trim()
    };
    
    try {
      if (!payload.name) {
        return;
      }
      const success = await onSave(payload);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
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
              disabled={isEditingBase}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isEditingBase ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
              title={isEditingBase ? 'La columna base siempre usa precio fijo' : undefined}
            >
              <option value="fixed">Precio fijo</option>
              <option value="volume">Precio por cantidad</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.visible}
                onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                disabled={isEditingBase}
                className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isEditingBase ? 'cursor-not-allowed' : ''}`}
                title={isEditingBase ? 'La columna base siempre es visible' : undefined}
              />
              <span className="ml-2 text-sm text-gray-700">Visible</span>
            </label>

            {(!hasBaseColumn || (editingColumn && editingColumn.isBase)) && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isBase}
                  onChange={(e) => setFormData({ ...formData, isBase: e.target.checked })}
                  disabled
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-not-allowed"
                  title="Siempre debe existir exactamente una columna base"
                />
                <span className="ml-2 text-sm text-gray-700">Columna base</span>
              </label>
            )}
          </div>

          {isEditingBase && (
            <p className="text-xs text-gray-500">
              La columna base siempre se mantiene fija y visible; solo puedes cambiar su nombre.
            </p>
          )}

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
              disabled={!formData.name.trim() || isSubmitting}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              style={!(!formData.name.trim() || isSubmitting) ? { backgroundColor: '#1478D4' } : {}}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </>
              ) : (
                editingColumn ? 'Guardar' : 'Agregar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};