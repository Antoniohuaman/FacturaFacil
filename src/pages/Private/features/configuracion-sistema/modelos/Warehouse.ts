// src/features/configuracion-sistema/modelos/Warehouse.ts

/**
 * Representa un almacén dentro de un establecimiento
 * Jerarquía: RUC (Company) → Establecimiento → Almacén
 *
 * Un establecimiento puede tener uno o varios almacenes.
 * Cada almacén es donde físicamente se gestiona el inventario.
 */
export interface Almacen {
  /** Identificador único del almacén */
  id: string;

  /** Código único del almacén (4 dígitos, ej: 0001) */
  codigoAlmacen: string;

  /** Alias legada: código en inglés */
  code: string;

  /** Nombre descriptivo del almacén */
  nombreAlmacen: string;

  /** Alias legada: nombre en inglés */
  name: string;

  /** ID del establecimiento al que pertenece este almacén */
  establecimientoId: string;

  /** Alias legada del ID del establecimiento */
  establishmentId: string;

  /** Nombre del establecimiento (desnormalizado para mostrar) */
  nombreEstablecimientoDesnormalizado?: string;

  /** Alias legada del nombre del establecimiento */
  establishmentName?: string;

  /** Código del establecimiento (desnormalizado para mostrar) */
  codigoEstablecimientoDesnormalizado?: string;

  /** Alias legada del código del establecimiento */
  establishmentCode?: string;

  /** Descripción opcional del almacén */
  descripcionAlmacen?: string;

  /** Ubicación física dentro del establecimiento */
  ubicacionAlmacen?: string;

  /** Alias legada: ubicación */
  location?: string;

  /** Indica si el almacén está activo/habilitado */
  estaActivoAlmacen: boolean;

  /** Alias legada: estado activo */
  isActive: boolean;

  /** Indica si es el almacén principal del establecimiento */
  esAlmacenPrincipal: boolean;

  /** Alias legada: almacén principal */
  isMainWarehouse: boolean;

  /** Configuración de gestión de inventario */
  configuracionInventarioAlmacen: {
    /** Permitir stock negativo */
    permiteStockNegativoAlmacen: boolean;

    /** Control estricto de stock (requiere ajustes documentados) */
    controlEstrictoStock: boolean;

    /** Requiere aprobación para movimientos */
    requiereAprobacionMovimientos: boolean;

    /** Capacidad máxima del almacén (opcional, en unidades o m³) */
    capacidadMaxima?: number;

    /** Unidad de medida de capacidad */
    unidadCapacidad?: 'units' | 'm3' | 'm2';
  };

  /** Metadatos de auditoría */
  creadoElAlmacen: Date;
  actualizadoElAlmacen: Date;
  createdBy?: string;
  updatedBy?: string;

  /** Indica si el almacén tiene movimientos de inventario asociados */
  tieneMovimientosInventario?: boolean;
}

/**
 * DTO para crear o actualizar un almacén
 */
export interface AlmacenFormData {
  codigoAlmacen: string;
  nombreAlmacen: string;
  establecimientoId: string;
  descripcionAlmacen?: string;
  ubicacionAlmacen?: string;
  estaActivoAlmacen: boolean;
  esAlmacenPrincipal: boolean;
  configuracionInventarioAlmacen: {
    permiteStockNegativoAlmacen: boolean;
    controlEstrictoStock: boolean;
    requiereAprobacionMovimientos: boolean;
    capacidadMaxima?: number;
    unidadCapacidad?: 'units' | 'm3' | 'm2';
  };
}

export type AlmacenSinAlias = Omit<
  Almacen,
  'code' | 'name' | 'establishmentId' | 'establishmentName' | 'establishmentCode' | 'location' | 'isActive' | 'isMainWarehouse'
> & Partial<Pick<Almacen, 'establishmentName' | 'establishmentCode' | 'location'>>;

export type Warehouse = Almacen;
