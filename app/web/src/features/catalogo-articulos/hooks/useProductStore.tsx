/* eslint-disable @typescript-eslint/no-explicit-any -- tenantized store; tipos reales se migrarán luego */
import type { Product, Package, FilterOptions, PaginationConfig } from '../models/types';
import type { Category } from '../../configuracion-sistema/context/ConfigurationContext';
import { inferUnitMeasureType } from '../utils/unitMeasureHelpers';
// src/features/catalogo-articulos/hooks/useProductStore.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { ensureEmpresaId, lsKey } from '../../../shared/tenant';

// ===================================================================
// DATOS INICIALES - CATÁLOGO VACÍO
// Los usuarios crearán sus propios productos desde el catálogo
// ===================================================================
const mockProducts: Product[] = [];

// One-shot migration de llaves legacy -> namespaced por empresa
function migrateLegacyToNamespaced() {
  try {
    const empresaId = ensureEmpresaId();
    const markerKey = `${empresaId}:catalog_migrated`;
    const migrated = localStorage.getItem(markerKey);
    if (migrated === 'v1') return;

    const legacyKeys = [
      'catalog_products',
      'catalog_categories',
      'catalog_packages',
      // 'catalog_movimientos' removido: este módulo no gestiona stock
      'productTableColumns',
      'productTableColumnsVersion',
      'productFieldsConfig'
    ];

    for (const key of legacyKeys) {
      const namespaced = `${empresaId}:${key}`;
      const hasNamespaced = localStorage.getItem(namespaced) !== null;
      const legacyValue = localStorage.getItem(key);
      if (!hasNamespaced && legacyValue !== null) {
        localStorage.setItem(namespaced, legacyValue);
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(markerKey, 'v1');
  } catch (err) {
    console.warn('Migración legacy->namespaced omitida por empresaId inválido o error:', err);
  }
}

// Helpers para localStorage con manejo de fechas (namespaced por empresa)
const saveToLocalStorage = (key: string, data: any) => {
  try {
    const k = lsKey(key);
    localStorage.setItem(k, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const k = lsKey(key);
    const stored = localStorage.getItem(k);
    if (!stored) return defaultValue;

    const parsed = JSON.parse(stored);

    // Convertir fechas de string a Date
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => {
        const converted: any = { ...item };
        
        // Convertir fechas estándar de productos/categorías/paquetes
        if (item.fechaCreacion) {
          converted.fechaCreacion = new Date(item.fechaCreacion);
        }
        if (item.fechaActualizacion) {
          converted.fechaActualizacion = new Date(item.fechaActualizacion);
        }
        if (item.unidadesMedidaAdicionales === undefined) {
          converted.unidadesMedidaAdicionales = [];
        }
        if (!item.tipoUnidadMedida) {
          converted.tipoUnidadMedida = inferUnitMeasureType(item.unidad);
        }
        
        return converted;
      }) as T;
    }

    return parsed;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const useProductStore = () => {
  // Usar categorías desde el ConfigurationContext
  const { state: configState, dispatch: configDispatch } = useConfigurationContext();
  const categories = configState.categories;
  const resolveUnitType = useCallback(
    (unitCode: string, provided?: Product['tipoUnidadMedida']) => {
      if (provided) return provided;
      return inferUnitMeasureType(unitCode, configState.units);
    },
    [configState.units]
  );

  // Cargar datos desde localStorage o usar mock data
  // Ejecutar migración one-shot antes de leer
  useEffect(() => {
    migrateLegacyToNamespaced();
  }, []);

  const [products, setProducts] = useState<Product[]>(() =>
    loadFromLocalStorage('catalog_products', mockProducts)
  );
  const [packages, setPackages] = useState<Package[]>(() =>
    loadFromLocalStorage('catalog_packages', [])
  );

  // Persistir productos en localStorage
  useEffect(() => {
    saveToLocalStorage('catalog_products', products);
  }, [products]);

  // Persistir paquetes en localStorage
  useEffect(() => {
    saveToLocalStorage('catalog_packages', packages);
  }, [packages]);

  // Cambio de empresa en caliente: recargar estado cuando cambie empresaId actual
  const reloadForEmpresa = useCallback((empresaId: string) => {
    try {
      if (!empresaId || empresaId.trim() === '') {
        return;
      }
      // Leer explícitamente con la empresa indicada (sin usar lsKey para este caso)
      const read = <T,>(key: string, def: T): T => {
        try {
          const raw = localStorage.getItem(`${empresaId}:${key}`);
          if (!raw) return def;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((item: any) => {
              const converted: any = { ...item };
              if (item.fechaCreacion) converted.fechaCreacion = new Date(item.fechaCreacion);
              if (item.fechaActualizacion) converted.fechaActualizacion = new Date(item.fechaActualizacion);
              if (item.unidadesMedidaAdicionales === undefined) converted.unidadesMedidaAdicionales = [];
              if (item.fecha) converted.fecha = new Date(item.fecha);
              return converted;
            }) as T;
          }
          return parsed;
        } catch {
          return def;
        }
      };

  const p = read<Product[]>('catalog_products', mockProducts);
      const pk = read<Package[]>('catalog_packages', []);

      setProducts(p);
      setPackages(pk);
    } catch (e) {
      console.warn('reloadForEmpresa falló:', e);
    }
  }, []);

  // Efecto para intentar recarga automática si cambia el helper
  useEffect(() => {
    try {
      const current = ensureEmpresaId();
      reloadForEmpresa(current);
    } catch {
      // si empresaId inválido, no recargar
    }
  }, [reloadForEmpresa]);
  
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    busqueda: '',
    categoria: '',
    unidad: '',
    rangoPrecios: { min: 0, max: 50000 },
    marca: '',
    modelo: '',
    impuesto: '',
    ordenarPor: 'fechaCreacion',
    direccion: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationConfig>({
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
    totalItems: 0
  });

  // Productos filtrados y paginados
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      // Búsqueda expandida en múltiples campos
      const searchTerm = filters.busqueda.toLowerCase();
      const matchesBusqueda = !filters.busqueda ||
        product.nombre.toLowerCase().includes(searchTerm) ||
        product.codigo.toLowerCase().includes(searchTerm) ||
        product.categoria.toLowerCase().includes(searchTerm) ||
        (product.alias && product.alias.toLowerCase().includes(searchTerm)) ||
        (product.codigoBarras && product.codigoBarras.toLowerCase().includes(searchTerm)) ||
        (product.codigoFabrica && product.codigoFabrica.toLowerCase().includes(searchTerm)) ||
        (product.codigoSunat && product.codigoSunat.toLowerCase().includes(searchTerm)) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm)) ||
        (product.marca && product.marca.toLowerCase().includes(searchTerm)) ||
        (product.modelo && product.modelo.toLowerCase().includes(searchTerm));

      const matchesCategoria = !filters.categoria || product.categoria === filters.categoria;
      const matchesUnidad = !filters.unidad || product.unidad === filters.unidad;
  const matchesMarca = !filters.marca || product.marca === filters.marca;
  const matchesModelo = !filters.modelo || product.modelo === filters.modelo;
      const matchesImpuesto = !filters.impuesto || product.impuesto === filters.impuesto;

      const matchesPrecio = product.precio >= filters.rangoPrecios.min &&
        product.precio <= filters.rangoPrecios.max;

      return matchesBusqueda && matchesCategoria && matchesUnidad && matchesPrecio &&
        matchesMarca && matchesModelo && matchesImpuesto;
    });

    // Ordenar
    filtered.sort((a, b) => {
      const direction = filters.direccion === 'asc' ? 1 : -1;
      
      switch (filters.ordenarPor) {
        case 'nombre':
          return direction * a.nombre.localeCompare(b.nombre);
        case 'precio':
          return direction * (a.precio - b.precio);
        case 'fechaCreacion':
          return direction * (a.fechaCreacion.getTime() - b.fechaCreacion.getTime());
        default:
          return 0;
      }
    });

    // Actualizar paginación
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pagination.itemsPerPage);
    
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages,
      currentPage: Math.min(prev.currentPage, Math.max(1, totalPages))
    }));

    // Paginar
    const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const endIndex = startIndex + pagination.itemsPerPage;
    
    return filtered.slice(startIndex, endIndex);
  }, [products, filters, pagination.currentPage, pagination.itemsPerPage]);

  // CRUD Productos
  const addProduct = useCallback((productData: Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion'>) => {
    const newProduct: Product = {
      ...productData,
      tipoUnidadMedida: resolveUnitType(productData.unidad, productData.tipoUnidadMedida),
      unidadesMedidaAdicionales: productData.unidadesMedidaAdicionales || [],
      id: Date.now().toString(),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    setProducts(prev => [newProduct, ...prev]);

    // Actualizar contador de categoría en ConfigurationContext
    const updatedCategories = categories.map(cat =>
      cat.nombre === productData.categoria
        ? { ...cat, productCount: cat.productCount + 1 }
        : cat
    );
    configDispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });
  }, [categories, configDispatch, resolveUnitType]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === id
          ? {
              ...product,
              ...updates,
              unidadesMedidaAdicionales: updates.unidadesMedidaAdicionales ?? product.unidadesMedidaAdicionales ?? [],
              fechaActualizacion: new Date()
            }
          : product
      )
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setProducts(prev => prev.filter(p => p.id !== id));
      // Actualizar contador de categoría en ConfigurationContext
      const updatedCategories = categories.map(cat =>
        cat.nombre === product.categoria
          ? { ...cat, productCount: Math.max(0, cat.productCount - 1) }
          : cat
      );
      configDispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });
    }
  }, [products, categories, configDispatch]);

  // Eliminar todos los productos y resetear contadores de categorías
  const deleteAllProducts = useCallback(() => {
    setProducts([]);
    const updatedCategories = categories.map(cat => ({ ...cat, productCount: 0 }));
    configDispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });
  }, [categories, configDispatch]);

  // Importación masiva con upsert (clave = código)
  const importProducts = useCallback((productsData: Array<Omit<Product, 'id' | 'fechaCreacion' | 'fechaActualizacion'>>) => {
    const now = new Date();
    let createdCount = 0;
    let updatedCount = 0;

    setProducts(prev => {
      const newProducts = [...prev];
      const categoryCounts = new Map<string, number>();

      // Contar productos por categoría existentes
      prev.forEach(p => {
        categoryCounts.set(p.categoria, (categoryCounts.get(p.categoria) || 0) + 1);
      });

      productsData.forEach(productData => {
        const existingIndex = newProducts.findIndex(p => p.codigo === productData.codigo);

        if (existingIndex >= 0) {
          // Actualizar producto existente
          const oldCategory = newProducts[existingIndex].categoria;
          newProducts[existingIndex] = {
            ...newProducts[existingIndex],
            ...productData,
            tipoUnidadMedida: resolveUnitType(productData.unidad, productData.tipoUnidadMedida ?? newProducts[existingIndex].tipoUnidadMedida),
            unidadesMedidaAdicionales: productData.unidadesMedidaAdicionales || [],
            fechaActualizacion: now
          };

          // Actualizar contador si cambió de categoría
          if (oldCategory !== productData.categoria) {
            categoryCounts.set(oldCategory, Math.max(0, (categoryCounts.get(oldCategory) || 0) - 1));
            categoryCounts.set(productData.categoria, (categoryCounts.get(productData.categoria) || 0) + 1);
          }

          updatedCount++;
        } else {
          // Crear nuevo producto
          const newProduct: Product = {
            ...productData,
            tipoUnidadMedida: resolveUnitType(productData.unidad, productData.tipoUnidadMedida),
            unidadesMedidaAdicionales: productData.unidadesMedidaAdicionales || [],
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            fechaCreacion: now,
            fechaActualizacion: now
          };
          newProducts.push(newProduct);
          categoryCounts.set(productData.categoria, (categoryCounts.get(productData.categoria) || 0) + 1);
          createdCount++;
        }
      });

      // Actualizar contadores de categorías
      const updatedCategories = categories.map(cat => ({
        ...cat,
        productCount: categoryCounts.get(cat.nombre) || 0
      }));
      configDispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });

      return newProducts;
    });

    return { createdCount, updatedCount };
  }, [categories, configDispatch, resolveUnitType]);

  // CRUD Categorías - Ahora usan ConfigurationContext
  const addCategory = useCallback((nombre: string, descripcion?: string, color?: string) => {
    // Evitar duplicados por nombre (case-insensitive)
    if (categories.some(cat => cat.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) {
      return;
    }
    const newCategory: Category = {
      id: Date.now().toString(),
      nombre,
      descripcion,
      color,
      productCount: 0,
      fechaCreacion: new Date()
    };
    configDispatch({ type: 'SET_CATEGORIES', payload: [...categories, newCategory] });
  }, [categories, configDispatch]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    const updatedCategories = categories.map(category =>
      category.id === id ? { ...category, ...updates } : category
    );
    configDispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });
  }, [categories, configDispatch]);

  const deleteCategory = useCallback((id: string) => {
    const updatedCategories = categories.filter(cat => cat.id !== id);
    configDispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });
  }, [categories, configDispatch]);

  // Filtros y paginación
  const updateFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      busqueda: '',
      categoria: '',
      unidad: '',
      rangoPrecios: { min: 0, max: 50000 },
      marca: '',
      modelo: '',
      impuesto: '',
      ordenarPor: 'fechaCreacion',
      direccion: 'desc'
    });
  }, []);

  const changePage = useCallback((page: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: Math.max(1, Math.min(page, prev.totalPages))
    }));
  }, []);

  const changeItemsPerPage = useCallback((itemsPerPage: number) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage,
      currentPage: 1
    }));
  }, []);

  // CRUD Paquetes
  const addPackage = useCallback((packageData: Omit<Package, 'id' | 'fechaCreacion'>) => {
    const newPackage: Package = {
      ...packageData,
      id: Date.now().toString(),
      fechaCreacion: new Date()
    };
    setPackages(prev => [newPackage, ...prev]);
  }, []);

  const updatePackage = useCallback((id: string, updates: Partial<Package>) => {
    setPackages(prev =>
      prev.map(pkg =>
        pkg.id === id ? { ...pkg, ...updates } : pkg
      )
    );
  }, []);

  const deletePackage = useCallback((id: string) => {
    setPackages(prev => prev.filter(pkg => pkg.id !== id));
  }, []);

  return {
    // Estado
    products: filteredProducts,
    allProducts: products,
    categories,
    packages,
    loading,
    filters,
    pagination,

    // Productos
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,
    importProducts,

    // Categorías
    addCategory,
    updateCategory,
    deleteCategory,

    // Paquetes
    addPackage,
    updatePackage,
    deletePackage,

    // Filtros y paginación
    updateFilters,
    resetFilters,
    changePage,
    changeItemsPerPage,

    // Utils
    setLoading,

    // Cambio de empresa
    reloadForEmpresa
  };
};