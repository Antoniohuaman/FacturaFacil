// ===================================================================
// HOOK PARA OBTENER PRODUCTOS DISPONIBLES PARA EL POS
// Obtiene productos del catálogo y aplica filtros de establecimiento
// ===================================================================

import { useMemo } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogoProduct } from '../../catalogo-articulos/models/types';
import type { Product as POSProduct } from '../models/comprobante.types';
import { usePriceCalculator } from '../../lista-precios/hooks/usePriceCalculator';

interface UseAvailableProductsOptions {
  /**
   * ID del establecimiento actual
   * Si no se proporciona, se mostrarán todos los productos
   */
  establecimientoId?: string;

  /**
   * Si es true, solo muestra productos con stock > 0
   * @default false
   */
  soloConStock?: boolean;
}

/**
 * Hook que obtiene los productos disponibles del catálogo
 * y los filtra según el establecimiento actual
 *
 * @param options - Opciones de filtrado
 * @returns Array de productos disponibles para el POS
 */
export const useAvailableProducts = (options: UseAvailableProductsOptions = {}) => {
  const { establecimientoId, soloConStock = false } = options;
  const { allProducts } = useProductStore();
  const { getUnitPrice, baseColumn } = usePriceCalculator();

  const availableProducts = useMemo(() => {
    // Filtrar productos según las reglas de negocio
    const filtered = allProducts.filter(product => {
      // 1. Filtrar por establecimiento si se proporciona uno
      if (establecimientoId) {
        // Si el producto está disponible en todos los establecimientos, mostrarlo
        if (product.disponibleEnTodos) {
          return true;
        }
        // Si no, verificar que el establecimiento actual esté en la lista
        if (!product.establecimientoIds.includes(establecimientoId)) {
          return false;
        }
      }

      // 2. Filtrar por stock si se requiere
      if (soloConStock) {
        // Si hay control de stock por establecimiento
        if (establecimientoId && product.stockPorEstablecimiento) {
          const stockEnEstablecimiento = product.stockPorEstablecimiento[establecimientoId] || 0;
          if (stockEnEstablecimiento <= 0) {
            return false;
          }
        } else {
          // Stock general (tratar undefined como 0)
          if ((product.cantidad ?? 0) <= 0) {
            return false;
          }
        }
      }

      return true;
    });

    // Convertir productos del catálogo al formato POS
    const posProducts: POSProduct[] = filtered.map(product => {
      const mappedUnit = mapUnitToPOS(product.unidad);
      const priceFromList = getUnitPrice(product.codigo, undefined, mappedUnit);
      const resolvedPrice = priceFromList ?? product.precio ?? 0;

      return {
        id: product.id,
        code: product.codigo,
        name: product.nombre,
        price: resolvedPrice,
        basePrice: resolvedPrice,
        priceColumnId: baseColumn?.id,
        priceColumnLabel: baseColumn?.name,
        category: product.categoria,
        description: product.descripcion || '',
        stock: getStockForEstablishment(product, establecimientoId),
        barcode: product.codigoBarras,
        image: product.imagen,
        unit: mappedUnit,
        unidadMedida: mappedUnit,
        requiresStockControl: product.cantidad !== undefined,
        // Datos adicionales del catálogo
        catalogData: {
          impuesto: product.impuesto,
          precioCompra: product.precioCompra,
          descuento: product.descuentoProducto,
          marca: product.marca,
          modelo: product.modelo
        }
      };
    });

    return posProducts;
  }, [allProducts, establecimientoId, soloConStock, baseColumn?.id, baseColumn?.name, getUnitPrice]);

  return availableProducts;
};

/**
 * Obtiene el stock del producto para un establecimiento específico
 */
function getStockForEstablishment(
  product: CatalogoProduct,
  establecimientoId?: string
): number {
  // Si hay un establecimiento específico y el producto tiene stock por establecimiento
  if (establecimientoId && product.stockPorEstablecimiento) {
    return product.stockPorEstablecimiento[establecimientoId] || 0;
  }

  // Retornar stock general
  return product.cantidad ?? 0;
}

/**
 * Mapea las unidades del catálogo al formato POS
 */
function mapUnitToPOS(unit: CatalogoProduct['unidad']): string {
  const unitMap: Record<CatalogoProduct['unidad'], string> = {
    'UNIDAD': 'NIU',
    'DOCENA': 'DZN',
    'KILOGRAMO': 'KGM',
    'LITRO': 'LTR',
    'METRO': 'MTR'
  };

  return unitMap[unit] || unit;
}
