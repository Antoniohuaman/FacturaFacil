// src/features/gestion-inventario/hooks/useInventarioDisponibilidad.ts

import { useState, useMemo, useCallback, useEffect } from 'react';
import { resolveUnidadMinima } from '@/shared/inventory/unitConversion';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { isProductEnabledForEstablecimiento } from '../../catalogo-articulos/models/types';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { InventoryService } from '../services/inventory.service';
import { useCurrentEstablecimientoId } from '../../../../../contexts/UserSessionContext';
import type {
  DisponibilidadItem,
  DisponibilidadFilters,
  SituacionStock,
  OrdenamientoDisponibilidad
} from '../models/disponibilidad.types';

type ThresholdField = 'stockMinimo' | 'stockMaximo';

interface UpdateThresholdInput {
  productoId: string;
  almacenId: string;
  field: ThresholdField;
  value: number | null;
}

/**
 * Hook para gestión de disponibilidad de inventario
 * Centraliza la lógica de la vista "Situación Actual"
 */
export const useInventarioDisponibilidad = () => {
  const { allProducts, updateProduct } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const currentEstablecimientoId = useCurrentEstablecimientoId();

  const almacenesActivos = useMemo(
    () => configState.almacenes.filter(w => w.estaActivoAlmacen),
    [configState.almacenes]
  );

  // Filtros activos
  // Inventario operativo: el establecimiento siempre lo manda el header.
  const [filtros, setFiltros] = useState<DisponibilidadFilters>(() => ({
    establecimientoId: currentEstablecimientoId,
    almacenId: '',
    filtroSku: '',
    soloConDisponible: false,
  }));

  // Ordenamiento
  const [ordenamiento, setOrdenamiento] = useState<OrdenamientoDisponibilidad>({
    campo: 'codigo',
    direccion: 'asc'
  });

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(25);

  const selectedEstablecimiento = useMemo(() => {
    if (!currentEstablecimientoId) {
      return undefined;
    }
    return configState.Establecimientos.find(e => e.id === currentEstablecimientoId);
  }, [configState.Establecimientos, currentEstablecimientoId]);

  const selectedalmacen = useMemo(() => {
    if (!filtros.almacenId) {
      return undefined;
    }
    return almacenesActivos.find(w => w.id === filtros.almacenId);
  }, [almacenesActivos, filtros.almacenId]);

  const canEditThresholds = Boolean(selectedEstablecimiento && selectedalmacen);
  const thresholdsTooltip = canEditThresholds
    ? undefined
    : 'Selecciona un establecimiento y un almacén para configurar mínimos/máximos';

  /**
   * Obtener almacenes disponibles según el establecimiento seleccionado
   */
  const almacenesDisponibles = useMemo(() => {
    if (!currentEstablecimientoId) {
      return [];
    }
    return almacenesActivos.filter(w => w.establecimientoId === currentEstablecimientoId);
  }, [almacenesActivos, currentEstablecimientoId]);

  const almacenescope = useMemo(() => {
    if (!almacenesActivos.length) {
      return [] as string[];
    }

    if (!currentEstablecimientoId) {
      return [] as string[];
    }

    if (filtros.almacenId) {
      const match = almacenesActivos.find(
        w => w.id === filtros.almacenId && w.establecimientoId === currentEstablecimientoId
      );
      return match ? [match.id] : [];
    }

    return almacenesActivos
      .filter(w => w.establecimientoId === currentEstablecimientoId)
      .map(w => w.id);
  }, [almacenesActivos, currentEstablecimientoId, filtros.almacenId]);
  const hasSinglealmacen = almacenescope.length === 1;

  useEffect(() => {
    setFiltros(prev => {
      if (prev.establecimientoId === currentEstablecimientoId) {
        const almacenSigueValido = !prev.almacenId
          ? true
          : almacenesActivos.some(
              w => w.id === prev.almacenId && w.establecimientoId === currentEstablecimientoId
            );
        if (almacenSigueValido) {
          return prev;
        }
        return { ...prev, almacenId: '' };
      }

      const almacenSigueValido = prev.almacenId
        ? almacenesActivos.some(
            w => w.id === prev.almacenId && w.establecimientoId === currentEstablecimientoId
          )
        : true;
      return {
        ...prev,
        establecimientoId: currentEstablecimientoId,
        almacenId: almacenSigueValido ? prev.almacenId : '',
      };
    });
    setPaginaActual(1);
  }, [currentEstablecimientoId, almacenesActivos]);

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
    if (!almacenescope.length) return [];

    return allProducts
      .filter(product => isProductEnabledForEstablecimiento(product, currentEstablecimientoId))
      .map(product => {
      let real = 0;
      let rawReservado = 0;

      almacenescope.forEach(almacenId => {
        real += InventoryService.getStock(product, almacenId);
        rawReservado += InventoryService.getReservedStock(product, almacenId);
      });

      const reservado = Math.min(rawReservado, Math.max(real, 0));
      const disponible = Math.max(0, real - reservado);

      const stockMinValues = almacenescope.map(almacenId => {
        const valor = product.stockMinimoPorAlmacen?.[almacenId];
        return typeof valor === 'number' ? valor : undefined;
      });
      const stockMaxValues = almacenescope.map(almacenId => {
        const valor = product.stockMaximoPorAlmacen?.[almacenId];
        return typeof valor === 'number' ? valor : undefined;
      });

      const hasConfiguredMin = stockMinValues.some(value => value !== undefined);
      const hasConfiguredMax = stockMaxValues.some(value => value !== undefined);

      const stockMinimoAcumulado = stockMinValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      const stockMaximoAcumulado = stockMaxValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);

      const stockMinimo = hasSinglealmacen
        ? stockMinValues[0]
        : hasConfiguredMin
          ? stockMinimoAcumulado
          : undefined;

      const stockMaximo = hasSinglealmacen
        ? stockMaxValues[0]
        : hasConfiguredMax
          ? stockMaximoAcumulado
          : undefined;
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
  }, [allProducts, almacenescope, hasSinglealmacen, calcularSituacion, currentEstablecimientoId]);

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
    setFiltros(prev => {
      const rest = { ...nuevosFiltros };
      delete rest.establecimientoId;
      const nextAlmacenId = rest.almacenId ?? prev.almacenId;
      const almacenEsValido = !nextAlmacenId
        ? true
        : almacenesActivos.some(
            w => w.id === nextAlmacenId && w.establecimientoId === currentEstablecimientoId
          );

      return {
        ...prev,
        ...rest,
        establecimientoId: currentEstablecimientoId,
        almacenId: almacenEsValido ? nextAlmacenId : '',
      };
    });
    setPaginaActual(1); // Resetear a primera página
  }, [currentEstablecimientoId, almacenesActivos]);

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

  const updateStockThreshold = useCallback(async ({
    productoId,
    almacenId,
    field,
    value
  }: UpdateThresholdInput) => {
    const product = allProducts.find(p => p.id === productoId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const normalizedValue = value === null ? undefined : Number(value);
    if (normalizedValue !== undefined && (Number.isNaN(normalizedValue) || normalizedValue < 0)) {
      throw new Error('El valor debe ser mayor o igual a 0');
    }

    const currentMin = product.stockMinimoPorAlmacen?.[almacenId];
    const currentMax = product.stockMaximoPorAlmacen?.[almacenId];

    const nextMin = field === 'stockMinimo' ? normalizedValue : currentMin;
    const nextMax = field === 'stockMaximo' ? normalizedValue : currentMax;

    if (nextMin !== undefined && nextMax !== undefined && nextMax < nextMin) {
      throw new Error('El stock máximo debe ser mayor o igual al mínimo');
    }

    const updatedProduct = InventoryService.updateThresholds(product, almacenId, {
      stockMinimo: field === 'stockMinimo' ? nextMin ?? null : undefined,
      stockMaximo: field === 'stockMaximo' ? nextMax ?? null : undefined
    });

    updateProduct(product.id, {
      stockMinimoPorAlmacen: updatedProduct.stockMinimoPorAlmacen,
      stockMaximoPorAlmacen: updatedProduct.stockMaximoPorAlmacen,
      fechaActualizacion: updatedProduct.fechaActualizacion
    });
  }, [allProducts, updateProduct]);

  return {
    // Datos
    datos: datosPaginados,
    datosExportacion: datosOrdenados,
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
    cambiarItemsPorPagina,

    // Thresholds inline editing
    canEditThresholds,
    thresholdsTooltip,
    selectedalmacen,
    selectedEstablecimiento,
    almacenescope,
    updateStockThreshold
  };
};
