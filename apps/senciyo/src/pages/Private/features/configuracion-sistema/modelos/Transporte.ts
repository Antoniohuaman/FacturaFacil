import type { TipoDocumentoConductorGRE } from '../datos/catalogosGRE';

export type EstadoConductor = 'ACTIVO' | 'INACTIVO';
export type EstadoVehiculo = 'ACTIVO' | 'INACTIVO';
export type EstadoTransportista = 'HABILITADO' | 'INACTIVO';

// Tipo estable derivado del catálogo central en catalogosGRE.ts
export type TipoDocumentoConductor = TipoDocumentoConductorGRE;

export interface Conductor {
  id: string;
  empresaId: string;
  numeroLicencia: string;
  tipoDocumento: TipoDocumentoConductor;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  estado: EstadoConductor;
  // Campos opcionales preparados para enriquecimiento por API
  categoriaLicencia?: string;
  fechaExpedicion?: string;
  fechaVencimiento?: string;
  estadoLicencia?: string;
  restricciones?: string;
  creadoEl: Date;
  actualizadoEl: Date;
}

export type CreateConductorInput = Omit<Conductor, 'id' | 'empresaId' | 'creadoEl' | 'actualizadoEl'>;
export type UpdateConductorInput = Partial<CreateConductorInput>;

export interface Vehiculo {
  id: string;
  empresaId: string;
  placa: string;
  estado: EstadoVehiculo;
  // Relación con conductores — se almacenan IDs estables
  conductoresIds?: string[];
  // Datos del vehículo (opcionales, preparados para enriquecimiento por API)
  marca?: string;
  modelo?: string;
  configuracionVehicular?: string;
  numeroCertificado?: string;
  numeroTUCE?: string;
  numeroSerie?: string;
  vin?: string;
  numeroMotor?: string;
  color?: string;
  // Autorización especial
  codigoEntidadAutorizadora?: string;
  numeroAutorizacion?: string;
  creadoEl: Date;
  actualizadoEl: Date;
}

export type CreateVehiculoInput = Omit<Vehiculo, 'id' | 'empresaId' | 'creadoEl' | 'actualizadoEl'>;
export type UpdateVehiculoInput = Partial<CreateVehiculoInput>;

export interface DatosTransportista {
  id: string;
  empresaId: string;
  numeroRegistroMTC: string;
  estado: EstadoTransportista;
  // Autorización especial del transportista
  codigoEntidadAutorizadora?: string;
  numeroAutorizacion?: string;
  actualizadoEl: Date;
}

export type UpdateDatosTransportistaInput = Omit<DatosTransportista, 'id' | 'empresaId' | 'actualizadoEl'>;
