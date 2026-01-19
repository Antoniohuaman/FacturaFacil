// src/features/gestion-inventario/services/inventory.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Warehouse';
import type {
  MovimientoStock,
  StockAdjustmentData,
  StockTransferData,
  MassStockUpdateData,
  StockAlert,
  EstadoAlerta
} from '../models';
import { StockRepository } from '../repositories/stock.repository';
import { evaluateStockAlert } from '../utils/stockAlerts';

/**
 * Servicio para gestión de inventario
 * Contiene toda la lógica de negocio relacionada con stock
 */
export class InventoryService {
  /**
   * Obtener stock actual de un producto en un almacén específico
   */
  static getStock(product: Product, almacenId: string): number {
    return product.stockPorAlmacen?.[almacenId] ?? 0;
  }

  /**
   * Obtener stock reservado de un producto en un almacén específico
   */
  static getReservedStock(product: Product, almacenId: string): number {
    return Math.max(0, product.stockReservadoPorAlmacen?.[almacenId] ?? 0);
  }

  /**
   * Obtener stock total de un producto en todos los almacenes
   */
  static getTotalStock(product: Product): number {
    const stockMap = product.stockPorAlmacen ?? {};
    return Object.values(stockMap).reduce<number>((sum, qty) => sum + (qty || 0), 0);
  }

  /**
   * Actualizar stock de un producto en un almacén
   */
  static updateStock(
    product: Product,
    almacenId: string,
    newQuantity: number,
    options?: { allowNegativeStock?: boolean }
  ): Product {
    const allowNegativeStock = Boolean(options?.allowNegativeStock);
    const normalizedQuantity = Number.isFinite(newQuantity) ? Number(newQuantity) : 0;

    return {
      ...product,
      stockPorAlmacen: {
        ...product.stockPorAlmacen,
        [almacenId]: allowNegativeStock ? normalizedQuantity : Math.max(0, normalizedQuantity)
      },
      fechaActualizacion: new Date()
    };
  }

  /**
   * Actualiza los umbrales mínimo/máximo para un almacén específico
   */
  static updateThresholds(
    product: Product,
    almacenId: string,
    updates: { stockMinimo?: number | null; stockMaximo?: number | null }
  ): Product {
    const hasMinUpdate = Object.prototype.hasOwnProperty.call(updates, 'stockMinimo');
    const hasMaxUpdate = Object.prototype.hasOwnProperty.call(updates, 'stockMaximo');

    const nextMinMap = { ...(product.stockMinimoPorAlmacen ?? {}) };
    const nextMaxMap = { ...(product.stockMaximoPorAlmacen ?? {}) };

    if (hasMinUpdate) {
      const normalizedMin = updates.stockMinimo ?? undefined;
      if (normalizedMin === undefined) {
        delete nextMinMap[almacenId];
      } else {
        nextMinMap[almacenId] = normalizedMin;
      }
    }

    if (hasMaxUpdate) {
      const normalizedMax = updates.stockMaximo ?? undefined;
      if (normalizedMax === undefined) {
        delete nextMaxMap[almacenId];
      } else {
        nextMaxMap[almacenId] = normalizedMax;
      }
    }

    return {
      ...product,
      stockMinimoPorAlmacen: Object.keys(nextMinMap).length ? nextMinMap : undefined,
      stockMaximoPorAlmacen: Object.keys(nextMaxMap).length ? nextMaxMap : undefined,
      fechaActualizacion: new Date()
    };
  }

  /**
   * Registrar ajuste de stock
   */
  static registerAdjustment(
    product: Product,
    almacen: Almacen,
    data: StockAdjustmentData,
    usuario: string
  ): { product: Product; movement: MovimientoStock } {
    const stockActual = this.getStock(product, data.almacenId);
    let nuevoStock = stockActual;

    // Calcular nuevo stock según el tipo de movimiento
    switch (data.tipo) {
      case 'ENTRADA':
      case 'AJUSTE_POSITIVO':
      case 'DEVOLUCION':
        nuevoStock = stockActual + data.cantidad;
        break;
      case 'SALIDA':
      case 'AJUSTE_NEGATIVO':
      case 'MERMA':
        nuevoStock = stockActual - data.cantidad;
        break;
    }

    // Actualizar producto
    const updatedProduct = this.updateStock(product, data.almacenId, nuevoStock);

    // Crear movimiento
    const movement: MovimientoStock = {
      id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: data.tipo,
      motivo: data.motivo,
      cantidad: data.cantidad,
      cantidadAnterior: stockActual,
      cantidadNueva: nuevoStock,
      usuario,
      observaciones: data.observaciones,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      almacenId: almacen.id,
      almacenCodigo: almacen.code,
      almacenNombre: almacen.name,
      establishmentId: almacen.establishmentId,
      establishmentCodigo: almacen.establishmentCode || '',
      establishmentNombre: almacen.establishmentName || '',
      esTransferencia: false
    };

    // Guardar movimiento
    StockRepository.addMovement(movement);

    return { product: updatedProduct, movement };
  }

  /**
   * Registrar transferencia entre almacenes
   */
  static registerTransfer(
    product: Product,
    almacenOrigen: Almacen,
    almacenDestino: Almacen,
    data: StockTransferData,
    usuario: string
  ): { product: Product; movements: MovimientoStock[] } {
    const stockOrigen = this.getStock(product, data.almacenOrigenId);
    const stockDestino = this.getStock(product, data.almacenDestinoId);

    // Validar stock disponible
    if (stockOrigen < data.cantidad) {
      throw new Error(`Stock insuficiente en ${almacenOrigen.name}. Disponible: ${stockOrigen}`);
    }

    const transferenciaId = `TRANS-${Date.now()}`;

    // Actualizar stocks
    let updatedProduct = this.updateStock(product, data.almacenOrigenId, stockOrigen - data.cantidad);
    updatedProduct = this.updateStock(updatedProduct, data.almacenDestinoId, stockDestino + data.cantidad);

    // Crear movimiento de salida (origen)
    const movimientoSalida: MovimientoStock = {
      id: `MOV-${Date.now()}-SALIDA-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: 'SALIDA',
      motivo: 'TRANSFERENCIA_ALMACEN',
      cantidad: data.cantidad,
      cantidadAnterior: stockOrigen,
      cantidadNueva: stockOrigen - data.cantidad,
      usuario,
      observaciones: data.observaciones || `Transferencia a ${almacenDestino.name}`,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenOrigen.id,
      almacenCodigo: almacenOrigen.code,
      almacenNombre: almacenOrigen.name,
      establishmentId: almacenOrigen.establishmentId,
      establishmentCodigo: almacenOrigen.establishmentCode || '',
      establishmentNombre: almacenOrigen.establishmentName || '',
      esTransferencia: true,
      transferenciaId,
      almacenOrigenId: almacenOrigen.id,
      almacenOrigenNombre: almacenOrigen.name,
      almacenDestinoId: almacenDestino.id,
      almacenDestinoNombre: almacenDestino.name
    };

    // Crear movimiento de entrada (destino)
    const movimientoEntrada: MovimientoStock = {
      id: `MOV-${Date.now()}-ENTRADA-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: 'ENTRADA',
      motivo: 'TRANSFERENCIA_ALMACEN',
      cantidad: data.cantidad,
      cantidadAnterior: stockDestino,
      cantidadNueva: stockDestino + data.cantidad,
      usuario,
      observaciones: data.observaciones || `Transferencia desde ${almacenOrigen.name}`,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenDestino.id,
      almacenCodigo: almacenDestino.code,
      almacenNombre: almacenDestino.name,
      establishmentId: almacenDestino.establishmentId,
      establishmentCodigo: almacenDestino.establishmentCode || '',
      establishmentNombre: almacenDestino.establishmentName || '',
      esTransferencia: true,
      transferenciaId,
      almacenOrigenId: almacenOrigen.id,
      almacenOrigenNombre: almacenOrigen.name,
      almacenDestinoId: almacenDestino.id,
      almacenDestinoNombre: almacenDestino.name,
      movimientoRelacionadoId: movimientoSalida.id
    };

    // Vincular movimientos
    movimientoSalida.movimientoRelacionadoId = movimientoEntrada.id;

    // Guardar movimientos
    StockRepository.addMovements([movimientoSalida, movimientoEntrada]);

    return { product: updatedProduct, movements: [movimientoSalida, movimientoEntrada] };
  }

  /**
   * Generar alertas de stock
   */
  static generateAlerts(
    products: Product[],
    almacenes: Almacen[]
  ): StockAlert[] {
    const alerts: StockAlert[] = [];

    products.forEach(product => {
      almacenes.forEach(almacen => {
        const stockReal = this.getStock(product, almacen.id);
        const stockReservado = this.getReservedStock(product, almacen.id);
        const stockDisponible = Math.max(0, stockReal - stockReservado);
        const stockMinimo = product.stockMinimoPorAlmacen?.[almacen.id];
        const stockMaximo = product.stockMaximoPorAlmacen?.[almacen.id];
        const evaluation = evaluateStockAlert({
          disponible: stockDisponible,
          stockMinimo,
          stockMaximo
        });

        if (evaluation.type === 'OK') {
          return;
        }

        const estado: EstadoAlerta = evaluation.type === 'OVER'
          ? 'EXCESO'
          : evaluation.isCritical
            ? 'CRITICO'
            : 'BAJO';

        alerts.push({
          productoId: product.id,
          productoCodigo: product.codigo,
          productoNombre: product.nombre,
          cantidadActual: stockDisponible,
          cantidadReal: stockReal,
          cantidadReservada: stockReservado,
          stockMinimo: typeof stockMinimo === 'number' ? stockMinimo : 0,
          stockMaximo,
          estado,
          alertType: evaluation.type === 'OVER' ? 'OVER' : 'LOW',
          isCritical: evaluation.isCritical,
          almacenId: almacen.id,
          almacenCodigo: almacen.code,
          almacenNombre: almacen.name,
          establishmentId: almacen.establishmentId,
          establishmentCodigo: almacen.establishmentCode || '',
          establishmentNombre: almacen.establishmentName || '',
          faltante: evaluation.missing,
          excedente: evaluation.excess
        });
      });
    });

    // Ordenar por prioridad: CRITICO > BAJO > EXCESO
    return alerts.sort((a, b) => {
      const prioridad = { CRITICO: 1, BAJO: 2, EXCESO: 3, NORMAL: 4 };
      return prioridad[a.estado] - prioridad[b.estado];
    });
  }

  /**
   * Procesar actualización masiva de stock
   */
  static processMassUpdate(
    products: Product[],
    almacenes: Almacen[],
    data: MassStockUpdateData,
    usuario: string
  ): { updatedProducts: Product[]; movements: MovimientoStock[] } {
    const updatedProducts: Product[] = [];
    const movements: MovimientoStock[] = [];

    data.updates.forEach(update => {
      const product = products.find(p => p.id === update.productoId);
      const almacen = almacenes.find(w => w.id === update.almacenId);

      if (!product || !almacen) {
        console.warn(`Producto ${update.productoId} o almacén ${update.almacenId} no encontrado`);
        return;
      }

      try {
        const adjustmentData: StockAdjustmentData = {
          productoId: update.productoId,
          almacenId: update.almacenId,
          tipo: data.tipo,
          motivo: data.motivo,
          cantidad: update.cantidad,
          observaciones: data.observaciones || 'Actualización masiva',
          documentoReferencia: ''
        };

        const result = this.registerAdjustment(product, almacen, adjustmentData, usuario);
        updatedProducts.push(result.product);
        movements.push(result.movement);
      } catch (error) {
        console.error(`Error procesando actualización para producto ${product.codigo}:`, error);
      }
    });

    return { updatedProducts, movements };
  }
}
