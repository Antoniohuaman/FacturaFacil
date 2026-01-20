// Tipos y modelos para el módulo de Control de Caja

import type { MedioPago as SharedMedioPago } from '../../../../../shared/payments/medioPago';

export type MedioPago = SharedMedioPago;
export type CajaStatus = 'abierta' | 'cerrada';
export type TipoMovimiento = 'Ingreso' | 'Egreso' | 'Transferencia' | 'Apertura' | 'Cierre';

export interface AperturaCaja {
  id: string;
  cajaId: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaHoraApertura: Date;
  montoInicialEfectivo: number;
  montoInicialTarjeta: number;
  montoInicialYape: number;
  montoInicialOtros: number;
  montoInicialTotal: number;
  notas?: string;
}

export interface CierreCaja {
  id: string;
  aperturaId: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaHoraCierre: Date;
  montoFinalEfectivo: number;
  montoFinalTarjeta: number;
  montoFinalYape: number;
  montoFinalOtros: number;
  montoFinalTotal: number;
  descuadre: number;
  observaciones?: string;
}

export interface ResumenCaja {
  apertura: number;
  ingresos: number;
  egresos: number;
  saldo: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalYape: number;
  totalOtros: number;
  cantidadMovimientos: number;
}

export interface Movimiento {
  id: string;
  cajaId: string;
  aperturaId: string;
  tipo: TipoMovimiento;
  concepto: string;
  medioPago: MedioPago;
  paymentMeanCode?: string;
  paymentMeanLabel?: string;
  monto: number;
  referencia?: string;
  fecha: Date;
  usuarioId: string;
  usuarioNombre: string;
  comprobante?: string;
  observaciones?: string;
}

export interface ConfiguracionCaja {
  margenDescuadreCaja: number;
  limiteMaximoCaja: number;
  mediosPagoPermitidos: string[];
  usuariosAutorizadosCaja: string[];
}
