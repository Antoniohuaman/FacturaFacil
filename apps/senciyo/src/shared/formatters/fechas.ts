// shared/formatters/fechas.ts
//
// Formato de fecha estándar del sistema (dd/MM/yyyy) — fuente única para
// cualquier dominio que muestre una fecha ISO al usuario. Nunca fechas ISO
// crudas en pantalla. `compras/utilidades/formatearCompras.ts` reexporta esta
// misma función como `formatearFechaCompra` por compatibilidad; Gastos la
// importa directamente.

export function formatearFecha(isoDate: string): string {
  if (!isoDate) return '—';
  const partes = isoDate.split('T')[0].split('-');
  const [year, month, day] = partes;
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
