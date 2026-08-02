// gastos/modelos/Gasto.ts
//
// Modelo del gasto operativo. Reutiliza tipos ya existentes de Compras
// (MonedaCompra, EventoHistorialCompras) en vez de duplicarlos — Gastos no
// tiene su propia unión de monedas ni su propio historial de auditoría.

import type { MonedaCompra } from '../../compras/modelos/tiposBaseCompras';
import type { EventoHistorialCompras } from '../../compras/modelos/EventoHistorialCompras';
import type { AdjuntoCompra, TipoAdjuntoCompra } from '../../compras/modelos/AdjuntoCompra';
import type { EstadoPago } from '../../compras/modelos/CuentaPorPagar';
import type { CreditScheduleTerms } from '@/shared/payments/paymentTerms';

export type EstadoDocumentoGasto = 'registrado' | 'anulado';

export const ESTADO_DOCUMENTO_GASTO_LABELS: Record<EstadoDocumentoGasto, string> = {
  registrado: 'Registrado',
  anulado: 'Anulado',
};

/**
 * Estado de pago — NUNCA se persiste como una segunda fuente de verdad: se
 * deriva siempre de la Cuenta por Pagar asociada, reutilizando la MISMA
 * función `recalcularEstadoPagoComprobante` que también usa `ComprobanteCompra`
 * (ver `servicios/servicioGasto.ts#resolverEstadoPagoGasto`) — por eso es
 * literalmente el mismo tipo `EstadoPago` del dominio general de CxP/Pagos
 * (`compras/modelos/CuentaPorPagar.ts`), nunca una unión paralela ni un
 * import físico de `ComprobanteCompra.ts`.
 */
export type EstadoPagoGasto = EstadoPago;

export const ESTADO_PAGO_GASTO_LABELS: Record<EstadoPagoGasto, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago parcial',
  pagado: 'Pagado',
};

/**
 * Tratamiento del impuesto — política, no monto (el desglose de monto
 * recuperable/no recuperable no está calculado en ningún punto del sistema
 * hoy; ver auditoría §16). `sin_desglose` es el caso de un gasto simple sin
 * línea de impuesto estructurada (ej. un recibo con un solo total).
 */
export type TratamientoImpuestoGasto = 'recuperable' | 'no_recuperable' | 'sin_desglose';

export const TRATAMIENTO_IMPUESTO_GASTO_LABELS: Record<TratamientoImpuestoGasto, string> = {
  recuperable: 'Impuesto recuperable',
  no_recuperable: 'Impuesto no recuperable',
  sin_desglose: 'Sin desglose de impuesto',
};

export interface Gasto {
  id: string;
  empresaId: string;
  /**
   * Referencia interna legible y estable (ej. "GTO-000001") — para búsqueda,
   * Drawer, impresión, Excel e historial. NUNCA una serie tributaria: no
   * existe una serie "GS" en Series de Comprobantes (SenciYo no emite el
   * comprobante del gasto). Generada una sola vez con la misma utilidad
   * genérica de numeración que ya usan los Pagos (`siguienteNumeroPago`,
   * adaptada al arreglo de gastos), nunca una cuarta implementación de
   * correlativos copiada.
   */
  referenciaInterna: string;
  /** Ausente = gasto general de la empresa (nunca prorrateado automáticamente entre establecimientos). */
  establecimientoId?: string;

  // Reconocimiento — la fecha que alimenta Rentabilidad Operativa, nunca la fecha de pago.
  fechaReconocimiento: string;
  /** Fecha del documento del proveedor, cuando existe. */
  fechaEmision?: string;
  /** Solo relevante cuando `condicionPago === 'credito'`. */
  fechaVencimiento?: string;

  categoriaId: string;
  concepto: string;

  // Proveedor o beneficiario — mismo catálogo de Clientes/Proveedores, nunca uno nuevo.
  proveedorId?: string;
  proveedorNombre?: string;
  proveedorNumeroDocumento?: string;
  /** Texto libre — solo cuando no hay `proveedorId` (movilidad, propinas, gastos sin documento). */
  beneficiario?: string;

  // Documento sustentatorio — reutiliza el mismo catálogo de tipos de documento de Compras.
  tipoDocumento?: string;
  serieDocumentoProveedor?: string;
  numeroDocumentoProveedor?: string;

  // Importes — fuente de verdad, nunca recalculados en JSX. subtotal/impuesto/total
  // son el resultado YA CALCULADO por `servicioImpuestoGasto.ts` en el momento del
  // registro (snapshot histórico, nunca recalculado con la tasa vigente después).
  moneda: MonedaCompra;
  tipoCambio?: number;
  subtotal: number;
  impuesto: number;
  total: number;
  tratamientoImpuesto: TratamientoImpuestoGasto;
  /** FK al `Tax` de Configuración usado para derivar impuesto/total — trazabilidad, ausente cuando `tratamientoImpuesto === 'sin_desglose'`. */
  impuestoId?: string;
  /** Tasa resuelta (fracción, ej. 0.18) AL MOMENTO del registro — snapshot histórico, nunca releído en vivo de la configuración actual para un gasto ya registrado. */
  tasaImpuesto?: number;

  // Condición y origen de la obligación.
  condicionPago: 'contado' | 'credito';
  /**
   * FK a `PaymentMethod.id` (Configuración de Negocio → Pagos → Formas de
   * pago) — la MISMA fuente que usa Compras para decidir si una forma de
   * pago es de crédito (`PaymentMethod.code === 'CREDITO'`) y para
   * hidratar su plantilla de cuotas configurada
   * (`PaymentMethod.creditSchedule`), vía `useCreditTermsConfigurator`
   * (`@/shared/payments/useCreditTermsConfigurator`). Solo relevante
   * cuando `condicionPago === 'credito'`.
   */
  formaPagoMetodoId?: string;
  /** Cronograma de cuotas cuando el crédito se pactó en más de una cuota — mismo motor y tipo que Compras (`@/shared/payments/paymentTerms`), nunca un cronograma paralelo. Ausente en contado o crédito de una sola cuota (vencimiento único). */
  creditTerms?: CreditScheduleTerms;
  /** Presente siempre que exista una Cuenta por Pagar asociada (contado y crédito) — ver servicioGasto. */
  cuentaPorPagarId?: string;
  /** Pagos (PagoCompra) aplicados a este gasto — mismo criterio que `ComprobanteCompra.pagosRelacionados`. */
  pagosRelacionados: string[];

  adjuntos: AdjuntoCompra[];
  observaciones?: string;

  // Estado documental — nunca 'borrador': un gasto nace ya reconocido.
  estadoDocumento: EstadoDocumentoGasto;
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;

  /** Presente cuando este gasto nació de la acción "Duplicar gasto" — trazabilidad, nunca genera un segundo reconocimiento del original. */
  gastoOrigenDuplicadoId?: string;

  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Tipos de adjunto propios de Gastos — reutiliza el componente de Compras (`AdjuntosCompra.tsx`) generalizándolo a este tipo, nunca un uploader nuevo. */
export type TipoAdjuntoGasto = Extract<TipoAdjuntoCompra, 'factura_proveedor' | 'voucher_pago' | 'otro'>;

export const TIPOS_ADJUNTO_GASTO: TipoAdjuntoGasto[] = ['factura_proveedor', 'voucher_pago', 'otro'];
