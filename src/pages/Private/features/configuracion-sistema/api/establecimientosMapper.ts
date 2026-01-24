import type { Establecimiento } from '../modelos/Establecimiento';
import type { EstablecimientoBackendDto, EstablecimientoInputDto } from '../types/backend-types';
import { getCurrentUser } from './config';

export function mapBackendToFrontend(
  dto: EstablecimientoBackendDto,
  existingData?: Partial<Establecimiento>
): Establecimiento {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    direccion: dto.direccion || '',
    codigoDepartamento: dto.codigoDepartamento || '',
    departamento: dto.departamento || '',
    codigoProvincia: dto.codigoProvincia || '',
    provincia: dto.provincia || '',
    codigoDistrito: dto.codigoDistrito || '',
    distrito: dto.distrito || '',
    codigoPostal: dto.codigoPostal || '',
    phone: dto.telefono || '',
    email: dto.correo || '',
    esActivo: dto.esActivo,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
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
    estado: dto.esActivo ? 'ACTIVE' : 'INACTIVE',
    principal: existingData?.principal || false,
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
    codigo: establecimiento.codigo || '',
    nombre: establecimiento.nombre || '',
    direccion: establecimiento.direccion || undefined,
    distrito: establecimiento.distrito || undefined,
    provincia: establecimiento.provincia || undefined,
    departamento: establecimiento.departamento || undefined,
    codigoDistrito: establecimiento.codigoDistrito || undefined,
    codigoProvincia: establecimiento.codigoProvincia || undefined,
    codigoDepartamento: establecimiento.codigoDepartamento || undefined,
    codigoPostal: establecimiento.codigoPostal || undefined,
    telefono: establecimiento.phone || undefined,
    correo: establecimiento.email || undefined,
    esActivo: establecimiento.esActivo ?? true,
    usuarioId: user?.id,
    usuarioNombre: user?.nombre,
  };
}
