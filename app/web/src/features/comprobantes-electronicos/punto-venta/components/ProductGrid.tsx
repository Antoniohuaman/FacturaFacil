// ===================================================================
// COMPONENTE GRID DE PRODUCTOS PARA MODO POS - VERSIÓN MEJORADA
// ===================================================================

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search, Scan, Plus, Filter, Package, X, LayoutGrid, List } from 'lucide-react';
import type { Product, CartItem, Currency } from '../../models/comprobante.types';
import { useProductSearch } from '../../shared/form-core/hooks/useProductSearch';
import { useCurrency } from '../../shared/form-core/hooks/useCurrency';

// Importar el modal REAL de productos del catálogo
import ProductModal from '../../../catalogo-articulos/components/ProductModal';
import { useProductStore, type ProductInput } from '../../../catalogo-articulos/hooks/useProductStore';
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

const GRID_SCROLL_MIN_HEIGHT = 240;
const GRID_SCROLL_BOTTOM_OFFSET = 24;
type CatalogViewMode = 'cards' | 'list';
const CATALOG_VIEW_STORAGE_KEY = 'pos_catalog_view';
const isCatalogViewMode = (value: unknown): value is CatalogViewMode => value === 'cards' || value === 'list';

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
  const [searchMode, setSearchMode] = useState<'text' | 'barcode'>('text');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [gridScrollMaxHeight, setGridScrollMaxHeight] = useState<string>('auto');
  const [catalogView, setCatalogView] = useState<CatalogViewMode>('cards');

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedView = window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY);
    if (isCatalogViewMode(storedView)) {
      setCatalogView(storedView);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, catalogView);
  }, [catalogView]);

  const recalcGridScrollArea = useCallback(() => {
    if (!scrollAreaRef.current) {
      return;
    }
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const { top } = scrollAreaRef.current.getBoundingClientRect();
    const available = viewportHeight - top - GRID_SCROLL_BOTTOM_OFFSET;
    setGridScrollMaxHeight(`${Math.max(available, GRID_SCROLL_MIN_HEIGHT)}px`);
  }, []);

  useLayoutEffect(() => {
    recalcGridScrollArea();
    const handleResize = () => recalcGridScrollArea();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [recalcGridScrollArea]);

  useEffect(() => {
    recalcGridScrollArea();
  }, [recalcGridScrollArea, showFilters, hasSearchQuery, selectedCategory, searchFilters.category]);

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

  const toggleCatalogView = () => {
    setCatalogView((prev) => (prev === 'cards' ? 'list' : 'cards'));
  };

  const getProductPresentationData = (product: Product) => {
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

    return {
      quantityInCart,
      inCart,
      sku,
      unitLabel,
      stockValue,
      formattedPrice,
      resolvedPrice,
      currentUnit,
    };
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

  const handleSearch = (query: string, mode: 'text' | 'barcode' = searchMode) => {
    setSearchQuery(query);
    const normalized = query.trim();
    if (mode === 'text') {
      setShowResults(normalized.length > 0);
    } else {
      setShowResults(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    const preparedProduct = buildProductForSale(product);
    onAddToCart(preparedProduct);
    setShowResults(false);
    setSearchQuery('');
  };

  const handleScanBarcode = (barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized) {
      return;
    }
    searchByBarcode(normalized).then(product => {
      if (product) {
        const preparedProduct = buildProductForSale(product);
        onAddToCart(preparedProduct);
        setShowResults(false);
        setSearchQuery('');
      }
    });
  };

  const handleCreateProduct = () => {
    setShowProductModal(true);
  };

  const handleProductCreated = (productData: ProductInput) => {
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

  const renderSearchHeader = () => {
    const ViewToggleIcon = catalogView === 'cards' ? List : LayoutGrid;
    const viewToggleLabel = catalogView === 'cards' ? 'Ver en lista' : 'Ver en tarjetas';

    return (
      <div className="bg-white border-b border-gray-200 p-3 mb-4">
        <div className="flex w-full flex-wrap items-center gap-3 xl:flex-nowrap">
        {/* Barra de búsqueda y escáner */}
        <div className="relative flex-1 min-w-[260px]">
          <div className="flex items-stretch rounded-lg border border-gray-200 bg-white shadow-sm focus-within:border-[#2f70b4] focus-within:ring-1 focus-within:ring-[#2f70b4]/10">
            <div className="flex overflow-hidden rounded-l-lg">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('text');
                  handleSearch(searchQuery, 'text');
                  searchInputRef.current?.focus();
                }}
                className={`flex items-center justify-center px-3 transition-colors focus-visible:ring-2 focus-visible:ring-[#2f70b4]/40 ${
                  searchMode === 'text' ? 'bg-[#2f70b4] text-white' : 'bg-white text-[#2f70b4]'
                }`}
                title="Buscar productos"
                aria-pressed={searchMode === 'text'}
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchMode('barcode');
                  setShowResults(false);
                  handleScanBarcode(searchQuery);
                  searchInputRef.current?.focus();
                }}
                className={`flex items-center justify-center border-l border-gray-100 px-3 transition-colors focus-visible:ring-2 focus-visible:ring-[#2ccdb0]/40 ${
                  searchMode === 'barcode' ? 'bg-[#2ccdb0] text-white' : 'bg-white text-[#2ccdb0]'
                }`}
                title="Escanear código de barras"
                aria-pressed={searchMode === 'barcode'}
              >
                <Scan className="h-4 w-4" />
              </button>
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const normalized = searchQuery.trim();
                    if (!normalized) {
                      return;
                    }
                    if (searchMode === 'barcode') {
                      handleScanBarcode(normalized);
                    } else {
                      handleSearch(searchQuery, 'text');
                    }
                  }
                }}
                placeholder={searchMode === 'barcode' ? 'Código de barras' : 'Buscar productos'}
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
                  <div className="h-4 w-4 rounded-full border-2 border-[#2f70b4]/30 border-t-[#2f70b4] animate-spin" />
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
                            <div className="font-bold text-[#2f70b4]">
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
        <div className="flex items-center gap-2 flex-wrap justify-end xl:flex-nowrap">
          <button
            type="button"
            onClick={handleCreateProduct}
            className="flex items-center gap-1.5 rounded-lg border border-[#2ccdb0] bg-white px-3 py-2 text-sm font-semibold text-[#2f70b4] transition-colors hover:bg-[#2ccdb0]/10 focus-visible:ring-2 focus-visible:ring-[#2ccdb0]/40"
            title="Crear nuevo producto"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>

          {priceListOptions.length > 0 && (
            <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <select
                value={selectedPriceListId}
                onChange={(event) => onPriceListChange(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-800 focus:border-[#2f70b4] focus:outline-none"
              >
                {priceListOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={toggleCatalogView}
            className={`rounded-full border border-transparent p-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#2f70b4]/30 ${
              catalogView === 'list' ? 'bg-[#2f70b4]/10 text-[#2f70b4]' : 'text-[#2f70b4] hover:bg-slate-50'
            }`}
            title={viewToggleLabel}
            aria-label={viewToggleLabel}
            aria-pressed={catalogView === 'list'}
          >
            <ViewToggleIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-full border border-transparent p-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#2f70b4]/30 ${
              showFilters ? 'bg-[#2ccdb0]/15 text-[#2f70b4]' : 'text-[#2f70b4] hover:bg-slate-50'
            }`}
            title="Mostrar filtros"
          >
            <Filter className="h-4 w-4" />
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
                  ? 'bg-[#2f70b4]/10 text-[#2f70b4]' 
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
                    ? 'bg-[#2f70b4]/10 text-[#2f70b4]' 
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
            className="text-[#2f70b4] hover:text-[#2f70b4]/80 font-medium"
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
  };

  const renderGridView = () => (
    <div className={getGridClasses()}>
      {displayProducts.map((product) => {
        const {
          quantityInCart,
          inCart,
          unitLabel,
          stockValue,
          formattedPrice,
        } = getProductPresentationData(product);

        return (
          <div 
            key={product.id}
            onClick={() => handleProductClick(product)}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:scale-105 relative group"
          >
            {/* Imagen/Placeholder del producto */}
            <div className="aspect-square bg-[#2f70b4]/10 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-12 h-12 bg-[#2f70b4]/40 rounded-full flex items-center justify-center ${product.image ? 'hidden' : ''}`}>
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
              <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-[#2f70b4] transition-colors">
                {product.name}
              </h3>
              
              <div className="text-lg font-bold text-[#2f70b4]">
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
  );

  const renderListView = () => (
    <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
      {displayProducts.map((product) => {
        const {
          quantityInCart,
          inCart,
          stockValue,
          formattedPrice,
        } = getProductPresentationData(product);

        return (
          <div
            key={product.id}
            className={`flex items-center justify-between gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f70b4]/30 ${
              inCart ? 'border-[#2ccdb0] bg-[#2ccdb0]/10' : 'border-transparent hover:bg-gray-50'
            }`}
            onClick={() => handleProductClick(product)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleProductClick(product);
              }
            }}
            data-in-cart={inCart ? 'true' : 'false'}
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate" title={product.name}>
                    {product.name}
                  </span>
                  {quantityInCart > 0 && (
                    <span className="rounded-full bg-[#2f70b4]/10 px-1.5 py-0 text-[11px] font-semibold leading-5 text-[#2f70b4] shrink-0">
                      x{quantityInCart}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#2f70b4]/5 px-2 py-0.5 text-xs font-medium text-[#2f70b4]"
                title={`Stock disponible: ${stockValue}`}
                aria-label={`Stock disponible: ${stockValue}`}
              >
                <Package className="h-3 w-3" aria-hidden="true" />
                {stockValue}
              </span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums text-right min-w-[72px]">
                {formattedPrice}
              </span>
              <button
                type="button"
                className="rounded-full border border-gray-300 p-1 text-[#2f70b4] hover:bg-[#2f70b4]/10 focus-visible:ring-2 focus-visible:ring-[#2f70b4]/30"
                onClick={(event) => {
                  event.stopPropagation();
                  handleProductClick(product);
                }}
                aria-label={`Agregar ${product.name}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2f70b4] mx-auto mb-4"></div>
            <p className="text-gray-500">Cargando productos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-catalog-view={catalogView}>
      {/* Header de búsqueda */}
      {renderSearchHeader()}

      {/* Grid de productos */}
      <div
        ref={scrollAreaRef}
        className="flex-1 min-h-0 overflow-y-auto pb-4 thin-scrollbar"
        style={{ maxHeight: gridScrollMaxHeight }}
      >
        <div className="h-full w-full px-2 sm:px-3 lg:px-4">
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
                    className="mt-2 text-[#2f70b4] hover:text-[#2f70b4]/80 text-sm font-medium"
                  >
                    Ver todos los productos
                  </button>
                )}
              </div>
            </div>
          ) : (
            catalogView === 'list' ? renderListView() : renderGridView()
          )}
        </div>
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