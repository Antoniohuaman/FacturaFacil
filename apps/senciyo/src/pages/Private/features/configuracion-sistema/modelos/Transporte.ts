export type EstadoConductor = 'ACTIVO' | 'INACTIVO';
export type EstadoVehiculo = 'ACTIVO' | 'INACTIVO';
export type EstadoTransportista = 'HABILITADO' | 'INACTIVO';

export type TipoDocumentoConductor = 'DNI' | 'CE' | 'PASAPORTE' | 'RUC';

export const TIPOS_DOCUMENTO_CONDUCTOR: Array<{ value: TipoDocumentoConductor; label: string }> = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'RUC', label: 'RUC' },
];

export interface Conductor {
  id: string;
  empresaId: string;
  tipoDocumento: TipoDocumentoConductor;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  numeroLicencia: string;
  estado: EstadoConductor;
  creadoEl: Date;
  actualizadoEl: Date;
}

export type CreateConductorInput = Omit<Conductor, 'id' | 'empresaId' | 'creadoEl' | 'actualizadoEl'>;
export type UpdateConductorInput = Partial<CreateConductorInput>;

export interface Vehiculo {
  id: string;
  empresaId: string;
  placa: string;
  marca: string;
  configuracionVehicular: string;
  numeroCertificado: string;
  codigoEntidadAutorizadora?: string;
  numeroAutorizacion?: string;
  estado: EstadoVehiculo;
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
  actualizadoEl: Date;
}

export type UpdateDatosTransportistaInput = Pick<DatosTransportista, 'numeroRegistroMTC' | 'estado'>;
