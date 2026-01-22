import type { Establecimiento } from '../modelos/Establecimiento';
import type { EstablecimientoBackendDto, EstablecimientoInputDto } from '../types/backend-types';
import { getCurrentUser } from './config';

export function mapBackendToFrontend(
  dto: EstablecimientoBackendDto,
  existingData?: Partial<Establecimiento>
): Establecimiento {
  return {
    id: dto.id,
    codigoEstablecimiento: dto.codigo,
    nombreEstablecimiento: dto.nombre,
    direccionEstablecimiento: dto.direccion || '',
    distritoEstablecimiento: dto.distrito || '',
    provinciaEstablecimiento: dto.provincia || '',
    departamentoEstablecimiento: dto.departamento || '',
    codigoPostalEstablecimiento: dto.codigoPostal || '',
    phone: dto.telefono || '',
    email: dto.correo || '',
    estaActivoEstablecimiento: dto.esActivo,
    creadoElEstablecimiento: new Date(dto.createdAt),
    actualizadoElEstablecimiento: new Date(dto.updatedAt),
    coordinates: existingData?.coordinates,
    businessHours: existingData?.businessHours || {},
    sunatConfiguration: existingData?.sunatConfiguration || { isRegistered: false },
    posConfiguration: existingData?.posConfiguration,
    inventoryConfiguration: existingData?.inventoryConfiguration || {
      managesInventory: false,
      isalmacen: false,
      allowNegativeStock: false,
      autoTransferStock: false,
    },
    financialConfiguration: existingData?.financialConfiguration || {
      handlesCash: true,
      defaultCurrencyId: '',
      acceptedCurrencies: [],
      defaultTaxId: '',
      bankAccounts: [],
    },
    estadoEstablecimiento: dto.esActivo ? 'ACTIVE' : 'INACTIVE',
    isMainEstablecimiento: existingData?.isMainEstablecimiento || false,
    notes: existingData?.notes,
  };
}

export function mapFrontendToBackendInput(
  establecimiento: Partial<Establecimiento>,
  empresaId: string
): EstablecimientoInputDto {
  const user = getCurrentUser();
  return {
    empresaId,
    codigo: establecimiento.codigoEstablecimiento || '',
    nombre: establecimiento.nombreEstablecimiento || '',
    direccion: establecimiento.direccionEstablecimiento || undefined,
    distrito: establecimiento.distritoEstablecimiento || undefined,
    provincia: establecimiento.provinciaEstablecimiento || undefined,
    departamento: establecimiento.departamentoEstablecimiento || undefined,
    codigoPostal: establecimiento.codigoPostalEstablecimiento || undefined,
    telefono: establecimiento.phone || undefined,
    correo: establecimiento.email || undefined,
    esActivo: establecimiento.estaActivoEstablecimiento ?? true,
    usuarioId: user?.id,
    usuarioNombre: user?.nombre,
  };
}
