import { ensureBusinessDateIso, shiftBusinessDate, toBusinessDate } from '@/shared/time/businessTime';
import type { CreditInstallment } from '../../../../../../shared/payments/paymentTerms';
import type { ComprobanteCreditTerms } from '../../models/comprobante.types';

const MILISEGUNDOS_DIA = 1000 * 60 * 60 * 24;
const redondearDos = (value: number): number => Math.round(value * 100) / 100;

export const obtenerFechaMinimaPrimeraCuota = (fechaEmision: string): string =>
  shiftBusinessDate(ensureBusinessDateIso(fechaEmision), 1);

export const sanitizarImporteTexto = (raw: string): number | null => {
  const limpio = raw.replace(/[^0-9.,]/g, '');
  if (!limpio) {
    return null;
  }
  const tieneComa = limpio.includes(',');
  const tienePunto = limpio.includes('.');
  let normalizado = limpio;

  if (tieneComa && tienePunto) {
    normalizado = limpio.replace(/,/g, '');
  } else if (tieneComa) {
    normalizado = limpio.replace(/,/g, '.');
  }

  const partes = normalizado.split('.');
  if (partes.length > 2) {
    normalizado = `${partes.shift()}.${partes.join('')}`;
  }

  const valor = Number.parseFloat(normalizado);
  if (!Number.isFinite(valor)) {
    return null;
  }
  return Math.max(0, valor);
};

export const calcularDiasDesdeEmision = (fechaEmision: string, fechaVencimiento?: string): number => {
  if (!fechaVencimiento) {
    return 0;
  }
  const emision = toBusinessDate(ensureBusinessDateIso(fechaEmision), 'start');
  const vencimiento = toBusinessDate(fechaVencimiento, 'start');
  if (!emision || !vencimiento) {
    return 0;
  }
  const diferencia = Math.floor((vencimiento.getTime() - emision.getTime()) / MILISEGUNDOS_DIA);
  return Math.max(0, diferencia);
};

export const normalizarCuotasManual = (
  cuotas: CreditInstallment[],
  total: number,
  fechaEmision: string,
): CreditInstallment[] => {
  const totalSeguro = Math.max(0, Number(total) || 0);
  const baseEmision = ensureBusinessDateIso(fechaEmision);

  return cuotas.map((cuota, index) => {
    const fechaVencimiento = cuota.fechaVencimiento || '';
    const importe = Number.isFinite(cuota.importe) ? Math.max(0, Number(cuota.importe)) : Number.NaN;
    const porcentaje = (totalSeguro > 0 && Number.isFinite(importe))
      ? redondearDos((importe / totalSeguro) * 100)
      : 0;
    const diasCredito = fechaVencimiento ? calcularDiasDesdeEmision(baseEmision, fechaVencimiento) : 0;

    return {
      ...cuota,
      numeroCuota: index + 1,
      fechaVencimiento,
      diasCredito,
      porcentaje,
      importe,
      pagado: 0,
      saldo: Number.isFinite(importe) ? importe : 0,
      estado: 'pendiente',
      pagos: cuota.pagos ?? [],
    };
  });
};

export const validarFechasManual = (
  cuotas: CreditInstallment[],
  fechaEmision: string,
): boolean => {
  if (!cuotas.length) {
    return false;
  }

  const baseEmision = ensureBusinessDateIso(fechaEmision);
  const minimoPrimera = obtenerFechaMinimaPrimeraCuota(baseEmision);

  const primera = cuotas[0];
  if (!primera?.fechaVencimiento) {
    return false;
  }
  const primeraDate = toBusinessDate(primera.fechaVencimiento, 'start');
  const minimoDate = toBusinessDate(minimoPrimera, 'start');
  if (!primeraDate || !minimoDate) {
    return false;
  }
  if (primeraDate.getTime() < minimoDate.getTime()) {
    return false;
  }

  let fechaAnterior = primera.fechaVencimiento;

  return cuotas.every((cuota, index) => {
    if (!cuota.fechaVencimiento) {
      return false;
    }
    if (index === 0) {
      return true;
    }
    const fechaActual = toBusinessDate(cuota.fechaVencimiento, 'start');
    const fechaPrev = toBusinessDate(fechaAnterior, 'start');
    if (!fechaActual || !fechaPrev) {
      return false;
    }
    const esValida = fechaActual.getTime() >= fechaPrev.getTime();
    if (!esValida) {
      return false;
    }
    fechaAnterior = cuota.fechaVencimiento;
    return true;
  });
};

export const sumarImportes = (cuotas: CreditInstallment[]): number =>
  cuotas.reduce((acc, cuota) => (
    Number.isFinite(cuota.importe) ? acc + Number(cuota.importe) : acc
  ), 0);

export const construirCreditTermsManual = (
  cuotas: CreditInstallment[],
  total: number,
  fechaEmision: string,
): ComprobanteCreditTerms | undefined => {
  if (!cuotas.length) {
    return undefined;
  }

  const normalizadas = normalizarCuotasManual(cuotas, total, fechaEmision);

  return {
    schedule: normalizadas,
    fechaVencimientoGlobal: normalizadas[normalizadas.length - 1]?.fechaVencimiento || '',
    totalPorcentaje: normalizadas.reduce((acc, cuota) => acc + cuota.porcentaje, 0),
  };
};
