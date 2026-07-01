import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { CuotaCuentaPorPagar } from '../modelos/CuentaPorPagar';

export interface DatosCxPDesdeCC {
  comprobanteCompraId: string;
  comprobanteCompraNumero: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNumeroDocumento: string;
  moneda: ComprobanteCompra['moneda'];
  tipoCambio?: number;
  total: number;
  formaPago: ComprobanteCompra['formaPago'];
  fechaEmision: string;
  fechaVencimiento?: string;
  cuotasSugeridas?: CuotaCuentaPorPagar[];
}

export function extraerDatosCCParaCxP(cc: ComprobanteCompra): DatosCxPDesdeCC {
  return {
    comprobanteCompraId: cc.id,
    comprobanteCompraNumero: `${cc.serieProveedor}-${cc.numeroProveedor}`,
    proveedorId: cc.proveedorId,
    proveedorNombre: cc.proveedorNombre,
    proveedorNumeroDocumento: cc.proveedorNumeroDocumento,
    moneda: cc.moneda,
    tipoCambio: cc.tipoCambio,
    total: cc.totales.total,
    formaPago: cc.formaPago,
    fechaEmision: cc.fechaRegistro,
    fechaVencimiento: cc.fechaVencimiento,
    cuotasSugeridas: generarCuotasDesdeCC(cc),
  };
}

export function generarCuotasDesdeCC(cc: ComprobanteCompra): CuotaCuentaPorPagar[] {
  if (cc.formaPago === 'contado' || !cc.fechaVencimiento) {
    return [];
  }

  const cuotaUnica: CuotaCuentaPorPagar = {
    id: `${cc.id}_cuota_1`,
    numeroCuota: 1,
    fechaVencimiento: cc.fechaVencimiento,
    montoCuota: cc.totales.total,
    montoPagado: 0,
    saldoPendiente: cc.totales.total,
    estadoPago: 'pendiente',
    estadoVencimiento: 'vigente',
  };

  return [cuotaUnica];
}
