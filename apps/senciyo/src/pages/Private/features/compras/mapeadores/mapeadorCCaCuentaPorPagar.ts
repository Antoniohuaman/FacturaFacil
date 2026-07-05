import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';

/**
 * Resuelve la fecha de vencimiento de la CxP generada por un comprobante de
 * compra. Todo comprobante genera CxP (contado o crédito, ver Etapa 2.1): si
 * no trae fecha de vencimiento propia (caso típico de contado), se usa la
 * fecha de emisión del documento del proveedor como vencimiento.
 */
export function resolverFechaVencimientoCxP(cc: ComprobanteCompra): string {
  return cc.fechaVencimiento || cc.fechaEmisionProveedor;
}

/**
 * Genera el cronograma de cuotas de la CxP a partir del comprobante de compra.
 * Fase 1 solo soporta una cuota única (el total a la fecha de vencimiento);
 * el fraccionamiento en múltiples cuotas queda para una fase posterior.
 */
export function generarCuotasDesdeCC(cc: ComprobanteCompra): CuotaCuentaPorPagar[] {
  const cuotaUnica: CuotaCuentaPorPagar = {
    id: `${cc.id}_cuota_1`,
    numeroCuota: 1,
    fechaVencimiento: resolverFechaVencimientoCxP(cc),
    montoCuota: cc.totales.total,
    montoPagado: 0,
    saldoPendiente: cc.totales.total,
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
  };

  return [cuotaUnica];
}
