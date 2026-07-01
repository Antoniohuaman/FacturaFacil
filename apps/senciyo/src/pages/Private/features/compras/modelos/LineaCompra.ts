export type ClasificacionLineaCompra =
  | 'producto'
  | 'servicio'
  | 'gasto'
  | 'suministro'
  | 'activo_fijo';

export type TipoAfectacionCompra = 'gravado' | 'exonerado' | 'inafecto';

export const CLASIFICACION_LINEA_LABELS: Record<ClasificacionLineaCompra, string> = {
  producto: 'Producto',
  servicio: 'Servicio',
  gasto: 'Gasto',
  suministro: 'Suministro',
  activo_fijo: 'Activo Fijo',
};

export interface LineaCompra {
  id: string;

  // Identificación del ítem
  productoId?: string;
  codigoProducto?: string;
  nombreProducto: string;
  descripcion?: string;

  // Clasificación funcional
  clasificacion: ClasificacionLineaCompra;
  /** Si es false, este ítem no genera movimiento de stock al registrar CC */
  afectaInventario: boolean;

  // Unidad de medida
  unidadMedida: string;
  unidadMedidaCodigo: string;

  // Cantidades separadas (prevención de doble ingreso)
  cantidadSolicitada: number;
  cantidadRecibida: number;
  cantidadFacturada: number;
  cantidadIngresadaInventario: number;
  /** Derivado: cantidadSolicitada - cantidadRecibida */
  cantidadPendienteRecepcion: number;
  /** Derivado: cantidadRecibida - cantidadFacturada */
  cantidadPendienteFacturacion: number;
  /** Derivado: cantidadFacturada - cantidadIngresadaInventario */
  cantidadPendienteInventario: number;

  // Financiero
  costoUnitario: number;
  descuentoUnitario?: number;
  descuentoTotal?: number;
  subtotal: number;
  tipoAfectacion: TipoAfectacionCompra;
  tasaIgv?: number;
  igv: number;
  total: number;

  // Destino de inventario
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;

  // Presupuestal
  centroCosto?: string;
  presupuesto?: string;

  // Solo para clasificacion = 'activo_fijo'
  descripcionActivo?: string;
  responsableActivo?: string;
  ubicacionActivo?: string;

  observacion?: string;
}
