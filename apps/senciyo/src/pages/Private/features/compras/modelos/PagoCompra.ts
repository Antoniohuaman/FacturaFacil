import type { MonedaCompra } from './tiposBaseCompras';
import type { AdjuntoCompra } from './AdjuntoCompra';
import type { EventoHistorialCompras } from './EventoHistorialCompras';

export type EstadoDocumentoPago = 'registrado' | 'anulado';

export const ESTADO_DOCUMENTO_PAGO_LABELS: Record<EstadoDocumentoPago, string> = {
  registrado: 'Registrado',
  anulado: 'Anulado',
};

export interface MedioPagoCompra {
  id: string;
  medioPagoCodigo: string;
  medioPagoNombre: string;
  monto: number;
  moneda?: MonedaCompra;
  tipoCambio?: number;
  cajaId?: string;
  cuentaBancariaId?: string;
  referenciaOperacion?: string;
  fechaOperacion?: string;
}

/** Cuota específica dentro de una CxP con cronograma real que recibió parte del pago. */
export interface AsignacionCuotaPago {
  cuotaId: string;
  monto: number;
}

/**
 * Una de las Cuentas por Pagar a las que se aplicó un Pago, y cuánto
 * exactamente recibió (1 Pago → 1 Proveedor → 1 Moneda → N aplicaciones).
 * `comprobanteCompraId` se guarda junto al FK de la CxP por el mismo motivo
 * que `PagoCompra.comprobantesCompraAplicados` ya lo hacía: evita un join
 * adicional para resolver el comprobante de compra al mostrar el detalle.
 */
export interface AplicacionPagoCompra {
  cuentaPorPagarId: string;
  comprobanteCompraId: string;
  importeAplicado: number;
  /** Asignación exacta por cuota DENTRO de esta CxP (cronograma real de crédito) — ausente si esta CxP no tiene cuotas propias o se aplicó de forma agregada. */
  asignacionesCuotas?: AsignacionCuotaPago[];
}

export interface PagoCompra {
  id: string;
  numeroPago: string;

  // Fechas
  fechaPago: string;

  // Proveedor
  proveedorId: string;
  proveedorNombre: string;

  // Financiero
  moneda: MonedaCompra;
  tipoCambio?: number;
  /** Única fuente del total: siempre round2(suma de aplicaciones[].importeAplicado) — nunca un valor independiente que pueda desincronizarse. */
  montoTotalPagado: number;

  // Medios de pago (múltiples medios en un mismo pago)
  mediosPago: MedioPagoCompra[];

  /**
   * Fuente de verdad de a qué Cuentas por Pagar se aplicó este pago y por
   * cuánto exactamente cada una — un pago puede tener una o varias
   * aplicaciones, siempre del mismo proveedor y la misma moneda (nunca dos
   * pagos PG distintos para un solo pago real). Pagos registrados ANTES de
   * esta versión no tienen este campo (`undefined`): ver
   * `obtenerAplicacionesPago` en `logica/reglasCompras.ts`, que sintetiza la
   * aplicación única equivalente a partir de los campos legacy de abajo
   * cuando está ausente — todo el código que necesita "las aplicaciones de
   * este pago" pasa por esa función, nunca lee `aplicaciones` directamente.
   */
  aplicaciones?: AplicacionPagoCompra[];

  /**
   * CxP/comprobantes aplicados — derivados de `aplicaciones` en los pagos
   * nuevos (mismo arreglo que `aplicaciones.map(a => a.cuentaPorPagarId)` /
   * `.comprobanteCompraId`, nunca una segunda fuente independiente). En
   * pagos legacy (sin `aplicaciones`) siguen siendo la fuente original de un
   * único elemento — se mantienen por compatibilidad de lectura con todo el
   * código existente que ya resuelve relaciones a través de ellos
   * (`obtenerCxPDePago`, `obtenerComprobanteDePago`, drawers de CC/CxP).
   */
  cuentasPorPagarAplicadas: string[];
  comprobantesCompraAplicados: string[];

  /**
   * LEGACY: asignación exacta por cuota, únicamente para pagos registrados
   * ANTES de soportar múltiples documentos (siempre tenían una sola CxP). Los
   * pagos NUEVOS guardan su asignación por cuota dentro de cada elemento de
   * `aplicaciones[].asignacionesCuotas`, nunca aquí.
   */
  asignacionesCuotas?: AsignacionCuotaPago[];

  // Caja / Cuenta bancaria principal
  cajaId?: string;
  cuentaBancariaId?: string;

  // Sustento del pago
  documentoSustentoTipo?: string;
  documentoSustentoSerie?: string;
  documentoSustentoNumero?: string;

  // Notas
  concepto?: string;
  observaciones?: string;
  adjuntos?: AdjuntoCompra[];

  // Estado
  estadoDocumento: EstadoDocumentoPago;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
}
