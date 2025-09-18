import type { Product, Category, Package, FilterOptions, PaginationConfig } from '../models/types';
// src/features/catalogo-articulos/hooks/useProductStore.tsx

import { useState, useMemo, useCallback } from 'react';

// Mock data
const mockProducts: Product[] = [
  {
    id: '1',
    codigo: '99',
    nombre: 'PAGO FINAL CONSTRUCCION LOSA',
    unidad: 'DOCENA',
    precio: 3000.00,
    cantidad: 0,
    categoria: 'FRUTALES',
    conImpuestos: true,
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-15'),
    fechaActualizacion: new Date('2024-01-15')
  },
  {
    id: '2',
    codigo: '0111',
    nombre: 'test',
    unidad: 'UNIDAD',
    precio: 200.00,
    cantidad: -1,
    categoria: 'FRUTALES',
    conImpuestos: true,
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-14'),
    fechaActualizacion: new Date('2024-01-14')
  },
  {
    id: '3',
    codigo: 'ISC',
    nombre: 'PRUEBA ISC',
    unidad: 'DOCENA',
    precio: 100.00,
    cantidad: -2,
    categoria: 'FRUTALES',
    conImpuestos: true,
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-13'),
    fechaActualizacion: new Date('2024-01-13')
  },
  {
    id: '4',
    codigo: '6657567',
    nombre: 'KK',
    unidad: 'DOCENA',
    precio: 100.00,
    cantidad: 0,
    categoria: 'Alimentos y Bebidas',
    conImpuestos: true,
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-12'),
    fechaActualizacion: new Date('2024-01-12')
  },
  {
    id: '5',
    codigo: '092512',
    nombre: 'polo',
    unidad: 'UNIDAD',
    precio: 10000.00,
    cantidad: 0,
    categoria: 'Accesorios',
    conImpuestos: true,
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-11'),
    fechaActualizacion: new Date('2024-01-11')
  }
];

const mockCategories: Category[] = [
  { id: '1', nombre: 'FRUTALES', productCount: 3, fechaCreacion: new Date('2024-01-01') },
  { id: '2', nombre: 'Alimentos y Bebidas', productCount: 1, fechaCreacion: new Date('2024-01-01') },
  { id: '3', nombre: 'Accesorios', productCount: 1, fechaCreacion: new Date('2024-01-01') },
  { id: '4', nombre: 'CERRAJERIA', productCount: 0, fechaCreacion: new Date('2024-01-01') },
  { id: '5', nombre: 'CONTRUCCION', productCount: 0, fechaCreacion: new Date('2024-01-01') },
  { id: '6', nombre: 'SOFTWARE', productCount: 0, fechaCreacion: new Date('2024-01-01') }
];

export const useProductStore = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [packages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    busqueda: '',
    categoria: '',
    unidad: '',
    conImpuestos: undefined,
    rangoPrecios: { min: 0, max: 50000 },
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
    let filtered = products.filter(product => {
      const matchesBusqueda = !filters.busqueda || 
        product.nombre.toLowerCase().includes(filters.busqueda.toLowerCase()) ||
        product.codigo.toLowerCase().includes(filters.busqueda.toLowerCase());
      
      const matchesCategoria = !filters.categoria || product.categoria === filters.categoria;
      const matchesUnidad = !filters.unidad || product.unidad === filters.unidad;
      const matchesImpuestos = filters.conImpuestos === undefined || product.conImpuestos === filters.conImpuestos;
      
      const matchesPrecio = product.precio >= filters.rangoPrecios.min && 
        product.precio <= filters.rangoPrecios.max;

      return matchesBusqueda && matchesCategoria && matchesUnidad && matchesImpuestos && matchesPrecio;
    });

    // Ordenar
    filtered.sort((a, b) => {
      const direction = filters.direccion === 'asc' ? 1 : -1;
      
      switch (filters.ordenarPor) {
        case 'nombre':
          return direction * a.nombre.localeCompare(b.nombre);
        case 'precio':
          return direction * (a.precio - b.precio);
        case 'cantidad':
          return direction * (a.cantidad - b.cantidad);
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
      id: Date.now().toString(),
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    setProducts(prev => [newProduct, ...prev]);
    
    // Actualizar contador de categoría
    setCategories(prev => 
      prev.map(cat => 
        cat.nombre === productData.categoria
          ? { ...cat, productCount: cat.productCount + 1 }
          : cat
      )
    );
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === id
          ? { ...product, ...updates, fechaActualizacion: new Date() }
          : product
      )
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setProducts(prev => prev.filter(p => p.id !== id));
      
      // Actualizar contador de categoría
      setCategories(prev => 
        prev.map(cat => 
          cat.nombre === product.categoria
            ? { ...cat, productCount: Math.max(0, cat.productCount - 1) }
            : cat
        )
      );
    }
  }, [products]);

  // CRUD Categorías
  const addCategory = useCallback((nombre: string, descripcion?: string) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      nombre,
      descripcion,
      productCount: 0,
      fechaCreacion: new Date()
    };
    
    setCategories(prev => [...prev, newCategory]);
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => 
      prev.map(category => 
        category.id === id ? { ...category, ...updates } : category
      )
    );
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  }, []);

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
      conImpuestos: undefined,
      rangoPrecios: { min: 0, max: 50000 },
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
    
    // Categorías
    addCategory,
    updateCategory,
    deleteCategory,
    
    // Filtros y paginación
    updateFilters,
    resetFilters,
    changePage,
    changeItemsPerPage,
    
    // Utils
    setLoading
  };
};