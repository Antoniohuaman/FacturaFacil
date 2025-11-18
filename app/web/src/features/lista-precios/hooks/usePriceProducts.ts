// src/features/lista-precios/hooks/usePriceProducts.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, PriceForm, FixedPrice, VolumePrice, CatalogProduct } from '../models/PriceTypes';
import { lsKey } from '../utils/tenantHelpers';

/**
 * Utilidad para cargar desde localStorage
 */
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch (error) {
    console.error(`[usePriceProducts] Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Utilidad para guardar en localStorage
 */
const saveToLocalStorage = (key: string, data: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[usePriceProducts] Error saving ${key} to localStorage:`, error);
  }
};

/**
 * Validar fechas de vigencia
 */
const validateDates = (validFrom: string, validUntil: string): string | null => {
  const fromDate = new Date(validFrom);
  const untilDate = new Date(validUntil);

  if (isNaN(fromDate.getTime())) {
    return 'La fecha "Vigente desde" no es válida';
  }

  if (isNaN(untilDate.getTime())) {
    return 'La fecha "Vigente hasta" no es válida';
  }

  if (fromDate >= untilDate) {
    return 'La fecha "Vigente hasta" debe ser posterior a "Vigente desde"';
  }

  return null;
};

/**
 * Validar precio fijo
 */
const validateFixedPrice = (value: string): string | null => {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return 'El precio debe ser un número válido';
  }

  if (numValue <= 0) {
    return 'El precio debe ser mayor a 0';
  }

  return null;
};

/**
 * Hook para gestión de productos con precios
 */
export const usePriceProducts = (catalogProducts: CatalogProduct[]) => {
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromLocalStorage<Product[]>(lsKey('price_list_products'), [])
  );
  const [searchSKU, setSearchSKU] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistir productos en localStorage cuando cambien
  useEffect(() => {
    saveToLocalStorage(lsKey('price_list_products'), products);
  }, [products]);

  // Sincronizar cambios de otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === lsKey('price_list_products') && e.newValue) {
        try {
          const newProducts = JSON.parse(e.newValue);
          setProducts(newProducts);
        } catch (error) {
          console.error('[usePriceProducts] Error parsing products from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Lista combinada: todos los productos del catálogo + los que tienen precios aunque ya no estén en el catálogo
   */
  const catalogMergedProducts = useMemo(() => {
    const catalogSkuSet = new Set(catalogProducts.map(product => product.codigo));
    const productsMap = new Map(products.map(product => [product.sku, product] as const));

    const merged: Product[] = catalogProducts.map((catalogProduct) => {
      const existing = productsMap.get(catalogProduct.codigo);
      if (existing) {
        return existing.name === catalogProduct.nombre
          ? existing
          : { ...existing, name: catalogProduct.nombre };
      }
      return {
        sku: catalogProduct.codigo,
        name: catalogProduct.nombre,
        prices: {}
      };
    });

    // Incluir productos que tienen precios pero ya no existen en el catálogo
    products.forEach((product) => {
      if (!catalogSkuSet.has(product.sku)) {
        merged.push(product);
      }
    });

    return merged;
  }, [products, catalogProducts]);

  /**
   * Productos filtrados por búsqueda (sobre la lista combinada)
   */
  const filteredProducts = useMemo(() => {
    if (searchSKU === '') return catalogMergedProducts;

    const searchTerm = searchSKU.toLowerCase().trim();
    return catalogMergedProducts.filter(product => {
      const skuMatch = product.sku.toLowerCase().includes(searchTerm);
      const nameMatch = product.name.toLowerCase().includes(searchTerm);
      return skuMatch || nameMatch;
    });
  }, [catalogMergedProducts, searchSKU]);

  /**
   * Verificar si un SKU existe en el catálogo
   */
  const isSKUInCatalog = useCallback((sku: string): boolean => {
    return catalogProducts.some(p => p.codigo === sku.trim());
  }, [catalogProducts]);

  /**
   * Obtener producto del catálogo por SKU
   */
  const getCatalogProductBySKU = useCallback((sku: string): CatalogProduct | undefined => {
    return catalogProducts.find(p => p.codigo === sku.trim());
  }, [catalogProducts]);

  /**
   * Agregar o actualizar precio de producto
   */
  const addOrUpdateProductPrice = useCallback(async (priceData: PriceForm): Promise<boolean> => {
    const { sku, columnId, validFrom, validUntil } = priceData;

    // Validaciones básicas
    if (!sku.trim()) {
      setError('El SKU es requerido');
      return false;
    }

    if (!columnId) {
      setError('Debe seleccionar una columna');
      return false;
    }

    // Validar fechas
    const dateError = validateDates(validFrom, validUntil);
    if (dateError) {
      setError(dateError);
      return false;
    }

    // Buscar producto en el catálogo
    const catalogProduct = getCatalogProductBySKU(sku);
    if (!catalogProduct) {
      setError(`El SKU "${sku}" no existe en el catálogo de productos`);
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      let newPrice: FixedPrice | VolumePrice;

      if (priceData.type === 'fixed') {
        // Validar precio fijo
        const priceError = validateFixedPrice(priceData.value);
        if (priceError) {
          setError(priceError);
          return false;
        }

        newPrice = {
          type: 'fixed',
          value: parseFloat(priceData.value),
          validFrom,
          validUntil
        };
      } else if (priceData.type === 'volume') {
        // Validar rangos de volumen
        if (priceData.ranges.length === 0) {
          setError('Debe agregar al menos un rango de cantidad');
          return false;
        }

        const ranges = priceData.ranges.map((range, index) => {
          const minQty = parseInt(range.minQuantity);
          const maxQty = range.maxQuantity ? parseInt(range.maxQuantity) : null;
          const price = parseFloat(range.price);

          if (isNaN(minQty) || minQty <= 0) {
            throw new Error(`Rango ${index + 1}: cantidad mínima inválida`);
          }

          if (maxQty !== null && (isNaN(maxQty) || maxQty <= minQty)) {
            throw new Error(`Rango ${index + 1}: cantidad máxima debe ser mayor a la mínima`);
          }

          if (isNaN(price) || price <= 0) {
            throw new Error(`Rango ${index + 1}: precio inválido`);
          }

          return {
            id: (index + 1).toString(),
            minQuantity: minQty,
            maxQuantity: maxQty,
            price: price
          };
        });

        newPrice = {
          type: 'volume',
          ranges,
          validFrom,
          validUntil
        };
      } else {
        setError('Tipo de precio no válido');
        return false;
      }

      // Actualizar o crear producto
      const existingProductIndex = products.findIndex(p => p.sku === sku.trim());

      if (existingProductIndex >= 0) {
        // Actualizar producto existente
        const updatedProducts = [...products];
        updatedProducts[existingProductIndex] = {
          ...updatedProducts[existingProductIndex],
          prices: {
            ...updatedProducts[existingProductIndex].prices,
            [columnId]: newPrice
          }
        };
        setProducts(updatedProducts);
      } else {
        // Agregar nuevo producto con información del catálogo
        const newProduct: Product = {
          sku: catalogProduct.codigo,
          name: catalogProduct.nombre,
          prices: {
            [columnId]: newPrice
          }
        };
        setProducts([...products, newProduct]);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar precio';
      console.error('[usePriceProducts] Error saving price:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [products, getCatalogProductBySKU]);

  /**
   * Eliminar precios de una columna específica
   */
  const removeProductPricesForColumn = useCallback((columnId: string): void => {
    setProducts(products.map(product => ({
      ...product,
      prices: Object.fromEntries(
        Object.entries(product.prices).filter(([key]) => key !== columnId)
      )
    })).filter(product => Object.keys(product.prices).length > 0)); // Eliminar productos sin precios
  }, [products]);

  /**
   * Limpiar error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    products: catalogMergedProducts,
    filteredProducts,
    searchSKU,
    loading,
    error,
    setSearchSKU,
    addOrUpdateProductPrice,
    removeProductPricesForColumn,
    isSKUInCatalog,
    getCatalogProductBySKU,
    clearError
  };
};
