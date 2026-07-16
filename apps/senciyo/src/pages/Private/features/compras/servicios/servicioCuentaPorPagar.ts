import type { CuentaPorPagar, CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import { generarCuotasDesdeCC, resolverFechaVencimientoCxP } from '../mapeadores/mapeadorCCaCuentaPorPagar';
import { round2 } from '../logica/reglasCompras';
import { assertBusinessDate, ensureBusinessDateIso, getBusinessTodayISODate } from '@/shared/time/businessTime';

const TOLERANCIA_DECIMAL = 0.01;

/** Umbral (días) a partir del cual una cuenta por vencer se marca "Por vencer". Única fuente — no dispersar este número en componentes. */
export const UMBRAL_DIAS_POR_VENCER_CXP = 7;

/**
 * Genera la Cuenta por Pagar de un comprobante de compra registrado. Todo CC
 * genera CxP, sea contado o crédito (ver Etapa 2.1): el saldo pendiente
 * inicia igual al total y el estado de pago inicia en 'pendiente'; el pago se
 * registra siempre de forma manual desde Cuentas por Pagar, nunca automático.
 */
export function generarCuentaPorPagar(cc: ComprobanteCompra, id: string): CuentaPorPagar {
  const fechaVencimiento = resolverFechaVencimientoCxP(cc);
  // La retención (si el CC la registró, ej. Recibo por Honorarios) reduce el
  // neto realmente pendiente de pago — la CxP nunca gestiona el bruto.
  const montoRetencion = cc.totales.retencion ?? 0;
  const totalNeto = round2(cc.totales.total - montoRetencion);

  return {
    id,
    comprobanteCompraId: cc.id,
    comprobanteCompraNumero: `${cc.serieProveedor ?? ''}-${cc.numeroProveedor ?? ''}`,
    tipoComprobanteOrigen: cc.tipoComprobanteProveedor ?? '',
    proveedorId: cc.proveedorId,
    proveedorNombre: cc.proveedorNombre,
    proveedorNumeroDocumento: cc.proveedorNumeroDocumento,
    moneda: cc.moneda,
    tipoCambio: cc.tipoCambio,
    total: totalNeto,
    totalPagado: 0,
    saldoPendiente: totalNeto,
    formaPago: cc.formaPago,
    formaPagoMetodoId: cc.formaPagoMetodoId,
    // La fecha de emisión de la CxP es la fecha real del comprobante del
    // proveedor, no la fecha en que se registró en SenciYo.
    fechaEmision: cc.fechaEmisionProveedor ?? cc.fechaRegistro,
    fechaVencimiento,
    cuotas: generarCuotasDesdeCC(cc),
    estadoPago: 'pendiente',
    estadoVencimiento: calcularEstadoVencimiento(fechaVencimiento, totalNeto),
    pagosRelacionados: [],
    historial: [
      {
        fecha: cc.fechaRegistro,
        accion: 'Cuenta por pagar generada',
        detalle: `Desde comprobante ${cc.serieProveedor ?? ''}-${cc.numeroProveedor ?? ''}`,
      },
    ],
    fechaCreacion: cc.fechaRegistro,
    fechaActualizacion: cc.fechaRegistro,
  };
}

/**
 * Resincroniza una CxP EXISTENTE cuando su CC origen se edita antes de
 * cualquier pago (mismo `id`, nunca genera una segunda CxP — a diferencia de
 * `generarCuentaPorPagar`, que solo se usa para un CC nuevo). El llamador es
 * responsable de verificar que la CxP no tenga pagos aplicados
 * (`cxp.totalPagado === 0` / `cc.estadoPago === 'pendiente'`) antes de
 * invocar esta función.
 */
export function resincronizarCuentaPorPagar(
  cxp: CuentaPorPagar,
  cc: ComprobanteCompra,
  fecha: string,
): CuentaPorPagar {
  const fechaVencimiento = resolverFechaVencimientoCxP(cc);
  const montoRetencion = cc.totales.retencion ?? 0;
  const totalNeto = round2(cc.totales.total - montoRetencion);

  return {
    ...cxp,
    comprobanteCompraNumero: `${cc.serieProveedor ?? ''}-${cc.numeroProveedor ?? ''}`,
    tipoComprobanteOrigen: cc.tipoComprobanteProveedor ?? '',
    proveedorId: cc.proveedorId,
    proveedorNombre: cc.proveedorNombre,
    proveedorNumeroDocumento: cc.proveedorNumeroDocumento,
    moneda: cc.moneda,
    tipoCambio: cc.tipoCambio,
    total: totalNeto,
    totalPagado: 0,
    saldoPendiente: totalNeto,
    formaPago: cc.formaPago,
    formaPagoMetodoId: cc.formaPagoMetodoId,
    fechaEmision: cc.fechaEmisionProveedor ?? cc.fechaRegistro,
    fechaVencimiento,
    cuotas: generarCuotasDesdeCC(cc),
    estadoVencimiento: calcularEstadoVencimiento(fechaVencimiento, totalNeto),
    historial: [
      ...cxp.historial,
      {
        fecha,
        accion: 'Cuenta por pagar resincronizada',
        detalle: `Por edición del comprobante ${cc.serieProveedor ?? ''}-${cc.numeroProveedor ?? ''}`,
      },
    ],
    fechaActualizacion: fecha,
  };
}

/**
 * Sincroniza las cuotas de la CxP con el total pagado/saldo tras aplicar o
 * revertir un pago SIN asignación explícita por cuota (contado, o datos
 * heredados sin cronograma seleccionable). El monto pagado se distribuye
 * entre las cuotas en orden de número de cuota (la más antigua primero),
 * recalculando siempre desde el total pagado acumulado — por eso es
 * idempotente sin importar cuántas veces se aplique o revierta un pago. Con
 * una sola cuota (el caso más común) el resultado es idéntico al de antes de
 * soportar cuotas reales.
 *
 * Cuando el pago sí trae asignación explícita por cuota (el usuario
 * seleccionó exactamente qué cuota(s) pagar desde Registrar Pago), se usa en
 * su lugar `aplicarAsignacionesACuotas`, que respeta esa selección en vez de
 * redistribuir de la más antigua a la más nueva.
 */
function sincronizarCuotas(
  cuotas: CuotaCuentaPorPagar[] | undefined,
  totalPagado: number,
): CuotaCuentaPorPagar[] | undefined {
  if (!cuotas || cuotas.length === 0) return cuotas;

  let restante = Math.max(0, totalPagado);
  return [...cuotas]
    .sort((a, b) => a.numeroCuota - b.numeroCuota)
    .map((cuota) => {
      const pagoEnCuota = round2(Math.min(restante, cuota.montoCuota));
      restante = round2(restante - pagoEnCuota);
      const saldo = round2(Math.max(0, cuota.montoCuota - pagoEnCuota));
      return {
        ...cuota,
        montoPagado: pagoEnCuota,
        saldoPendiente: saldo,
        estadoPago: saldo <= TOLERANCIA_DECIMAL ? 'pagada' : pagoEnCuota > 0 ? 'parcial' : 'pendiente',
        estadoVencimiento: calcularEstadoVencimiento(cuota.fechaVencimiento, saldo),
      };
    });
}

/**
 * Aplica (direccion=1) o revierte (direccion=-1) montos exactos por cuota,
 * según lo que el usuario seleccionó en Registrar Pago — a diferencia de
 * `sincronizarCuotas`, no redistribuye: cada asignación afecta únicamente la
 * cuota `cuotaId` indicada, con el monto acotado a su propio importe/saldo.
 */
function aplicarAsignacionesACuotas(
  cuotas: CuotaCuentaPorPagar[],
  asignaciones: Array<{ cuotaId: string; monto: number }>,
  direccion: 1 | -1,
): CuotaCuentaPorPagar[] {
  const montosPorCuota = new Map(asignaciones.map((a) => [a.cuotaId, a.monto]));
  return cuotas.map((cuota) => {
    const monto = montosPorCuota.get(cuota.id);
    if (monto === undefined) return cuota;
    const nuevoMontoPagado = round2(
      Math.max(0, Math.min(cuota.montoCuota, cuota.montoPagado + direccion * monto)),
    );
    const saldo = round2(Math.max(0, cuota.montoCuota - nuevoMontoPagado));
    return {
      ...cuota,
      montoPagado: nuevoMontoPagado,
      saldoPendiente: saldo,
      estadoPago: saldo <= TOLERANCIA_DECIMAL ? 'pagada' : nuevoMontoPagado > 0 ? 'parcial' : 'pendiente',
      estadoVencimiento: calcularEstadoVencimiento(cuota.fechaVencimiento, saldo),
    };
  });
}

/** Deriva el estadoPago de una CxP a partir de su total y lo efectivamente pagado. */
export function recalcularEstadoCuentaPorPagar(
  total: number,
  totalPagado: number,
): CuentaPorPagar['estadoPago'] {
  if (totalPagado <= 0) return 'pendiente';
  const saldo = round2(total - totalPagado);
  if (saldo <= TOLERANCIA_DECIMAL) return 'pagada';
  return 'parcial';
}

export function aplicarPagoACuentaPorPagar(
  cxp: CuentaPorPagar,
  montoAplicado: number,
  pagoId: string,
  fechaPago: string,
  usuario?: string,
  asignaciones?: Array<{ cuotaId: string; monto: number }>,
): CuentaPorPagar {
  const usaAsignacionesExactas = !!asignaciones?.length && !!cxp.cuotas?.length;
  const nuevasCuotas = usaAsignacionesExactas
    ? aplicarAsignacionesACuotas(cxp.cuotas!, asignaciones!, 1)
    : sincronizarCuotas(cxp.cuotas, round2(cxp.totalPagado + montoAplicado));
  const nuevoTotalPagado = usaAsignacionesExactas
    ? round2((nuevasCuotas ?? []).reduce((acumulado, cuota) => acumulado + cuota.montoPagado, 0))
    : round2(cxp.totalPagado + montoAplicado);
  const nuevoSaldo = Math.max(0, round2(cxp.total - nuevoTotalPagado));
  const nuevoEstadoPago = recalcularEstadoCuentaPorPagar(cxp.total, nuevoTotalPagado);

  return {
    ...cxp,
    totalPagado: nuevoTotalPagado,
    saldoPendiente: nuevoSaldo,
    estadoPago: nuevoEstadoPago,
    estadoVencimiento: calcularEstadoVencimiento(cxp.fechaVencimiento, nuevoSaldo),
    cuotas: nuevasCuotas,
    pagosRelacionados: [...cxp.pagosRelacionados, pagoId],
    historial: [
      ...cxp.historial,
      {
        fecha: fechaPago,
        usuario,
        accion: 'Pago registrado',
        detalle: `Monto aplicado: ${montoAplicado.toFixed(2)}`,
      },
    ],
    fechaActualizacion: fechaPago,
  };
}

export function revertirPagoDeCuentaPorPagar(
  cxp: CuentaPorPagar,
  montoRevertido: number,
  pagoId: string,
  fechaReversion: string,
  usuario?: string,
  asignaciones?: Array<{ cuotaId: string; monto: number }>,
): CuentaPorPagar {
  const usaAsignacionesExactas = !!asignaciones?.length && !!cxp.cuotas?.length;
  const nuevasCuotas = usaAsignacionesExactas
    ? aplicarAsignacionesACuotas(cxp.cuotas!, asignaciones!, -1)
    : sincronizarCuotas(cxp.cuotas, round2(Math.max(0, cxp.totalPagado - montoRevertido)));
  const nuevoTotalPagado = usaAsignacionesExactas
    ? round2((nuevasCuotas ?? []).reduce((acumulado, cuota) => acumulado + cuota.montoPagado, 0))
    : round2(Math.max(0, cxp.totalPagado - montoRevertido));
  const nuevoSaldo = Math.max(0, round2(cxp.total - nuevoTotalPagado));
  const nuevoEstadoPago = recalcularEstadoCuentaPorPagar(cxp.total, nuevoTotalPagado);

  return {
    ...cxp,
    totalPagado: nuevoTotalPagado,
    saldoPendiente: nuevoSaldo,
    estadoPago: nuevoEstadoPago,
    estadoVencimiento: calcularEstadoVencimiento(cxp.fechaVencimiento, nuevoSaldo),
    cuotas: nuevasCuotas,
    // El pago anulado se conserva en pagosRelacionados (historial/documentos
    // relacionados); deja de contar como activo por su propio
    // estadoDocumento, no por ausencia aquí.
    historial: [
      ...cxp.historial,
      {
        fecha: fechaReversion,
        usuario,
        accion: 'Pago anulado',
        detalle: `Pago ${pagoId} — monto revertido: ${montoRevertido.toFixed(2)}`,
      },
    ],
    fechaActualizacion: fechaReversion,
  };
}

/** Anula la CxP como consecuencia de la anulación de su comprobante de compra origen. */
export function anularCuentaPorPagarPorComprobante(
  cxp: CuentaPorPagar,
  motivo: string,
  fecha: string,
): CuentaPorPagar {
  return {
    ...cxp,
    estadoPago: 'anulada',
    historial: [
      ...cxp.historial,
      { fecha, accion: 'CxP anulada por comprobante anulado', detalle: motivo },
    ],
    fechaActualizacion: fecha,
  };
}

/**
 * Deriva el estado de vencimiento real: una cuenta sin saldo pendiente ya no
 * tiene deuda que vencer (nunca "Vencida"/"Por vencer" tras quedar pagada),
 * y el día exacto del vencimiento se distingue de "Vencida" ("Vence hoy").
 */
export function calcularEstadoVencimiento(
  fechaVencimiento: string | undefined,
  saldoPendiente: number,
  diasAviso = UMBRAL_DIAS_POR_VENCER_CXP,
): CuentaPorPagar['estadoVencimiento'] {
  if (!fechaVencimiento) return 'vigente';
  if (saldoPendiente <= TOLERANCIA_DECIMAL) return 'vigente';
  const diffDias = diasHastaVencimiento(fechaVencimiento);
  if (diffDias < 0) return 'vencida';
  if (diffDias === 0) return 'vence_hoy';
  if (diffDias <= diasAviso) return 'por_vencer';
  return 'vigente';
}

/**
 * Días calendario entre hoy y el vencimiento, en la hora de negocio oficial
 * (America/Lima, `@/shared/time/businessTime`) — nunca `new Date(string)` +
 * `setHours` local: un string "YYYY-MM-DD" se interpreta como medianoche
 * UTC, que en Lima (UTC-5) cae en el día calendario ANTERIOR, adelantando
 * por error una fecha de vencimiento "hoy" a "vencida". Ambos extremos se
 * normalizan al inicio de su día de negocio para que la resta sea siempre un
 * múltiplo exacto de un día. `fechaVencimiento` puede venir como fecha corta
 * o como timestamp completo heredado (`ensureBusinessDateIso` normaliza
 * cualquiera de los dos a la fecha de negocio real, sin fabricar datos).
 */
function diasHastaVencimiento(fechaVencimiento: string): number {
  const vence = assertBusinessDate(ensureBusinessDateIso(fechaVencimiento), 'start');
  const hoy = assertBusinessDate(getBusinessTodayISODate(), 'start');
  const diffMs = vence.getTime() - hoy.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Días de atraso respecto a la fecha de vencimiento (0 si aún no vence o no tiene vencimiento). */
export function calcularDiasVencidos(fechaVencimiento: string | undefined): number {
  if (!fechaVencimiento) return 0;
  return Math.max(0, -diasHastaVencimiento(fechaVencimiento));
}

/** Días de crédito reales (fechaVencimiento - fechaEmision) si ambas fechas existen. */
export function calcularDiasCredito(
  fechaEmision: string | undefined,
  fechaVencimiento: string | undefined,
): number | undefined {
  if (!fechaEmision || !fechaVencimiento) return undefined;
  const emision = new Date(fechaEmision);
  emision.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);
  const diffMs = vencimiento.getTime() - emision.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

