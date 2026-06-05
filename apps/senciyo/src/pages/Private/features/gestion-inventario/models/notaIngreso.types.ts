// src/features/gestion-inventario/models/notaIngreso.types.ts

export type EstadoNotaIngreso = 'Borrador' | 'Generada' | 'Anulada';

export type TipoIngreso =
  | '02'
  | '03'
  | '05'
  | '16'
  | '18'
  | '19'
  | '20'
  | '21'
  | '22'
  | '24'
  | '26'
  | '28'
  | '29'
  | '31';

export interface EventoHistorialNI {
  fecha: string;
  usuario?: string;
  accion: string;
  detalle?: string;
}

export interface LineaNotaIngreso {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  tipoBienServicio: 'bien' | 'servicio';
  unidad: string;
  unidadCodigo: string;
  impuesto?: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface NotaIngreso {
  id: string;
  tipoDocumento: 'nota_ingreso';
  serie: string;
  correlativo?: string;
  numero?: string;
  estado: EstadoNotaIngreso;
  esBorrador: boolean;

  fechaDocumento: string;
  fechaIngresoAlmacen: string;
  tipoIngreso: TipoIngreso;

  almacenDestinoId: string;
  almacenDestinoNombre: string;
  almacenDestinoCodigo: string;
  encargadoAlmacen?: string;

  proveedorId?: string | number;
  proveedorNombre?: string;
  tipoDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  direccionProveedor?: string;

  moneda: 'PEN' | 'USD';
  formaPago?: string;

  documentoOrigen?: string;
  numeroDocumentoOrigen?: string;
  guiaRemision?: string;
  fechaGuiaRemision?: string;

  lineas: LineaNotaIngreso[];

  baseImponible: number;
  descuentos: number;
  isc: number;
  impuesto: number;
  noGravados: number;
  otc: number;
  total: number;

  informacionAdicional?: string;
  observaciones?: string;

  establecimientoId?: string;
  usuario: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  motivoAnulacion?: string;
  fechaAnulacion?: string;
  usuarioAnulacion?: string;

  historial: EventoHistorialNI[];
}
