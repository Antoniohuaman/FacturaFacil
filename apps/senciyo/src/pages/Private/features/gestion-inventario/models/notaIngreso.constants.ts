// src/features/gestion-inventario/models/notaIngreso.constants.ts

import type { TipoIngreso } from './notaIngreso.types';

export interface DescripcionTipoIngreso {
  codigo: TipoIngreso;
  descripcion: string;
}

export const TIPOS_INGRESO: DescripcionTipoIngreso[] = [
  { codigo: '02', descripcion: 'Compra nacional' },
  { codigo: '03', descripcion: 'Consignación recibida' },
  { codigo: '05', descripcion: 'Devolución recibida' },
  { codigo: '16', descripcion: 'Saldo inicial' },
  { codigo: '18', descripcion: 'Importación' },
  { codigo: '19', descripcion: 'Entrada de producción' },
  { codigo: '20', descripcion: 'Entrada por devolución de producción' },
  { codigo: '21', descripcion: 'Entrada por transferencia entre almacenes' },
  { codigo: '22', descripcion: 'Entrada por identificación errónea' },
  { codigo: '24', descripcion: 'Entrada por devolución del cliente' },
  { codigo: '26', descripcion: 'Entrada para servicio de producción' },
  { codigo: '28', descripcion: 'Ajuste por diferencia de inventario' },
  { codigo: '29', descripcion: 'Entrada de bienes en préstamo' },
  { codigo: '31', descripcion: 'Entrada de bienes en custodia' },
];

export const TIPO_INGRESO_LABEL: Record<TipoIngreso, string> = {
  '02': 'Compra nacional',
  '03': 'Consignación recibida',
  '05': 'Devolución recibida',
  '16': 'Saldo inicial',
  '18': 'Importación',
  '19': 'Entrada de producción',
  '20': 'Entrada por devolución de producción',
  '21': 'Entrada por transferencia entre almacenes',
  '22': 'Entrada por identificación errónea',
  '24': 'Entrada por devolución del cliente',
  '26': 'Entrada para servicio de producción',
  '28': 'Ajuste por diferencia de inventario',
  '29': 'Entrada de bienes en préstamo',
  '31': 'Entrada de bienes en custodia',
};

// Tipos que requieren proveedor identificado
export const TIPOS_INGRESO_CON_PROVEEDOR: TipoIngreso[] = [
  '02', '03', '05', '18', '24', '29', '31',
];

export const STORAGE_KEY_NOTAS_INGRESO = 'notas_ingreso_v1';

export const CORRELATIVO_DIGITOS_NI = 8;

export const ESTADO_NI_BADGE: Record<string, { label: string; cls: string }> = {
  Borrador: {
    label: 'Borrador',
    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  },
  Generada: {
    label: 'Generada',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700',
  },
  Anulada: {
    label: 'Anulada',
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700',
  },
};
