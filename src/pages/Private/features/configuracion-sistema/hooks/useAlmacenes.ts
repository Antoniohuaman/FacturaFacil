// src/features/configuracion-sistema/hooks/useAlmacenes.ts

import { useMemo, useState } from 'react';
import type { Almacen, AlmacenSinAlias } from '../modelos/Warehouse';

/**
 * Hook para gestionar almacenes (CRUD + validaciones)
 *
 * Proporciona datos mock iniciales y funciones para:
 * - Crear, actualizar, eliminar almacenes
 * - Validar que un almacén no se elimine si tiene movimientos
 * - Habilitar/deshabilitar almacenes
 * - Filtrar almacenes por establecimiento
 */
const sincronizarAliasAlmacen = (almacen: AlmacenSinAlias): Almacen => ({
  ...almacen,
  code: almacen.codigoAlmacen,
  name: almacen.nombreAlmacen,
  establishmentName: almacen.nombreEstablecimientoDesnormalizado,
  establishmentCode: almacen.codigoEstablecimientoDesnormalizado,
  establishmentId: almacen.establecimientoId,
  location: almacen.ubicacionAlmacen,
  isActive: almacen.estaActivoAlmacen,
  isMainalmacen: almacen.esAlmacenPrincipal,
});

const ALMACENES_BASE: AlmacenSinAlias[] = [
  {
    id: 'alm-1',
    codigoAlmacen: '0001',
    nombreAlmacen: 'Almacén Principal',
    establecimientoId: 'est-1',
    nombreEstablecimientoDesnormalizado: 'Establecimiento Principal',
    codigoEstablecimientoDesnormalizado: '0000',
    descripcionAlmacen: 'Almacén principal de mercadería',
    ubicacionAlmacen: 'Piso 1 - Zona A',
    estaActivoAlmacen: true,
    esAlmacenPrincipal: true,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen: false,
      controlEstrictoStock: true,
      requiereAprobacionMovimientos: false,
      capacidadMaxima: 10000,
      unidadCapacidad: 'units',
    },
    creadoElAlmacen: new Date('2024-01-15'),
    actualizadoElAlmacen: new Date('2024-01-15'),
    tieneMovimientosInventario: true,
  },
  {
    id: 'alm-2',
    codigoAlmacen: '0002',
    nombreAlmacen: 'Almacén Secundario',
    establecimientoId: 'est-1',
    nombreEstablecimientoDesnormalizado: 'Establecimiento Principal',
    codigoEstablecimientoDesnormalizado: '0000',
    descripcionAlmacen: 'Almacén para productos de rotación lenta',
    ubicacionAlmacen: 'Piso 2 - Zona B',
    estaActivoAlmacen: true,
    esAlmacenPrincipal: false,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen: false,
      controlEstrictoStock: false,
      requiereAprobacionMovimientos: false,
      capacidadMaxima: 5000,
      unidadCapacidad: 'units',
    },
    creadoElAlmacen: new Date('2024-02-01'),
    actualizadoElAlmacen: new Date('2024-02-01'),
    tieneMovimientosInventario: false,
  },
  {
    id: 'alm-3',
    codigoAlmacen: '0001',
    nombreAlmacen: 'Almacén San Isidro',
    establecimientoId: 'est-2',
    nombreEstablecimientoDesnormalizado: 'Sucursal San Isidro',
    codigoEstablecimientoDesnormalizado: '0001',
    descripcionAlmacen: 'Almacén de la sucursal',
    ubicacionAlmacen: 'Planta baja',
    estaActivoAlmacen: true,
    esAlmacenPrincipal: true,
    configuracionInventarioAlmacen: {
      permiteStockNegativoAlmacen: true,
      controlEstrictoStock: false,
      requiereAprobacionMovimientos: false,
      capacidadMaxima: 3000,
      unidadCapacidad: 'units',
    },
    creadoElAlmacen: new Date('2024-02-10'),
    actualizadoElAlmacen: new Date('2024-02-10'),
    tieneMovimientosInventario: false,
  },
];

export function useAlmacenes() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>(
    ALMACENES_BASE.map(sincronizarAliasAlmacen)
  );

  const obtenerAlmacenesPorEstablecimiento = useMemo(() => {
    return (establecimientoId: string) =>
      almacenes.filter((almacen) => almacen.establecimientoId === establecimientoId);
  }, [almacenes]);

  const obtenerAlmacenesActivosPorEstablecimiento = useMemo(() => {
    return (establecimientoId: string) =>
      almacenes.filter(
        (almacen) => almacen.establecimientoId === establecimientoId && almacen.estaActivoAlmacen
      );
  }, [almacenes]);

  const esCodigoDuplicado = (
    codigoAlmacen: string,
    establecimientoId: string,
    excludeId?: string
  ): boolean => {
    return almacenes.some(
      (almacen) =>
        almacen.codigoAlmacen === codigoAlmacen &&
        almacen.establecimientoId === establecimientoId &&
        almacen.id !== excludeId
    );
  };

  const generarSiguienteCodigo = (establecimientoId: string): string => {
    const almacenesDelEstablecimiento = almacenes.filter(
      (almacen) => almacen.establecimientoId === establecimientoId
    );

    if (almacenesDelEstablecimiento.length === 0) return '0001';

    const numericCodes = almacenesDelEstablecimiento
      .map((almacen) => {
        const match = almacen.codigoAlmacen.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter((numero) => numero > 0);

    const lastCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(lastCode + 1).padStart(4, '0');
  };

  const crearAlmacen = (
    almacen: Omit<Almacen, 'id' | 'creadoElAlmacen' | 'actualizadoElAlmacen'>
  ): Almacen => {
    const nuevoAlmacen: Almacen = sincronizarAliasAlmacen({
      ...almacen,
      id: `alm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      creadoElAlmacen: new Date(),
      actualizadoElAlmacen: new Date(),
      tieneMovimientosInventario: false,
    });

    setAlmacenes((prev) => [...prev, nuevoAlmacen]);
    return nuevoAlmacen;
  };

  const actualizarAlmacen = (id: string, updates: Partial<Almacen>): boolean => {
    let success = false;
    setAlmacenes((prev) =>
      prev.map((almacen) => {
        if (almacen.id === id) {
          success = true;
          return sincronizarAliasAlmacen({
            ...almacen,
            ...updates,
            actualizadoElAlmacen: new Date(),
          });
        }
        return almacen;
      })
    );
    return success;
  };

  const eliminarAlmacen = (id: string): { success: boolean; message: string } => {
    const almacen = almacenes.find((item) => item.id === id);

    if (!almacen) {
      return {
        success: false,
        message: 'Almacén no encontrado',
      };
    }

    if (almacen.tieneMovimientosInventario) {
      return {
        success: false,
        message: `No se puede eliminar el almacén "${almacen.nombreAlmacen}" porque tiene movimientos de inventario asociados. Puedes deshabilitarlo en su lugar.`,
      };
    }

    setAlmacenes((prev) => prev.filter((item) => item.id !== id));
    return {
      success: true,
      message: 'Almacén eliminado correctamente',
    };
  };

  const alternarEstadoAlmacen = (id: string): boolean => {
    const objetivo = almacenes.find((almacen) => almacen.id === id);
    return actualizarAlmacen(id, {
      estaActivoAlmacen: objetivo ? !objetivo.estaActivoAlmacen : true,
    });
  };

  const tieneAlmacenes = (establecimientoId: string): boolean => {
    return almacenes.some((almacen) => almacen.establecimientoId === establecimientoId);
  };

  const obtenerAlmacenPrincipal = (establecimientoId: string): Almacen | undefined => {
    return almacenes.find(
      (almacen) => almacen.establecimientoId === establecimientoId && almacen.esAlmacenPrincipal
    );
  };

  return {
    almacenes,
    obtenerAlmacenesPorEstablecimiento,
    obtenerAlmacenesActivosPorEstablecimiento,
    esCodigoDuplicado,
    generarSiguienteCodigo,
    crearAlmacen,
    actualizarAlmacen,
    eliminarAlmacen,
    alternarEstadoAlmacen,
    tieneAlmacenes,
    obtenerAlmacenPrincipal,
  };
}
