// src/features/gestion-inventario/services/notaIngreso.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock, StockAdjustmentData } from '../models';
import { InventoryService } from './inventory.service';
import { CORRELATIVO_DIGITOS_NI } from '../models/notaIngreso.constants';
import type { NotaIngreso, TipoIngreso } from '../models/notaIngreso.types';
import type { MovimientoMotivo } from '../models/inventory.types';

const TIPO_INGRESO_A_MOTIVO: Record<TipoIngreso, MovimientoMotivo> = {
  '02': 'COMPRA',
  '03': 'OTRO',
  '05': 'DEVOLUCION_PROVEEDOR',
  '16': 'AJUSTE_INVENTARIO',
  '18': 'COMPRA',
  '19': 'PRODUCCION',
  '20': 'PRODUCCION',
  '21': 'TRANSFERENCIA_ALMACEN',
  '22': 'AJUSTE_INVENTARIO',
  '24': 'DEVOLUCION_CLIENTE',
  '26': 'PRODUCCION',
  '28': 'AJUSTE_INVENTARIO',
  '29': 'OTRO',
  '31': 'OTRO',
};

export const mapTipoIngresoAMotivo = (tipo: TipoIngreso): MovimientoMotivo =>
  TIPO_INGRESO_A_MOTIVO[tipo];

export const generarCorrelativoNI = (
  notasExistentes: NotaIngreso[],
  serie: string,
): string => {
  const usados = notasExistentes
    .filter(n => n.serie === serie && n.correlativo)
    .map(n => parseInt(n.correlativo ?? '0', 10))
    .filter(Number.isFinite);

  const siguiente = usados.length > 0 ? Math.max(...usados) + 1 : 1;
  return String(siguiente).padStart(CORRELATIVO_DIGITOS_NI, '0');
};

export interface ResultadoGenerarNI {
  notaActualizada: NotaIngreso;
  productosActualizados: Product[];
  movimientos: MovimientoStock[];
}

export const generarNIEnInventario = (
  nota: NotaIngreso,
  notasExistentes: NotaIngreso[],
  productsMap: Map<string, Product>,
  almacen: Almacen,
  usuario: string,
): ResultadoGenerarNI => {
  if (nota.estado === 'Generada') {
    throw new Error('Esta Nota de Ingreso ya fue generada.');
  }
  if (nota.estado === 'Anulada') {
    throw new Error('No se puede generar una Nota de Ingreso anulada.');
  }
  if (nota.lineas.length === 0) {
    throw new Error('La Nota de Ingreso debe tener al menos una línea de producto.');
  }

  const correlativo = generarCorrelativoNI(notasExistentes, nota.serie);
  const numero = `${nota.serie}-${correlativo}`;
  const motivo = mapTipoIngresoAMotivo(nota.tipoIngreso);
  const ahora = new Date().toISOString();

  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;

    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    const data: StockAdjustmentData = {
      productoId: linea.productoId,
      almacenId: almacen.id,
      tipo: 'ENTRADA',
      motivo,
      cantidad: linea.cantidad,
      observaciones: `NI ${numero} - ${nota.observaciones ?? ''}`.trim(),
      documentoReferencia: numero,
    };

    const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
      producto,
      almacen,
      data,
      usuario,
    );

    productsMap.set(linea.productoId, productoActualizado);
    productosActualizados.push(productoActualizado);
    movimientos.push(movement);
  }

  const notaActualizada: NotaIngreso = {
    ...nota,
    estado: 'Generada',
    esBorrador: false,
    correlativo,
    numero,
    fechaActualizacion: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Generada',
        detalle: `Número asignado: ${numero}. ${movimientos.length} línea(s) procesadas.`,
      },
    ],
  };

  return { notaActualizada, productosActualizados, movimientos };
};

export interface ResultadoAnularNI {
  notaActualizada: NotaIngreso;
  productosActualizados: Product[];
  movimientos: MovimientoStock[];
}

export const anularNIEnInventario = (
  nota: NotaIngreso,
  productsMap: Map<string, Product>,
  almacen: Almacen,
  motivo: string,
  usuario: string,
): ResultadoAnularNI => {
  if (nota.estado !== 'Generada') {
    throw new Error('Solo se pueden anular Notas de Ingreso en estado Generada.');
  }

  // Validar que el stock no quede negativo por la reversión
  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;
    const stockActual = InventoryService.getStock(producto, almacen.id);
    if (stockActual < linea.cantidad) {
      throw new Error(
        `No se puede anular: el producto "${linea.productoNombre}" tiene stock actual (${stockActual}) menor a la cantidad ingresada (${linea.cantidad}).`,
      );
    }
  }

  const ahora = new Date().toISOString();
  const productosActualizados: Product[] = [];
  const movimientos: MovimientoStock[] = [];
  const motivoMovimiento = mapTipoIngresoAMotivo(nota.tipoIngreso);

  for (const linea of nota.lineas) {
    if (linea.tipoBienServicio === 'servicio') continue;
    const producto = productsMap.get(linea.productoId);
    if (!producto) continue;

    const data: StockAdjustmentData = {
      productoId: linea.productoId,
      almacenId: almacen.id,
      tipo: 'AJUSTE_NEGATIVO',
      motivo: motivoMovimiento,
      cantidad: linea.cantidad,
      observaciones: `Anulación NI ${nota.numero ?? ''} - ${motivo}`.trim(),
      documentoReferencia: nota.numero ?? nota.id,
    };

    const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
      producto,
      almacen,
      data,
      usuario,
    );

    productsMap.set(linea.productoId, productoActualizado);
    productosActualizados.push(productoActualizado);
    movimientos.push(movement);
  }

  const notaActualizada: NotaIngreso = {
    ...nota,
    estado: 'Anulada',
    motivoAnulacion: motivo,
    fechaAnulacion: ahora,
    usuarioAnulacion: usuario,
    fechaActualizacion: ahora,
    historial: [
      ...nota.historial,
      {
        fecha: ahora,
        usuario,
        accion: 'Anulada',
        detalle: `Motivo: ${motivo}. Stock revertido en ${movimientos.length} línea(s).`,
      },
    ],
  };

  return { notaActualizada, productosActualizados, movimientos };
};
