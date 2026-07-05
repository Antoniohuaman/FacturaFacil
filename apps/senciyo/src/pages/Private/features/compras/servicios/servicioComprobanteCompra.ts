import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';
import { validarFechaVencimientoCredito, validarLineasCompra } from '../logica/reglasCompras';

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
  if (!cc.moneda) {
    errores.push({ campo: 'moneda', mensaje: 'La moneda es obligatoria.' });
  }
  if (!cc.formaPago) {
    errores.push({ campo: 'formaPago', mensaje: 'La forma de pago es obligatoria.' });
  } else {
    errores.push(
      ...validarFechaVencimientoCredito(cc.formaPago, cc.fechaEmisionProveedor, cc.fechaVencimiento),
    );
  }
  if (!cc.modalidadInventario) {
    errores.push({ campo: 'modalidadInventario', mensaje: 'La modalidad de inventario es obligatoria.' });
  }
  if (!cc.lineas || cc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  if (cc.lineas) {
    errores.push(...validarLineasCompra(cc.lineas));
  }

  return errores;
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

/**
 * Verifica si ya existe un comprobante de compra registrado con la misma
 * combinación proveedor + tipo + serie + número. Por defecto, un comprobante
 * anulado sigue bloqueando el número (no se reutiliza), ya que el modelo
 * actual no define una política segura de reutilización de numeración anulada.
 */
export function validarComprobanteCompraDuplicado(
  comprobantes: ComprobanteCompra[],
  datos: Pick<
    ComprobanteCompra,
    'proveedorNumeroDocumento' | 'tipoComprobanteProveedor' | 'serieProveedor' | 'numeroProveedor'
  >,
): boolean {
  const claveNueva = generarClaveUnicaCC(
    datos.proveedorNumeroDocumento,
    datos.tipoComprobanteProveedor,
    datos.serieProveedor,
    datos.numeroProveedor,
  );

  return comprobantes.some(
    (cc) =>
      generarClaveUnicaCC(
        cc.proveedorNumeroDocumento,
        cc.tipoComprobanteProveedor,
        cc.serieProveedor,
        cc.numeroProveedor,
      ) === claveNueva,
  );
}
