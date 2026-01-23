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
    codigoAlmacen: dto.codigo,
    nombreAlmacen: dto.nombre,
    establecimientoId: dto.establecimientoId,
    nombreEstablecimientoDesnormalizado: dto.establecimientoNombre || undefined,
    codigoEstablecimientoDesnormalizado: dto.establecimientoCodigo || undefined,
    descripcionAlmacen: dto.descripcion || undefined,
    ubicacionAlmacen: dto.ubicacion || undefined,
    esAlmacenPrincipal: dto.esPrincipal,
    estaActivoAlmacen: dto.esActivo,
    configuracionInventarioAlmacen: existingData?.configuracionInventarioAlmacen || {
      permiteStockNegativoAlmacen: false,
      controlEstrictoStock: true,
      requiereAprobacionMovimientos: false,
    },
    creadoElAlmacen: new Date(dto.createdAt),
    actualizadoElAlmacen: new Date(dto.updatedAt),
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
    codigo: almacen.codigoAlmacen || '',
    nombre: almacen.nombreAlmacen || '',
    establecimientoId: almacen.establecimientoId || '',
    establecimientoCodigo: almacen.codigoEstablecimientoDesnormalizado,
    establecimientoNombre: almacen.nombreEstablecimientoDesnormalizado,
    descripcion: almacen.descripcionAlmacen,
    ubicacion: almacen.ubicacionAlmacen,
    esPrincipal: almacen.esAlmacenPrincipal ?? false,
    esActivo: almacen.estaActivoAlmacen ?? true,
    usuarioId: user?.id,
    usuarioNombre: user?.nombre,
  };
}
