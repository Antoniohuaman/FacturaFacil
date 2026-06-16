// src/features/configuracion-sistema/hooks/useCrearAlmacen.ts

import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import type { Almacen } from '../modelos/Almacen';

/**
 * Hook reutilizable para crear un almacén con valores automáticos.
 * Fuente de verdad: ConfiguracionAlmacenes (misma lógica, mismo dispatch).
 * Usable desde: Configuración de Almacenes, Inventario (creación rápida).
 */
export function useCrearAlmacen() {
  const { state, dispatch } = useConfigurationContext();
  const { almacenes, Establecimientos } = state;

  const crearAlmacen = (establecimientoId: string): Almacen => {
    const existentes = almacenes.filter(a => a.establecimientoId === establecimientoId);
    const nums = existentes
      .map(a => { const m = a.codigoAlmacen.match(/\d+/); return m ? parseInt(m[0], 10) : 0; })
      .filter(n => n > 0);
    const siguiente = nums.length > 0 ? Math.max(...nums) + 1 : 1;

    const codigo = String(siguiente).padStart(4, '0');
    const nombre = `Almacén ${siguiente}`;
    const prioridad = almacenes.filter(
      a => a.establecimientoId === establecimientoId && a.estaActivoAlmacen
    ).length + 1;
    const est = Establecimientos.find(e => e.id === establecimientoId);

    const nuevoAlmacen: Almacen = {
      id: `alm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      codigoAlmacen: codigo,
      nombreAlmacen: nombre,
      establecimientoId,
      nombreEstablecimientoDesnormalizado: est?.nombreEstablecimiento,
      codigoEstablecimientoDesnormalizado: est?.codigoEstablecimiento,
      estaActivoAlmacen: true,
      esAlmacenPrincipal: prioridad === 1,
      prioridadSalida: prioridad,
      configuracionInventarioAlmacen: {
        permiteStockNegativoAlmacen: false,
        controlEstrictoStock: false,
        requiereAprobacionMovimientos: false,
      },
      creadoElAlmacen: new Date(),
      actualizadoElAlmacen: new Date(),
      tieneMovimientosInventario: false,
    };

    dispatch({ type: 'SET_ALMACENES', payload: [...almacenes, nuevoAlmacen] });
    return nuevoAlmacen;
  };

  return { crearAlmacen };
}
