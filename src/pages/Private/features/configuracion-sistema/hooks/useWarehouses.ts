// src/features/configuracion-sistema/hooks/useWarehouses.ts

import { useState, useMemo } from 'react';
import type { Warehouse } from '../models/Warehouse';

/**
 * Hook para gestionar almacenes (CRUD + validaciones)
 *
 * Proporciona datos mock iniciales y funciones para:
 * - Crear, actualizar, eliminar almacenes
 * - Validar que un almacén no se elimine si tiene movimientos
 * - Habilitar/deshabilitar almacenes
 * - Filtrar almacenes por establecimiento
 */
export function useWarehouses() {
  // Mock data inicial - 3 almacenes de ejemplo
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    {
      id: 'wh-1',
      code: '0001',
      name: 'Almacén Principal',
      establishmentId: 'est-1',
      establishmentName: 'Establecimiento Principal',
      establishmentCode: '0000',
      description: 'Almacén principal de mercadería',
      location: 'Piso 1 - Zona A',
      isActive: true,
      isMainWarehouse: true,
      inventorySettings: {
        allowNegativeStock: false,
        strictStockControl: true,
        requireApproval: false,
        maxCapacity: 10000,
        capacityUnit: 'units'
      },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      hasMovements: true // Este almacén ya tiene movimientos
    },
    {
      id: 'wh-2',
      code: '0002',
      name: 'Almacén Secundario',
      establishmentId: 'est-1',
      establishmentName: 'Establecimiento Principal',
      establishmentCode: '0000',
      description: 'Almacén para productos de rotación lenta',
      location: 'Piso 2 - Zona B',
      isActive: true,
      isMainWarehouse: false,
      inventorySettings: {
        allowNegativeStock: false,
        strictStockControl: false,
        requireApproval: false,
        maxCapacity: 5000,
        capacityUnit: 'units'
      },
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
      hasMovements: false
    },
    {
      id: 'wh-3',
      code: '0001',
      name: 'Almacén San Isidro',
      establishmentId: 'est-2',
      establishmentName: 'Sucursal San Isidro',
      establishmentCode: '0001',
      description: 'Almacén de la sucursal',
      location: 'Planta baja',
      isActive: true,
      isMainWarehouse: true,
      inventorySettings: {
        allowNegativeStock: true,
        strictStockControl: false,
        requireApproval: false,
        maxCapacity: 3000,
        capacityUnit: 'units'
      },
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-10'),
      hasMovements: false
    }
  ]);

  /**
   * Obtiene almacenes filtrados por establecimiento
   */
  const getWarehousesByEstablishment = useMemo(() => {
    return (establishmentId: string) =>
      warehouses.filter((wh) => wh.establishmentId === establishmentId);
  }, [warehouses]);

  /**
   * Obtiene almacenes activos de un establecimiento
   */
  const getActiveWarehousesByEstablishment = useMemo(() => {
    return (establishmentId: string) =>
      warehouses.filter(
        (wh) => wh.establishmentId === establishmentId && wh.isActive
      );
  }, [warehouses]);

  /**
   * Verifica si un código de almacén ya existe para un establecimiento
   */
  const isCodeDuplicate = (
    code: string,
    establishmentId: string,
    excludeId?: string
  ): boolean => {
    return warehouses.some(
      (wh) =>
        wh.code === code &&
        wh.establishmentId === establishmentId &&
        wh.id !== excludeId
    );
  };

  /**
   * Genera el siguiente código disponible para un establecimiento
   */
  const generateNextCode = (establishmentId: string): string => {
    const establishmentWarehouses = warehouses.filter(
      (wh) => wh.establishmentId === establishmentId
    );

    if (establishmentWarehouses.length === 0) return '0001';

    const numericCodes = establishmentWarehouses
      .map((wh) => {
        const match = wh.code.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter((n) => n > 0);

    const lastCode =
      numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(lastCode + 1).padStart(4, '0');
  };

  /**
   * Crea un nuevo almacén
   */
  const createWarehouse = (warehouse: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Warehouse => {
    const newWarehouse: Warehouse = {
      ...warehouse,
      id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      hasMovements: false
    };

    setWarehouses((prev) => [...prev, newWarehouse]);
    return newWarehouse;
  };

  /**
   * Actualiza un almacén existente
   */
  const updateWarehouse = (id: string, updates: Partial<Warehouse>): boolean => {
    let success = false;
    setWarehouses((prev) =>
      prev.map((wh) => {
        if (wh.id === id) {
          success = true;
          return {
            ...wh,
            ...updates,
            updatedAt: new Date()
          };
        }
        return wh;
      })
    );
    return success;
  };

  /**
   * Elimina un almacén (solo si no tiene movimientos)
   */
  const deleteWarehouse = (id: string): { success: boolean; message: string } => {
    const warehouse = warehouses.find((wh) => wh.id === id);

    if (!warehouse) {
      return {
        success: false,
        message: 'Almacén no encontrado'
      };
    }

    if (warehouse.hasMovements) {
      return {
        success: false,
        message: `No se puede eliminar el almacén "${warehouse.name}" porque tiene movimientos de inventario asociados. Puedes deshabilitarlo en su lugar.`
      };
    }

    setWarehouses((prev) => prev.filter((wh) => wh.id !== id));
    return {
      success: true,
      message: 'Almacén eliminado correctamente'
    };
  };

  /**
   * Habilita o deshabilita un almacén
   */
  const toggleWarehouseStatus = (id: string): boolean => {
    return updateWarehouse(id, {
      isActive: !warehouses.find((wh) => wh.id === id)?.isActive
    });
  };

  /**
   * Verifica si un establecimiento tiene almacenes
   */
  const hasWarehouses = (establishmentId: string): boolean => {
    return warehouses.some((wh) => wh.establishmentId === establishmentId);
  };

  /**
   * Obtiene el almacén principal de un establecimiento
   */
  const getMainWarehouse = (establishmentId: string): Warehouse | undefined => {
    return warehouses.find(
      (wh) => wh.establishmentId === establishmentId && wh.isMainWarehouse
    );
  };

  return {
    warehouses,
    getWarehousesByEstablishment,
    getActiveWarehousesByEstablishment,
    isCodeDuplicate,
    generateNextCode,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    toggleWarehouseStatus,
    hasWarehouses,
    getMainWarehouse
  };
}
