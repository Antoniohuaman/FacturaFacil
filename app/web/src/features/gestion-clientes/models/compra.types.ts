export type TipoComprobante = 'Factura' | 'Boleta' | 'NotaCredito' | 'NotaDebito';
export type EstadoCompra = 'Pagado' | 'Pendiente' | 'Cancelado' | 'Anulado';

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
  estado: EstadoCompra;
  productos: number;
  clienteId: number | string;
}

export interface CompraDetalle {
  id: number | string;
  fecha: string;
  comprobante: string;
  tipoComprobante: TipoComprobante;
  monto: number;
  estado: EstadoCompra;
  productos: Producto[];
  cliente: {
    nombre: string;
    documento: string;
  };
  vendedor: string;
  metodoPago: string;
  observaciones?: string;
  subtotal: number;
  igv: number;
  total: number;
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
