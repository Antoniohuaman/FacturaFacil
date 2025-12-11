// src/features/gestion-inventario/hooks/useInventarioDisponibilidad.ts

import { useState, useMemo, useCallback } from 'react';
import { resolveUnidadMinima } from '@/shared/inventory/unitConversion';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import { InventoryService } from '../services/inventory.service';
import type {
  DisponibilidadItem,
  DisponibilidadFilters,
  SituacionStock,
  OrdenamientoDisponibilidad
} from '../models/disponibilidad.types';

/**
 * Hook para gestión de disponibilidad de inventario
 * Centraliza la lógica de la vista "Situación Actual"
 */
export const useInventarioDisponibilidad = () => {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();

  const warehousesActivos = useMemo(
    () => configState.warehouses.filter(w => w.isActive),
    [configState.warehouses]
  );

  // Filtros activos
  const [filtros, setFiltros] = useState<DisponibilidadFilters>({
    // establecimientoId vacío representa "sin seleccionar" y se filtra luego por empresa actual
    establecimientoId: '',
    almacenId: '',
    filtroSku: '',
    soloConDisponible: false
  });

  // Ordenamiento
  const [ordenamiento, setOrdenamiento] = useState<OrdenamientoDisponibilidad>({
    campo: 'codigo',
    direccion: 'asc'
  });

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(25);

  /**
   * Obtener almacenes disponibles según el establecimiento seleccionado
   */
  const almacenesDisponibles = useMemo(() => {
    if (filtros.establecimientoId) {
      return warehousesActivos.filter(
        w => w.establishmentId === filtros.establecimientoId
      );
    }
    return warehousesActivos;
  }, [warehousesActivos, filtros.establecimientoId]);

  const warehouseScope = useMemo(() => {
    if (!warehousesActivos.length) {
      return [] as string[];
    }

    if (filtros.almacenId) {
      const match = warehousesActivos.find(w => w.id === filtros.almacenId);
      return match ? [match.id] : [];
    }

    if (filtros.establecimientoId) {
      return warehousesActivos
        .filter(w => w.establishmentId === filtros.establecimientoId)
        .map(w => w.id);
    }

    return warehousesActivos.map(w => w.id);
  }, [warehousesActivos, filtros.almacenId, filtros.establecimientoId]);

  /**
   * Calcular situación del stock
   */
  const calcularSituacion = useCallback((
    disponible: number,
    stockMinimo?: number
  ): SituacionStock => {
    if (disponible === 0) return 'Sin stock';
    if (stockMinimo && disponible < stockMinimo * 0.5) return 'Crítico';
    if (stockMinimo && disponible < stockMinimo) return 'Bajo';
    return 'OK';
  }, []);

  /**
   * Generar datos de disponibilidad desde productos
   */
  const datosDisponibilidad = useMemo<DisponibilidadItem[]>(() => {
    if (!warehouseScope.length) return [];

    return allProducts.map(product => {
      let real = 0;
      let rawReservado = 0;

      warehouseScope.forEach(warehouseId => {
        real += InventoryService.getStock(product, warehouseId);
        rawReservado += InventoryService.getReservedStock(product, warehouseId);
      });

      const reservado = Math.min(rawReservado, Math.max(real, 0));
      const disponible = Math.max(0, real - reservado);

      const stockMinimoAcumulado = warehouseScope.reduce((sum, warehouseId) => {
        const valor = Number(product.stockMinimoPorAlmacen?.[warehouseId] ?? 0);
        return sum + (Number.isFinite(valor) ? valor : 0);
      }, 0);

      const stockMaximoAcumulado = warehouseScope.reduce((sum, warehouseId) => {
        const valor = Number(product.stockMaximoPorAlmacen?.[warehouseId] ?? 0);
        return sum + (Number.isFinite(valor) ? valor : 0);
      }, 0);

      const stockMinimo = stockMinimoAcumulado > 0 ? stockMinimoAcumulado : undefined;
      const stockMaximo = stockMaximoAcumulado > 0 ? stockMaximoAcumulado : undefined;
      const situacion = calcularSituacion(disponible, stockMinimo);

      return {
        sku: product.codigo,
        productoId: product.id,
        nombre: product.nombre,
        unidadMinima: resolveUnidadMinima(product),
        real,
        reservado,
        disponible,
        situacion,
        stockMinimo,
        stockMaximo,
        precio: product.precio
      };
    });
  }, [allProducts, warehouseScope, calcularSituacion]);

  /**
   * Aplicar filtros de búsqueda y disponibilidad
   */
  const datosFiltrados = useMemo(() => {
    let resultado = [...datosDisponibilidad];

    // Filtrar por SKU o nombre
    if (filtros.filtroSku && filtros.filtroSku.trim()) {
      const busqueda = filtros.filtroSku.toLowerCase().trim();
      resultado = resultado.filter(
        item =>
          item.sku.toLowerCase().includes(busqueda) ||
          item.nombre.toLowerCase().includes(busqueda)
      );
    }

    // Filtrar solo con disponible
    if (filtros.soloConDisponible) {
      resultado = resultado.filter(item => item.disponible > 0);
    }

    return resultado;
  }, [datosDisponibilidad, filtros.filtroSku, filtros.soloConDisponible]);

  /**
   * Aplicar ordenamiento
   */
  const datosOrdenados = useMemo(() => {
    const resultado = [...datosFiltrados];

    resultado.sort((a, b) => {
      let valorA: string | number;
      let valorB: string | number;

      switch (ordenamiento.campo) {
        case 'codigo':
          valorA = a.sku;
          valorB = b.sku;
          break;
        case 'producto':
          valorA = a.nombre;
          valorB = b.nombre;
          break;
        case 'unidadMinima':
          valorA = a.unidadMinima;
          valorB = b.unidadMinima;
          break;
        case 'real':
          valorA = a.real;
          valorB = b.real;
          break;
        case 'reservado':
          valorA = a.reservado;
          valorB = b.reservado;
          break;
        case 'disponible':
          valorA = a.disponible;
          valorB = b.disponible;
          break;
        case 'situacion':
          valorA = a.situacion;
          valorB = b.situacion;
          break;
        default:
          return 0;
      }

      if (typeof valorA === 'string' && typeof valorB === 'string') {
        return ordenamiento.direccion === 'asc'
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return ordenamiento.direccion === 'asc'
          ? valorA - valorB
          : valorB - valorA;
      }

      return 0;
    });

    return resultado;
  }, [datosFiltrados, ordenamiento]);

  /**
   * Aplicar paginación
   */
  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    return datosOrdenados.slice(inicio, fin);
  }, [datosOrdenados, paginaActual, itemsPorPagina]);

  /**
   * Información de paginación
   */
  const infoPaginacion = useMemo(() => {
    const totalItems = datosOrdenados.length;
    const totalPaginas = Math.ceil(totalItems / itemsPorPagina);
    const inicio = (paginaActual - 1) * itemsPorPagina + 1;
    const fin = Math.min(paginaActual * itemsPorPagina, totalItems);

    return {
      totalItems,
      totalPaginas,
      paginaActual,
      itemsPorPagina,
      inicio,
      fin,
      hayAnterior: paginaActual > 1,
      haySiguiente: paginaActual < totalPaginas
    };
  }, [datosOrdenados.length, paginaActual, itemsPorPagina]);

  /**
   * Resumen de disponibilidad
   */
  const resumen = useMemo(() => {
    const totalProductos = datosDisponibilidad.length;
    const conStock = datosDisponibilidad.filter(d => d.disponible > 0).length;
    const sinStock = datosDisponibilidad.filter(d => d.disponible === 0).length;
    const stockBajo = datosDisponibilidad.filter(d => d.situacion === 'Bajo').length;
    const stockCritico = datosDisponibilidad.filter(d => d.situacion === 'Crítico').length;
    const totalReal = datosDisponibilidad.reduce((sum, d) => sum + d.real, 0);
    const totalReservado = datosDisponibilidad.reduce((sum, d) => sum + d.reservado, 0);
    const totalDisponible = datosDisponibilidad.reduce((sum, d) => sum + d.disponible, 0);
    const valorTotal = datosDisponibilidad.reduce((sum, d) => sum + (d.disponible * d.precio), 0);

    return {
      totalProductos,
      conStock,
      sinStock,
      stockBajo,
      stockCritico,
      totalReal,
      totalReservado,
      totalDisponible,
      valorTotal
    };
  }, [datosDisponibilidad]);

  /**
   * Actualizar filtros
   */
  const actualizarFiltros = useCallback((nuevosFiltros: Partial<DisponibilidadFilters>) => {
    setFiltros(prev => ({ ...prev, ...nuevosFiltros }));
    setPaginaActual(1); // Resetear a primera página
  }, []);

  /**
   * Cambiar ordenamiento
   */
  const cambiarOrdenamiento = useCallback((campo: OrdenamientoDisponibilidad['campo']) => {
    setOrdenamiento(prev => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  /**
   * Cambiar página
   */
  const irAPagina = useCallback((pagina: number) => {
    const totalPaginas = Math.ceil(datosOrdenados.length / itemsPorPagina);
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaActual(pagina);
    }
  }, [datosOrdenados.length, itemsPorPagina]);

  /**
   * Cambiar items por página
   */
  const cambiarItemsPorPagina = useCallback((items: number) => {
    setItemsPorPagina(items);
    setPaginaActual(1);
  }, []);

  return {
    // Datos
    datos: datosPaginados,
    resumen,
    almacenesDisponibles,

    // Estado
    filtros,
    ordenamiento,
    infoPaginacion,

    // Acciones
    actualizarFiltros,
    cambiarOrdenamiento,
    irAPagina,
    cambiarItemsPorPagina
  };
};
