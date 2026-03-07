// src/features/configuracion-sistema/modelos/almacen.ts

export interface ConfiguracionInventarioAlmacen {
  permiteStockNegativoAlmacen: boolean;
  controlEstrictoStock: boolean;
  requiereAprobacionMovimientos: boolean;
  capacidadMaxima?: number;
  unidadCapacidad?: 'units' | 'm3' | 'm2';
}

/**
 * Representa un almacén dentro de un establecimiento
 * Jerarquía: RUC (Company) → Establecimiento → Almacén
 */
export interface Almacen {
  id: string;
  codigoAlmacen: string;
  nombreAlmacen: string;
  establecimientoId: string;
  nombreEstablecimientoDesnormalizado?: string;
  codigoEstablecimientoDesnormalizado?: string;
  descripcionAlmacen?: string;
  ubicacionAlmacen?: string;
  estaActivoAlmacen: boolean;
  esAlmacenPrincipal: boolean;
  configuracionInventarioAlmacen: ConfiguracionInventarioAlmacen;
  creadoElAlmacen: Date;
  actualizadoElAlmacen: Date;
  creadoPor?: string;
  actualizadoPor?: string;
  tieneMovimientosInventario?: boolean;
}

/**
 * DTO para crear o actualizar un almacén desde formularios.
 * Usa los mismos nombres de campos que el modelo canónico.
 */
export interface AlmacenFormData {
  codigoAlmacen: string;
  nombreAlmacen: string;
  establecimientoId: string;
  nombreEstablecimientoDesnormalizado?: string;
  codigoEstablecimientoDesnormalizado?: string;
  descripcionAlmacen?: string;
  ubicacionAlmacen?: string;
  estaActivoAlmacen: boolean;
  esAlmacenPrincipal: boolean;
  configuracionInventarioAlmacen: ConfiguracionInventarioAlmacen;
}
