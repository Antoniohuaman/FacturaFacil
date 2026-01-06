import type { Comprobante } from '../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import type { CobranzaStatus } from '../../gestion-cobranzas/models/cobranzas.types';

export type TipoComprobante = string;
export type EstadoComprobante = Comprobante['status'];
export type EstadoComprobanteColor = Comprobante['statusColor'];
export type EstadoCobro = CobranzaStatus;

export interface Producto {
  id: number | string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Compra {
  id: number | string;
  fecha: string;
  comprobante: string;
  tipoComprobante: TipoComprobante;
  monto: number;
  moneda?: string;
  estadoComprobante: EstadoComprobante | 'Emitido' | 'Anulado';
  estadoComprobanteColor?: EstadoComprobanteColor;
  estadoCobro?: EstadoCobro;
  productos: number;
  clienteId: number | string;
  items?: Producto[];
  metodoPago?: string;
  cuentaId?: string;
}

export interface CompraDetalle {
  id: number | string;
  fecha: string;
  comprobante: string;
  tipoComprobante: TipoComprobante;
  monto: number;
  moneda?: string;
  estadoComprobante: EstadoComprobante | 'Emitido' | 'Anulado';
  estadoComprobanteColor?: EstadoComprobanteColor;
  estadoCobro?: EstadoCobro;
  productos: Producto[];
  cliente: {
    nombre: string;
    documento: string;
  };
  vendedor: string;
  metodoPago?: string;
  observaciones?: string;
  subtotal?: number | null;
  igv?: number | null;
  total: number;
}

export interface CobroResumen {
  id: string;
  numero: string;
  fecha: string;
  comprobanteId: string;
  comprobanteNumero?: string;
  medioPago: string;
  monto: number;
  moneda?: string;
  estado: EstadoCobro;
}

export interface ImportHistory {
  id: string;
  fecha: string;
  archivo: string;
  totalRegistros: number;
  registrosImportados: number;
  registrosErroneos: number;
  estado: 'completado' | 'parcial' | 'fallido';
  errores?: string[];
}
