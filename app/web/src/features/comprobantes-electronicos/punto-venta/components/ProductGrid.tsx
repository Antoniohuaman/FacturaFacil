// ===================================================================
// COMPONENTE GRID DE PRODUCTOS PARA MODO POS - VERSIÓN MEJORADA
// ===================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Scan, Plus, Filter, Package, X } from 'lucide-react';
import type { Product, CartItem, Currency } from '../../models/comprobante.types';
import { useProductSearch } from '../../shared/form-core/hooks/useProductSearch';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';

// Importar el modal REAL de productos del catálogo
import ProductModal from '../../../catalogo-articulos/components/ProductModal';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogoProduct } from '../../../catalogo-articulos/models/types';
import type { ProductUnitOption } from '../../../lista-precios/models/PriceTypes';
import type { PosPriceListOption } from '../hooks/usePosCartAndTotals';

export interface ProductGridProps {
  // Lista de productos disponibles
  products: Product[];
  
  // Items del carrito (para mostrar badges)
  cartItems: CartItem[];
  
  // Función para agregar al carrito
  onAddToCart: (product: Product) => void;
  
  // Configuración del grid
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  
  // Estados
  isLoading?: boolean;
  emptyStateMessage?: string;
  
  // Nuevas props para funcionalidades mejoradas
  currency?: Currency;
  priceListOptions: PosPriceListOption[];
  selectedPriceListId: string;
  onPriceListChange: (id: string) => void;
  getUnitOptionsForProduct: (sku: string) => ProductUnitOption[];
  formatUnitLabel: (code?: string) => string;
  getPreferredUnitForSku: (sku: string, requestedUnit?: string) => string;
  getPriceForProduct: (sku: string, unitCode?: string, columnId?: string) => number | undefined;
  activePriceListLabel?: string;
  showQuantityBadge?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  cartItems,
  onAddToCart,
  columns = {
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5
  },
  showQuantityBadge = true,
  isLoading = false,
  emptyStateMessage = 'No hay productos disponibles',
  currency = 'PEN',
  priceListOptions,
  selectedPriceListId,
  onPriceListChange,
  getUnitOptionsForProduct,
  formatUnitLabel,
  getPreferredUnitForSku,
  getPriceForProduct,
  activePriceListLabel,
}) => {
  const { formatPrice } = useCurrency();
  const { addProduct, categories: catalogoCategories } = useProductStore();
  
  const {
    searchQuery,
    searchResults,
    isSearching,
    hasResults,
    hasSearchQuery,
    availableCategories,
    selectedCategory,
    searchFilters,
    setSearchQuery,
    searchByBarcode,
    searchByCategory,
    clearSearch
  } = useProductSearch();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [unitSelections, setUnitSelections] = useState<Record<string, string>>({});

  const resolveSku = useCallback((product: Product) => product.code || product.id, []);

  useEffect(() => {
    setUnitSelections((prev) => {
      const next: Record<string, string> = {};
      products.forEach((product) => {
        const sku = resolveSku(product);
        if (!sku) {
          return;
        }
        const preferredUnit = getPreferredUnitForSku(sku, product.unidadMedida || product.unit);
        next[sku] = prev[sku] || preferredUnit;
      });
      return next;
    });
  }, [getPreferredUnitForSku, products, resolveSku]);

  const resolveProductPrice = useCallback((product: Product, unitCode?: string) => {
    const sku = resolveSku(product);
    const computed = getPriceForProduct(sku, unitCode, selectedPriceListId);
    if (typeof computed === 'number') {
      return computed;
    }
    return Number.isFinite(product.price) ? product.price : 0;
  }, [getPriceForProduct, resolveSku, selectedPriceListId]);

  const buildProductForSale = useCallback((product: Product, forcedUnit?: string): Product => {
    const sku = resolveSku(product);
    const selectedUnit = forcedUnit || unitSelections[sku] || getPreferredUnitForSku(sku, product.unidadMedida || product.unit);
    const resolvedPrice = resolveProductPrice(product, selectedUnit);
    return {
      ...product,
      price: resolvedPrice,
      basePrice: resolvedPrice,
      unidadMedida: selectedUnit,
      unit: selectedUnit || product.unit,
      priceColumnId: selectedPriceListId,
      priceColumnLabel: activePriceListLabel,
    };
  }, [activePriceListLabel, getPreferredUnitForSku, resolveProductPrice, resolveSku, selectedPriceListId, unitSelections]);

  // ===================================================================
  // FUNCIONES DE UTILIDAD
  // ===================================================================

  const getProductQuantityInCart = (productId: string): number => {
    const cartItem = cartItems.find(item => item.id === productId);
    return cartItem?.quantity || 0;
  };

  const isProductInCart = (productId: string): boolean => {
    return cartItems.some(item => item.id === productId);
  };

  const handleProductClick = (product: Product) => {
    if (isLoading) {
      return;
    }
    const preparedProduct = buildProductForSale(product);
    onAddToCart(preparedProduct);
  };

  const getGridClasses = (): string => {
    const baseClasses = 'grid gap-4';
    const colClasses = [
      `grid-cols-${columns.sm || 2}`,
      `md:grid-cols-${columns.md || 3}`,
      `lg:grid-cols-${columns.lg || 4}`,
      `xl:grid-cols-${columns.xl || 5}`
    ].join(' ');
    
    return `${baseClasses} ${colClasses}`;
  };

  // ===================================================================
  // FUNCIONES DE BÚSQUEDA
  // ===================================================================

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 0);
  };

  const handleProductSelect = (product: Product) => {
    const preparedProduct = buildProductForSale(product);
    onAddToCart(preparedProduct);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleScanBarcode = (barcode: string) => {
    searchByBarcode(barcode).then(product => {
      if (product) {
        const preparedProduct = buildProductForSale(product);
        onAddToCart(preparedProduct);
        setShowResults(false);
      }
    });
  };

  const handleCreateProduct = () => {
    setShowProductModal(true);
  };

  const handleProductCreated = (productData: Omit<CatalogoProduct, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => {
    // Guardar en el catálogo usando el store
    addProduct(productData);
    
    // Cerrar modal
    setShowProductModal(false);
    
    // Nota: No es necesario agregar manualmente al carrito ni convertir.
    // El hook useAvailableProducts en PuntoVenta ya está suscrito a allProducts del store,
    // por lo que el nuevo producto aparecerá automáticamente en la lista.
    // El usuario puede buscarlo o seleccionarlo normalmente desde el grid.
  };

  const handleCategorySelect = (category: string) => {
    searchByCategory(category);
    setShowResults(true);
  };


  // Usar productos filtrados o todos los productos
  const displayProducts = (hasSearchQuery || selectedCategory || searchFilters.category)
    ? searchResults
    : products;

  // ===================================================================
  // RENDERIZADO DEL HEADER DE BÚSQUEDA
  // ===================================================================

  const renderSearchHeader = () => (
    <div className="bg-white border-b border-gray-200 p-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Catálogo disponible</p>
          <p className="text-xs text-gray-400">Selecciona productos y ajusta unidades sin salir del grid</p>
        </div>
        {priceListOptions.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            <span className="uppercase tracking-wide">Lista de precios</span>
            <select
              value={selectedPriceListId}
              onChange={(event) => onPriceListChange(event.target.value)}
              className="bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] font-semibold text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-0"
            >
              {priceListOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {/* Barra de búsqueda principal */}
      <div className="flex items-center gap-3 mb-3">
        
        {/* Barra de búsqueda */}
        <div className="flex-1 relative">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, código o categoría..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-sm placeholder-gray-500 transition-all duration-200"
            />

            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}

            {searchQuery && (
              <button
                onClick={() => {
                  clearSearch();
                  setShowResults(false);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Resultados de búsqueda dropdown */}
          {showResults && hasSearchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              {hasResults ? (
                <div className="p-2">
                  {searchResults.slice(0, 6).map(product => {
                    const sku = resolveSku(product);
                    const previewUnit = unitSelections[sku] || getPreferredUnitForSku(sku, product.unidadMedida || product.unit);
                    const previewPrice = resolveProductPrice(product, previewUnit);
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.code}</div>
                          </div>
                          <div className="ml-3 text-right">
                            <div className="font-bold text-blue-600">
                              {formatPrice(previewPrice, currency)}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {activePriceListLabel || 'Lista de precios'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div>No se encontraron productos</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-1.5">
          
          {/* Escanear */}
          <button
            onClick={() => handleScanBarcode('00168822')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm"
            title="Escanear código de barras"
          >
            <Scan className="h-4 w-4" />
            <span className="hidden sm:inline">Escanear</span>
          </button>

          {/* Crear producto */}
          <button
            onClick={handleCreateProduct}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm"
            title="Crear nuevo producto"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo</span>
          </button>


          {/* Filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors text-sm font-semibold ${
              showFilters 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden lg:inline">Filtros</span>
          </button>
        </div>
      </div>

      {/* Filtros expandibles */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg px-3 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Categorías:</span>
            
            <button
              onClick={() => {
                clearSearch();
                setShowResults(false);
              }}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !selectedCategory 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todas
            </button>
            
            {availableCategories.map(category => (
              <button
                key={category}
                onClick={() => category && handleCategorySelect(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === category 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de búsqueda */}
      {hasSearchQuery && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>
            {hasResults ? `${searchResults.length} productos encontrados` : `Sin resultados para "${searchQuery}"`}
          </span>
          <button
            onClick={() => {
              clearSearch();
              setShowResults(false);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Backdrop para cerrar resultados */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );

  // ===================================================================
  // RENDERIZADO PRINCIPAL
  // ===================================================================

  if (isLoading) {
    return (
      <>
        {renderSearchHeader()}
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando productos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header de búsqueda */}
      {renderSearchHeader()}

      {/* Grid de productos */}
      <div className="flex-1 overflow-y-auto p-4">
        {!displayProducts || displayProducts.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">{emptyStateMessage}</p>
              {hasSearchQuery && (
                <button
                  onClick={() => {
                    clearSearch();
                    setShowResults(false);
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Ver todos los productos
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={getGridClasses()}>
            {displayProducts.map((product) => {
              const quantityInCart = getProductQuantityInCart(product.id);
              const inCart = isProductInCart(product.id);
              const sku = resolveSku(product);
              const selectedUnit = unitSelections[sku] || getPreferredUnitForSku(sku, product.unidadMedida || product.unit);
              const unitOptions = getUnitOptionsForProduct(sku);
              const fallbackUnitCode = selectedUnit || product.unidadMedida || product.unit || '';
              const normalizedOptions = unitOptions.length > 0
                ? unitOptions
                : fallbackUnitCode
                  ? [{ code: fallbackUnitCode, label: formatUnitLabel(fallbackUnitCode) || fallbackUnitCode, isBase: true }]
                  : [];
              const baseUnitOption = normalizedOptions[0];
              const currentUnit = baseUnitOption?.code || fallbackUnitCode || product.unidadMedida || product.unit || '';
              const resolvedPrice = resolveProductPrice(product, currentUnit);
              const formattedPrice = formatPrice(resolvedPrice, currency);
              const unitLabel = baseUnitOption?.label
                || (currentUnit ? formatUnitLabel(currentUnit) : undefined)
                || currentUnit
                || 'Unidad';
              const stockValue = Number.isFinite(product.stock) ? Math.max(0, product.stock) : 0;

              return (
                <div 
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:scale-105 relative group"
                >
                  {/* Imagen/Placeholder del producto */}
                  <div className="aspect-square bg-blue-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si falla la carga de la imagen, mostrar placeholder
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-blue-300 rounded-full flex items-center justify-center ${product.image ? 'hidden' : ''}`}>
                      <div className="w-6 h-6 border-2 border-white rounded-full"></div>
                    </div>

                    {/* Badge de cantidad en carrito */}
                    {showQuantityBadge && inCart && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                        {quantityInCart}
                      </div>
                    )}
                  </div>

                  {/* Información del producto */}
                  <div className="space-y-1">
                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    
                    <div className="text-lg font-bold text-blue-600">
                      {formattedPrice}
                    </div>
                    <p className="text-xs text-gray-500 mt-1" title="Unidad base">
                      {unitLabel}
                    </p>

                    <p className="text-xs text-gray-600 font-semibold">
                      Stock: {stockValue}
                    </p>
                  </div>

                  {/* Indicador de selección */}
                  {inCart && (
                    <div className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de creación de productos - USANDO EL MODAL REAL DEL CATÁLOGO */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleProductCreated}
        categories={catalogoCategories}
      />
    </div>
  );
};