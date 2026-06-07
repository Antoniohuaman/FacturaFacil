// src/features/gestion-inventario/models/notaSalida.constants.ts

import type { TipoSalida } from './notaSalida.types';

export interface DescripcionTipoSalida {
  codigo: TipoSalida;
  descripcion: string;
}

export const TIPOS_SALIDA: DescripcionTipoSalida[] = [
  { codigo: '01', descripcion: 'Venta nacional' },
  { codigo: '04', descripcion: 'Consignación entregada' },
  { codigo: '06', descripcion: 'Devolución entregada' },
  { codigo: '07', descripcion: 'Bonificación' },
  { codigo: '08', descripcion: 'Premio' },
  { codigo: '09', descripcion: 'Donación' },
  { codigo: '10', descripcion: 'Salida a producción' },
  { codigo: '11', descripcion: 'Salida por transferencia entre almacenes' },
  { codigo: '12', descripcion: 'Retiro' },
  { codigo: '13', descripcion: 'Mermas' },
  { codigo: '14', descripcion: 'Desmedros' },
  { codigo: '15', descripcion: 'Destrucción' },
  { codigo: '17', descripcion: 'Exportación' },
  { codigo: '23', descripcion: 'Salida por identificación errónea' },
  { codigo: '25', descripcion: 'Salida por devolución al proveedor' },
  { codigo: '27', descripcion: 'Salida por servicio de producción' },
  { codigo: '28', descripcion: 'Ajuste por diferencia de inventario' },
  { codigo: '30', descripcion: 'Salida de bienes en préstamo' },
  { codigo: '32', descripcion: 'Salida de bienes en custodia' },
  { codigo: '33', descripcion: 'Muestras médicas' },
  { codigo: '34', descripcion: 'Publicidad' },
  { codigo: '35', descripcion: 'Gastos de representación' },
  { codigo: '36', descripcion: 'Retiro para entrega a trabajadores' },
  { codigo: '37', descripcion: 'Retiro por convenio colectivo' },
  { codigo: '38', descripcion: 'Retiro por sustitución de bien siniestrado' },
];

export const TIPO_SALIDA_LABEL: Record<TipoSalida, string> = {
  '01': 'Venta nacional',
  '04': 'Consignación entregada',
  '06': 'Devolución entregada',
  '07': 'Bonificación',
  '08': 'Premio',
  '09': 'Donación',
  '10': 'Salida a producción',
  '11': 'Salida por transferencia entre almacenes',
  '12': 'Retiro',
  '13': 'Mermas',
  '14': 'Desmedros',
  '15': 'Destrucción',
  '17': 'Exportación',
  '23': 'Salida por identificación errónea',
  '25': 'Salida por devolución al proveedor',
  '27': 'Salida por servicio de producción',
  '28': 'Ajuste por diferencia de inventario',
  '30': 'Salida de bienes en préstamo',
  '32': 'Salida de bienes en custodia',
  '33': 'Muestras médicas',
  '34': 'Publicidad',
  '35': 'Gastos de representación',
  '36': 'Retiro para entrega a trabajadores',
  '37': 'Retiro por convenio colectivo',
  '38': 'Retiro por sustitución de bien siniestrado',
};

// Tipos de salida que requieren cliente identificado
export const TIPOS_SALIDA_CON_CLIENTE: TipoSalida[] = [
  '01', // Venta nacional
  '04', // Consignación entregada
  '06', // Devolución entregada
  '09', // Donación
  '30', // Bienes en préstamo
  '32', // Bienes en custodia
  '33', // Muestras médicas
];

export const STORAGE_KEY_NOTAS_SALIDA = 'notas_salida_v1';
export const NOTAS_SALIDA_CHANGED_EVENT = 'facturafacil:notas-salida-changed';

export const CORRELATIVO_DIGITOS_NS = 8;

export const FORMAS_PAGO_NS: Array<{ value: string; label: string }> = [
  { value: 'Contado', label: 'Contado' },
  { value: 'Credito', label: 'Crédito' },
  { value: 'Transferencia', label: 'Transferencia bancaria' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Efectivo', label: 'Efectivo' },
];

export const METODOS_ENVIO_NS: Array<{ value: string; label: string }> = [
  { value: 'Propio', label: 'Transporte propio' },
  { value: 'Tercero', label: 'Transporte por tercero' },
  { value: 'Cliente', label: 'Recojo por cliente' },
];

export const ESTADO_NS_BADGE: Record<string, { label: string; cls: string }> = {
  Borrador: {
    label: 'Borrador',
    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  },
  Generada: {
    label: 'Generada',
    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700',
  },
  Entregada: {
    label: 'Entregada',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700',
  },
  Anulada: {
    label: 'Anulada',
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700',
  },
};
