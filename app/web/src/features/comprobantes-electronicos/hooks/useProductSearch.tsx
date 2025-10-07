import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Product, ProductSearchFilters, ProductSearchResult } from '../models/comprobante.types';
import { SEARCH_CONFIG } from '../models/constants';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';

export const useProductSearch = () => {
  // Obtener productos del catálogo real
  const { allProducts: catalogProducts } = useProductStore();
  
  // Convertir productos del catálogo al formato de comprobantes
  const AVAILABLE_PRODUCTS: Product[] = useMemo(() => 
    catalogProducts.map(p => ({
      id: p.id,
      code: p.codigo,
      name: p.nombre,
      price: p.precio,
      stock: p.cantidad,
      category: p.categoria || 'Sin categoría',
      description: p.descripcion || ''
    })),
    [catalogProducts]
  );
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>(AVAILABLE_PRODUCTS);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchFilters, setSearchFilters] = useState<ProductSearchFilters>({});

  // Función de búsqueda (simulada - en producción sería una llamada a API)
  const performSearch = useCallback(async (query: string, filters: ProductSearchFilters = {}): Promise<ProductSearchResult> => {
    setIsSearching(true);

    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      let filteredProducts = [...AVAILABLE_PRODUCTS];

      // Filtro por búsqueda de texto
      if (query && query.length >= SEARCH_CONFIG.MIN_SEARCH_LENGTH) {
        const searchTerm = query.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.code.toLowerCase().includes(searchTerm) ||
          product.description?.toLowerCase().includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm)
        );
      }

      // Filtro por categoría
      if (filters.category) {
        filteredProducts = filteredProducts.filter(product => 
          product.category?.toLowerCase() === filters.category?.toLowerCase()
        );
      }

      // Filtro por rango de precios
      if (filters.priceMin !== undefined) {
        filteredProducts = filteredProducts.filter(product => product.price >= filters.priceMin!);
      }
      if (filters.priceMax !== undefined) {
        filteredProducts = filteredProducts.filter(product => product.price <= filters.priceMax!);
      }

      // Filtro por stock
      if (filters.inStock) {
        filteredProducts = filteredProducts.filter(product => (product.stock || 0) > 0);
      }

      // Limitar resultados
      const limitedResults = filteredProducts.slice(0, SEARCH_CONFIG.MAX_RESULTS_PER_PAGE);

      return {
        products: limitedResults,
        total: filteredProducts.length,
        page: 1,
        hasMore: filteredProducts.length > SEARCH_CONFIG.MAX_RESULTS_PER_PAGE
      };
    } catch (error) {
      console.error('Error en búsqueda:', error);
      return {
        products: [],
        total: 0,
        page: 1,
        hasMore: false
      };
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
    const delayedSearch = setTimeout(async () => {
      const result = await performSearch(searchQuery, searchFilters);
      setSearchResults(result.products);
    }, SEARCH_CONFIG.DEBOUNCE_DELAY);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, searchFilters, performSearch]);

  // Buscar por código de barras
  const searchByBarcode = useCallback(async (barcode: string): Promise<Product | null> => {
    setIsSearching(true);
    
    try {
      // Simular delay de escaneo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const product = AVAILABLE_PRODUCTS.find(p => p.code === barcode);
      
      if (product) {
        // Agregar el producto encontrado al inicio de los resultados
        setSearchResults(prev => {
          const filtered = prev.filter(p => p.id !== product.id);
          return [product, ...filtered];
        });
        setSearchQuery(product.name); // Actualizar query para mostrar el resultado
      }
      
      return product || null;
    } catch (error) {
      console.error('Error en escaneo:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Buscar por categoría
  const searchByCategory = useCallback((category: string) => {
    setSelectedCategory(category);
    setSearchFilters(prev => ({ ...prev, category }));
  }, []);

  // Limpiar búsqueda
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSearchFilters({});
    setSearchResults(AVAILABLE_PRODUCTS);
  }, [AVAILABLE_PRODUCTS]);

  // Buscar producto por ID
  const findProductById = useCallback((id: string): Product | undefined => {
    return AVAILABLE_PRODUCTS.find(product => product.id === id);
  }, [AVAILABLE_PRODUCTS]);

  // Obtener productos sugeridos basados en historial (simulado)
  const getSuggestedProducts = useCallback((): Product[] => {
    // En producción, esto vendría del historial de ventas del usuario
    return AVAILABLE_PRODUCTS.slice(0, 4);
  }, [AVAILABLE_PRODUCTS]);

  // Validar stock de producto
  const hasStock = useCallback((productId: string): boolean => {
    const product = findProductById(productId);
    return product ? (product.stock || 0) > 0 : false;
  }, [findProductById]);

  // Obtener categorías únicas de los productos
  const availableCategories = useMemo(() => {
    const categories = new Set(AVAILABLE_PRODUCTS.map(p => p.category).filter(Boolean));
    return Array.from(categories);
  }, [AVAILABLE_PRODUCTS]);

  // Estado computed
  const hasSearchQuery = searchQuery.length >= SEARCH_CONFIG.MIN_SEARCH_LENGTH;
  const hasResults = searchResults.length > 0;
  const showAllProducts = !hasSearchQuery && !selectedCategory;

  return {
    // Estado
    searchQuery,
    searchResults,
    isSearching,
    selectedCategory,
    searchFilters,
    hasSearchQuery,
    hasResults,
    showAllProducts,
    availableCategories,

    // Acciones
    setSearchQuery,
    searchByBarcode,
    searchByCategory,
    clearSearch,
    setSearchFilters,

    // Utilidades
    performSearch,
    findProductById,
    getSuggestedProducts,
    hasStock
  };
};