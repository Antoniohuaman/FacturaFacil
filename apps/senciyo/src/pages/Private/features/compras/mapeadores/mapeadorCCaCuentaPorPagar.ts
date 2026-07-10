import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';

/**
 * Resuelve la fecha de vencimiento de la CxP generada por un comprobante de
 * compra. Todo comprobante genera CxP (contado o crédito, ver Etapa 2.1): si
 * no trae fecha de vencimiento propia (caso típico de contado), se usa la
 * fecha de emisión del documento del proveedor como vencimiento.
 */
export function resolverFechaVencimientoCxP(cc: ComprobanteCompra): string {
  return cc.fechaVencimiento || cc.fechaEmisionProveedor || cc.fechaRegistro;
}

/**
 * Genera el cronograma de cuotas de la CxP a partir del comprobante de compra.
 * Si el CC es a crédito y trae un cronograma real configurado (creditTerms,
 * mismo configurador/modal reutilizado de Documentos Comerciales), se genera
 * una cuota por cada cuota del cronograma. En cualquier otro caso (contado o
 * crédito sin cronograma configurado) se genera una cuota única con el total.
 */
export function generarCuotasDesdeCC(cc: ComprobanteCompra): CuotaCuentaPorPagar[] {
  if (cc.formaPago === 'credito' && cc.creditTerms && cc.creditTerms.schedule.length > 0) {
    return cc.creditTerms.schedule.map((cuota) => ({
      id: `${cc.id}_cuota_${cuota.numeroCuota}`,
      numeroCuota: cuota.numeroCuota,
      fechaVencimiento: cuota.fechaVencimiento,
      montoCuota: cuota.importe,
      montoPagado: 0,
      saldoPendiente: cuota.importe,
      diasCredito: cuota.diasCredito,
      estadoPago: 'pendiente',
      estadoVencimiento: 'vigente',
    }));
  }

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
