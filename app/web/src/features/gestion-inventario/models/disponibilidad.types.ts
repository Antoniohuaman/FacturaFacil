// src/features/gestion-inventario/models/disponibilidad.types.ts

/**
 * Situación del stock según disponibilidad
 */
export type SituacionStock = 'OK' | 'Sin stock' | 'Bajo' | 'Crítico';

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
}

/**
 * Filtros para la vista de disponibilidad
 */
export interface DisponibilidadFilters {
  /** ID del establecimiento (requerido) */
  establecimientoId: string;

  /** ID del almacén (requerido) */
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
  | 'real'
  | 'reservado'
  | 'disponible'
  | 'situacion'
  | 'acciones';

/**
 * Vista guardada por el usuario
 */
export interface VistaGuardada {
  /** ID único de la vista */
  id: string;

  /** Nombre de la vista */
  nombre: string;

  /** Filtros aplicados */
  filtros: Partial<DisponibilidadFilters>;

  /** Columnas visibles */
  columnasVisibles: ColumnaDisponibilidad[];

  /** Densidad de la tabla */
  densidad: DensidadTabla;

  /** Fecha de creación */
  fechaCreacion: Date;
}

/**
 * Preferencias de usuario para la vista de disponibilidad
 */
export interface PreferenciasDisponibilidad {
  /** Densidad preferida de la tabla */
  densidad: DensidadTabla;

  /** Columnas visibles */
  columnasVisibles: ColumnaDisponibilidad[];

  /** Vistas guardadas */
  vistasGuardadas: VistaGuardada[];

  /** Vista activa (si hay alguna seleccionada) */
  vistaActivaId?: string;

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
