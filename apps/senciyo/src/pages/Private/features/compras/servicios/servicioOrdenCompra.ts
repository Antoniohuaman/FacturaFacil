import type { OrdenCompra } from '../modelos/OrdenCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import type { ErrorValidacion } from './tiposServiciosCompras';
import type { ProductUnitOption } from '@/shared/units/productUnitOptions';
import { validarFechaVencimientoCredito, validarLineasCompra, resolverImpuestoProducto } from '../logica/reglasCompras';

export function validarOrdenCompraBasica(oc: Partial<OrdenCompra>): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  if (!oc.proveedorId) {
    errores.push({ campo: 'proveedorId', mensaje: 'El proveedor es obligatorio.' });
  }
  if (!oc.moneda) {
    errores.push({ campo: 'moneda', mensaje: 'La moneda es obligatoria.' });
  }
  if (!oc.formaPago) {
    errores.push({ campo: 'formaPago', mensaje: 'La forma de pago es obligatoria.' });
  } else {
    errores.push(...validarFechaVencimientoCredito(oc.formaPago, oc.fechaEmision, oc.fechaVencimiento));
  }
  if (!oc.lineas || oc.lineas.length === 0) {
    errores.push({ campo: 'lineas', mensaje: 'Se requiere al menos una línea.' });
  }
  if (oc.lineas) {
    errores.push(...validarLineasCompra(oc.lineas));
  }

  return errores;
}

export interface ProductDataLineaCompra {
  productoId: string;
  codigoProducto?: string;
  nombre: string;
  precioCompra?: number;
  unidadMedida?: string;
  unidadMedidaCodigo?: string;
  unidadesDisponibles: ProductUnitOption[];
  imagen?: string;
  stockReferencia?: number;
  alias?: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  tipoExistencia?: string;
  codigoBarras?: string;
  codigoFabrica?: string;
  codigoSunat?: string;
  peso?: number;
  /** Etiqueta de impuesto propia del producto (ej. "IGV (18.00%)"), tal como la define Productos. */
  impuestoProducto?: string;
  esServicio: boolean;
}

/**
 * Construye una línea de compra a partir de un producto real del catálogo.
 * Toda línea de Compras se origina en un producto: unidad, impuesto/afectación
 * y clasificación se toman del producto, nunca se inventan aquí.
 */
export function crearLineaCompraDesdeProducto(
  id: string,
  productData: ProductDataLineaCompra,
  cantidad: number,
): LineaCompra {
  const { tipoAfectacion, tasaIgv } = resolverImpuestoProducto(productData.impuestoProducto);

  return {
    id,
    productoId: productData.productoId,
    codigoProducto: productData.codigoProducto ?? '',
    nombreProducto: productData.nombre,
    imagen: productData.imagen,
    stockReferencia: productData.stockReferencia,
    alias: productData.alias,
    descripcion: productData.descripcion,
    categoria: productData.categoria,
    marca: productData.marca,
    modelo: productData.modelo,
    tipoExistencia: productData.tipoExistencia,
    codigoBarras: productData.codigoBarras,
    codigoFabrica: productData.codigoFabrica,
    codigoSunat: productData.codigoSunat,
    peso: productData.peso,
    precioCompraReferencia: productData.precioCompra,
    clasificacion: productData.esServicio ? 'servicio' : 'producto',
    afectaInventario: false,
    unidadMedida: productData.unidadMedida ?? '',
    unidadMedidaCodigo: productData.unidadMedidaCodigo ?? productData.unidadMedida ?? '',
    unidadesDisponibles: productData.unidadesDisponibles,
    cantidadSolicitada: cantidad,
    cantidadRecibida: 0,
    cantidadFacturada: 0,
    cantidadIngresadaInventario: 0,
    cantidadPendienteRecepcion: cantidad,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: 0,
    costoUnitario: productData.precioCompra ?? 0,
    subtotal: 0,
    tipoAfectacion,
    tasaIgv,
    igv: 0,
    total: 0,
  };
}
