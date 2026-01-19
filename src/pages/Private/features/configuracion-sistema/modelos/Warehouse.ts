// src/features/configuracion-sistema/modelos/Warehouse.ts

/**
 * Representa un almacén dentro de un establecimiento
 * Jerarquía: RUC (Company) → Establecimiento → Almacén
 *
 * Un establecimiento puede tener uno o varios almacenes.
 * Cada almacén es donde físicamente se gestiona el inventario.
 */
export interface Warehouse {
  /** Identificador único del almacén */
  id: string;

  /** Código único del almacén (4 dígitos, ej: 0001) */
  code: string;

  /** Nombre descriptivo del almacén */
  name: string;

  /** ID del establecimiento al que pertenece este almacén */
  establishmentId: string;

  /** Nombre del establecimiento (desnormalizado para mostrar) */
  establishmentName?: string;

  /** Código del establecimiento (desnormalizado para mostrar) */
  establishmentCode?: string;

  /** Descripción opcional del almacén */
  description?: string;

  /** Ubicación física dentro del establecimiento */
  location?: string;

  /** Indica si el almacén está activo/habilitado */
  isActive: boolean;

  /** Indica si es el almacén principal del establecimiento */
  isMainWarehouse: boolean;

  /** Configuración de gestión de inventario */
  inventorySettings: {
    /** Permitir stock negativo */
    allowNegativeStock: boolean;

    /** Control estricto de stock (requiere ajustes documentados) */
    strictStockControl: boolean;

    /** Requiere aprobación para movimientos */
    requireApproval: boolean;

    /** Capacidad máxima del almacén (opcional, en unidades o m³) */
    maxCapacity?: number;

    /** Unidad de medida de capacidad */
    capacityUnit?: 'units' | 'm3' | 'm2';
  };

  /** Metadatos de auditoría */
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  /** Indica si el almacén tiene movimientos de inventario asociados */
  hasMovements?: boolean;
}

/**
 * DTO para crear o actualizar un almacén
 */
export interface WarehouseFormData {
  code: string;
  name: string;
  establishmentId: string;
  description?: string;
  location?: string;
  isActive: boolean;
  isMainWarehouse: boolean;
  inventorySettings: {
    allowNegativeStock: boolean;
    strictStockControl: boolean;
    requireApproval: boolean;
    maxCapacity?: number;
    capacityUnit?: 'units' | 'm3' | 'm2';
  };
}
