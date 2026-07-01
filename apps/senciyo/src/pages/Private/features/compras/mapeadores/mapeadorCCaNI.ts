import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { LineaCompra } from '../modelos/LineaCompra';

export interface LineaNIDesdeCC {
  productoId?: string;
  codigoProducto?: string;
  nombreProducto: string;
  unidadMedida: string;
  unidadMedidaCodigo: string;
  cantidad: number;
  costoUnitario: number;
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;
  observacion?: string;
}

export interface DatosNIDesdeCC {
  comprobanteCompraOrigenId: string;
  proveedorId: string;
  tipoIngreso: '02';
  motivo: 'COMPRA';
  fechaIngreso: string;
  observaciones?: string;
  lineas: LineaNIDesdeCC[];
}

export function prepararDatosNIDesdeCC(cc: ComprobanteCompra): DatosNIDesdeCC {
  const lineasConInventario = cc.lineas.filter(
    (l: LineaCompra) => l.afectaInventario && l.cantidadRecibida > 0,
  );

  return {
    comprobanteCompraOrigenId: cc.id,
    proveedorId: cc.proveedorId,
    tipoIngreso: '02',
    motivo: 'COMPRA',
    fechaIngreso: cc.fechaRegistro,
    observaciones: cc.observaciones,
    lineas: lineasConInventario.map((l: LineaCompra) => ({
      productoId: l.productoId,
      codigoProducto: l.codigoProducto,
      nombreProducto: l.nombreProducto,
      unidadMedida: l.unidadMedida,
      unidadMedidaCodigo: l.unidadMedidaCodigo,
      cantidad: l.cantidadRecibida,
      costoUnitario: l.costoUnitario,
      almacenDestinoId: l.almacenDestinoId,
      almacenDestinoNombre: l.almacenDestinoNombre,
      observacion: l.observacion,
    })),
  };
}
