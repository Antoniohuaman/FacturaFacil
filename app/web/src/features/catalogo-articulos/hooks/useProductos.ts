import { useState, useMemo, useCallback } from 'react';
import type { Producto, FiltrosProducto, PaginacionState, MovimientoKardex } from '../models/types';
import { mockProductos, mockMovimientosKardex, mockResumenStock } from '../store/mock';

export const useProductos = () => {
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [filtros, setFiltros] = useState<FiltrosProducto>({
    busqueda: '',
    categoria: 'TODAS',
    activo: true
  });
  
  const [paginacion, setPaginacion] = useState<PaginacionState>({
    pagina: 1,
    totalPaginas: 1,
    itemsPorPagina: 10,
    totalItems: 0
  });


  // Productos filtrados
  const productosFiltrados = useMemo(() => {
    let productos = mockProductos;

    // Filtro por búsqueda (código, nombre, categoría)
    if (filtros.busqueda.trim()) {
      const busqueda = filtros.busqueda.toLowerCase().trim();
      productos = productos.filter(p =>
        p.codigo.toLowerCase().includes(busqueda) ||
        p.nombre.toLowerCase().includes(busqueda) ||
        p.categoria.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por categoría
    if (filtros.categoria && filtros.categoria !== 'TODAS') {
      productos = productos.filter(p => p.categoria === filtros.categoria);
    }

    // Filtro por estado activo
    if (filtros.activo !== undefined) {
      productos = productos.filter(p => p.activo === filtros.activo);
    }

    console.log('useProductos productosFiltrados:', productos);
    return productos;
  }, [filtros]);

  // Productos paginados

  const productosPaginados = useMemo(() => {
    const inicio = (paginacion.pagina - 1) * paginacion.itemsPorPagina;
    const fin = inicio + paginacion.itemsPorPagina;
    const paginados = productosFiltrados.slice(inicio, fin);
    console.log('useProductos productosPaginados:', paginados);
    return paginados;
  }, [productosFiltrados, paginacion.pagina, paginacion.itemsPorPagina]);

  // Actualizar paginación cuando cambian los filtros
  useMemo(() => {
    const totalPaginas = Math.ceil(productosFiltrados.length / paginacion.itemsPorPagina);
    setPaginacion(prev => ({
      ...prev,
      totalPaginas,
      totalItems: productosFiltrados.length,
      pagina: Math.min(prev.pagina, totalPaginas || 1)
    }));
  }, [productosFiltrados.length, paginacion.itemsPorPagina]);

  // Handlers
  const actualizarFiltros = useCallback((nuevosFiltros: Partial<FiltrosProducto>) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
  }, []);

  const cambiarPagina = useCallback((nuevaPagina: number) => {
    setPaginacion(prev => ({ ...prev, pagina: nuevaPagina }));
  }, []);

  const seleccionarProducto = useCallback((producto: Producto | null) => {
    setProductoSeleccionado(producto);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({
      busqueda: '',
      categoria: 'TODAS',
      activo: true
    });
    setPaginacion(prev => ({ ...prev, pagina: 1 }));
  }, []);

  return {
    // Estados
    productos: productosPaginados,
    productoSeleccionado,
    filtros,
    paginacion,
    totalProductos: productosFiltrados.length,
    
    // Acciones
    actualizarFiltros,
    cambiarPagina,
    seleccionarProducto,
    limpiarFiltros
  };
};

export const useKardexProducto = (productoId: string | null) => {
  const movimientos = useMemo<MovimientoKardex[]>(() => {
    if (!productoId) return [];
    // En un caso real, filtrarías por productoId
    return mockMovimientosKardex;
  }, [productoId]);

  return {
    movimientos,
    cargando: false
  };
};

export const useResumenStock = () => {
  return {
    resumen: mockResumenStock,
    cargando: false
  };
};