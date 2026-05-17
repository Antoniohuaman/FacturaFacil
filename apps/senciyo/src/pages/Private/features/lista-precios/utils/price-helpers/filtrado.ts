import type { Product } from '../../models/PriceTypes';
import type { FiltrosPrecios } from '../../models/filtrosPrecios';
import { hayFiltrosActivos } from '../../models/filtrosPrecios';
import { obtenerEstadoVigencia } from './vigencia';

export function aplicarFiltros(
  productos: Product[],
  filtros: FiltrosPrecios,
  hoyIso: string,
): Product[] {
  if (!hayFiltrosActivos(filtros)) return productos;

  return productos.filter(producto => {
    const idsColumnas =
      filtros.columnaId === 'todas'
        ? Object.keys(producto.prices)
        : [filtros.columnaId];

    const precios = idsColumnas.flatMap(colId => {
      const porUnidad = producto.prices[colId];
      return porUnidad ? Object.values(porUnidad) : [];
    });

    if (filtros.estado !== 'todos') {
      if (filtros.estado === 'sin-precio') {
        if (precios.length > 0) return false;
      } else if (filtros.estado === 'con-precio') {
        if (!precios.some(p => p.type === 'fixed' && p.value > 0)) return false;
      } else if (filtros.estado === 'precio-cero') {
        if (!precios.some(p => p.type === 'fixed' && p.value === 0)) return false;
      }
    }

    if (filtros.vigencia !== 'todos') {
      if (!precios.some(p => obtenerEstadoVigencia(p, hoyIso) === filtros.vigencia)) return false;
    }

    return true;
  });
}
