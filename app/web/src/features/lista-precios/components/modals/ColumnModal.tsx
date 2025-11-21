import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Column, NewColumnForm } from '../../models/PriceTypes';
import { getColumnDisplayName, getFixedColumnHelpText, isFixedColumn, isGlobalColumn } from '../../utils/priceHelpers';

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (columnData: NewColumnForm) => boolean | Promise<boolean>;
  editingColumn?: Column | null;
}

export const ColumnModal: React.FC<ColumnModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingColumn
}) => {
  const [formData, setFormData] = useState<NewColumnForm>({
    name: '',
    mode: 'fixed',
    visible: true,
    isVisibleInTable: true,
    kind: 'manual',
    globalRuleType: 'percent',
    globalRuleValue: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ruleValueInput, setRuleValueInput] = useState('');
  const isEditingBase = editingColumn?.kind === 'base';
  const isEditingGlobal = editingColumn ? isGlobalColumn(editingColumn) : false;
  const isSpecialManualColumn = editingColumn ? (editingColumn.kind === 'product-discount' || editingColumn.kind === 'min-allowed') : false;
  const isManualContext = !editingColumn || editingColumn.kind === 'manual' || isSpecialManualColumn;
  const displayName = editingColumn ? getColumnDisplayName(editingColumn) : null;
  const fixedHelpText = editingColumn ? getFixedColumnHelpText(editingColumn.id) : null;
  const editingIsFixed = editingColumn ? isFixedColumn(editingColumn) : false;

  useEffect(() => {
    if (editingColumn) {
      setFormData({
        name: editingColumn.name,
        mode: editingColumn.kind === 'product-discount' || editingColumn.kind === 'min-allowed' ? 'fixed' : editingColumn.mode,
        visible: editingColumn.visible,
        isVisibleInTable: editingColumn.isVisibleInTable ?? true,
        kind: editingColumn.kind,
        globalRuleType: editingColumn.globalRuleType ?? 'percent',
        globalRuleValue: editingColumn.globalRuleValue ?? null
      });
      setRuleValueInput(
        editingColumn.globalRuleValue != null ? editingColumn.globalRuleValue.toString() : ''
      );
    } else {
      setFormData({
        name: '',
        mode: 'fixed',
        visible: true,
        isVisibleInTable: true,
        kind: 'manual',
        globalRuleType: 'percent',
        globalRuleValue: null
      });
      setRuleValueInput('');
    }
  }, [editingColumn, isOpen]);

  const handleRuleValueChange = (value: string) => {
    setRuleValueInput(value);
    const parsed = Number(value);
    setFormData(prev => ({
      ...prev,
      globalRuleValue: value.trim() === '' || Number.isNaN(parsed) ? null : Math.max(parsed, 0)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return;
    }
    if (isEditingGlobal && formData.globalRuleValue == null) {
      alert('Ingresa un valor para la regla global.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: NewColumnForm = {
        ...formData,
        name: formData.name.trim(),
        kind: editingColumn?.kind ?? 'manual',
        isVisibleInTable: formData.isVisibleInTable ?? true
      };

      if (!isEditingGlobal) {
        delete payload.globalRuleType;
        delete payload.globalRuleValue;
      }

      if (isSpecialManualColumn) {
        payload.mode = 'fixed';
      }

      const success = await onSave(payload);
      if (success) {
        handleClose();
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
      isVisibleInTable: true,
      kind: 'manual',
      globalRuleType: 'percent',
      globalRuleValue: null
    });
    setRuleValueInput('');
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
              placeholder={displayName ?? 'Ej: Precio preferencial'}
              disabled={editingIsFixed}
              required
            />
            {editingIsFixed && (
              <p className="text-xs text-gray-500 mt-1">
                Los nombres de las columnas fijas se definen automáticamente y no se pueden editar.
              </p>
            )}
            {fixedHelpText && (
              <p className="text-xs text-gray-500 mt-1">
                {fixedHelpText}
              </p>
            )}
          </div>

          {isManualContext && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modo de valorización
              </label>
              <select
                value={formData.mode}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'fixed' | 'volume' })}
                disabled={isSpecialManualColumn || editingIsFixed}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="fixed">Precio fijo</option>
                <option value="volume">Precio por cantidad</option>
              </select>
              {(isSpecialManualColumn || editingIsFixed) && (
                <p className="text-xs text-gray-500 mt-1">
                  {isSpecialManualColumn
                    ? 'Esta columna especial siempre usa precio fijo manual.'
                    : 'Las columnas fijas mantienen el modo de valorización predeterminado.'}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">Visibilidad</p>
            <div className="space-y-3">
              <label className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900">Visible en formularios</span>
                  <p className="text-xs text-gray-500">Permite usar esta columna al gestionar precios.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.visible}
                  onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900">Visible en tabla</span>
                  <p className="text-xs text-gray-500">Controla si la columna se muestra en la tabla de precios.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isVisibleInTable !== false}
                  onChange={(e) => setFormData({ ...formData, isVisibleInTable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {isEditingBase && (
            <p className="text-xs text-gray-500">
              La columna base siempre se mantiene fija; solo puedes ajustar su nombre y visibilidad.
            </p>
          )}

          {isEditingGlobal && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regla desde precio base
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.globalRuleType ?? 'percent'}
                    onChange={(e) => setFormData(prev => ({ ...prev, globalRuleType: e.target.value as 'percent' | 'amount' }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percent">Porcentaje sobre base</option>
                    <option value="amount">Monto fijo</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ruleValueInput}
                    onChange={(e) => handleRuleValueChange(e.target.value)}
                    className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Usa valores positivos. El descuento resta y el recargo suma al precio base.
                </p>
              </div>
            </div>
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
              disabled={!formData.name.trim() || (isEditingGlobal && formData.globalRuleValue == null) || isSubmitting}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              style={!(!formData.name.trim() || (isEditingGlobal && formData.globalRuleValue == null) || isSubmitting) ? { backgroundColor: '#1478D4' } : {}}
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