// src/features/gestion-inventario/services/inventory.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Warehouse } from '../../configuracion-sistema/models/Warehouse';
import type {
  MovimientoStock,
  StockAdjustmentData,
  StockTransferData,
  MassStockUpdateData,
  StockAlert,
  EstadoAlerta
} from '../models';
import { StockRepository } from '../repositories/stock.repository';

/**
 * Servicio para gestión de inventario
 * Contiene toda la lógica de negocio relacionada con stock
 */
export class InventoryService {
  /**
   * Obtener stock actual de un producto en un almacén específico
   */
  static getStock(product: Product, warehouseId: string): number {
    return product.stockPorAlmacen?.[warehouseId] ?? 0;
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
    warehouseId: string,
    newQuantity: number
  ): Product {
    return {
      ...product,
      stockPorAlmacen: {
        ...product.stockPorAlmacen,
        [warehouseId]: Math.max(0, newQuantity) // No permitir stock negativo
      },
      fechaActualizacion: new Date()
    };
  }

  /**
   * Registrar ajuste de stock
   */
  static registerAdjustment(
    product: Product,
    warehouse: Warehouse,
    data: StockAdjustmentData,
    usuario: string
  ): { product: Product; movement: MovimientoStock } {
    const stockActual = this.getStock(product, data.warehouseId);
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
    const updatedProduct = this.updateStock(product, data.warehouseId, nuevoStock);

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
      warehouseId: warehouse.id,
      warehouseCodigo: warehouse.code,
      warehouseNombre: warehouse.name,
      establishmentId: warehouse.establishmentId,
      establishmentCodigo: warehouse.establishmentCode || '',
      establishmentNombre: warehouse.establishmentName || '',
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
    warehouseOrigen: Warehouse,
    warehouseDestino: Warehouse,
    data: StockTransferData,
    usuario: string
  ): { product: Product; movements: MovimientoStock[] } {
    const stockOrigen = this.getStock(product, data.warehouseOrigenId);
    const stockDestino = this.getStock(product, data.warehouseDestinoId);

    // Validar stock disponible
    if (stockOrigen < data.cantidad) {
      throw new Error(`Stock insuficiente en ${warehouseOrigen.name}. Disponible: ${stockOrigen}`);
    }

    const transferenciaId = `TRANS-${Date.now()}`;

    // Actualizar stocks
    let updatedProduct = this.updateStock(product, data.warehouseOrigenId, stockOrigen - data.cantidad);
    updatedProduct = this.updateStock(updatedProduct, data.warehouseDestinoId, stockDestino + data.cantidad);

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
      observaciones: data.observaciones || `Transferencia a ${warehouseDestino.name}`,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      warehouseId: warehouseOrigen.id,
      warehouseCodigo: warehouseOrigen.code,
      warehouseNombre: warehouseOrigen.name,
      establishmentId: warehouseOrigen.establishmentId,
      establishmentCodigo: warehouseOrigen.establishmentCode || '',
      establishmentNombre: warehouseOrigen.establishmentName || '',
      esTransferencia: true,
      transferenciaId,
      warehouseOrigenId: warehouseOrigen.id,
      warehouseOrigenNombre: warehouseOrigen.name,
      warehouseDestinoId: warehouseDestino.id,
      warehouseDestinoNombre: warehouseDestino.name
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
      observaciones: data.observaciones || `Transferencia desde ${warehouseOrigen.name}`,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      warehouseId: warehouseDestino.id,
      warehouseCodigo: warehouseDestino.code,
      warehouseNombre: warehouseDestino.name,
      establishmentId: warehouseDestino.establishmentId,
      establishmentCodigo: warehouseDestino.establishmentCode || '',
      establishmentNombre: warehouseDestino.establishmentName || '',
      esTransferencia: true,
      transferenciaId,
      warehouseOrigenId: warehouseOrigen.id,
      warehouseOrigenNombre: warehouseOrigen.name,
      warehouseDestinoId: warehouseDestino.id,
      warehouseDestinoNombre: warehouseDestino.name,
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
    warehouses: Warehouse[]
  ): StockAlert[] {
    const alerts: StockAlert[] = [];

    products.forEach(product => {
      warehouses.forEach(warehouse => {
        const stockActual = this.getStock(product, warehouse.id);
        const stockMinimo = product.stockMinimoPorAlmacen?.[warehouse.id] || 0;
        const stockMaximo = product.stockMaximoPorAlmacen?.[warehouse.id];

        // Verificar si hay alerta
        let estado: EstadoAlerta | null = null;
        let faltante: number | undefined;
        let excedente: number | undefined;

        if (stockActual === 0) {
          estado = 'CRITICO';
          faltante = stockMinimo;
        } else if (stockActual < stockMinimo * 0.5) {
          estado = 'CRITICO';
          faltante = stockMinimo - stockActual;
        } else if (stockActual < stockMinimo) {
          estado = 'BAJO';
          faltante = stockMinimo - stockActual;
        } else if (stockMaximo && stockActual > stockMaximo) {
          estado = 'EXCESO';
          excedente = stockActual - stockMaximo;
        } else if (stockMinimo > 0) {
          estado = 'NORMAL';
        }

        // Solo crear alerta si hay problema
        if (estado && estado !== 'NORMAL') {
          alerts.push({
            productoId: product.id,
            productoCodigo: product.codigo,
            productoNombre: product.nombre,
            cantidadActual: stockActual,
            stockMinimo,
            stockMaximo,
            estado,
            warehouseId: warehouse.id,
            warehouseCodigo: warehouse.code,
            warehouseNombre: warehouse.name,
            establishmentId: warehouse.establishmentId,
            establishmentCodigo: warehouse.establishmentCode || '',
            establishmentNombre: warehouse.establishmentName || '',
            faltante,
            excedente
          });
        }
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
    warehouses: Warehouse[],
    data: MassStockUpdateData,
    usuario: string
  ): { updatedProducts: Product[]; movements: MovimientoStock[] } {
    const updatedProducts: Product[] = [];
    const movements: MovimientoStock[] = [];

    data.updates.forEach(update => {
      const product = products.find(p => p.id === update.productoId);
      const warehouse = warehouses.find(w => w.id === update.warehouseId);

      if (!product || !warehouse) {
        console.warn(`Producto ${update.productoId} o almacén ${update.warehouseId} no encontrado`);
        return;
      }

      try {
        const adjustmentData: StockAdjustmentData = {
          productoId: update.productoId,
          warehouseId: update.warehouseId,
          tipo: data.tipo,
          motivo: data.motivo,
          cantidad: update.cantidad,
          observaciones: data.observaciones || 'Actualización masiva',
          documentoReferencia: ''
        };

        const result = this.registerAdjustment(product, warehouse, adjustmentData, usuario);
        updatedProducts.push(result.product);
        movements.push(result.movement);
      } catch (error) {
        console.error(`Error procesando actualización para producto ${product.codigo}:`, error);
      }
    });

    return { updatedProducts, movements };
  }
}
