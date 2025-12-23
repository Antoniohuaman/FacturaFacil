import type { CuentaPorCobrarSummary, CobranzaDocumento } from '../models/cobranzas.types';

type CobranzaWithAmount = CobranzaDocumento & { displayAmount?: number };

export interface CuentaInstallmentStats {
  total: number;
  pending: number;
  partial: number;
  canceled: number;
}

export interface CobranzaInstallmentSnapshot {
  ratio: string;
  caption: string;
  total: number;
  pending: number;
  paid: number;
}

export const getCuentaInstallmentStats = (cuenta: CuentaPorCobrarSummary): CuentaInstallmentStats | null => {
  let total = cuenta.totalInstallments;
  let pending = cuenta.pendingInstallmentsCount;
  const partial = cuenta.partialInstallmentsCount ?? 0;

  if (typeof total !== 'number' && cuenta.creditTerms?.schedule?.length) {
    total = cuenta.creditTerms.schedule.length;
  }

  if (typeof pending !== 'number' && typeof total === 'number') {
    pending = total;
  }

  if (typeof total !== 'number' || typeof pending !== 'number') {
    return null;
  }

  const canceled = Math.max(0, total - pending);

  return {
    total,
    pending,
    partial,
    canceled,
  };
};

export const formatCuentaFormaPago = (cuenta: CuentaPorCobrarSummary): string => {
  if (cuenta.formaPago !== 'credito' || !cuenta.creditTerms) {
    return cuenta.formaPago;
  }

  const cuotas = cuenta.creditTerms.schedule?.length;
  const vencimiento = cuenta.creditTerms.fechaVencimientoGlobal;
  const detalleCuotas = typeof cuotas === 'number' && cuotas > 0 ? `${cuotas} cuota${cuotas === 1 ? '' : 's'}` : 'Crédito';
  return `${detalleCuotas}${vencimiento ? ` · vence ${vencimiento}` : ''}`;
};

export const formatCuentaCuotasLabel = (stats: CuentaInstallmentStats | null): string => {
  if (!stats || stats.total === 0) {
    return '—';
  }

  return `${stats.pending}/${stats.total}`;
};

export const getCobranzaInstallmentSnapshot = (cobranza: CobranzaDocumento): CobranzaInstallmentSnapshot | null => {
  const info = cobranza.installmentsInfo;
  if (!info || info.total === 0) {
    return null;
  }

  const paid = Math.max(0, info.total - info.pending);
  const ratio = cobranza.estado === 'cancelado'
    ? `${info.total}/${info.total}`
    : `${paid}/${info.total}`;
  const caption = cobranza.estado === 'cancelado' ? 'Cuotas totales' : 'Cuotas pagadas';

  return {
    ratio,
    caption,
    total: info.total,
    pending: info.pending,
    paid,
  };
};

export const formatCobranzaCuotasLabel = (snapshot: CobranzaInstallmentSnapshot | null): string => {
  if (!snapshot || snapshot.total === 0) {
    return '—';
  }
  return snapshot.ratio;
};

export const buildCuentasExportRows = (
  cuentas: CuentaPorCobrarSummary[],
  formatMoney: (value: number, currency?: string) => string,
) => {
  return cuentas.map((cuenta) => {
    const stats = getCuentaInstallmentStats(cuenta);
    return {
      Cliente: cuenta.clienteNombre,
      'Doc. cliente': cuenta.clienteDocumento,
      Comprobante: `${cuenta.comprobanteSerie}-${cuenta.comprobanteNumero} (${cuenta.tipoComprobante})`,
      'Fecha emisión': cuenta.fechaEmision,
      'Fecha vencimiento': cuenta.fechaVencimiento ?? '',
      Forma: formatCuentaFormaPago(cuenta),
      'Cuotas (pendientes/total)': formatCuentaCuotasLabel(stats),
      Total: formatMoney(cuenta.total, cuenta.moneda),
      Cobrado: formatMoney(cuenta.cobrado, cuenta.moneda),
      Saldo: formatMoney(cuenta.saldo, cuenta.moneda),
      Estado: cuenta.estado,
    } as const;
  });
};

export const buildCobranzasExportRows = (
  cobranzas: CobranzaWithAmount[],
  formatMoney: (value: number, currency?: string) => string,
) => {
  return cobranzas.map((cobranza) => {
    const snapshot = getCobranzaInstallmentSnapshot(cobranza);
    return {
      Documento: cobranza.numero,
      Fecha: cobranza.fechaCobranza,
      'Comprobante relacionado': `${cobranza.comprobanteSerie}-${cobranza.comprobanteNumero}`,
      Cliente: cobranza.clienteNombre,
      'Medio de pago': cobranza.medioPago,
      Caja: cobranza.cajaDestino,
      'Cuotas': formatCobranzaCuotasLabel(snapshot),
      Importe: formatMoney(cobranza.displayAmount ?? cobranza.monto, cobranza.moneda),
      Estado: cobranza.estado,
    } as const;
  });
};
