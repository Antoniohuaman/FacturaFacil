// src/features/gestion-inventario/models/notaSalida.types.ts

export type EstadoNotaSalida = 'Borrador' | 'Generada' | 'Entregada' | 'Anulada';

export type TipoSalida =
  | '01'
  | '04'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12'
  | '13'
  | '14'
  | '15'
  | '17'
  | '23'
  | '25'
  | '27'
  | '28'
  | '30'
  | '32'
  | '33'
  | '34'
  | '35'
  | '36'
  | '37'
  | '38';

export interface EventoHistorialNS {
  fecha: string;
  usuario?: string;
  accion: string;
  detalle?: string;
}

export interface LineaNotaSalida {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  tipoBienServicio: 'bien' | 'servicio';
  unidad: string;
  unidadCodigo: string;
  impuesto?: string;
  almacenId?: string;
  almacenNombre?: string;
  cantidad: number;
  pvUnitario: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface NotaSalida {
  id: string;
  tipoDocumento: 'nota_salida';

  serie: string;
  correlativo?: string;
  numero?: string;

  estado: EstadoNotaSalida;
  esBorrador: boolean;

  fechaDocumento: string;
  fechaEntregaPrevista?: string;
  tipoSalida: TipoSalida;

  almacenOrigenId: string;
  almacenOrigenNombre: string;
  almacenOrigenCodigo?: string;
  encargadoAlmacen?: string;
  encargadoAlmacenId?: string;

  clienteId?: string | number;
  clienteNombre?: string;
  tipoDocumentoCliente?: string;
  numeroDocumentoCliente?: string;
  direccionFacturacion?: string;
  direccionEnvio?: string;
  contacto?: string;
  cargo?: string;

  moneda: 'PEN' | 'USD';
  formaPago?: string;
  metodoEnvio?: string;

  documentoOrigen?: string;
  numeroDocumentoOrigen?: string;
  origen?: 'Manual';

  lineas: LineaNotaSalida[];

  baseImponible: number;
  impuesto: number;
  total: number;

  observaciones?: string;

  motivoAnulacion?: string;
  fechaAnulacion?: string;
  usuarioAnulacion?: string;

  historial: EventoHistorialNS[];

  usuario: string;
  createdAt: string;
  updatedAt: string;
}
