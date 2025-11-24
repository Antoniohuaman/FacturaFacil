// src/features/gestion-inventario/repositories/stock.repository.ts

import type { MovimientoStock } from '../models';
import { lsKey } from '../../../shared/tenant';

const STORAGE_KEY_MOVEMENTS = 'facturafacil_stock_movements';

/**
 * Repositorio para gestionar el almacenamiento de movimientos de stock
 * Utiliza localStorage para persistencia en frontend
 */
export class StockRepository {
  /**
   * Obtener todos los movimientos de stock
   */
  static getMovements(): MovimientoStock[] {
    try {
      const tenantKey = lsKey(STORAGE_KEY_MOVEMENTS);
      let data = localStorage.getItem(tenantKey);

      if (!data) {
        const legacyData = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
        if (legacyData) {
          localStorage.setItem(tenantKey, legacyData);
          localStorage.removeItem(STORAGE_KEY_MOVEMENTS);
          data = legacyData;
        }
      }

      if (!data) return [];

      const movements: MovimientoStock[] = JSON.parse(data);
      // Convertir fechas de string a Date sin utilizar any
      return movements.map((mov) => ({
        ...mov,
        fecha: new Date(mov.fecha)
      }));
    } catch (error) {
      console.error('Error loading movements from localStorage:', error);
      return [];
    }
  }

  /**
   * Guardar movimientos de stock
   */
  static saveMovements(movements: MovimientoStock[]): void {
    try {
      const tenantKey = lsKey(STORAGE_KEY_MOVEMENTS);
      localStorage.setItem(tenantKey, JSON.stringify(movements));
    } catch (error) {
      console.error('Error saving movements to localStorage:', error);
      throw new Error('No se pudieron guardar los movimientos de stock');
    }
  }

  /**
   * Agregar un nuevo movimiento
   */
  static addMovement(movement: MovimientoStock): void {
    const movements = this.getMovements();
    movements.push(movement);
    this.saveMovements(movements);
  }

  /**
   * Agregar múltiples movimientos (útil para transferencias)
   */
  static addMovements(newMovements: MovimientoStock[]): void {
    const movements = this.getMovements();
    movements.push(...newMovements);
    this.saveMovements(movements);
  }

  /**
   * Obtener movimientos por producto
   */
  static getMovementsByProduct(productId: string): MovimientoStock[] {
    return this.getMovements().filter(mov => mov.productoId === productId);
  }

  /**
   * Obtener movimientos por almacén
   */
  static getMovementsByWarehouse(warehouseId: string): MovimientoStock[] {
    return this.getMovements().filter(mov =>
      mov.warehouseId === warehouseId ||
      mov.warehouseOrigenId === warehouseId ||
      mov.warehouseDestinoId === warehouseId
    );
  }

  /**
   * Obtener movimientos por rango de fechas
   */
  static getMovementsByDateRange(startDate: Date, endDate: Date): MovimientoStock[] {
    return this.getMovements().filter(mov => {
      const movDate = new Date(mov.fecha);
      return movDate >= startDate && movDate <= endDate;
    });
  }

  /**
   * Limpiar todos los movimientos (usar con precaución)
   */
  static clearAllMovements(): void {
    const tenantKey = lsKey(STORAGE_KEY_MOVEMENTS);
    localStorage.removeItem(tenantKey);
  }
}
