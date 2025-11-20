// src/features/lista-precios/hooks/usePriceProducts.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Product, PriceForm, FixedPrice, VolumePrice, CatalogProduct, ProductUnitPrices, Price, Column } from '../models/PriceTypes';
import { lsKey } from '../utils/tenantHelpers';
import { buildEffectivePriceMatrix, DEFAULT_UNIT_CODE, getFixedPriceValue, getCanonicalColumnId } from '../utils/priceHelpers';

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
  if (value.trim() === '') {
    return null;
  }
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return 'El precio debe ser un número válido';
  }

  if (numValue <= 0) {
    return 'El precio debe ser mayor a 0';
  }

  return null;
};

type StoredProduct = Omit<Product, 'prices'> & {
  prices: Record<string, Price | ProductUnitPrices>;
};

const isPriceObject = (value: unknown): value is Price => {
  if (!value || typeof value !== 'object') return false;
  const maybePrice = value as Partial<Price> & { type?: string };
  return maybePrice.type === 'fixed' || maybePrice.type === 'volume';
};

const isUnitPriceMap = (value: unknown): value is ProductUnitPrices => {
  if (!value || typeof value !== 'object') return false;
  const entries = Object.values(value as Record<string, unknown>);
  return entries.every(entry => isPriceObject(entry));
};

const getBaseUnitForProduct = (catalogProduct?: CatalogProduct, fallback?: string): string => {
  return catalogProduct?.unidad || fallback || DEFAULT_UNIT_CODE;
};

const normalizeStoredProduct = (
  product: StoredProduct,
  catalogProduct?: CatalogProduct
): Product => {
  const baseUnit = getBaseUnitForProduct(catalogProduct, product.activeUnitCode);
  const normalizedPrices: Record<string, ProductUnitPrices> = {};

  Object.entries(product.prices || {}).forEach(([columnId, rawValue]) => {
    const canonicalColumnId = getCanonicalColumnId(columnId);
    if (!rawValue) return;
    if (isPriceObject(rawValue)) {
      normalizedPrices[canonicalColumnId] = {
        ...(normalizedPrices[canonicalColumnId] || {}),
        [baseUnit]: rawValue
      };
    } else if (isUnitPriceMap(rawValue)) {
      normalizedPrices[canonicalColumnId] = {
        ...(normalizedPrices[canonicalColumnId] || {}),
        ...rawValue
      };
    } else {
      normalizedPrices[canonicalColumnId] = normalizedPrices[canonicalColumnId] || {};
    }
  });

  return {
    sku: product.sku,
    name: product.name,
    prices: normalizedPrices,
    activeUnitCode: product.activeUnitCode || baseUnit
  };
};

const normalizeStoredProducts = (
  storedProducts: StoredProduct[],
  catalogProducts: CatalogProduct[]
): Product[] => {
  const catalogMap = new Map(catalogProducts.map(product => [product.codigo, product] as const));
  return storedProducts.map(product =>
    normalizeStoredProduct(product, catalogMap.get(product.sku))
  );
};

/**
 * Hook para gestión de productos con precios
 */
export const usePriceProducts = (catalogProducts: CatalogProduct[], columns: Column[]) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = loadFromLocalStorage<StoredProduct[]>(lsKey('price_list_products'), []);
    return normalizeStoredProducts(stored, catalogProducts);
  });
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
          const newProducts = JSON.parse(e.newValue) as StoredProduct[];
          setProducts(normalizeStoredProducts(newProducts, catalogProducts));
        } catch (error) {
          console.error('[usePriceProducts] Error parsing products from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [catalogProducts]);

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
        prices: {},
        activeUnitCode: getBaseUnitForProduct(catalogProduct)
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
    const { sku, columnId, unitCode, validFrom, validUntil } = priceData;
    const normalizedSku = sku.trim();

    // Validaciones básicas
    if (!normalizedSku) {
      setError('El SKU es requerido');
      return false;
    }

    if (!columnId) {
      setError('Debe seleccionar una columna');
      return false;
    }

    const canonicalColumnId = getCanonicalColumnId(columnId);
    const catalogProduct = getCatalogProductBySKU(normalizedSku);
    const existingProduct = products.find(product => product.sku === normalizedSku);
    const targetColumn = columns.find(column => column.id === canonicalColumnId);

    if (!targetColumn) {
      setError('Columna no encontrada');
      return false;
    }

    const resolvedUnitCode = unitCode?.trim() || getBaseUnitForProduct(catalogProduct, existingProduct?.activeUnitCode);
    if (!resolvedUnitCode) {
      setError('Debe seleccionar una unidad de medida');
      return false;
    }

    const isClearingFixedPrice = priceData.type === 'fixed' && priceData.value.trim() === '';

    if (!catalogProduct && !existingProduct) {
      setError(`El SKU "${normalizedSku}" no existe en el catálogo de productos`);
      return false;
    }

    if (!isClearingFixedPrice) {
      const dateError = validateDates(validFrom, validUntil);
      if (dateError) {
        setError(dateError);
        return false;
      }
    }

    if (
      !isClearingFixedPrice &&
      priceData.type === 'fixed' &&
      targetColumn.kind === 'min-allowed'
    ) {
      const baseColumn = columns.find(column => column.kind === 'base');
      const baseColumnId = baseColumn?.id;
      const baseValue = baseColumnId && existingProduct
        ? getFixedPriceValue(existingProduct.prices[baseColumnId]?.[resolvedUnitCode])
        : undefined;

      if (typeof baseValue === 'number') {
        const minValue = parseFloat(priceData.value);
        if (Number.isFinite(minValue) && minValue > baseValue) {
          setError('El precio mínimo no puede ser mayor que el precio base.');
          return false;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (isClearingFixedPrice) {
        setProducts(prevProducts => {
          const updated = prevProducts.map(product => {
            if (product.sku !== normalizedSku) return product;
            const columnPrices = product.prices[canonicalColumnId];
            if (!columnPrices || !(resolvedUnitCode in columnPrices)) return product;

            const nextColumnPrices = { ...columnPrices };
            delete nextColumnPrices[resolvedUnitCode];

            const nextPrices = { ...product.prices };
            if (Object.keys(nextColumnPrices).length === 0) {
              delete nextPrices[canonicalColumnId];
            } else {
              nextPrices[canonicalColumnId] = nextColumnPrices;
            }

            return {
              ...product,
              prices: nextPrices
            };
          });
          return updated;
        });
        return true;
      }

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
      setProducts(prevProducts => {
        const updated = [...prevProducts];
        const targetIndex = updated.findIndex(p => p.sku === normalizedSku);

        if (targetIndex >= 0) {
          const target = updated[targetIndex];
          const columnPrices = target.prices[canonicalColumnId] || {};
          updated[targetIndex] = {
            ...target,
            prices: {
              ...target.prices,
              [canonicalColumnId]: {
                ...columnPrices,
                [resolvedUnitCode]: newPrice
              }
            },
            activeUnitCode: target.activeUnitCode || resolvedUnitCode
          };
          return updated;
        }

        if (!catalogProduct) {
          return updated;
        }

        const newProduct: Product = {
          sku: catalogProduct.codigo,
          name: catalogProduct.nombre,
          prices: {
            [canonicalColumnId]: {
              [resolvedUnitCode]: newPrice
            }
          },
          activeUnitCode: resolvedUnitCode
        };

        return [...updated, newProduct];
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar precio';
      console.error('[usePriceProducts] Error saving price:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getCatalogProductBySKU, products, columns]);

  /**
   * Eliminar precios de una columna específica
   */
  const removeProductPricesForColumn = useCallback((columnId: string): void => {
    const canonicalColumnId = getCanonicalColumnId(columnId);
    setProducts(prevProducts => {
      const next = prevProducts
        .map(product => {
          const remainingEntries = Object.entries(product.prices).filter(([priceColumnId]) => getCanonicalColumnId(priceColumnId) !== canonicalColumnId);
          if (remainingEntries.length === Object.entries(product.prices).length) {
            return product;
          }
          const remainingPrices = Object.fromEntries(remainingEntries);
          return {
            ...product,
            prices: remainingPrices
          };
        })
        .filter(product => Object.values(product.prices).some(unitPrices => Object.keys(unitPrices).length > 0));
      return next;
    });
  }, []);

  const setProductActiveUnit = useCallback((sku: string, unitCode: string) => {
    if (!unitCode) return;
    setProducts(prevProducts => {
      const targetIndex = prevProducts.findIndex(product => product.sku === sku);
      if (targetIndex >= 0) {
        if (prevProducts[targetIndex].activeUnitCode === unitCode) {
          return prevProducts;
        }
        const updated = [...prevProducts];
        updated[targetIndex] = {
          ...prevProducts[targetIndex],
          activeUnitCode: unitCode
        };
        return updated;
      }

      const catalogProduct = catalogProducts.find(product => product.codigo === sku);
      if (!catalogProduct) {
        return prevProducts;
      }

      const newProduct: Product = {
        sku: catalogProduct.codigo,
        name: catalogProduct.nombre,
        prices: {},
        activeUnitCode: unitCode
      };

      return [...prevProducts, newProduct];
    });
  }, [catalogProducts]);

  /**
   * Limpiar error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const effectivePrices = useMemo(() => buildEffectivePriceMatrix(catalogMergedProducts, columns, catalogProducts), [catalogMergedProducts, columns, catalogProducts]);

  return {
    products: catalogMergedProducts,
    filteredProducts,
    searchSKU,
    loading,
    error,
    setSearchSKU,
    addOrUpdateProductPrice,
    removeProductPricesForColumn,
    setProductActiveUnit,
    isSKUInCatalog,
    getCatalogProductBySKU,
    clearError,
    effectivePrices
  };
};
