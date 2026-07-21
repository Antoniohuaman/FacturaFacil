// src/features/gestion-inventario/services/inventory.service.ts

import type { Product } from '../../catalogo-articulos/models/types';
import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type {
  MovimientoStock,
  MovimientoTipo,
  StockAdjustmentData,
  StockTransferData,
  MassStockUpdateData,
  StockAlert,
  EstadoAlerta
} from '../models';
import { StockRepository } from '../repositories/stock.repository';
import { evaluateStockAlert } from '../utils/stockAlerts';
import { generateTransferId } from '../utils/inventory.helpers';
import type { Transferencia } from '../models/transferencia.types';

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
   * Recalcula los campos derivados cantidad y stockPorEstablecimiento a partir
   * de stockPorAlmacen.  Debe llamarse después de toda operación que modifique
   * stockPorAlmacen mediante registerAdjustment (ajustes, NI, importación).
   * registerTransfer ya lo hace internamente.
   */
  static recalcularTotalesStock(product: Product, almacenes: Almacen[]): Product {
    const cantidad = this.getTotalStock(product);
    const estMap: Record<string, number> = {};
    for (const almacen of almacenes) {
      if (!almacen.establecimientoId) continue;
      estMap[almacen.establecimientoId] =
        (estMap[almacen.establecimientoId] ?? 0) +
        (product.stockPorAlmacen?.[almacen.id] ?? 0);
    }
    const hasEstData = Object.keys(estMap).length > 0;
    return {
      ...product,
      cantidad,
      ...(hasEstData
        ? { stockPorEstablecimiento: { ...(product.stockPorEstablecimiento ?? {}), ...estMap } }
        : {}),
    };
  }

  /**
   * Signo cuantitativo de un `MovimientoTipo` (Etapa 1D, §6: "no mantengas dos fórmulas
   * independientes para descontar stock") — única fuente de verdad, reutilizada por
   * `calcularAjustePropuesto` y por `inventory.facade.ts::addMovimiento`. `TRANSFERENCIA` nunca
   * pasa por aquí — tiene su propio flujo dedicado (`registerTransfer*`), con origen y destino
   * explícitos, donde "signo único" no tiene significado.
   */
  static signoParaTipoMovimiento(tipo: MovimientoTipo): 1 | -1 {
    switch (tipo) {
      case 'ENTRADA':
      case 'AJUSTE_POSITIVO':
      case 'DEVOLUCION':
        return 1;
      case 'SALIDA':
      case 'AJUSTE_NEGATIVO':
      case 'MERMA':
        return -1;
      default:
        throw new Error(`InventoryService.signoParaTipoMovimiento: "${tipo}" no tiene un signo cuantitativo genérico — usa el flujo dedicado.`);
    }
  }

  /**
   * Cálculo puro del ajuste de stock (Etapa 1C, §5 del encargo): recibe todo el estado necesario
   * como parámetros, calcula el nuevo stock y el `MovimientoStock` propuesto, y devuelve datos
   * nuevos sin persistirlos. No muta `product`/`almacen`, no lee ni escribe `localStorage`, no
   * llama `StockRepository`, no emite eventos, no depende de React. Determinista para la misma
   * entrada (incluyendo `generarId`/`fechaActual` inyectados) — `registerAdjustment` reutiliza
   * esta misma función con los generadores no deterministas que usaba antes, para no cambiar su
   * comportamiento observable.
   */
  static calcularAjustePropuesto(params: {
    product: Product;
    almacen: Almacen;
    data: StockAdjustmentData;
    usuario: string;
    generarId: () => string;
    fechaActual: () => Date;
  }): { cantidadAnterior: number; cantidadNueva: number; productoActualizado: Product; movimientoPropuesto: MovimientoStock } {
    const { product, almacen, data, usuario, generarId, fechaActual } = params;

    if (!Number.isFinite(data.cantidad) || data.cantidad <= 0) {
      throw new Error('La cantidad del movimiento debe ser mayor a cero.');
    }

    const cantidadAnterior = this.getStock(product, data.almacenId);
    const cantidadNueva = cantidadAnterior + this.signoParaTipoMovimiento(data.tipo) * data.cantidad;

    const productoActualizado = this.updateStock(product, data.almacenId, cantidadNueva);

    const movimientoPropuesto: MovimientoStock = {
      id: generarId(),
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: data.tipo,
      motivo: data.motivo,
      cantidad: data.cantidad,
      cantidadAnterior,
      cantidadNueva,
      usuario,
      observaciones: data.observaciones,
      documentoReferencia: data.documentoReferencia,
      fecha: fechaActual(),
      almacenId: almacen.id,
      almacenCodigo: almacen.codigoAlmacen,
      almacenNombre: almacen.nombreAlmacen,
      EstablecimientoId: almacen.establecimientoId,
      EstablecimientoCodigo: almacen.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacen.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: false
    };

    return { cantidadAnterior, cantidadNueva, productoActualizado, movimientoPropuesto };
  }

  /**
   * @deprecated Persiste directamente sin reserva idempotente ni unidad de trabajo recuperable.
   * Para nuevas integraciones usa `ServicioKardexValorizado.registrarEntradaValorizada` (Etapa
   * 1C). Se mantiene como wrapper temporal — mismo comportamiento observable de siempre — para los
   * consumidores que todavía no migraron (POS, formularios de comprobantes, ajustes negativos,
   * transferencias, actualización masiva).
   */
  static registerAdjustment(
    product: Product,
    almacen: Almacen,
    data: StockAdjustmentData,
    usuario: string
  ): { product: Product; movement: MovimientoStock } {
    const { productoActualizado, movimientoPropuesto } = this.calcularAjustePropuesto({
      product,
      almacen,
      data,
      usuario,
      generarId: () => `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fechaActual: () => new Date(),
    });

    StockRepository.addMovement(movimientoPropuesto);

    return { product: productoActualizado, movement: movimientoPropuesto };
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

    // Validar stock disponible (real − reservado)
    const reservedOrigen = this.getReservedStock(product, data.almacenOrigenId);
    const disponible = Math.max(0, stockOrigen - reservedOrigen);
    if (disponible < data.cantidad) {
      const detalle = reservedOrigen > 0 ? ` (${stockOrigen} real − ${reservedOrigen} reservado)` : '';
      throw new Error(`Stock insuficiente en ${almacenOrigen.nombreAlmacen}. Disponible: ${disponible}${detalle}.`);
    }

    const transferenciaId = generateTransferId();

    const tipoTransferencia = almacenOrigen.establecimientoId === almacenDestino.establecimientoId
      ? 'INTRA_ESTABLECIMIENTO' as const
      : 'INTER_ESTABLECIMIENTO' as const;

    // Actualizar stocks
    let updatedProduct = this.updateStock(product, data.almacenOrigenId, stockOrigen - data.cantidad);
    updatedProduct = this.updateStock(updatedProduct, data.almacenDestinoId, stockDestino + data.cantidad);
    // Actualizar campo legacy de stock total
    updatedProduct = { ...updatedProduct, cantidad: this.getTotalStock(updatedProduct) };

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
      observaciones: data.observaciones || `Transferencia a ${almacenDestino.nombreAlmacen}`,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenOrigen.id,
      almacenCodigo: almacenOrigen.codigoAlmacen,
      almacenNombre: almacenOrigen.nombreAlmacen,
      EstablecimientoId: almacenOrigen.establecimientoId,
      EstablecimientoCodigo: almacenOrigen.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: true,
      transferenciaId,
      tipoTransferencia,
      almacenOrigenId: almacenOrigen.id,
      almacenOrigenNombre: almacenOrigen.nombreAlmacen,
      almacenDestinoId: almacenDestino.id,
      almacenDestinoNombre: almacenDestino.nombreAlmacen
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
      observaciones: data.observaciones || `Transferencia desde ${almacenOrigen.nombreAlmacen}`,
      documentoReferencia: data.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenDestino.id,
      almacenCodigo: almacenDestino.codigoAlmacen,
      almacenNombre: almacenDestino.nombreAlmacen,
      EstablecimientoId: almacenDestino.establecimientoId,
      EstablecimientoCodigo: almacenDestino.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: true,
      transferenciaId,
      tipoTransferencia,
      almacenOrigenId: almacenOrigen.id,
      almacenOrigenNombre: almacenOrigen.nombreAlmacen,
      almacenDestinoId: almacenDestino.id,
      almacenDestinoNombre: almacenDestino.nombreAlmacen,
      movimientoRelacionadoId: movimientoSalida.id
    };

    // Vincular movimientos
    movimientoSalida.movimientoRelacionadoId = movimientoEntrada.id;

    // Guardar movimientos
    StockRepository.addMovements([movimientoSalida, movimientoEntrada]);

    return { product: updatedProduct, movements: [movimientoSalida, movimientoEntrada] };
  }

  /**
   * Registrar solo la SALIDA de una transferencia inter-establecimiento (despacho)
   */
  static registerTransferSalida(
    product: Product,
    almacenOrigen: Almacen,
    transferencia: Pick<Transferencia, 'id' | 'cantidad' | 'tipoTransferencia' | 'almacenDestinoId' | 'almacenDestinoNombre' | 'documentoReferencia' | 'observaciones'>,
    usuario: string
  ): { product: Product; movement: MovimientoStock } {
    const stockOrigen = this.getStock(product, almacenOrigen.id);

    const reservedOrigen = this.getReservedStock(product, almacenOrigen.id);
    const disponible = Math.max(0, stockOrigen - reservedOrigen);
    if (disponible < transferencia.cantidad) {
      const detalle = reservedOrigen > 0 ? ` (${stockOrigen} real − ${reservedOrigen} reservado)` : '';
      throw new Error(`Stock insuficiente en ${almacenOrigen.nombreAlmacen}. Disponible: ${disponible}${detalle}.`);
    }

    const nuevoStock = stockOrigen - transferencia.cantidad;
    let updatedProduct = this.updateStock(product, almacenOrigen.id, nuevoStock);
    updatedProduct = { ...updatedProduct, cantidad: this.getTotalStock(updatedProduct) };

    const movement: MovimientoStock = {
      id: `MOV-${Date.now()}-SALIDA-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: 'SALIDA',
      motivo: 'TRANSFERENCIA_ALMACEN',
      cantidad: transferencia.cantidad,
      cantidadAnterior: stockOrigen,
      cantidadNueva: nuevoStock,
      usuario,
      observaciones: transferencia.observaciones || `Despacho hacia ${transferencia.almacenDestinoNombre}`,
      documentoReferencia: transferencia.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenOrigen.id,
      almacenCodigo: almacenOrigen.codigoAlmacen,
      almacenNombre: almacenOrigen.nombreAlmacen,
      EstablecimientoId: almacenOrigen.establecimientoId,
      EstablecimientoCodigo: almacenOrigen.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: true,
      transferenciaId: transferencia.id,
      tipoTransferencia: transferencia.tipoTransferencia,
      almacenOrigenId: almacenOrigen.id,
      almacenOrigenNombre: almacenOrigen.nombreAlmacen,
      almacenDestinoId: transferencia.almacenDestinoId,
      almacenDestinoNombre: transferencia.almacenDestinoNombre,
    };

    StockRepository.addMovement(movement);
    return { product: updatedProduct, movement };
  }

  /**
   * Registrar solo la ENTRADA de una transferencia inter-establecimiento (recepción)
   */
  static registerTransferEntrada(
    product: Product,
    almacenDestino: Almacen,
    transferencia: Pick<Transferencia, 'id' | 'cantidad' | 'tipoTransferencia' | 'almacenOrigenId' | 'almacenOrigenNombre' | 'documentoReferencia' | 'observaciones' | 'movimientoSalidaId'>,
    usuario: string
  ): { product: Product; movement: MovimientoStock } {
    const stockDestino = this.getStock(product, almacenDestino.id);
    const nuevoStock = stockDestino + transferencia.cantidad;

    let updatedProduct = this.updateStock(product, almacenDestino.id, nuevoStock);
    updatedProduct = { ...updatedProduct, cantidad: this.getTotalStock(updatedProduct) };

    const movement: MovimientoStock = {
      id: `MOV-${Date.now()}-ENTRADA-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: 'ENTRADA',
      motivo: 'TRANSFERENCIA_ALMACEN',
      cantidad: transferencia.cantidad,
      cantidadAnterior: stockDestino,
      cantidadNueva: nuevoStock,
      usuario,
      observaciones: transferencia.observaciones || `Recepción desde ${transferencia.almacenOrigenNombre}`,
      documentoReferencia: transferencia.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenDestino.id,
      almacenCodigo: almacenDestino.codigoAlmacen,
      almacenNombre: almacenDestino.nombreAlmacen,
      EstablecimientoId: almacenDestino.establecimientoId,
      EstablecimientoCodigo: almacenDestino.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: true,
      transferenciaId: transferencia.id,
      tipoTransferencia: transferencia.tipoTransferencia,
      almacenOrigenId: transferencia.almacenOrigenId,
      almacenOrigenNombre: transferencia.almacenOrigenNombre,
      almacenDestinoId: almacenDestino.id,
      almacenDestinoNombre: almacenDestino.nombreAlmacen,
      movimientoRelacionadoId: transferencia.movimientoSalidaId,
    };

    StockRepository.addMovement(movement);
    return { product: updatedProduct, movement };
  }

  /**
   * Registrar la anulación de una transferencia generando movimientos inversos.
   * Para EN_TRANSITO: solo revierte la SALIDA.
   * Para CONFIRMADA/RECIBIDA: revierte ambos movimientos.
   */
  static registerTransferAnulacion(
    product: Product,
    almacenOrigen: Almacen,
    almacenDestino: Almacen,
    transferencia: Pick<Transferencia, 'id' | 'cantidad' | 'tipoTransferencia' | 'estado' | 'movimientoSalidaId' | 'documentoReferencia'>,
    usuario: string
  ): { product: Product; movements: MovimientoStock[] } {
    const { id, cantidad, tipoTransferencia, estado } = transferencia;
    const nota = `Anulación de ${id}`;

    if (estado === 'EN_TRANSITO') {
      // Solo restituir stock al origen (reversar la SALIDA)
      const stockOrigen = this.getStock(product, almacenOrigen.id);
      const nuevoStockOrigen = stockOrigen + cantidad;
      let updatedProduct = this.updateStock(product, almacenOrigen.id, nuevoStockOrigen);
      updatedProduct = { ...updatedProduct, cantidad: this.getTotalStock(updatedProduct) };

      const movEntrada: MovimientoStock = {
        id: `MOV-${Date.now()}-ANUL-${Math.random().toString(36).substr(2, 9)}`,
        productoId: product.id,
        productoCodigo: product.codigo,
        productoNombre: product.nombre,
        tipo: 'ENTRADA',
        motivo: 'TRANSFERENCIA_ALMACEN',
        cantidad,
        cantidadAnterior: stockOrigen,
        cantidadNueva: nuevoStockOrigen,
        usuario,
        observaciones: nota,
        documentoReferencia: transferencia.documentoReferencia,
        fecha: new Date(),
        almacenId: almacenOrigen.id,
        almacenCodigo: almacenOrigen.codigoAlmacen,
        almacenNombre: almacenOrigen.nombreAlmacen,
        EstablecimientoId: almacenOrigen.establecimientoId,
        EstablecimientoCodigo: almacenOrigen.codigoEstablecimientoDesnormalizado || '',
        EstablecimientoNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
        esTransferencia: true,
        transferenciaId: id,
        tipoTransferencia,
        almacenOrigenId: almacenDestino.id,
        almacenOrigenNombre: almacenDestino.nombreAlmacen,
        almacenDestinoId: almacenOrigen.id,
        almacenDestinoNombre: almacenOrigen.nombreAlmacen,
        movimientoRelacionadoId: transferencia.movimientoSalidaId,
      };

      StockRepository.addMovement(movEntrada);
      return { product: updatedProduct, movements: [movEntrada] };
    }

    // CONFIRMADA o RECIBIDA: revertir ambos movimientos
    const stockDestino = this.getStock(product, almacenDestino.id);
    if (stockDestino < cantidad) {
      throw new Error(
        `No hay stock suficiente en ${almacenDestino.nombreAlmacen} para anular. Disponible: ${stockDestino}, requerido: ${cantidad}.`
      );
    }

    const stockOrigen = this.getStock(product, almacenOrigen.id);
    const nuevoStockDestino = stockDestino - cantidad;
    const nuevoStockOrigen = stockOrigen + cantidad;

    const movSalida: MovimientoStock = {
      id: `MOV-${Date.now()}-ANUL-SAL-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: 'SALIDA',
      motivo: 'TRANSFERENCIA_ALMACEN',
      cantidad,
      cantidadAnterior: stockDestino,
      cantidadNueva: nuevoStockDestino,
      usuario,
      observaciones: nota,
      documentoReferencia: transferencia.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenDestino.id,
      almacenCodigo: almacenDestino.codigoAlmacen,
      almacenNombre: almacenDestino.nombreAlmacen,
      EstablecimientoId: almacenDestino.establecimientoId,
      EstablecimientoCodigo: almacenDestino.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: true,
      transferenciaId: id,
      tipoTransferencia,
      almacenOrigenId: almacenDestino.id,
      almacenOrigenNombre: almacenDestino.nombreAlmacen,
      almacenDestinoId: almacenOrigen.id,
      almacenDestinoNombre: almacenOrigen.nombreAlmacen,
    };

    const movEntrada: MovimientoStock = {
      id: `MOV-${Date.now()}-ANUL-ENT-${Math.random().toString(36).substr(2, 9)}`,
      productoId: product.id,
      productoCodigo: product.codigo,
      productoNombre: product.nombre,
      tipo: 'ENTRADA',
      motivo: 'TRANSFERENCIA_ALMACEN',
      cantidad,
      cantidadAnterior: stockOrigen,
      cantidadNueva: nuevoStockOrigen,
      usuario,
      observaciones: nota,
      documentoReferencia: transferencia.documentoReferencia,
      fecha: new Date(),
      almacenId: almacenOrigen.id,
      almacenCodigo: almacenOrigen.codigoAlmacen,
      almacenNombre: almacenOrigen.nombreAlmacen,
      EstablecimientoId: almacenOrigen.establecimientoId,
      EstablecimientoCodigo: almacenOrigen.codigoEstablecimientoDesnormalizado || '',
      EstablecimientoNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
      esTransferencia: true,
      transferenciaId: id,
      tipoTransferencia,
      almacenOrigenId: almacenDestino.id,
      almacenOrigenNombre: almacenDestino.nombreAlmacen,
      almacenDestinoId: almacenOrigen.id,
      almacenDestinoNombre: almacenOrigen.nombreAlmacen,
      movimientoRelacionadoId: movSalida.id,
    };

    movSalida.movimientoRelacionadoId = movEntrada.id;

    let updatedProduct = this.updateStock(product, almacenDestino.id, nuevoStockDestino);
    updatedProduct = this.updateStock(updatedProduct, almacenOrigen.id, nuevoStockOrigen);
    updatedProduct = { ...updatedProduct, cantidad: this.getTotalStock(updatedProduct) };

    StockRepository.addMovements([movSalida, movEntrada]);
    return { product: updatedProduct, movements: [movSalida, movEntrada] };
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
          : stockDisponible === 0
          ? 'SIN_STOCK'
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
          almacenCodigo: almacen.codigoAlmacen,
          almacenNombre: almacen.nombreAlmacen,
          EstablecimientoId: almacen.establecimientoId,
          EstablecimientoCodigo: almacen.codigoEstablecimientoDesnormalizado || '',
          EstablecimientoNombre: almacen.nombreEstablecimientoDesnormalizado || '',
          faltante: evaluation.missing,
          excedente: evaluation.excess
        });
      });
    });

    // Ordenar por prioridad: SIN_STOCK > CRITICO > BAJO > EXCESO
    return alerts.sort((a, b) => {
      const prioridad: Record<string, number> = { SIN_STOCK: 1, CRITICO: 2, BAJO: 3, EXCESO: 4, NORMAL: 5 };
      return (prioridad[a.estado] ?? 5) - (prioridad[b.estado] ?? 5);
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
