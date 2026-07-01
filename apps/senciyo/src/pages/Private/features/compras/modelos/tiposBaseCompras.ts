export type MonedaCompra = 'PEN' | 'USD' | 'EUR';

export interface TotalesCompra {
  subtotal: number;
  subtotalExonerado: number;
  subtotalInafecto: number;
  descuentoTotal: number;
  igv: number;
  retencion?: number;
  percepcion?: number;
  detraccion?: number;
  total: number;
  moneda: MonedaCompra;
}

export interface DatosDetraccionCompra {
  codigoCatalogo54: string;
  descripcion: string;
  porcentaje: number;
  montoBase: number;
  montoDetraccion: number;
  cuentaDeposito?: string;
  fechaDeposito?: string;
}

export interface DatosPercepcionCompra {
  tasaPercepcion: number;
  montoPercepcion: number;
  totalConPercepcion: number;
}

export interface DatosRetencionCompra {
  tasaRetencion: number;
  montoRetencion: number;
  netoAPagar: number;
}
