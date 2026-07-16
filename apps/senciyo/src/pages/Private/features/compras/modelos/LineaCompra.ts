import type { ProductUnitOption } from '@/shared/units/productUnitOptions';

export type ClasificacionLineaCompra =
  | 'producto'
  | 'servicio'
  | 'gasto'
  | 'suministro'
  | 'activo_fijo';

/** 'sin_configurar': el producto no tiene impuesto propio definido en Productos; bloquea el registro. */
export type TipoAfectacionCompra = 'gravado' | 'exonerado' | 'inafecto' | 'sin_configurar';

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
  alias?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  tipoExistencia?: string;
  codigoBarras?: string;
  codigoFabrica?: string;
  codigoSunat?: string;
  peso?: number;
  /** Costo de compra de referencia registrado en el producto (dato del catálogo, no editable desde la línea). */
  precioCompraReferencia?: number;
  /** Imagen del producto de catálogo, informativa (ver Producto en Configuración). */
  imagen?: string;
  /** Stock disponible al momento de agregar la línea, solo informativo (no bloquea el registro). */
  stockReferencia?: number;

  // Clasificación funcional
  clasificacion: ClasificacionLineaCompra;
  /** Si es false, este ítem no genera movimiento de stock al registrar CC */
  afectaInventario: boolean;

  // Unidad de medida
  unidadMedida: string;
  unidadMedidaCodigo: string;
  /** Unidad base + presentaciones válidas del producto (ver getProductUnitOptions). Vacío si el producto no tiene unidad configurada. */
  unidadesDisponibles: ProductUnitOption[];

  // Cantidades separadas (prevención de doble ingreso)
  cantidadSolicitada: number;
  cantidadRecibida: number;
  cantidadFacturada: number;
  cantidadIngresadaInventario: number;
  /** Derivado: cantidadSolicitada - cantidadRecibida */
  cantidadPendienteRecepcion: number;
  /** Derivado: cantidadSolicitada - cantidadFacturada (ver recalcularSeguimientoFacturacionOC, en OC; en CC, siempre 0 — un CC factura la línea completa) */
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
