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
  // Almacén destino de esta línea; si no especificado hereda el almacén de cabecera
  almacenId?: string;
  almacenNombre?: string;
  cantidad: number;
  /** Costo por unidad mínima, en moneda base — el mismo campo sirve tanto a una línea ingresada manualmente (ya en unidad mínima) como a una derivada de Compras (Etapa 3, ya convertida — nunca costo comercial sin dividir). */
  costoUnitario: number;
  subtotal: number;
  igv: number;
  total: number;

  // --- Snapshot de trazabilidad de compra (Etapa 3) — ausente en una NI sin origen de Comprobante ---
  /** Línea de `LineaCompra` que originó esta línea de NI — FK técnica, nunca inferida de texto libre. */
  lineaCompraOrigenId?: string;
  /** Cantidad en la presentación comercial original (ej. 2 cajas) — snapshot, nunca recalculada desde el catálogo. */
  cantidadComercialOriginal?: number;
  /** Snapshot histórico del factor de conversión aplicado por la línea de compra — nunca reconsultado. */
  factorConversionAplicado?: number;
  /** Costo por unidad de presentación comercial, en moneda original (ej. 120 por caja) — snapshot, distinto de `costoUnitario` (que ya está en unidad mínima y moneda base). */
  costoUnitarioComercialOriginal?: number;
  /** Descuento por unidad ya aplicado en la línea de compra de origen — snapshot informativo, ya reflejado en `costoUnitario`. */
  descuentoAplicado?: number;
  /** Recuperabilidad tributaria ya resuelta (vía `resolverTratamientoTributarioProducto`) al momento de construir esta línea — snapshot, nunca vuelto a derivar del catálogo o de `impuesto` (legado) al confirmar. */
  esImpuestoRecuperable?: boolean;
  /** Moneda del Comprobante de Compra de origen — snapshot, nunca la moneda base actual de la empresa. */
  monedaOriginal?: string;
  /** Tipo de cambio histórico del Comprobante de origen — snapshot, nunca la cotización vigente al confirmar. */
  tipoCambioAplicado?: number;
  /** Fecha/referencia del tipo de cambio usado — acompaña a `tipoCambioAplicado`. */
  fechaTipoCambio?: string;
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
  encargadoAlmacenId?: string;

  proveedorId?: string | number;
  proveedorNombre?: string;
  tipoDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;
  direccionProveedor?: string;
  direccionEnvio?: string;

  moneda: 'PEN' | 'USD';
  formaPago?: string;

  /** Código de tipo documental SUNAT del documento de referencia del proveedor (ej. '01' Factura, '03' Boleta) — texto/catálogo visual, NUNCA una FK técnica. La relación real con el Comprobante de Compra es `comprobanteCompraOrigenId`. */
  documentoOrigen?: string;
  numeroDocumentoOrigen?: string;
  guiaRemision?: string;
  fechaGuiaRemision?: string;

  /** FK técnica real al `ComprobanteCompra` que originó esta NI (Etapa 3) — ausente en una NI creada directamente en este módulo, sin origen de Compras. */
  comprobanteCompraOrigenId?: string;
  /** Cómo se generó esta NI a partir del Comprobante: 'automatico' (ingreso_automatico, autoconfirmada por el orquestador) o 'manual' (el usuario la confirma). Ausente cuando `comprobanteCompraOrigenId` también lo está. */
  modalidadOrigenCompra?: 'automatico' | 'manual';

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
