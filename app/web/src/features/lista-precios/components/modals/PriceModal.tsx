import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import type { Column, Product, PriceForm } from '../../models/PriceTypes';

interface CatalogProduct {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  [key: string]: any;
}

interface PriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (priceData: PriceForm) => boolean;
  columns: Column[];
  selectedProduct?: Product | null;
  selectedColumn?: Column | null;
  onSwitchToVolumeModal?: (columnId: string) => void;
  catalogProducts?: CatalogProduct[];
}

export const PriceModal: React.FC<PriceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  columns,
  selectedProduct,
  selectedColumn,
  onSwitchToVolumeModal,
  catalogProducts = []
}) => {
  const [formData, setFormData] = useState<PriceForm>({
    type: 'fixed',
    sku: '',
    columnId: '',
    value: '',
    validFrom: '',
    validUntil: ''
  });

  const [skuSearch, setSkuSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedProduct && selectedColumn) {
      // Cargar datos existentes para edición
      const existingPrice = selectedProduct.prices[selectedColumn.id];

      setSkuSearch(selectedProduct.sku);
      setSelectedProductName(selectedProduct.name);

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
      setSkuSearch(selectedProduct.sku);
      setSelectedProductName(selectedProduct.name);
      setFormData(prev => ({
        ...prev,
        sku: selectedProduct.sku
      }));
    } else {
      // Producto nuevo
      setSkuSearch('');
      setSelectedProductName('');
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

  // Filtrar productos del catálogo según búsqueda
  const filteredCatalogProducts = catalogProducts.filter(product =>
    product.codigo.toLowerCase().includes(skuSearch.toLowerCase()) ||
    product.nombre.toLowerCase().includes(skuSearch.toLowerCase())
  ).slice(0, 10); // Limitar a 10 resultados

  // Manejar selección de producto del catálogo
  const handleSelectProduct = (product: CatalogProduct) => {
    setSkuSearch(product.codigo);
    setSelectedProductName(product.nombre);
    setFormData({ ...formData, sku: product.codigo });
    setShowSuggestions(false);
  };

  // Manejar cambio en el campo de búsqueda de SKU
  const handleSkuSearchChange = (value: string) => {
    setSkuSearch(value);
    setFormData({ ...formData, sku: value });
    setShowSuggestions(value.length > 0);

    // Buscar producto para mostrar nombre
    const product = catalogProducts.find(p => p.codigo === value);
    if (product) {
      setSelectedProductName(product.nombre);
    } else {
      setSelectedProductName('');
    }
  };

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
    setSkuSearch('');
    setSelectedProductName('');
    setShowSuggestions(false);
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
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU del producto
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={skuSearch}
                onChange={(e) => handleSkuSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(skuSearch.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Buscar por SKU o nombre..."
                disabled={!!selectedProduct}
                required
              />
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            </div>

            {selectedProductName && (
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Producto: <span className="font-medium">{selectedProductName}</span>
              </div>
            )}

            {!selectedProduct && showSuggestions && filteredCatalogProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCatalogProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{product.codigo}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{product.nombre}</div>
                    </div>
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      S/ {product.precio.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!selectedProduct && showSuggestions && skuSearch.length > 0 && filteredCatalogProducts.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4">
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
                  No se encontraron productos que coincidan con "{skuSearch}"
                </div>
              </div>
            )}
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
              className="px-4 py-2 text-white rounded-lg hover:opacity-90"
              style={{ backgroundColor: '#1478D4' }}
            >
              Guardar precio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};