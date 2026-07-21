// src/features/gestion-inventario/models/notaSalida.types.ts

import type { DatosLineaOperacionCuantitativa } from './operacionEntradaInventario.types';

export type EstadoNotaSalida = 'Borrador' | 'Generada' | 'Entregada' | 'Anulada';

/** Despacho por SKU para `atenderOrdenVentaPostNSDirecta`/`atenderOrdenVentaPostNS` — independiente de qué mecanismo liberó la reserva. */
export interface DespachoOVBasico {
  sku: string;
  cantidad: number;
  almacenId?: string;
  establecimientoId?: string;
}

/**
 * Snapshot INMUTABLE de la preparación de inventario de una NS (corrección post-1D, §2) —
 * persistido junto con `numero`/`correlativo`/`lineas` ANTES de invocar al motor central de
 * salidas. Un reintento (p. ej. tras un fallo entre confirmar inventario y persistir la NS como
 * 'Generada') reutiliza este snapshot EXACTAMENTE tal cual: nunca vuelve a ejecutar FIFO, nunca
 * vuelve a consultar `esProductoInventariable` contra el catálogo vigente, nunca reconstruye
 * cantidades o almacenes desde el stock actual. Si el producto cambió de clasificación, desapareció
 * del catálogo, o el stock/almacén cambiaron desde la primera preparación, el snapshot ya
 * congelado es la única fuente de verdad para el reintento.
 */
export interface PreparacionInventarioNS {
  /** Líneas exactas para `DatosOperacionSalidaCuantitativa.lineas` — ya incluyen `liberarReservaOV`/`liberarReservaLegacyOV` cuando corresponda. */
  lineasOperacion: DatosLineaOperacionCuantitativa[];
  /** Para `atenderOrdenVentaPostNSDirecta`/`atenderOrdenVentaPostNS`. */
  despachosOV: DespachoOVBasico[];
  /**
   * `true` cuando la primera preparación legítima determinó que esta NS no genera ningún
   * movimiento de inventario (solo servicios y/o productos no inventariables) — persistido
   * explícitamente para que un reintento nunca tenga que inferirlo de nuevo desde el catálogo.
   * Debe ser siempre `lineasOperacion.length === 0`; una discrepancia indica un snapshot corrupto.
   */
  sinMovimientoInventario: boolean;
}

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

  almacenOrigenId?: string;
  almacenOrigenNombre?: string;
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
  origen?: 'Manual' | 'Comprobante' | 'NotaVenta' | 'OrdenVenta';
  comprobanteOrigenId?: string;
  ordenVentaOrigenId?: string;
  notaVentaOrigenId?: string;

  lineas: LineaNotaSalida[];

  /** Snapshot inmutable de preparación de inventario — ver `PreparacionInventarioNS`. Ausente en un borrador que todavía no se preparó ni una sola vez. */
  preparacionInventario?: PreparacionInventarioNS;

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

export interface ComprobanteOrigenNS {
  id: string;
  type: string;
  client: string;
  clientDoc: string;
  clientDocType?: string;
  address?: string;
  currency?: string;
  lineas: LineaNotaSalida[];
  ordenVentaOrigenId?: string;
}

/** Datos del documento comercial (NV u OV) que origina una Nota de Salida directa. */
export interface DocumentoComercialOrigenNS {
  id: string;
  numero: string;
  tipo: 'nota_venta' | 'orden_venta';
  clienteNombre?: string;
  clienteDoc?: string;
  clienteDocTipo?: string;
  clienteDireccion?: string;
  moneda?: string;
  lineas: LineaNotaSalida[];
}
