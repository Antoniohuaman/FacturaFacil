import { useCallback, useMemo, useState, useEffect } from 'react';
import type { Almacen } from '../modelos/Almacen';
import { almacenService } from '../servicios/AlmacenService';

/**
 * Hook para gestionar almacenes (CRUD real + validaciones)
 */
export function useAlmacenes() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlmacenes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await almacenService.getAll(1, 100);
      // Adaptar nombres de campos del backend (PascalCase/Costo) al frontend
      const mapped = response.data.map((item: any) => ({
        id: item.id,
        empresaId: item.empresaId,
        codigoAlmacen: item.codigo,
        nombreAlmacen: item.nombre,
        establecimientoId: item.establecimientoId,
        nombreEstablecimientoDesnormalizado: item.establecimientoNombre,
        codigoEstablecimientoDesnormalizado: item.establecimientoCodigo,
        descripcionAlmacen: item.descripcion,
        ubicacionAlmacen: item.ubicacion,
        estaActivoAlmacen: item.esActivo,
        esAlmacenPrincipal: item.esPrincipal,
        configuracionInventarioAlmacen: {
          permiteStockNegativoAlmacen: false,
          controlEstrictoStock: true,
          requiereAprobacionMovimientos: false,
        },
        creadoElAlmacen: new Date(item.createdAt),
        actualizadoElAlmacen: new Date(item.updatedAt),
        tieneMovimientosInventario: false, // El backend debería informar esto
      }));
      setAlmacenes(mapped);
    } catch (err: any) {
      setError(err.message || 'Error al cargar almacenes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlmacenes();
  }, [fetchAlmacenes]);

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

  const crearAlmacen = async (
    almacen: Omit<Almacen, 'id' | 'creadoElAlmacen' | 'actualizadoElAlmacen'>
  ): Promise<boolean> => {
    setLoading(true);
    try {
      await almacenService.create({
        codigo: almacen.codigoAlmacen,
        nombre: almacen.nombreAlmacen,
        establecimientoId: almacen.establecimientoId,
        establecimientoNombre: almacen.nombreEstablecimientoDesnormalizado,
        establecimientoCodigo: almacen.codigoEstablecimientoDesnormalizado,
        descripcion: almacen.descripcionAlmacen,
        ubicacion: almacen.ubicacionAlmacen,
        esPrincipal: almacen.esAlmacenPrincipal,
        esActivo: almacen.estaActivoAlmacen,
      });
      await fetchAlmacenes();
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al crear almacén');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const actualizarAlmacen = async (id: string, updates: Partial<Almacen>): Promise<boolean> => {
    setLoading(true);
    try {
      const fullAlmacen = almacenes.find(a => a.id === id);
      if (!fullAlmacen) return false;

      const merged = { ...fullAlmacen, ...updates };

      await almacenService.update(id, {
        codigo: merged.codigoAlmacen,
        nombre: merged.nombreAlmacen,
        establecimientoId: merged.establecimientoId,
        establecimientoNombre: merged.nombreEstablecimientoDesnormalizado,
        establecimientoCodigo: merged.codigoEstablecimientoDesnormalizado,
        descripcion: merged.descripcionAlmacen,
        ubicacion: merged.ubicacionAlmacen,
        esPrincipal: merged.esAlmacenPrincipal,
        esActivo: merged.estaActivoAlmacen,
      });
      await fetchAlmacenes();
      return true;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar almacén');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const eliminarAlmacen = async (id: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      await almacenService.delete(id);
      await fetchAlmacenes();
      return {
        success: true,
        message: 'Almacén eliminado correctamente',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error al eliminar el almacén',
      };
    } finally {
      setLoading(false);
    }
  };

  const alternarEstadoAlmacen = async (id: string): Promise<boolean> => {
    const objetivo = almacenes.find((almacen) => almacen.id === id);
    if (!objetivo) return false;
    return actualizarAlmacen(id, {
      estaActivoAlmacen: !objetivo.estaActivoAlmacen,
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
    loading,
    error,
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
    refetch: fetchAlmacenes
  };
}
