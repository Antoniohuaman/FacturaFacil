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

/** Calcula el siguiente número correlativo de pago para una serie, a partir de los pagos ya registrados. */
export function siguienteNumeroPago(pagos: Array<{ numeroPago: string }>, serie: string): string {
  const prefijo = serie;
  const existentes = pagos
    .filter((p) => p.numeroPago.startsWith(`${prefijo}-`))
    .map((p) => parseInt(p.numeroPago.split('-').pop() ?? '0', 10))
    .filter((n) => !isNaN(n));
  const siguiente = existentes.length > 0 ? Math.max(...existentes) + 1 : 1;
  return `${prefijo}-${String(siguiente).padStart(8, '0')}`;
}
