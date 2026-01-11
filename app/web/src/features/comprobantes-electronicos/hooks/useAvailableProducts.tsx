// ===================================================================
// HOOK PARA OBTENER PRODUCTOS DISPONIBLES PARA EL POS
// Obtiene productos del catálogo y aplica filtros de establecimiento
// ===================================================================

import { useMemo } from 'react';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import type { Product as CatalogoProduct } from '../../catalogo-articulos/models/types';
import type { Product as POSProduct } from '../models/comprobante.types';
import { usePriceCalculator } from '../../lista-precios/hooks/usePriceCalculator';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import {
  getAvailableStockForUnit,
  summarizeProductStock,
} from '../../../shared/inventory/stockGateway';
import type { ProductStockSummary } from '../../../shared/inventory/stockGateway';

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
  const { state: { warehouses } } = useConfigurationContext();

  const availableProducts = useMemo(() => {
    const stockCache = new Map<string, ProductStockSummary>();

    const getSummary = (product: CatalogoProduct): ProductStockSummary => {
      const cached = stockCache.get(product.id);
      if (cached) {
        return cached;
      }
      const summary = summarizeProductStock({
        product,
        warehouses,
        establishmentId: establecimientoId,
      });
      stockCache.set(product.id, summary);
      return summary;
    };

    // Filtrar productos según las reglas de negocio
    const filtered = allProducts.filter(product => {
      const summary = getSummary(product);

      if (establecimientoId && !product.disponibleEnTodos) {
        const assigned = product.establecimientoIds || [];
        if (assigned.length > 0 && !assigned.includes(establecimientoId)) {
          return false;
        }
      }

      if (soloConStock && summary.totalAvailable <= 0) {
        return false;
      }

      return true;
    });

    // Convertir productos del catálogo al formato POS
    const posProducts: POSProduct[] = filtered.map(product => {
      const mappedUnit = mapUnitToPOS(product.unidad);
      const priceFromList = getUnitPrice(product.codigo, undefined, mappedUnit);
      const resolvedPrice = priceFromList ?? product.precio ?? 0;
      const stockInfo = getAvailableStockForUnit({
        product,
        warehouses,
        establishmentId: establecimientoId,
        unitCode: mappedUnit,
      });
      const requiresStockControl = Boolean(
        product.stockPorAlmacen ||
        product.stockPorEstablecimiento ||
        typeof product.cantidad === 'number'
      );

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
        stock: stockInfo.availableInUnidadSeleccionada,
        barcode: product.codigoBarras,
        image: product.imagen,
        // Propagar el impuesto configurado en el catálogo al producto POS
        // para que el flujo de carrito pueda resolver correctamente igvType
        // y tasa de IGV por ítem.
        impuesto: product.impuesto,
        unit: mappedUnit,
        unidadMedida: mappedUnit,
        requiresStockControl,
        isFavorite: Boolean(product.isFavorite),
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
  }, [allProducts, establecimientoId, soloConStock, baseColumn?.id, baseColumn?.name, getUnitPrice, warehouses]);

  return availableProducts;
};

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
