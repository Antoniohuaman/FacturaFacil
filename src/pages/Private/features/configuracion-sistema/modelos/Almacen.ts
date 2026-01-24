export interface ConfiguracionInventario {
  permiteStockNegativo: boolean;
  controlEstrictoStock: boolean;
  requiereAprobacionMovimientos: boolean;
  capacidadMaxima?: number;
  unidadCapacidad?: 'units' | 'm3' | 'm2';
}

export interface Almacen {
  id: string;
  empresaId: string;
  codigo: string;
  nombre: string;
  establecimientoId: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: string;
  descripcion?: string;
  ubicacion?: string;
  esActivo: boolean;
  principal: boolean;
  configuracionInventario: ConfiguracionInventario;
  createdAt: Date;
  updatedAt: Date;
  creadoPor?: string;
  actualizadoPor?: string;
  tieneMovimientosInventario?: boolean;
}

export interface AlmacenFormData {
  codigo: string;
  nombre: string;
  establecimientoId: string;
  establecimientoNombre?: string;
  establecimientoCodigo?: string;
  descripcion?: string;
  ubicacion?: string;
  esActivo: boolean;
  principal: boolean;
  configuracionInventario: ConfiguracionInventario;
}
