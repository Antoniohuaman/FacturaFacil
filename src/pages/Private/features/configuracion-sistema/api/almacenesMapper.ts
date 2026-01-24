import type { Almacen } from '../modelos/Almacen';
import type { AlmacenBackendDto, AlmacenInputDto } from '../types/backend-types';
import { getCurrentUser } from './config';

export function mapBackendToFrontend(
  dto: AlmacenBackendDto,
  existingData?: Partial<Almacen>
): Almacen {
  return {
    id: dto.id,
    empresaId: dto.empresaId,
    codigo: dto.codigo,
    nombre: dto.nombre,
    establecimientoId: dto.establecimientoId,
    establecimientoNombre: dto.establecimientoNombre || undefined,
    establecimientoCodigo: dto.establecimientoCodigo || undefined,
    descripcion: dto.descripcion || undefined,
    ubicacion: dto.ubicacion || undefined,
    principal: dto.esPrincipal,
    esActivo: dto.esActivo,
    configuracionInventario: existingData?.configuracionInventario || {
      permiteStockNegativo: false,
      controlEstrictoStock: true,
      requiereAprobacionMovimientos: false,
    },
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    tieneMovimientosInventario: existingData?.tieneMovimientosInventario || false,
  };
}

export function mapFrontendToBackendInput(
  almacen: Partial<Almacen>,
  empresaId: string
): AlmacenInputDto {
  const user = getCurrentUser();
  return {
    empresaId,
    codigo: almacen.codigo || '',
    nombre: almacen.nombre || '',
    establecimientoId: almacen.establecimientoId || '',
    establecimientoCodigo: almacen.establecimientoCodigo,
    establecimientoNombre: almacen.establecimientoNombre,
    descripcion: almacen.descripcion,
    ubicacion: almacen.ubicacion,
    esPrincipal: almacen.principal ?? false,
    esActivo: almacen.esActivo ?? true,
    usuarioId: user?.id,
    usuarioNombre: user?.nombre,
  };
}
