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
      <div className="flex w-full flex-wrap items-center gap-3">
        {/* Barra de búsqueda y escáner */}
        <div className="relative flex-1 min-w-[260px]">
          <div className="flex items-stretch rounded-lg border border-gray-200 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100">
            <div className="flex overflow-hidden rounded-l-lg">
              <button
                type="button"
                className="flex items-center justify-center bg-teal-600 px-3 text-white"
                title="Buscar productos"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScanBarcode('00168822')}
                className="flex items-center justify-center bg-teal-500 px-3 text-white border-l border-teal-400 hover:bg-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                title="Escanear código de barras"
              >
                <Scan className="h-4 w-4" />
              </button>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por nombre, código o categoría..."
                className="w-full border-0 bg-transparent py-2.5 pl-3 pr-16 text-sm placeholder-gray-500 focus:outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    clearSearch();
                    setShowResults(false);
                  }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Resultados de búsqueda dropdown */}
          {showResults && hasSearchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
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
                        className="w-full rounded-lg border-b border-gray-100 p-3 text-left transition-colors hover:bg-gray-50 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-gray-900">{product.name}</div>
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
                  <Package className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <div>No se encontraron productos</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateProduct}
            className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-200"
            title="Crear nuevo producto"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-blue-200 ${
              showFilters ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:text-blue-600'
            }`}
            title="Mostrar filtros"
          >
            <Filter className="h-4 w-4" />
          </button>

          {priceListOptions.length > 0 && (
            <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <span>Lista de precios</span>
              <select
                value={selectedPriceListId}
                onChange={(event) => onPriceListChange(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
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
              const stockValue = Math.max(0, typeof product.stock === 'number' ? product.stock : 0);

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