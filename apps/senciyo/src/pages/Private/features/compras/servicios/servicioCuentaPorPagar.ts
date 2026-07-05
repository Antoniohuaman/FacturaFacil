import type { CuentaPorPagar, CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import { generarCuotasDesdeCC, resolverFechaVencimientoCxP } from '../mapeadores/mapeadorCCaCuentaPorPagar';

const TOLERANCIA_DECIMAL = 0.01;

/**
 * Genera la Cuenta por Pagar de un comprobante de compra registrado. Todo CC
 * genera CxP, sea contado o crédito (ver Etapa 2.1): el saldo pendiente
 * inicia igual al total y el estado de pago inicia en 'pendiente'; el pago se
 * registra siempre de forma manual desde Cuentas por Pagar, nunca automático.
 */
export function generarCuentaPorPagar(cc: ComprobanteCompra, id: string): CuentaPorPagar {
  const fechaVencimiento = resolverFechaVencimientoCxP(cc);

  return {
    id,
    comprobanteCompraId: cc.id,
    comprobanteCompraNumero: `${cc.serieProveedor}-${cc.numeroProveedor}`,
    tipoComprobanteOrigen: cc.tipoComprobanteProveedor,
    proveedorId: cc.proveedorId,
    proveedorNombre: cc.proveedorNombre,
    proveedorNumeroDocumento: cc.proveedorNumeroDocumento,
    moneda: cc.moneda,
    tipoCambio: cc.tipoCambio,
    total: cc.totales.total,
    totalPagado: 0,
    saldoPendiente: cc.totales.total,
    formaPago: cc.formaPago,
    // La fecha de emisión de la CxP es la fecha real del comprobante del
    // proveedor, no la fecha en que se registró en SenciYo.
    fechaEmision: cc.fechaEmisionProveedor,
    fechaVencimiento,
    cuotas: generarCuotasDesdeCC(cc),
    estadoPago: 'pendiente',
    estadoVencimiento: calcularEstadoVencimiento(fechaVencimiento),
    pagosRelacionados: [],
    historial: [
      {
        fecha: cc.fechaRegistro,
        accion: 'Cuenta por pagar generada',
        detalle: `Desde comprobante ${cc.serieProveedor}-${cc.numeroProveedor}`,
      },
    ],
    fechaCreacion: cc.fechaRegistro,
    fechaActualizacion: cc.fechaRegistro,
  };
}

/**
 * Sincroniza la cuota única (Fase 1 no soporta fraccionamiento en varias
 * cuotas) con el total pagado/saldo de la CxP tras aplicar o revertir un pago.
 */
function sincronizarCuotaUnica(
  cuotas: CuotaCuentaPorPagar[] | undefined,
  totalPagado: number,
  saldoPendiente: number,
  estadoPago: CuentaPorPagar['estadoPago'],
): CuotaCuentaPorPagar[] | undefined {
  if (!cuotas || cuotas.length === 0) return cuotas;

  const [cuota] = cuotas;
  return [
    {
      ...cuota,
      montoPagado: Math.min(totalPagado, cuota.montoCuota),
      saldoPendiente: Math.max(0, saldoPendiente),
      estadoPago: estadoPago === 'pagada' ? 'pagada' : estadoPago === 'parcial' ? 'parcial' : 'pendiente',
      estadoVencimiento: calcularEstadoVencimiento(cuota.fechaVencimiento),
    },
  ];
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
): CuentaPorPagar {
  const nuevoTotalPagado = round2(cxp.totalPagado + montoAplicado);
  const nuevoSaldo = Math.max(0, round2(cxp.total - nuevoTotalPagado));
  const nuevoEstadoPago = recalcularEstadoCuentaPorPagar(cxp.total, nuevoTotalPagado);

  return {
    ...cxp,
    totalPagado: nuevoTotalPagado,
    saldoPendiente: nuevoSaldo,
    estadoPago: nuevoEstadoPago,
    cuotas: sincronizarCuotaUnica(cxp.cuotas, nuevoTotalPagado, nuevoSaldo, nuevoEstadoPago),
    pagosRelacionados: [...cxp.pagosRelacionados, pagoId],
    historial: [
      ...cxp.historial,
      { fecha: fechaPago, accion: 'Pago registrado', detalle: `Monto aplicado: ${montoAplicado.toFixed(2)}` },
    ],
    fechaActualizacion: fechaPago,
  };
}

export function revertirPagoDeCuentaPorPagar(
  cxp: CuentaPorPagar,
  montoRevertido: number,
  pagoId: string,
  fechaReversion: string,
): CuentaPorPagar {
  const nuevoTotalPagado = round2(Math.max(0, cxp.totalPagado - montoRevertido));
  const nuevoSaldo = round2(cxp.total - nuevoTotalPagado);
  const nuevoEstadoPago = recalcularEstadoCuentaPorPagar(cxp.total, nuevoTotalPagado);

  return {
    ...cxp,
    totalPagado: nuevoTotalPagado,
    saldoPendiente: nuevoSaldo,
    estadoPago: nuevoEstadoPago,
    cuotas: sincronizarCuotaUnica(cxp.cuotas, nuevoTotalPagado, nuevoSaldo, nuevoEstadoPago),
    pagosRelacionados: cxp.pagosRelacionados.filter((id) => id !== pagoId),
    historial: [
      ...cxp.historial,
      { fecha: fechaReversion, accion: 'Pago anulado', detalle: `Monto revertido: ${montoRevertido.toFixed(2)}` },
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

export function calcularEstadoVencimiento(
  fechaVencimiento: string | undefined,
  diasAviso = 7,
): CuentaPorPagar['estadoVencimiento'] {
  if (!fechaVencimiento) return 'vigente';
  const diffDias = diasHastaVencimiento(fechaVencimiento);
  if (diffDias < 0) return 'vencida';
  if (diffDias <= diasAviso) return 'por_vencer';
  return 'vigente';
}

function diasHastaVencimiento(fechaVencimiento: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);
  const diffMs = vence.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
