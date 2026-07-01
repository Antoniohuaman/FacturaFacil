import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';

export function validarComprobanteCompraBasico(
  cc: Partial<ComprobanteCompra>,
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!cc.proveedorId) {
    errores.push({ campo: 'proveedorId', mensaje: 'El proveedor es obligatorio.' });
  }
  if (!cc.tipoComprobanteProveedor) {
    errores.push({ campo: 'tipoComprobanteProveedor', mensaje: 'El tipo de comprobante es obligatorio.' });
  }
  if (!cc.serieProveedor) {
    errores.push({ campo: 'serieProveedor', mensaje: 'La serie del comprobante es obligatoria.' });
  }
  if (!cc.numeroProveedor) {
    errores.push({ campo: 'numeroProveedor', mensaje: 'El número del comprobante es obligatorio.' });
  }
  if (!cc.fechaEmisionProveedor) {
    errores.push({ campo: 'fechaEmisionProveedor', mensaje: 'La fecha de emisión es obligatoria.' });
  }
  if (!cc.modalidadInventario) {
    errores.push({ campo: 'modalidadInventario', mensaje: 'La modalidad de inventario es obligatoria.' });
  }
  if (!cc.lineas || cc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  if (cc.formaPago === 'credito' && !cc.fechaVencimiento) {
    errores.push({ campo: 'fechaVencimiento', mensaje: 'La fecha de vencimiento es obligatoria para pago a crédito.' });
  }

  return errores;
}

export function puedeAnularCC(cc: ComprobanteCompra): boolean {
  return cc.estadoDocumento === 'registrado';
}

/** Genera una clave única para detectar comprobantes duplicados del mismo proveedor */
export function generarClaveUnicaCC(
  proveedorRuc: string,
  tipoComprobante: string,
  serie: string,
  numero: string,
): string {
  return `${proveedorRuc}|${tipoComprobante}|${serie}|${numero}`.toUpperCase();
}
