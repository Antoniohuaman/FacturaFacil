import type { Product, Category, Package, FilterOptions, PaginationConfig, MovimientoStock, MovimientoStockTipo, MovimientoStockMotivo } from '../models/types';
// src/features/catalogo-articulos/hooks/useProductStore.tsx

import { useState, useMemo, useCallback, useEffect } from 'react';

// Mock data
const mockProducts: Product[] = [
  {
    id: '1',
    codigo: 'JU-966699',
    nombre: 'PAGO FINAL CONSTRUCCION LOSA',
    unidad: 'DOCENA',
    precio: 3000.00,
    cantidad: 0,
    categoria: 'HERRAMIENTAS',
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-15'),
    fechaActualizacion: new Date('2024-01-15')
  },
  {
    id: '2',
    codigo: 'D0111',
    nombre: 'CEMENTO SOL 50KG',
    unidad: 'UNIDAD',
    precio: 200.00,
    cantidad: 50,
    categoria: 'HERRAMIENTAS',
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-14'),
    fechaActualizacion: new Date('2024-01-14')
  },
  {
    id: '3',
    codigo: 'Y89659644855',
    nombre: 'ROPERO PARA NIÑOS',
    unidad: 'DOCENA',
    precio: 100.00,
    cantidad: 30,
    categoria: 'HERRAMIENTAS',
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-13'),
    fechaActualizacion: new Date('2024-01-13')
  },
  {
    id: '4',
    codigo: 'PL-6657567',
    nombre: 'PARLANTE BLUETOOTH',
    unidad: 'DOCENA',
    precio: 100.00,
    cantidad: 0,
    categoria: 'Alimentos y Bebidas',
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-12'),
    fechaActualizacion: new Date('2024-01-12')
  },
  {
    id: '5',
    codigo: '092512',
    nombre: 'Polo manga corta',
    unidad: 'UNIDAD',
    precio: 10000.00,
    cantidad: 0,
    categoria: 'Accesorios',
    impuesto: 'IGV (18.00%)',
    fechaCreacion: new Date('2024-01-11'),
    fechaActualizacion: new Date('2024-01-11')
  }
];

const mockCategories: Category[] = [
  { id: '1', nombre: 'HERRAMIENTAS', productCount: 3, fechaCreacion: new Date('2024-01-01') },
  { id: '2', nombre: 'Alimentos y Bebidas', productCount: 1, fechaCreacion: new Date('2024-01-01') },
  { id: '3', nombre: 'Accesorios', productCount: 1, fechaCreacion: new Date('2024-01-01') },
  { id: '4', nombre: 'CERRAJERIA', productCount: 0, fechaCreacion: new Date('2024-01-01') },
  { id: '5', nombre: 'CONTRUCCION', productCount: 0, fechaCreacion: new Date('2024-01-01') },
  { id: '6', nombre: 'SOFTWARE', productCount: 0, fechaCreacion: new Date('2024-01-01') }
];

// Helpers para localStorage con manejo de fechas
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
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
        
        // Convertir fecha de movimientos de stock
        if (item.fecha) {
          converted.fecha = new Date(item.fecha);
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
  // Cargar datos desde localStorage o usar mock data
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromLocalStorage('catalog_products', mockProducts)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromLocalStorage('catalog_categories', mockCategories)
  );
  const [packages, setPackages] = useState<Package[]>(() =>
    loadFromLocalStorage('catalog_packages', [])
  );
  
  // Movimientos de stock
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>(() =>
    loadFromLocalStorage('catalog_movimientos', [])
  );

  // Persistir productos en localStorage
  useEffect(() => {
    saveToLocalStorage('catalog_products', products);
  }, [products]);

  // Persistir categorías en localStorage
  useEffect(() => {
    saveToLocalStorage('catalog_categories', categories);
  }, [categories]);

  // Persistir paquetes en localStorage
  useEffect(() => {
    saveToLocalStorage('catalog_packages', packages);
  }, [packages]);
  
  // Persistir movimientos en localStorage
  useEffect(() => {
    saveToLocalStorage('catalog_movimientos', movimientos);
  }, [movimientos]);
  
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    busqueda: '',
    categoria: '',
    unidad: '',
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
      
      const matchesPrecio = product.precio >= filters.rangoPrecios.min && 
        product.precio <= filters.rangoPrecios.max;

      return matchesBusqueda && matchesCategoria && matchesUnidad && matchesPrecio;
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

  // Eliminar todos los productos y resetear contadores de categorías
  const deleteAllProducts = useCallback(() => {
    setProducts([]);
    setCategories(prev =>
      prev.map(cat => ({ ...cat, productCount: 0 }))
    );
  }, []);

  // CRUD Categorías
  const addCategory = useCallback((nombre: string, descripcion?: string, color?: string) => {
    setCategories(prev => {
      // Evitar duplicados por nombre (case-insensitive)
      if (prev.some(cat => cat.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) {
        return prev;
      }
      const newCategory: Category = {
        id: Date.now().toString(),
        nombre,
        descripcion,
        color,
        productCount: 0,
        fechaCreacion: new Date()
      };
      return [...prev, newCategory];
    });
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

  // CRUD Movimientos de Stock
  const addMovimiento = useCallback((
    productoId: string,
    tipo: MovimientoStockTipo,
    motivo: MovimientoStockMotivo,
    cantidad: number,
    observaciones?: string,
    documentoReferencia?: string,
    ubicacion?: string
  ) => {
    const producto = products.find(p => p.id === productoId);
    if (!producto) return;

    const cantidadAnterior = producto.cantidad;
    let cantidadNueva = cantidadAnterior;

    // Calcular nueva cantidad según el tipo de movimiento
    switch (tipo) {
      case 'ENTRADA':
      case 'AJUSTE_POSITIVO':
      case 'DEVOLUCION':
        cantidadNueva = cantidadAnterior + cantidad;
        break;
      case 'SALIDA':
      case 'AJUSTE_NEGATIVO':
      case 'MERMA':
        cantidadNueva = cantidadAnterior - cantidad;
        break;
      case 'TRANSFERENCIA':
        // Para transferencias, la lógica dependerá de si es entrada o salida
        cantidadNueva = cantidadAnterior;
        break;
    }

    // Crear el movimiento
    const nuevoMovimiento: MovimientoStock = {
      id: Date.now().toString(),
      productoId,
      productoCodigo: producto.codigo,
      productoNombre: producto.nombre,
      tipo,
      motivo,
      cantidad,
      cantidadAnterior,
      cantidadNueva,
      usuario: 'Usuario Actual', // Esto debería venir del sistema de autenticación
      observaciones,
      documentoReferencia,
      fecha: new Date(),
      ubicacion
    };

    // Actualizar stock del producto
    setProducts(prev =>
      prev.map(p =>
        p.id === productoId
          ? { ...p, cantidad: cantidadNueva, fechaActualizacion: new Date() }
          : p
      )
    );

    // Agregar movimiento al historial
    setMovimientos(prev => [nuevoMovimiento, ...prev]);

    return nuevoMovimiento;
  }, [products]);

  return {
    // Estado
    products: filteredProducts,
    allProducts: products,
    categories,
    packages,
    movimientos,
    loading,
    filters,
    pagination,

    // Productos
    addProduct,
    updateProduct,
    deleteProduct,
    deleteAllProducts,

    // Categorías
    addCategory,
    updateCategory,
    deleteCategory,

    // Paquetes
    addPackage,
    updatePackage,
    deletePackage,
    
    // Movimientos de Stock
    addMovimiento,

    // Filtros y paginación
    updateFilters,
    resetFilters,
    changePage,
    changeItemsPerPage,

    // Utils
    setLoading
  };
};