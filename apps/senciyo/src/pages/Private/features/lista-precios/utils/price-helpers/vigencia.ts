import type { FixedPrice, VolumePrice } from '../../models/PriceTypes';

export const DIAS_PROXIMO_VENCIMIENTO = 30;

export type EstadoVigencia =
  | 'vigente'
  | 'vencido'
  | 'por-vencer'
  | 'programado'
  | 'sin-vigencia';

function sumarDias(fechaIso: string, dias: number): string {
  const [a, m, d] = fechaIso.split('-').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

export function obtenerEstadoVigencia(
  precio: FixedPrice | VolumePrice,
  hoyIso: string,
): EstadoVigencia {
  const { validFrom, validUntil } = precio;

  if (!validFrom && !validUntil) return 'sin-vigencia';
  if (validFrom && validFrom > hoyIso) return 'programado';
  if (validUntil && validUntil < hoyIso) return 'vencido';

  if (validUntil) {
    const limite = sumarDias(hoyIso, DIAS_PROXIMO_VENCIMIENTO);
    if (validUntil <= limite) return 'por-vencer';
  }

  return 'vigente';
}
