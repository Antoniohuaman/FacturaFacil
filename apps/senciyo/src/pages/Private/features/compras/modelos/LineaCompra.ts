import type { ProductUnitOption } from '@/shared/units/productUnitOptions';

export type ClasificacionLineaCompra =
  | 'producto'
  | 'servicio'
  | 'gasto'
  | 'suministro'
  | 'activo_fijo';

/**
 * 'sin_configurar': el producto no tiene impuesto propio definido en Productos; bloquea el
 * registro. 'exportacion': tasa 0 igual que 'exonerado'/'inafecto', pero es una categoría
 * tributaria distinta (Catálogo 07 SUNAT código '40') — nunca se confunde con exoneración solo
 * porque ambas tengan tasa cero.
 */
export type TipoAfectacionCompra = 'gravado' | 'exonerado' | 'inafecto' | 'exportacion' | 'sin_configurar';

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
  /**
   * Naturaleza histórica de la línea (¿es controlada por stock?), calculada una sola vez con
   * `calcularEsInventariable` al confirmar la línea — snapshot, nunca se recalcula leyendo el
   * catálogo vigente. Ausente en líneas históricas creadas antes de este campo (ver
   * `calcularEsInventariable`/`calcularAfectaInventarioLinea` en `logica/reglasCompras.ts`).
   */
  esInventariable?: boolean;
  /** Si es false, este ítem no genera movimiento de stock al registrar CC. Derivado de esInventariable + modalidadInventario del documento (calcularAfectaInventarioLinea) — no es un booleano libre. */
  afectaInventario: boolean;

  // Unidad de medida
  unidadMedida: string;
  unidadMedidaCodigo: string;
  /** Unidad base + presentaciones válidas del producto (ver getProductUnitOptions). Vacío si el producto no tiene unidad configurada. */
  unidadesDisponibles: ProductUnitOption[];
  /**
   * Snapshot histórico del factor de conversión aplicado (presentación comercial → unidad
   * mínima), capturado una sola vez al confirmar la línea con las utilidades centrales de
   * `shared/inventory/unitConversion.ts` — nunca reconsultado si el producto cambia después.
   * Ausente en líneas históricas anteriores a este campo.
   */
  factorConversionAplicado?: number;

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
  /**
   * Cantidad documental inventariable, en unidad mínima — snapshot calculado una sola vez al
   * confirmar la línea (cantidad comercial documentada × factorConversionAplicado), nunca
   * recalculado ni incrementado/decrementado por deltas. Ausente en líneas no inventariables
   * (no aplica) y en líneas históricas anteriores a este campo — ver `mapeadorCCaNI.ts` y
   * `logica/reglasCompras.ts`.
   */
  cantidadDocumentadaInventariable?: number;

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
