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
import { BADGE_ESTADO_DOCUMENTO_REGISTRABLE } from '@/shared/status/estadoDocumento';

/**
 * `borrador` — guardado sin numeración oficial ni efecto financiero
 * (§4 de la corrección): no consume serie/correlativo, no genera CxP/Pago,
 * no afecta Caja ni Rentabilidad. Se convierte en `registrado` recién al
 * ejecutar "Registrar gasto"/"Registrar y pagar" — nunca antes.
 */
export type EstadoDocumentoGasto = 'borrador' | 'registrado' | 'anulado';

export const ESTADO_DOCUMENTO_GASTO_LABELS: Record<EstadoDocumentoGasto, string> = {
  borrador: 'Borrador',
  registrado: 'Registrado',
  anulado: 'Anulado',
};

/** 'borrador' es propio del Gasto; 'registrado'/'anulado' delegan en el badge transversal (`shared/status/estadoDocumento.ts`) — mismo patrón que `BADGE_ESTADO_DOCUMENTO_CC` en Compras, nunca un color paralelo. */
export const BADGE_ESTADO_DOCUMENTO_GASTO: Record<EstadoDocumentoGasto, string> = {
  borrador: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  ...BADGE_ESTADO_DOCUMENTO_REGISTRABLE,
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
   * Referencia interna definitiva (ej. "G001-00000005") — para búsqueda,
   * Drawer, impresión, Excel e historial. Se resuelve desde el catálogo
   * central de Series (tipo documental "Gasto", código "GTO"), NUNCA
   * inventada localmente: ver `serieId` y `getNextExpenseDocument`
   * (`@/shared/series/expenseSeries`). Un borrador sin registrar todavía
   * lleva un identificador técnico interno (`referenciaTecnicaBorradorGasto`),
   * nunca presentado al usuario (ver `presentarReferenciaGasto`).
   */
  referenciaInterna: string;
  /**
   * FK a la `Series` (Configuración → Series, tipo documental "Gasto")
   * elegida por el usuario en el formulario. Un borrador puede llevarla
   * como simple selección (sin consumir su correlativo); un gasto
   * registrado la conserva como la serie DEFINITIVA que ya reservó su
   * correlativo — nunca se cambia después de registrado.
   */
  serieId?: string;
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
  /**
   * Señal ESTRUCTURADA de por qué `estadoDocumento` llegó a 'anulado'
   * (corrección técnica final §12) — nunca se distingue un borrador
   * descartado de un gasto genuinamente anulado comparando el TEXTO de
   * `motivoAnulacion` contra `MOTIVO_DESCARTE_BORRADOR_GASTO` (frágil: un
   * usuario podría escribir ese mismo texto como motivo real). Ausente en
   * gastos existentes anulados/descartados ANTES de esta corrección —
   * `esBorradorDescartadoGasto` conserva el criterio de texto SOLO como
   * respaldo de compatibilidad para esos registros históricos, nunca para
   * los nuevos.
   */
  tipoCierre?: 'descarte_borrador' | 'anulacion';

  /** Presente cuando este gasto nació de la acción "Duplicar gasto" — trazabilidad, nunca genera un segundo reconocimiento del original. */
  gastoOrigenDuplicadoId?: string;

  /**
   * Clave de idempotencia del COMANDO "Registrar gasto" (sin pago) o de la
   * conversión borrador→registrado (§13 de la corrección final) — un
   * reintento con la MISMA clave nunca crea un segundo gasto, una segunda
   * CxP ni consume el correlativo dos veces (ver
   * `buscarGastoPorClaveIdempotencia` en `servicioGasto.ts`). Generalización
   * aditiva, ausente en gastos existentes y en "Registrar y pagar" (que ya
   * tiene su propia clave persistida en el `PagoCompra`, ver
   * `PagoCompra.claveIdempotencia`).
   */
  claveIdempotencia?: string;

  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Tipos de adjunto propios de Gastos — reutiliza el componente de Compras (`AdjuntosCompra.tsx`) generalizándolo a este tipo, nunca un uploader nuevo. */
export type TipoAdjuntoGasto = Extract<TipoAdjuntoCompra, 'factura_proveedor' | 'voucher_pago' | 'otro'>;

export const TIPOS_ADJUNTO_GASTO: TipoAdjuntoGasto[] = ['factura_proveedor', 'voucher_pago', 'otro'];
