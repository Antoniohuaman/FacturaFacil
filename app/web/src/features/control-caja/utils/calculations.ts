import type { Movimiento, ResumenCaja, AperturaCaja, MedioPago } from '../models';

/**
 * Calcula el descuadre entre el monto ingresado y el saldo esperado
 */
export const calcularDescuadre = (montoIngresado: number, saldoEsperado: number): number => {
  return montoIngresado - saldoEsperado;
};

/**
 * Calcula el total de ingresos de una lista de movimientos
 */
export const calcularTotalIngresos = (movimientos: Movimiento[]): number => {
  return movimientos
    .filter(m => m.tipo === 'Ingreso')
    .reduce((sum, m) => sum + m.monto, 0);
};

/**
 * Calcula el total de egresos de una lista de movimientos
 */
export const calcularTotalEgresos = (movimientos: Movimiento[]): number => {
  return movimientos
    .filter(m => m.tipo === 'Egreso')
    .reduce((sum, m) => sum + m.monto, 0);
};

/**
 * Calcula el saldo neto (ingresos - egresos)
 */
export const calcularSaldoNeto = (ingresos: number, egresos: number): number => {
  return ingresos - egresos;
};

/**
 * Calcula el total por medio de pago
 */
export const calcularTotalPorMedioPago = (
  movimientos: Movimiento[],
  medioPago: MedioPago,
  montoInicial: number = 0
): number => {
  return movimientos
    .filter(m => m.medioPago === medioPago)
    .reduce((sum, m) => {
      return m.tipo === 'Ingreso' ? sum + m.monto : sum - m.monto;
    }, montoInicial);
};

/**
 * Calcula el resumen completo de la caja
 */
export const calcularResumenCaja = (
  aperturaActual: AperturaCaja | null,
  movimientos: Movimiento[]
): ResumenCaja => {
  if (!aperturaActual) {
    return {
      apertura: 0,
      ingresos: 0,
      egresos: 0,
      saldo: 0,
      totalEfectivo: 0,
      totalTarjeta: 0,
      totalYape: 0,
      totalOtros: 0,
      cantidadMovimientos: 0,
    };
  }

  const ingresos = calcularTotalIngresos(movimientos);
  const egresos = calcularTotalEgresos(movimientos);

  const totalEfectivo = calcularTotalPorMedioPago(
    movimientos,
    'Efectivo',
    aperturaActual.montoInicialEfectivo
  );

  const totalTarjeta = calcularTotalPorMedioPago(
    movimientos,
    'Tarjeta',
    aperturaActual.montoInicialTarjeta
  );

  const totalYape = calcularTotalPorMedioPago(
    movimientos,
    'Yape',
    aperturaActual.montoInicialYape
  );

  // Calcular otros medios (Plin, Transferencia, Deposito)
  const totalOtros = movimientos
    .filter(m => !['Efectivo', 'Tarjeta', 'Yape'].includes(m.medioPago))
    .reduce((sum, m) => {
      return m.tipo === 'Ingreso' ? sum + m.monto : sum - m.monto;
    }, aperturaActual.montoInicialOtros);

  return {
    apertura: aperturaActual.montoInicialTotal,
    ingresos,
    egresos,
    saldo: aperturaActual.montoInicialTotal + ingresos - egresos,
    totalEfectivo,
    totalTarjeta,
    totalYape,
    totalOtros,
    cantidadMovimientos: movimientos.length,
  };
};

/**
 * Calcula el total de montos iniciales
 */
export const calcularMontoInicialTotal = (
  efectivo: number,
  tarjeta: number,
  yape: number,
  otros: number = 0
): number => {
  return efectivo + tarjeta + yape + otros;
};
