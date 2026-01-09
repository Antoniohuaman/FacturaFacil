import type { CuentaPorCobrarSummary, CobranzaDocumento, CreditoPagadoResumen } from '../models/cobranzas.types';

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

const splitOperationRefs = (raw?: string | null): string[] => {
  if (!raw) return [];
  return raw
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const isCuentaContado = (cuenta?: CuentaPorCobrarSummary) => {
  if (!cuenta) return false;
  return cuenta.formaPago === 'contado' || !cuenta.creditTerms;
};

type InstallmentApplicationFlag = 'cuota_cancelada' | 'abono_parcial';

const getAplicacionFromDocument = (cobranza: CobranzaDocumento): InstallmentApplicationFlag | null => {
  const flag = (cobranza as { installmentApplication?: InstallmentApplicationFlag }).installmentApplication;
  if (!flag) return null;
  return flag;
};

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

export const getCobranzaEstadoDocumentoLabel = (cobranza: CobranzaDocumento): string =>
  cobranza.estado === 'anulado' ? 'anulado' : 'cobrado';

export const getCobranzaTipoCobroLabel = (
  cobranza: CobranzaDocumento,
  relatedCuenta?: CuentaPorCobrarSummary
): string => {
  if (isCuentaContado(relatedCuenta)) {
    return 'venta al contado';
  }

  const flag = getAplicacionFromDocument(cobranza);
  if (flag === 'cuota_cancelada') {
    return 'cuota cancelada';
  }
  if (flag === 'abono_parcial') {
    return 'abono parcial';
  }

  return cobranza.estado === 'parcial' ? 'abono parcial' : 'cuota cancelada';
};

export const getCobranzaOperacionLabel = (cobranza: CobranzaDocumento): string => {
  const refs = splitOperationRefs(cobranza.referencia);
  if (!refs.length) return '—';
  if (refs.length === 1) return refs[0];
  return `${refs[0]} (+${refs.length - 1})`;
};

export const getCobranzaOperacionDetailLabel = (cobranza: CobranzaDocumento): string => {
  const refs = splitOperationRefs(cobranza.referencia);
  if (!refs.length) return '—';
  return `${cobranza.medioPago || 'Medio'}: ${refs.join(', ')}`;
};

export const getCobranzaMedioPagoLabel = (cobranza: CobranzaDocumento): string => {
  const medio = cobranza.medioPago?.trim();
  if (!medio) return '—';

  if (medio.toLowerCase() === 'mixto') {
    const refs = splitOperationRefs(cobranza.referencia);
    return refs.length > 1 ? `Mixto (${refs.length})` : 'Mixto';
  }

  return medio;
};

export const buildCobranzasExportRows = (
  cobranzas: Array<CobranzaWithAmount & { relatedCuenta?: CuentaPorCobrarSummary }>,
  formatMoney: (value: number, currency?: string) => string,
) => {
  return cobranzas.map((cobranza) => {
    const snapshot = getCobranzaInstallmentSnapshot(cobranza);
    return {
      Documento: cobranza.numero,
      Fecha: cobranza.fechaCobranza,
      'Comprobante relacionado': `${cobranza.comprobanteSerie}-${cobranza.comprobanteNumero}`,
      Cliente: cobranza.clienteNombre,
      'Estado (documento)': getCobranzaEstadoDocumentoLabel(cobranza),
      'Tipo de cobro': getCobranzaTipoCobroLabel(cobranza, (cobranza as { relatedCuenta?: CuentaPorCobrarSummary }).relatedCuenta),
      'Medio de pago': getCobranzaMedioPagoLabel(cobranza),
      'N° operación': getCobranzaOperacionDetailLabel(cobranza),
      Caja: cobranza.cajaDestino,
      'Cuotas': formatCobranzaCuotasLabel(snapshot),
      Importe: formatMoney(cobranza.displayAmount ?? cobranza.monto, cobranza.moneda),
    } as const;
  });
};

export const buildCreditosPagadosExportRows = (
  creditos: CreditoPagadoResumen[],
  formatMoney: (value: number, currency?: string) => string,
) => {
  return creditos.map((item) => ({
    Comprobante: `${item.cuenta.comprobanteSerie}-${item.cuenta.comprobanteNumero}`,
    Emisión: item.cuenta.fechaEmision,
    Cliente: item.cuenta.clienteNombre,
    Cuotas: item.cuotasLabel,
    Total: formatMoney(item.cuenta.total, item.cuenta.moneda),
    Cancelación: item.cancelacion ?? '',
    Cobros: item.cobrosCount,
  } as const));
};
