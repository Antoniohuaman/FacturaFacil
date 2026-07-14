import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';
import { round2 } from '../logica/reglasCompras';

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
  // La retención (ej. Recibo por Honorarios) reduce el neto realmente
  // pendiente de pago; las cuotas se escalan proporcionalmente para que su
  // suma siga siendo exactamente igual al total neto de la CxP (la última
  // cuota absorbe el remanente de redondeo).
  const montoRetencion = cc.totales.retencion ?? 0;
  const totalNeto = round2(cc.totales.total - montoRetencion);
  const factorNeto = cc.totales.total > 0 ? totalNeto / cc.totales.total : 1;

  if (cc.formaPago === 'credito' && cc.creditTerms && cc.creditTerms.schedule.length > 0) {
    const schedule = cc.creditTerms.schedule;
    let acumulado = 0;
    return schedule.map((cuota, index) => {
      const esUltima = index === schedule.length - 1;
      const importeNeto = esUltima ? round2(totalNeto - acumulado) : round2(cuota.importe * factorNeto);
      acumulado = round2(acumulado + importeNeto);
      return {
        id: `${cc.id}_cuota_${cuota.numeroCuota}`,
        numeroCuota: cuota.numeroCuota,
        fechaVencimiento: cuota.fechaVencimiento,
        montoCuota: importeNeto,
        montoPagado: 0,
        saldoPendiente: importeNeto,
        diasCredito: cuota.diasCredito,
        estadoPago: 'pendiente',
        estadoVencimiento: 'vigente',
      };
    });
  }

  const cuotaUnica: CuotaCuentaPorPagar = {
    id: `${cc.id}_cuota_1`,
    numeroCuota: 1,
    fechaVencimiento: resolverFechaVencimientoCxP(cc),
    montoCuota: totalNeto,
    montoPagado: 0,
    saldoPendiente: totalNeto,
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
  };

  return [cuotaUnica];
}
