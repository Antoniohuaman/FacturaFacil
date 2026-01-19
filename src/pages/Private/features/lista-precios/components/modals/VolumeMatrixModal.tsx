import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Plus, Trash2, AlertCircle, Info, Search } from 'lucide-react';
import { getBusinessDefaultValidityRange } from '@/shared/time/businessTime';
import { useCurrencyManager } from '@/shared/currency';
import type { Column, Product, VolumePriceForm, VolumeRange, CatalogProduct, ProductUnitOption } from '../../models/PriceTypes';
import { generateDefaultVolumeRanges, validateVolumeRanges } from '../../utils/priceHelpers';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface VolumeMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (priceData: VolumePriceForm) => Promise<boolean> | boolean;
  column: Column;
  selectedProduct?: Product | null;
  catalogProducts?: CatalogProduct[];
  unitOptions?: ProductUnitOption[];
  initialUnitCode?: string;
}

export const VolumeMatrixModal: React.FC<VolumeMatrixModalProps> = ({
  isOpen,
  onClose,
  onSave,
  column,
  selectedProduct,
  catalogProducts = [],
  unitOptions,
  initialUnitCode
}) => {
  const [formData, setFormData] = useState<VolumePriceForm>({
    type: 'volume',
    sku: '',
    columnId: column.id,
    unitCode: initialUnitCode || '',
    ranges: [],
    validFrom: '',
    validUntil: ''
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { state: configState } = useConfigurationContext();
  const { baseCurrency, formatMoney } = useCurrencyManager();
  const formatCurrency = useCallback((amount: number) => formatMoney(amount, baseCurrency.code), [formatMoney, baseCurrency.code]);
  const unitsByCode = useMemo(() => new Map(configState.units.map(unit => [unit.code, unit] as const)), [configState.units]);

  const formatUnitLabel = useCallback((code: string) => {
    const unit = unitsByCode.get(code);
    if (!unit) return code;
    const symbol = unit.symbol || unit.code;
    const name = unit.name || '';
    return `${symbol} ${name}`.trim();
  }, [unitsByCode]);

  const deriveDefaultUnit = useCallback((sku: string) => {
    if (!sku) return initialUnitCode || '';
    const catalogProduct = catalogProducts.find(product => product.codigo === sku);
    return catalogProduct?.unidad || initialUnitCode || '';
  }, [catalogProducts, initialUnitCode]);

  const catalogUnitOptions = useMemo(() => {
    const sku = formData.sku.trim();
    if (!sku) return [] as ProductUnitOption[];
    const catalogProduct = catalogProducts.find(product => product.codigo === sku);
    if (!catalogProduct) return [] as ProductUnitOption[];

    const seen = new Set<string>();
    const options: ProductUnitOption[] = [];

    const addOption = (code?: string, isBase = false, factor?: number) => {
      if (!code || seen.has(code)) return;
      seen.add(code);
      options.push({ code, label: formatUnitLabel(code), isBase, factor });
    };

    addOption(catalogProduct.unidad, true);
    catalogProduct.unidadesMedidaAdicionales?.forEach(unit => addOption(unit.unidadCodigo, false, unit.factorConversion));

    return options;
  }, [catalogProducts, formData.sku, formatUnitLabel]);

  const availableUnitOptions = useMemo(() => {
    if (unitOptions && unitOptions.length > 0) {
      return unitOptions.map(option => ({
        ...option,
        label: option.label || formatUnitLabel(option.code)
      }));
    }
    if (catalogUnitOptions.length > 0) {
      return catalogUnitOptions;
    }
    const fallbackUnit = deriveDefaultUnit(formData.sku);
    if (!fallbackUnit) return [] as ProductUnitOption[];
    return [{ code: fallbackUnit, label: formatUnitLabel(fallbackUnit), isBase: true }];
  }, [unitOptions, catalogUnitOptions, deriveDefaultUnit, formData.sku, formatUnitLabel]);

  useEffect(() => {
    if (!formData.sku || availableUnitOptions.length === 0) return;
    if (!formData.unitCode || !availableUnitOptions.some(option => option.code === formData.unitCode)) {
      setFormData(prev => ({ ...prev, unitCode: availableUnitOptions[0].code }));
    }
  }, [availableUnitOptions, formData.sku, formData.unitCode]);

  useEffect(() => {
    if (isOpen) {
      const defaultValidity = getBusinessDefaultValidityRange();

      if (selectedProduct) {
        setSkuSearch(selectedProduct.sku);
        setSelectedProductName(selectedProduct.name);
        const preferredUnit = initialUnitCode || selectedProduct.activeUnitCode || deriveDefaultUnit(selectedProduct.sku);
        const unitPrices = selectedProduct.prices[column.id];
        const existingPrice = preferredUnit ? unitPrices?.[preferredUnit] : undefined;

        if (existingPrice && existingPrice.type === 'volume') {
          setFormData({
            type: 'volume',
            sku: selectedProduct.sku,
            columnId: column.id,
            unitCode: preferredUnit || '',
            ranges: existingPrice.ranges.map(range => ({
              minQuantity: range.minQuantity.toString(),
              maxQuantity: range.maxQuantity?.toString() || '',
              price: range.price.toString()
            })),
            validFrom: existingPrice.validFrom,
            validUntil: existingPrice.validUntil
          });
        } else {
          setFormData({
            type: 'volume',
            sku: selectedProduct.sku,
            columnId: column.id,
            unitCode: preferredUnit || '',
            ranges: generateDefaultVolumeRanges().map(range => ({
              minQuantity: range.minQuantity.toString(),
              maxQuantity: range.maxQuantity?.toString() || '',
              price: '0'
            })),
            validFrom: defaultValidity.validFrom,
            validUntil: defaultValidity.validUntil
          });
        }
      } else {
        setSkuSearch('');
        setSelectedProductName('');
        setFormData({
          type: 'volume',
          sku: '',
          columnId: column.id,
          unitCode: '',
          ranges: generateDefaultVolumeRanges().map(range => ({
            minQuantity: range.minQuantity.toString(),
            maxQuantity: range.maxQuantity?.toString() || '',
            price: '0'
          })),
          validFrom: defaultValidity.validFrom,
          validUntil: defaultValidity.validUntil
        });
      }
    }
  }, [isOpen, selectedProduct, column, initialUnitCode, deriveDefaultUnit]);

  // Filtrar productos del catálogo según búsqueda
  const filteredCatalogProducts = catalogProducts.filter(product =>
    product.codigo.toLowerCase().includes(skuSearch.toLowerCase()) ||
    product.nombre.toLowerCase().includes(skuSearch.toLowerCase())
  ).slice(0, 10);

  // Manejar selección de producto del catálogo
  const handleSelectProduct = (product: CatalogProduct) => {
    setSkuSearch(product.codigo);
    setSelectedProductName(product.nombre);
    setFormData(prev => ({
      ...prev,
      sku: product.codigo,
      unitCode: product.unidad || prev.unitCode
    }));
    setShowSuggestions(false);
  };

  // Manejar cambio en el campo de búsqueda de SKU
  const handleSkuSearchChange = (value: string) => {
    setSkuSearch(value);
    setFormData(prev => ({
      ...prev,
      sku: value,
      unitCode: (catalogProducts.find(p => p.codigo === value)?.unidad) || ''
    }));
    setShowSuggestions(value.length > 0);

    const product = catalogProducts.find(p => p.codigo === value);
    if (product) {
      setSelectedProductName(product.nombre);
    } else {
      setSelectedProductName('');
    }
  };

  const addRange = () => {
    const lastRange = formData.ranges[formData.ranges.length - 1];
    const newMinQuantity = lastRange ? 
      (parseInt(lastRange.maxQuantity) || parseInt(lastRange.minQuantity)) + 1 : 
      1;

    setFormData({
      ...formData,
      ranges: [
        ...formData.ranges,
        {
          minQuantity: newMinQuantity.toString(),
          maxQuantity: '',
          price: '0'
        }
      ]
    });
  };

  const removeRange = (index: number) => {
    if (formData.ranges.length > 1) {
      setFormData({
        ...formData,
        ranges: formData.ranges.filter((_, i) => i !== index)
      });
    }
  };

  const updateRange = (index: number, field: keyof typeof formData.ranges[0], value: string) => {
    const newRanges = [...formData.ranges];
    newRanges[index] = {
      ...newRanges[index],
      [field]: value
    };
    setFormData({
      ...formData,
      ranges: newRanges
    });
  };

  const validateForm = (): boolean => {
    const volumeRanges: VolumeRange[] = formData.ranges.map((range, index) => ({
      id: index.toString(),
      minQuantity: parseInt(range.minQuantity) || 0,
      maxQuantity: range.maxQuantity ? parseInt(range.maxQuantity) : null,
      price: parseFloat(range.price) || 0
    }));

    const validation = validateVolumeRanges(volumeRanges);
    setValidationErrors(validation.errors);
    
    return validation.isValid && formData.sku.trim() !== '' && !!formData.unitCode;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      const success = await Promise.resolve(onSave(formData));
      if (success) {
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'volume',
      sku: '',
      columnId: column.id,
      unitCode: '',
      ranges: [],
      validFrom: '',
      validUntil: ''
    });
    setValidationErrors([]);
    setSkuSearch('');
    setSelectedProductName('');
    setShowSuggestions(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Matriz por Volumen - {column.name}
            </h3>
            <p className="text-sm text-gray-600">
              Configura precios diferentes según la cantidad comprada
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
            aria-label="Cerrar modal"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SKU */}
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
                      {formatCurrency(product.precio)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
            <select
              value={formData.unitCode}
              onChange={(e) => setFormData(prev => ({ ...prev, unitCode: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.sku}
              required
            >
              <option value="">Seleccionar unidad</option>
              {availableUnitOptions.map(option => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            {!formData.sku && (
              <p className="text-xs text-gray-500 mt-1">Selecciona un SKU para habilitar las unidades configuradas.</p>
            )}
          </div>

          {/* Fecha de vigencia */}
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

          {/* Matriz de rangos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-medium text-gray-900">Rangos de cantidad</h4>
              <button
                type="button"
                onClick={addRange}
                className="flex items-center px-3 py-1 text-white text-sm rounded hover:opacity-90"
                style={{ backgroundColor: '#1478D4' }}
              >
                <Plus size={14} className="mr-1" />
                Agregar rango
              </button>
            </div>

            <div className="space-y-3">
              {formData.ranges.map((range, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Cantidad mínima</label>
                    <input
                      type="number"
                      min="1"
                      value={range.minQuantity}
                      onChange={(e) => updateRange(index, 'minQuantity', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Cantidad máxima</label>
                    <input
                      type="number"
                      min="1"
                      value={range.maxQuantity}
                      onChange={(e) => updateRange(index, 'maxQuantity', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      placeholder="Dejar vacío para 'en adelante'"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Precio unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={range.price}
                      onChange={(e) => updateRange(index, 'price', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex-shrink-0">
                    {formData.ranges.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRange(index)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        aria-label="Eliminar rango"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Vista previa de rangos:</h5>
              <div className="text-sm text-gray-600 space-y-1">
                {formData.ranges.map((range, index) => {
                  const minQty = parseInt(range.minQuantity) || 0;
                  const maxQty = range.maxQuantity ? parseInt(range.maxQuantity) : null;
                  const price = parseFloat(range.price) || 0;
                  
                  return (
                    <div key={index} className="flex justify-between">
                      <span>
                        {maxQty ? `${minQty} - ${maxQty}` : `${minQty}+`} unidades
                      </span>
                      <span className="font-medium">{formatCurrency(price)} c/u</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 mb-1">Errores de configuración:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info size={16} className="text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Matriz por Volumen:</strong> El precio se calcula automáticamente según la cantidad. 
                Los rangos deben ser continuos y sin vacíos. El último rango puede ser abierto (sin máximo).
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
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
              Guardar matriz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
