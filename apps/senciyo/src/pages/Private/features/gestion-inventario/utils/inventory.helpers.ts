// src/features/inventario/utils/inventory.helpers.ts

import type { MovimientoStock, StockAlert, FilterPeriod } from '../models';
import type { Transferencia } from '../models/transferencia.types';

/**
 * Formatea una fecha para mostrar
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Formatea moneda en soles peruanos
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(amount);
};

/**
 * Obtiene el color según el estado de la alerta
 */
export const getAlertColor = (estado: StockAlert['estado']): { bg: string; text: string; border: string } => {
  const colors: Record<StockAlert['estado'], { bg: string; text: string; border: string }> = {
    SIN_STOCK: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    },
    CRITICO: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800'
    },
    BAJO: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800'
    },
    EXCESO: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    NORMAL: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    }
  };
  return colors[estado];
};

/**
 * Obtiene el ícono según el tipo de movimiento
 */
export const getMovementIcon = (tipo: MovimientoStock['tipo']): string => {
  const icons = {
    ENTRADA: '⬆️',
    SALIDA: '⬇️',
    AJUSTE_POSITIVO: '➕',
    AJUSTE_NEGATIVO: '➖',
    DEVOLUCION: '↩️',
    MERMA: '🗑️',
    TRANSFERENCIA: '🔄'
  };
  return icons[tipo] || '📦';
};

/**
 * Obtiene el color del badge según el tipo de movimiento
 */
export const getMovementColor = (tipo: MovimientoStock['tipo']): string => {
  const colors = {
    ENTRADA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    SALIDA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    AJUSTE_POSITIVO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    AJUSTE_NEGATIVO: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    DEVOLUCION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    MERMA: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    TRANSFERENCIA: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
  };
  return colors[tipo] || 'bg-gray-100 text-gray-800';
};

/**
 * Filtra movimientos por período
 */
export const filterByPeriod = (movimientos: MovimientoStock[], period: FilterPeriod): MovimientoStock[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return movimientos.filter(mov => {
    const movDate = new Date(mov.fecha);

    switch (period) {
      case 'hoy':
        return movDate >= today;
      case 'semana': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return movDate >= weekAgo;
      }
      case 'mes': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return movDate >= monthAgo;
      }
      case 'todo':
      default:
        return true;
    }
  });
};

/**
 * Ordena movimientos por fecha (más recientes primero)
 */
export const sortByDateDesc = (movimientos: MovimientoStock[]): MovimientoStock[] => {
  return [...movimientos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
};

/**
 * Filtra alertas por prioridad
 */
export const sortAlertsByPriority = (alertas: StockAlert[]): StockAlert[] => {
  const priority: Record<string, number> = { SIN_STOCK: 1, CRITICO: 2, BAJO: 3, EXCESO: 4, NORMAL: 5 };
  return [...alertas].sort((a, b) => (priority[a.estado] ?? 5) - (priority[b.estado] ?? 5));
};

/**
 * Genera un ID único para movimientos
 */
export const generateMovementId = (): string => {
  return `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Genera un ID legible para transferencias con formato TRF-YYYYMMDD-HHmmss
 */
export const generateTransferId = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `TRF-${date}-${time}`;
};

/**
 * Valida si una cantidad es válida
 */
export const isValidQuantity = (quantity: number): boolean => {
  return !isNaN(quantity) && quantity > 0 && isFinite(quantity);
};

/**
 * Infiere la fuente legible de un movimiento para pantalla y exportación.
 * Usa prefijos de documentoReferencia y campos del modelo, no datos hardcodeados.
 */
export const inferirFuente = (mov: MovimientoStock): string => {
  if (mov.documentoReferencia?.startsWith('IMP-')) return 'Importación masiva';
  if (mov.documentoReferencia?.startsWith('RST-')) return 'Reset de stock';
  if (mov.esTransferencia) return 'Transferencia';
  if (mov.motivo === 'VENTA') return 'Venta';
  if (mov.motivo === 'DEVOLUCION_CLIENTE') {
    if (mov.observaciones?.includes('Reversión anulación')) return 'Anulación comprobante';
    if (mov.observaciones?.includes('Devolución NC')) return 'Nota de crédito';
    return 'Devolución cliente';
  }
  if (mov.motivo === 'AJUSTE_INVENTARIO') return 'Ajuste inventario';
  if (mov.motivo === 'COMPRA') return 'Compra';
  if (mov.motivo === 'PRODUCCION') return 'Producción';
  if (mov.motivo === 'MERMA') return 'Merma';
  return 'Movimiento manual';
};

/**
 * Infiere entidades Transferencia a partir de movimientos con esTransferencia=true
 * que no tienen una entidad correspondiente en el repositorio.
 * Usado para compatibilidad con transferencias creadas antes del tab Transferencias.
 */
export const inferirTransferenciasDesdeMovimientos = (
  movimientos: MovimientoStock[],
  idsEnRepositorio: Set<string>
): Transferencia[] => {
  const grupos = new Map<string, MovimientoStock[]>();

  movimientos
    .filter(m => m.esTransferencia && m.transferenciaId && !idsEnRepositorio.has(m.transferenciaId))
    .forEach(m => {
      const key = m.transferenciaId as string;
      const grupo = grupos.get(key) ?? [];
      grupo.push(m);
      grupos.set(key, grupo);
    });

  return Array.from(grupos.entries()).map(([id, movs]) => {
    const salida = movs.find(m => m.tipo === 'SALIDA');
    const entrada = movs.find(m => m.tipo === 'ENTRADA');
    const ref = salida ?? entrada ?? movs[0];

    return {
      id,
      fecha: ref.fecha,
      productoId: ref.productoId,
      productoCodigo: ref.productoCodigo,
      productoNombre: ref.productoNombre,
      almacenOrigenId: ref.almacenOrigenId ?? salida?.almacenId ?? '',
      almacenOrigenNombre: ref.almacenOrigenNombre ?? salida?.almacenNombre ?? '',
      establecimientoOrigenId: salida?.EstablecimientoId ?? '',
      establecimientoOrigenNombre: salida?.EstablecimientoNombre ?? '',
      almacenDestinoId: ref.almacenDestinoId ?? entrada?.almacenId ?? '',
      almacenDestinoNombre: ref.almacenDestinoNombre ?? entrada?.almacenNombre ?? '',
      establecimientoDestinoId: entrada?.EstablecimientoId ?? '',
      establecimientoDestinoNombre: entrada?.EstablecimientoNombre ?? '',
      cantidad: ref.cantidad,
      tipoTransferencia: ref.tipoTransferencia ?? 'INTRA_ESTABLECIMIENTO',
      estado: 'CONFIRMADA' as const,
      documentoReferencia: ref.documentoReferencia,
      observaciones: ref.observaciones,
      usuario: ref.usuario,
      movimientoSalidaId: salida?.id,
      movimientoEntradaId: entrada?.id,
    };
  });
};

/**
 * Obtiene el label del motivo
 */
export const getMotivoLabel = (motivo: MovimientoStock['motivo']): string => {
  const labels: Record<MovimientoStock['motivo'], string> = {
    COMPRA: 'Compra',
    VENTA: 'Venta',
    AJUSTE_INVENTARIO: 'Ajuste de inventario',
    DEVOLUCION_CLIENTE: 'Devolución de cliente',
    DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
    PRODUCTO_DAÑADO: 'Producto dañado',
    PRODUCTO_VENCIDO: 'Producto vencido',
    ROBO_PERDIDA: 'Robo/Pérdida',
    TRANSFERENCIA_ALMACEN: 'Transferencia entre almacenes',
    PRODUCCION: 'Producción',
    MERMA: 'Merma',
    OTRO: 'Otro'
  };
  return labels[motivo] || motivo;
};
