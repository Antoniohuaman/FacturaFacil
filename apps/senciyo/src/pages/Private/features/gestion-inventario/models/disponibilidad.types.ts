// src/features/gestion-inventario/models/disponibilidad.types.ts

/**
 * Situación del stock según disponibilidad
 */
export type SituacionStock = 'OK' | 'Sin stock' | 'Bajo' | 'Crítico' | 'Excedido';

/**
 * Item de disponibilidad de inventario
 * Basado en ListarDisponibilidadUseCase
 */
export interface DisponibilidadItem {
  /** Código único del producto (SKU) */
  sku: string;

  /** ID del producto para operaciones */
  productoId: string;

  /** Nombre del producto */
  nombre: string;

  /** Unidad mínima definida en el catálogo */
  unidadMinima: string;

  /** Stock real en el almacén */
  real: number;

  /** Stock reservado (en pedidos, ordenes, etc.) */
  reservado: number;

  /** Stock disponible (real - reservado) */
  disponible: number;

  /** Situación calculada del stock */
  situacion: SituacionStock;

  /** Stock mínimo configurado para el almacén */
  stockMinimo?: number;

  /** Stock máximo configurado para el almacén */
  stockMaximo?: number;

  /** Precio del producto */
  precio: number;

  /**
   * Stock real por almacén individual.
   * Solo se popula cuando el scope incluye más de un almacén
   * (modo "Todos los almacenes"), para mostrar columnas dinámicas por almacén.
   */
  stockPorAlmacen?: Record<string, number>;
}

/**
 * Filtros para la vista de disponibilidad
 */
export interface DisponibilidadFilters {
  /** ID del establecimiento. Vacío representa "todos" */
  establecimientoId: string;

  /** ID del almacén. Vacío representa "todos" */
  almacenId: string;

  /** Filtro de búsqueda por SKU o nombre (opcional) */
  filtroSku?: string;

  /** Mostrar solo productos con disponibilidad > 0 */
  soloConDisponible: boolean;
}

/**
 * Densidad de la tabla
 */
export type DensidadTabla = 'compacta' | 'comoda' | 'espaciosa';

/**
 * Columnas disponibles en la tabla
 */
export type ColumnaDisponibilidad =
  | 'codigo'
  | 'producto'
  | 'unidadMinima'
  | 'real'
  | 'reservado'
  | 'disponible'
  | 'stockMinimo'
  | 'stockMaximo'
  | 'situacion'
  | 'acciones';

/**
 * Preferencias de usuario para la vista de disponibilidad
 */
export interface PreferenciasDisponibilidad {
  /** Densidad preferida de la tabla */
  densidad: DensidadTabla;

  /** Columnas visibles */
  columnasVisibles: ColumnaDisponibilidad[];

  /** Mostrar columnas individuales por almacén (solo en modo "Todos los almacenes") */
  mostrarColumnasPorAlmacen: boolean;

  /** Número de items por página */
  itemsPorPagina: number;
}

/**
 * Opciones de ordenamiento
 */
export interface OrdenamientoDisponibilidad {
  /** Campo por el cual ordenar */
  campo: ColumnaDisponibilidad;

  /** Dirección del ordenamiento */
  direccion: 'asc' | 'desc';
}
