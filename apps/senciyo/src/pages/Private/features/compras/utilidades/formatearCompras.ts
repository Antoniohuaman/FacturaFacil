export function formatearNumeroCompra(serie: string, correlativo: string | number): string {
  const corr =
    typeof correlativo === 'number'
      ? String(correlativo).padStart(8, '0')
      : correlativo;
  return `${serie}-${corr}`;
}

export function formatearMonedaCompra(monto: number, moneda: string): string {
  const simbolos: Record<string, string> = { PEN: 'S/', USD: 'US$', EUR: '€' };
  return `${simbolos[moneda] ?? moneda} ${monto.toFixed(2)}`;
}

export function formatearFechaCompra(isoDate: string): string {
  if (!isoDate) return '—';
  const partes = isoDate.split('T')[0].split('-');
  const [year, month, day] = partes;
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
