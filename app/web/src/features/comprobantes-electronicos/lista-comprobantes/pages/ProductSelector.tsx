import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, Check, ShoppingCart, Plus, Minus } from 'lucide-react';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import ProductModal from '../../../catalogo-articulos/components/ProductModal';
import type { Product as CatalogProduct } from '../../../catalogo-articulos/models/types';
import { usePriceBook } from '../../shared/form-core/hooks/usePriceBook';
import { useUserSession } from '../../../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';
import { getAvailableStockForUnit } from '../../../../shared/inventory/stockGateway';

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  requiresStockControl?: boolean;
  category: string;
  // ✅ Campos adicionales del catálogo para comprobantes
  descripcion?: string;
  alias?: string;
  marca?: string;
  modelo?: string;
  codigoBarras?: string;
  codigoFabrica?: string;
  precioCompra?: number;
  descuentoProducto?: number;
  peso?: number;
  tipoExistencia?: string;
  tipoProducto?: 'BIEN' | 'SERVICIO';
  impuesto?: string;
  imagen?: string;
  codigoSunat?: string;
  unidad?: string; // ✅ Nombre de la unidad del producto
}

interface ProductSelectorProps {
  onAddProducts: (products: { product: Product; quantity: number }[]) => void;
  existingProducts?: string[]; // IDs of products already in cart
}

const formatCurrency = (value: number | null | undefined) => {
  const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `S/ ${numericValue.toFixed(2)}`;
};

const resolveStockTone = (stock: number) => {
  if (stock <= 0) return 'text-red-600';
  if (stock <= 10) return 'text-yellow-600';
  return 'text-green-600';
};

const ProductSelector: React.FC<ProductSelectorProps> = ({ 
  onAddProducts, 
  existingProducts = [] 
}) => {
  // Obtener productos del catálogo real
  const {
    allProducts: catalogProducts,
    addProduct,
    categories: catalogCategories
  } = useProductStore();
  const { baseColumnId, getPriceOptionsFor, hasSelectableColumns } = usePriceBook();
  const { session } = useUserSession();
  const establishmentId = session?.currentEstablishmentId;
  const { state: { warehouses } } = useConfigurationContext();

  const mapCatalogProductToSelectorProduct = useCallback((p: CatalogProduct): Product => {
    const stockInfo = getAvailableStockForUnit({
      product: p,
      warehouses,
      establishmentId,
      unitCode: p.unidad,
    });
    const requiresStockControl = Boolean(
      p.stockPorAlmacen ||
      p.stockPorEstablecimiento ||
      typeof p.cantidad === 'number'
    );

    return {
      id: p.id,
      code: p.codigo,
      name: p.nombre,
      price: p.precio,
      stock: stockInfo.availableInUnidadSeleccionada,
      requiresStockControl,
      category: p.categoria || 'Sin categoría',
      descripcion: p.descripcion,
      alias: p.alias,
      marca: p.marca,
      modelo: p.modelo,
      codigoBarras: p.codigoBarras,
      codigoFabrica: p.codigoFabrica,
      precioCompra: p.precioCompra,
      descuentoProducto: p.descuentoProducto,
      peso: p.peso,
      tipoExistencia: p.tipoExistencia,
      tipoProducto: p.tipoExistencia === 'SERVICIOS' ? 'SERVICIO' : 'BIEN',
      impuesto: p.impuesto,
      imagen: p.imagen,
      codigoSunat: p.codigoSunat,
      unidad: p.unidad,
    };
  }, [establishmentId, warehouses]);

  const getBasePriceForProduct = useCallback((product: Product): number | null => {
    if (!hasSelectableColumns) {
      return typeof product.price === 'number' ? product.price : null;
    }

    const sku = product.code || product.id;
    if (!sku) {
      return typeof product.price === 'number' ? product.price : null;
    }

    const options = getPriceOptionsFor(sku, product.unidad);
    if (options.length === 0) {
      return typeof product.price === 'number' ? product.price : null;
    }

    const preferredOption = options.find(option => option.isBase || (baseColumnId && option.columnId === baseColumnId));
    return preferredOption?.price ?? options[0]?.price ?? (typeof product.price === 'number' ? product.price : null);
  }, [baseColumnId, getPriceOptionsFor, hasSelectableColumns]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const noResultsPanelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ✅ Convertir productos del catálogo al formato esperado CON useMemo
  const allProducts: Product[] = useMemo(
    () => catalogProducts.map(mapCatalogProductToSelectorProduct),
    [catalogProducts, mapCatalogProductToSelectorProduct]
  );
  const handleCreateProductClick = useCallback(() => {
    setShowProductModal(true);
  }, []);

  const handleProductModalClose = useCallback(() => {
    setShowProductModal(false);
  }, []);

  const handleProductCreated = useCallback((productData: Omit<CatalogProduct, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => {
    const created = addProduct(productData);
    const selectorProduct = mapCatalogProductToSelectorProduct(created);
    onAddProducts([{ product: selectorProduct, quantity: 1 }]);
    setShowProductModal(false);
    setSearchTerm('');
    setShowDropdown(false);
    setSelectedProducts(new Set());
    setQuantities({});
    setHoveredIndex(-1);
    requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
  }, [addProduct, mapCatalogProductToSelectorProduct, onAddProducts]);


  // Intelligent search with prioritization
  const getFilteredProducts = useCallback(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const results = allProducts.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(term);
      const codeMatch = product.code.toLowerCase().includes(term);
      const categoryMatch = product.category.toLowerCase().includes(term);
      return nameMatch || codeMatch || categoryMatch;
    });

    // Prioritize exact matches and code matches
    return results.sort((a, b) => {
      const aExactName = a.name.toLowerCase() === term;
      const bExactName = b.name.toLowerCase() === term;
      if (aExactName !== bExactName) return aExactName ? -1 : 1;
      
      const aCodeMatch = a.code.toLowerCase().includes(term);
      const bCodeMatch = b.code.toLowerCase().includes(term);
      if (aCodeMatch !== bCodeMatch) return aCodeMatch ? -1 : 1;
      
      return a.name.localeCompare(b.name);
    }).slice(0, 8); // Limit results for better performance
  }, [searchTerm, allProducts]); // ✅ Agregado allProducts como dependencia

  const filteredProducts = getFilteredProducts();

  // Close dropdown/panel when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const clickedInsideDropdown = dropdownRef.current?.contains(target);
      const clickedInsideSearch = searchRef.current?.contains(target);
      const clickedInsideHint = noResultsPanelRef.current?.contains(target);

      if (clickedInsideDropdown || clickedInsideSearch || clickedInsideHint) {
        return;
      }

      setShowDropdown(false);
      setHoveredIndex(-1);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showDropdown]);

  // Scroll hovered item into view
  useEffect(() => {
    if (hoveredIndex >= 0 && itemRefs.current[hoveredIndex]) {
      itemRefs.current[hoveredIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [hoveredIndex]);

  // Auto-focus search when opening dropdown
  const handleSearchFocus = () => {
    setShowDropdown(true);
    setHoveredIndex(-1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(value.length > 0);
    setHoveredIndex(-1);
  };

  const handleProductSelect = useCallback((product: Product) => {
    if (isMultipleMode) {
      // Multiple selection mode
      const newSelected = new Set(selectedProducts);
      if (selectedProducts.has(product.id)) {
        newSelected.delete(product.id);
        const newQuantities = { ...quantities };
        delete newQuantities[product.id];
        setQuantities(newQuantities);
      } else {
        newSelected.add(product.id);
        setQuantities(prev => ({ ...prev, [product.id]: 1 }));
      }
      setSelectedProducts(newSelected);
    } else {
      // Single selection mode - immediate add
      const quantity = quantities[product.id] || 1;
      onAddProducts([{ product, quantity }]);
      
      // Clear and close
      setSearchTerm('');
      setShowDropdown(false);
      setSelectedProducts(new Set());
      setQuantities({});
      setHoveredIndex(-1);
      
      // Optional: show brief success feedback
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [isMultipleMode, selectedProducts, quantities, onAddProducts]);

  // Keyboard navigation + ESC closing for dropdown/panel
  useEffect(() => {
    if (!showDropdown) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setHoveredIndex(-1);
        return;
      }

      if (filteredProducts.length === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHoveredIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHoveredIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          event.preventDefault();
          if (hoveredIndex >= 0) {
            handleProductSelect(filteredProducts[hoveredIndex]);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDropdown, hoveredIndex, filteredProducts, handleProductSelect]);

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleAddSelected = () => {
    if (selectedProducts.size === 0) return;
    
    const productsToAdd = Array.from(selectedProducts).map(productId => {
      const product = allProducts.find(p => p.id === productId);
      const quantity = quantities[productId] || 1;
      return { product: product!, quantity };
    });

    onAddProducts(productsToAdd);
    
    // Clear everything
    setSearchTerm('');
    setShowDropdown(false);
    setSelectedProducts(new Set());
    setQuantities({});
    setHoveredIndex(-1);
    
    // Success feedback
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleModeChange = (multipleMode: boolean) => {
    setIsMultipleMode(multipleMode);
    // Clear selections when switching modes
    setSelectedProducts(new Set());
    setQuantities({});
    setSearchTerm('');
    setShowDropdown(false);
  };

  const getDisplayText = () => {
    if (isMultipleMode && selectedProducts.size > 0) {
      return `${selectedProducts.size} producto${selectedProducts.size > 1 ? 's' : ''} seleccionado${selectedProducts.size > 1 ? 's' : ''}`;
    }
    return searchTerm;
  };

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  const trimmedSearch = searchTerm.trim();
  const showCreateProductHint = showDropdown && trimmedSearch.length > 0 && filteredProducts.length === 0 && !isLoading;

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600 font-bold">Selección múltiple</span>
          <button
            onClick={() => handleModeChange(!isMultipleMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isMultipleMode ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isMultipleMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar producto por nombre, código o categoría..."
            value={getDisplayText()}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            className="w-full px-4 py-3 pr-10 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            disabled={isLoading}
          />
          
          {isLoading ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          )}
        </div>

        {showCreateProductHint && (
          <button
            type="button"
            onClick={handleCreateProductClick}
            className="mt-1 text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
          >
            ➕ Crear nuevo producto
          </button>
        )}

        {/* Selected Products Preview (Multiple Mode) */}
        {isMultipleMode && selectedProducts.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Array.from(selectedProducts).slice(0, 3).map(productId => {
              const product = allProducts.find(p => p.id === productId);
              if (!product) return null;
              
              return (
                <div
                  key={productId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                >
                  <span>{product.name}</span>
                  <span className="ml-1 font-semibold">×{quantities[productId] || 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductSelect(product);
                    }}
                    className="ml-2 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            {selectedProducts.size > 3 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                +{selectedProducts.size - 3} más
              </span>
            )}
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && filteredProducts.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            {/* Multiple mode header */}
            {isMultipleMode && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    Modo selección múltiple
                  </span>
                  {selectedProducts.size > 0 && (
                    <span className="text-xs text-blue-700">
                      {selectedProducts.size} seleccionados
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Product list */}
            <div className="py-1">
              {filteredProducts.map((product, index) => {
                const isSelected = selectedProducts.has(product.id);
                const isHovered = hoveredIndex === index;
                const isInCart = existingProducts.includes(product.id);
                const basePriceValue = getBasePriceForProduct(product);
                const resolvedUnitPrice = typeof basePriceValue === 'number' ? basePriceValue : product.price;
                const safeUnitPrice = Number.isFinite(resolvedUnitPrice) ? resolvedUnitPrice : 0;
                const formattedBasePrice = formatCurrency(safeUnitPrice);
                const stockValue = Number.isFinite(product.stock) ? product.stock : 0;
                const stockToneClass = resolveStockTone(stockValue);
                
                return (
                  <div
                    key={product.id}
                    ref={el => { itemRefs.current[index] = el; }}
                    onClick={() => handleProductSelect(product)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      isHovered ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } ${isSelected ? 'bg-blue-100' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Checkbox for multiple mode */}
                        {isMultipleMode && (
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}

                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {highlightMatch(product.name, searchTerm)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                            <span>{highlightMatch(product.code, searchTerm)}</span>
                            <span>•</span>
                            <span>{product.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-gray-600">
                              <span>Precio base:</span>
                              <span className="font-semibold text-blue-600">{formattedBasePrice}</span>
                            </span>
                            <span>•</span>
                            <span className={`font-medium ${stockToneClass}`}>
                              Stock: {stockValue}
                            </span>
                            {isInCart && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">En carrito</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price and quantity controls */}
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {/* Quantity controls for selected items in multiple mode */}
                        {isMultipleMode && isSelected && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(product.id, -1);
                              }}
                              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">
                              {quantities[product.id] || 1}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuantityChange(product.id, 1);
                              }}
                              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        
                        {/* Price */}
                        <div className="text-right">
                          <div className="text-[11px] uppercase text-gray-400 tracking-wide">Precio base</div>
                          <div className="font-bold text-blue-600">
                            {formattedBasePrice}
                          </div>
                          {isMultipleMode && isSelected && (
                            <div className="text-xs text-gray-500">
                              Total: {formatCurrency((quantities[product.id] || 1) * safeUnitPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add button for multiple mode */}
            {isMultipleMode && selectedProducts.size > 0 && (
              <div className="p-3 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleAddSelected}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>
                    Agregar {selectedProducts.size} producto{selectedProducts.size > 1 ? 's' : ''}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* No results */}
        {showDropdown && searchTerm && filteredProducts.length === 0 && (
          <div
            ref={noResultsPanelRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500"
          >
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No se encontraron productos</p>
            <p className="text-xs text-gray-400">
              Intenta con otro término de búsqueda
            </p>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>
          {isMultipleMode 
            ? 'Selecciona varios productos con checkboxes y presiona "Agregar"' 
            : 'Busca un producto y se agregará automáticamente al seleccionarlo'
          }
        </span>
        {showDropdown && filteredProducts.length > 0 && (
          <span className="text-gray-400">
            Use ↑↓ para navegar, Enter para seleccionar, Esc para cerrar
          </span>
        )}
      </div>

      <ProductModal
        isOpen={showProductModal}
        onClose={handleProductModalClose}
        onSave={handleProductCreated}
        categories={catalogCategories}
      />
    </div>
  );
};

export default ProductSelector;