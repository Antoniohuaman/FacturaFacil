import type { TableColumnDefinition } from './types';

export type CuentasPorCobrarColumnKey =
  | 'cliente'
  | 'comprobante'
  | 'fechaEmision'
  | 'fechaVencimiento'
  | 'formaPago'
  | 'cuotas'
  | 'total'
  | 'cobrado'
  | 'saldo'
  | 'estado'
  | 'acciones';

export type CobranzasColumnKey =
  | 'documento'
  | 'fecha'
  | 'comprobante'
  | 'cliente'
  | 'medioPago'
  | 'caja'
  | 'cuotas'
  | 'importe'
  | 'estado'
  | 'acciones';

export const CUENTAS_POR_COBRAR_COLUMNS: TableColumnDefinition<CuentasPorCobrarColumnKey>[] = [
  { key: 'cliente', label: 'Cliente', defaultVisible: true, fixed: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3' },
  { key: 'comprobante', label: 'Comprobante', defaultVisible: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3' },
  { key: 'fechaEmision', label: 'F. emisión', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' },
  { key: 'fechaVencimiento', label: 'F. vencimiento', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' },
  { key: 'formaPago', label: 'Forma', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' },
  { key: 'cuotas', label: 'Cuotas', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' },
  { key: 'total', label: 'Total', defaultVisible: true, headerClassName: 'text-right', cellClassName: 'px-4 py-3 text-right font-medium' },
  { key: 'cobrado', label: 'Cobrado', defaultVisible: true, headerClassName: 'text-right', cellClassName: 'px-4 py-3 text-right text-slate-500' },
  { key: 'saldo', label: 'Saldo', defaultVisible: true, headerClassName: 'text-right', cellClassName: 'px-4 py-3 text-right font-semibold' },
  { key: 'estado', label: 'Estado', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' },
  { key: 'acciones', label: 'Acciones', defaultVisible: true, fixed: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' }
];

export const COBRANZAS_COLUMNS: TableColumnDefinition<CobranzasColumnKey>[] = [
  { key: 'documento', label: 'Documento', defaultVisible: true, fixed: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3' },
  { key: 'fecha', label: 'Fecha', defaultVisible: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3 text-xs font-medium' },
  { key: 'comprobante', label: 'Comprobante relacionado', defaultVisible: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3' },
  { key: 'cliente', label: 'Cliente', defaultVisible: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3' },
  { key: 'medioPago', label: 'Medio de pago', defaultVisible: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3 text-xs font-medium' },
  { key: 'caja', label: 'Caja', defaultVisible: true, headerClassName: 'text-left', cellClassName: 'px-4 py-3 text-xs' },
  { key: 'cuotas', label: 'Cuotas', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center text-xs' },
  { key: 'importe', label: 'Importe', defaultVisible: true, headerClassName: 'text-right', cellClassName: 'px-4 py-3 text-right font-semibold' },
  { key: 'estado', label: 'Estado', defaultVisible: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' },
  { key: 'acciones', label: 'Acciones', defaultVisible: true, fixed: true, headerClassName: 'text-center', cellClassName: 'px-4 py-3 text-center' }
];
