import type { MonedaCompra } from './tiposBaseCompras';
import type { EventoHistorialCompras } from './EventoHistorialCompras';

export type EstadoPagoCxP = 'pendiente' | 'parcial' | 'pagada' | 'anulada';
export type EstadoVencimientoCxP = 'vigente' | 'por_vencer' | 'vence_hoy' | 'vencida';

/**
 * Estado de pago DERIVADO de un documento (ComprobanteCompra o Gasto) a
 * partir del `EstadoPagoCxP` de su Cuenta por Pagar — transversal a Compras
 * y Gastos, por lo que vive aquí (dominio general de CxP/Pagos) y no en
 * `ComprobanteCompra.ts`. `ComprobanteCompra.ts` reexporta este mismo tipo
 * como `EstadoPagoCC` por compatibilidad con el código existente; nunca
 * declarar una segunda unión paralela.
 */
export type EstadoPago = 'pendiente' | 'parcial' | 'pagado';

export const ESTADO_PAGO_CXP_LABELS: Record<EstadoPagoCxP, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

export const ESTADO_VENCIMIENTO_CXP_LABELS: Record<EstadoVencimientoCxP, string> = {
  vigente: 'Vigente',
  por_vencer: 'Por vencer',
  vence_hoy: 'Vence hoy',
  vencida: 'Vencida',
};

export interface CuotaCuentaPorPagar {
  id: string;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCuota: number;
  montoPagado: number;
  saldoPendiente: number;
  diasCredito?: number;
  estadoPago: 'pendiente' | 'parcial' | 'pagada';
  estadoVencimiento: EstadoVencimientoCxP;
}

/**
 * Origen documental de una Cuenta por Pagar — generalización aditiva (nunca
 * una segunda CxP paralela) para que Gastos reutilice el mismo motor de
 * aplicar/revertir pago sin acoplarse a `ComprobanteCompra`. Ausente en
 * registros persistidos ANTES de esta generalización: se normaliza a
 * `'compra'` al leer (ver `repositorios/repositorioCuentasPorPagar.ts`),
 * nunca se asume en el resto del código sin pasar por esa normalización.
 */
export type TipoOrigenCxP = 'compra' | 'gasto';

export interface CuentaPorPagar {
  id: string;

  // Origen — `tipoOrigen`/`documentoOrigenId` son la fuente canónica y
  // genérica; `comprobanteCompraId`/`comprobanteCompraNumero`/
  // `tipoComprobanteOrigen` se conservan SOLO para `tipoOrigen === 'compra'`
  // (compatibilidad con todo el código y las pruebas existentes de Compras
  // — nunca una segunda fuente independiente: `documentoOrigenId` siempre
  // espeja `comprobanteCompraId` cuando el origen es 'compra'). Para
  // `tipoOrigen === 'gasto'` quedan como cadena vacía — ningún consumidor de
  // Compras debe leerlos sin filtrar antes por `tipoOrigen === 'compra'`.
  tipoOrigen: TipoOrigenCxP;
  documentoOrigenId: string;
  comprobanteCompraId: string;
  comprobanteCompraNumero: string;
  tipoComprobanteOrigen: string;

  // Proveedor
  proveedorId: string;
  proveedorNombre: string;
  proveedorNumeroDocumento: string;

  // Financiero
  moneda: MonedaCompra;
  tipoCambio?: number;
  total: number;
  totalPagado: number;
  saldoPendiente: number;

  // Condiciones
  formaPago: 'contado' | 'credito';
  formaPagoMetodoId?: string;
  fechaEmision: string;
  fechaVencimiento?: string;
  cuotas?: CuotaCuentaPorPagar[];

  // Estados
  estadoPago: EstadoPagoCxP;
  estadoVencimiento: EstadoVencimientoCxP;

  // Relaciones
  pagosRelacionados: string[];

  // Auditoría
  historial: EventoHistorialCompras[];
  observaciones?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}
