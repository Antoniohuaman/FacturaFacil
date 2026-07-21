import { tryLsKey } from '@/shared/tenant';
import { CLAVES_COMPRAS } from '../constantes/clavesAlmacenamientoCompras';
import type { RequerimientoCompra } from '../modelos/RequerimientoCompra';

export const EVENTO_RC_CAMBIADA = 'compras_requerimientos_cambiada';

const obtenerClave = (): string =>
  tryLsKey(CLAVES_COMPRAS.REQUERIMIENTOS_COMPRA) ?? CLAVES_COMPRAS.REQUERIMIENTOS_COMPRA;

export function cargarRequerimientosCompra(): RequerimientoCompra[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as RequerimientoCompra[];
  } catch {
    return [];
  }
}

export function guardarRequerimientosCompra(requerimientos: RequerimientoCompra[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(requerimientos));
    window.dispatchEvent(new Event(EVENTO_RC_CAMBIADA));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

export function obtenerRCPorId(id: string): RequerimientoCompra | undefined {
  return cargarRequerimientosCompra().find((r) => r.id === id);
}

export function agregarOActualizarRC(requerimiento: RequerimientoCompra): void {
  const requerimientos = cargarRequerimientosCompra();
  const idx = requerimientos.findIndex((r) => r.id === requerimiento.id);
  if (idx >= 0) {
    requerimientos[idx] = requerimiento;
  } else {
    requerimientos.unshift(requerimiento);
  }
  guardarRequerimientosCompra(requerimientos);
}

export function eliminarRCDelStorage(rcId: string): void {
  const requerimientos = cargarRequerimientosCompra();
  guardarRequerimientosCompra(requerimientos.filter((r) => r.id !== rcId));
}
