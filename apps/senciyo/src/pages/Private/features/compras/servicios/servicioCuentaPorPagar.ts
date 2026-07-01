import type { CuentaPorPagar } from '../modelos/CuentaPorPagar';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';

const TOLERANCIA_DECIMAL = 0.01;

export function generarCuentaPorPagar(cc: ComprobanteCompra, id: string): CuentaPorPagar {
  return {
    id,
    comprobanteCompraId: cc.id,
    comprobanteCompraNumero: `${cc.serieProveedor}-${cc.numeroProveedor}`,
    proveedorId: cc.proveedorId,
    proveedorNombre: cc.proveedorNombre,
    proveedorNumeroDocumento: cc.proveedorNumeroDocumento,
    moneda: cc.moneda,
    tipoCambio: cc.tipoCambio,
    total: cc.totales.total,
    totalPagado: 0,
    saldoPendiente: cc.totales.total,
    formaPago: cc.formaPago,
    fechaEmision: cc.fechaRegistro,
    fechaVencimiento: cc.fechaVencimiento,
    estadoPago: 'pendiente',
    estadoVencimiento: calcularEstadoVencimiento(cc.fechaVencimiento),
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

export function aplicarPagoACuentaPorPagar(
  cxp: CuentaPorPagar,
  montoAplicado: number,
  pagoId: string,
  fechaPago: string,
): CuentaPorPagar {
  const nuevoTotalPagado = round2(cxp.totalPagado + montoAplicado);
  const nuevoSaldo = round2(cxp.total - nuevoTotalPagado);

  let estadoPago: CuentaPorPagar['estadoPago'];
  if (nuevoSaldo <= TOLERANCIA_DECIMAL) {
    estadoPago = 'pagada';
  } else if (nuevoTotalPagado > 0) {
    estadoPago = 'parcial';
  } else {
    estadoPago = 'pendiente';
  }

  return {
    ...cxp,
    totalPagado: nuevoTotalPagado,
    saldoPendiente: Math.max(0, nuevoSaldo),
    estadoPago,
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

  let estadoPago: CuentaPorPagar['estadoPago'];
  if (nuevoTotalPagado <= 0) {
    estadoPago = 'pendiente';
  } else if (nuevoSaldo <= TOLERANCIA_DECIMAL) {
    estadoPago = 'pagada';
  } else {
    estadoPago = 'parcial';
  }

  return {
    ...cxp,
    totalPagado: nuevoTotalPagado,
    saldoPendiente: nuevoSaldo,
    estadoPago,
    pagosRelacionados: cxp.pagosRelacionados.filter((id) => id !== pagoId),
    historial: [
      ...cxp.historial,
      { fecha: fechaReversion, accion: 'Pago anulado', detalle: `Monto revertido: ${montoRevertido.toFixed(2)}` },
    ],
    fechaActualizacion: fechaReversion,
  };
}

export function calcularEstadoVencimiento(
  fechaVencimiento: string | undefined,
  diasAviso = 7,
): CuentaPorPagar['estadoVencimiento'] {
  if (!fechaVencimiento) return 'vigente';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVencimiento);
  vence.setHours(0, 0, 0, 0);
  const diffMs = vence.getTime() - hoy.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencida';
  if (diffDias <= diasAviso) return 'por_vencer';
  return 'vigente';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
