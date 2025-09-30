import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Column, Product, PriceForm } from '../../models/PriceTypes';

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (priceData: PriceForm) => boolean;
  columns: Column[];
  selectedProduct?: Product | null;
  selectedColumn?: Column | null;
  onSwitchToVolumeModal?: (columnId: string) => void;
}

export const PriceModal: React.FC<PriceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  columns,
  selectedProduct,
  selectedColumn,
  onSwitchToVolumeModal
}) => {
  const [formData, setFormData] = useState<PriceForm>({
    type: 'fixed',
    sku: '',
    columnId: '',
    value: '',
    validFrom: '',
    validUntil: ''
  });

  useEffect(() => {
    if (selectedProduct && selectedColumn) {
      // Cargar datos existentes para edición
      const existingPrice = selectedProduct.prices[selectedColumn.id];
      
      if (existingPrice && existingPrice.type === 'fixed') {
        setFormData({
          type: 'fixed',
          sku: selectedProduct.sku,
          columnId: selectedColumn.id,
          value: existingPrice.value.toString(),
          validFrom: existingPrice.validFrom,
          validUntil: existingPrice.validUntil
        });
      } else {
        // Si no tiene precio en esa columna, usar valores por defecto pero con SKU y columna
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];
        
        setFormData({
          type: 'fixed',
          sku: selectedProduct.sku,
          columnId: selectedColumn.id,
          value: '',
          validFrom: today,
          validUntil: nextYearStr
        });
      }
    } else if (selectedProduct) {
      // Solo producto seleccionado, sin columna específica
      setFormData(prev => ({
        ...prev,
        sku: selectedProduct.sku
      }));
    } else {
      // Producto nuevo
      setFormData({
        type: 'fixed',
        sku: '',
        columnId: '',
        value: '',
        validFrom: '',
        validUntil: ''
      });
    }
  }, [selectedProduct, selectedColumn, isOpen]);

  const handleColumnChange = (columnId: string) => {
    const selectedColumn = columns.find(col => col.id === columnId);
    
    if (selectedColumn && selectedColumn.mode === 'volume' && onSwitchToVolumeModal) {
      // Si la columna seleccionada es de tipo volume, cambiar al modal de volumen
      onSwitchToVolumeModal(columnId);
      return;
    }
    
    // Si es fixed, actualizar el formulario normalmente
    if (formData.type === 'fixed') {
      setFormData({ ...formData, columnId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onSave(formData);
    if (success) {
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'fixed',
      sku: '',
      columnId: '',
      value: '',
      validFrom: '',
      validUntil: ''
    });
    onClose();
  };

  // Set default dates
  useEffect(() => {
    if (isOpen && !formData.validFrom) {
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const nextYearStr = nextYear.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        validFrom: today,
        validUntil: nextYearStr
      }));
    }
  }, [isOpen, formData.validFrom]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedProduct ? 'Editar precio' : 'Asignar precio'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ingrese SKU del producto"
              disabled={!!selectedProduct}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Columna</label>
            <select
              value={formData.columnId}
              onChange={(e) => handleColumnChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar columna</option>
              {columns.map(column => (
                <option key={column.id} value={column.id}>
                  {column.id} - {column.name} {column.mode === 'volume' ? '(Precio por cantidad)' : '(Precio fijo)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.type === 'fixed' ? formData.value : ''}
              onChange={(e) => {
                if (formData.type === 'fixed') {
                  setFormData({ ...formData, value: e.target.value });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vigente desde</label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vigente hasta</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={formData.validFrom}
                required
              />
            </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Guardar precio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};