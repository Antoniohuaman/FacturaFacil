/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useEffect } from 'react';
import type { Column, Product, NewColumnForm, PriceForm, FixedPrice, VolumePrice, ProductUnitPrices } from '../models/PriceTypes';
import {
  generateColumnId,
  getNextOrder,
  removeProductPricesForColumn
} from '../utils/priceHelpers';

// Tipos del módulo de productos (catálogo)
interface CatalogProduct {
  id: string;
  codigo: string;
  nombre: string;
  precio: number;
  [key: string]: any;
}

const DEFAULT_UNIT_CODE = 'NIU';

// Helpers de tenant/empresa para namespacing de localStorage
const getTenantEmpresaId = () => 'EMP-01'; // TODO: reemplazar por hook real
const ensureEmpresaId = (id: string) => {
  if (!id) throw new Error('empresaId requerido');
  return id;
};
const lsKey = (base: string) => `${ensureEmpresaId(getTenantEmpresaId())}:${base}`;

// Utilidad para cargar desde localStorage
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

// Utilidad para guardar en localStorage
const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

export const usePriceList = () => {
  // Cargar columnas desde localStorage (vacío por defecto)
  const [columns, setColumns] = useState<Column[]>(() =>
    loadFromLocalStorage<Column[]>('price_list_columns', [])
  );

  // Cargar precios desde localStorage (vacío por defecto)
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromLocalStorage<Product[]>('price_list_products', [])
  );

  const [activeTab, setActiveTab] = useState<'columns' | 'products'>('columns');
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showProductPriceModal, setShowProductPriceModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchSKU, setSearchSKU] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar productos desde el catálogo
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(() => {
    try {
      return loadFromLocalStorage<CatalogProduct[]>(lsKey('catalog_products'), []);
    } catch (e) {
      console.warn('usePriceList: error leyendo catalog_products', e);
      return [];
    }
  });

  // Sincronizar con localStorage del catálogo cuando cambie
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      try {
        if (e.key === lsKey('catalog_products') && e.newValue) {
          const newProducts = JSON.parse(e.newValue);
          setCatalogProducts(newProducts);
        }
      } catch (error) {
        console.error('Error parsing catalog products:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Persistir columnas en localStorage cuando cambien
  useEffect(() => {
    saveToLocalStorage('price_list_columns', columns);
  }, [columns]);

  // Persistir productos/precios en localStorage cuando cambien
  useEffect(() => {
    saveToLocalStorage('price_list_products', products);
  }, [products]);

  // Computed values - Filtrar productos que tienen precios asignados
  const filteredProducts = products.filter(product => {
    if (searchSKU === '') return true;

    const searchTerm = searchSKU.toLowerCase().trim();
    const skuMatch = product.sku.toLowerCase().includes(searchTerm);
    const nameMatch = product.name.toLowerCase().includes(searchTerm);

    return skuMatch || nameMatch;
  });

  // Column management functions
  const addColumn = async (newColumnData: NewColumnForm) => {
    if (newColumnData.name.trim() && columns.length < 10) {
      setLoading(true);
      setError(null);
      
      try {
        // Simular operación async
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newId = generateColumnId(columns);
        const newOrder = getNextOrder(columns);
        
        const newColumn: Column = {
          id: newId,
          name: newColumnData.name.trim(),
          mode: newColumnData.mode,
          visible: newColumnData.visible,
          isBase: newColumnData.isBase && !columns.some(c => c.isBase),
          order: newOrder
        };
        
        setColumns([...columns, newColumn]);
        return true;
      } catch {
        setError('Error al agregar columna');
        return false;
      } finally {
        setLoading(false);
      }
    }
    return false;
  };

  const deleteColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column && !column.isBase) {
      setColumns(columns.filter(c => c.id !== columnId));
      setProducts(removeProductPricesForColumn(products, columnId));
      return true;
    }
    return false;
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const setBaseColumn = (columnId: string) => {
    setColumns(columns.map(col => ({
      ...col,
      isBase: col.id === columnId
    })));
  };

  const updateColumn = (columnId: string, updates: Partial<Column>) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  // Product management functions
  const addOrUpdateProductPrice = (priceData: PriceForm) => {
    const { sku, columnId, validFrom, validUntil } = priceData;

    if (!sku.trim() || !columnId || !validFrom || !validUntil) {
      return false;
    }

    // Buscar producto en el catálogo
    const catalogProduct = catalogProducts.find(p => p.codigo === sku.trim());
    if (!catalogProduct) {
      setError(`El SKU "${sku}" no existe en el catálogo de productos`);
      return false;
    }

    const existingProductIndex = products.findIndex(p => p.sku === sku.trim());
    const unitCode = priceData.unitCode || DEFAULT_UNIT_CODE;

    let newPrice: FixedPrice | VolumePrice;

    if (priceData.type === 'fixed') {
      // Precio fijo
      const value = priceData.value;
      if (!value) {
        return false;
      }

      newPrice = {
        type: 'fixed',
        value: parseFloat(value),
        validFrom,
        validUntil
      };
    } else if (priceData.type === 'volume') {
      // Precio por volumen
      const ranges = priceData.ranges.map((range, index) => ({
        id: (index + 1).toString(),
        minQuantity: parseInt(range.minQuantity) || 0,
        maxQuantity: range.maxQuantity ? parseInt(range.maxQuantity) : null,
        price: parseFloat(range.price) || 0
      }));

      newPrice = {
        type: 'volume',
        ranges,
        validFrom,
        validUntil
      };
    } else {
      return false;
    }

    if (existingProductIndex >= 0) {
      // Actualizar producto existente
      const updatedProducts = [...products];
      const productToUpdate = updatedProducts[existingProductIndex];
      const existingColumnPrices: ProductUnitPrices = productToUpdate.prices[columnId] || {};
      updatedProducts[existingProductIndex] = {
        ...productToUpdate,
        prices: {
          ...productToUpdate.prices,
          [columnId]: {
            ...existingColumnPrices,
            [unitCode]: newPrice
          }
        },
        activeUnitCode: productToUpdate.activeUnitCode || unitCode
      };
      setProducts(updatedProducts);
    } else {
      // Agregar nuevo producto con información del catálogo
      const newProduct: Product = {
        sku: catalogProduct.codigo,
        name: catalogProduct.nombre,
        prices: {
          [columnId]: {
            [unitCode]: newPrice
          }
        },
        activeUnitCode: unitCode
      };
      setProducts([...products, newProduct]);
    }

    return true;
  };

  // Modal management
  const openColumnModal = (column?: Column) => {
    setEditingColumn(column || null);
    setShowColumnModal(true);
  };

  const closeColumnModal = () => {
    setShowColumnModal(false);
    setEditingColumn(null);
  };

  const openPriceModal = (product?: Product) => {
    setSelectedProduct(product || null);
    setShowProductPriceModal(true);
  };

  const closePriceModal = () => {
    setShowProductPriceModal(false);
    setSelectedProduct(null);
  };

  // Función para obtener productos del catálogo
  const getCatalogProducts = () => catalogProducts;

  // Función para verificar si un SKU existe en el catálogo
  const isSKUInCatalog = (sku: string): boolean => {
    return catalogProducts.some(p => p.codigo === sku.trim());
  };

  // Función para obtener información de producto del catálogo por SKU
  const getCatalogProductBySKU = (sku: string): CatalogProduct | undefined => {
    return catalogProducts.find(p => p.codigo === sku.trim());
  };

  return {
    // State
    columns,
    products,
    filteredProducts,
    loading,
    error,
    activeTab,
    showColumnModal,
    showProductPriceModal,
    editingColumn,
    selectedProduct,
    searchSKU,
    catalogProducts,

    // Actions
    setActiveTab,
    setSearchSKU,
    addColumn,
    deleteColumn,
    toggleColumnVisibility,
    setBaseColumn,
    updateColumn,
    addOrUpdateProductPrice,
    openColumnModal,
    closeColumnModal,
    openPriceModal,
    closePriceModal,
    getCatalogProducts,
    isSKUInCatalog,
    getCatalogProductBySKU
  };
};