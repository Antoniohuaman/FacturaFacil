import { tryLsKey } from '@/shared/tenant';
import { CLAVES_COMPRAS } from '../constantes/clavesAlmacenamientoCompras';
import type { OrdenCompra } from '../modelos/OrdenCompra';

export const EVENTO_OC_CAMBIADA = 'compras_ordenes_cambiada';

const obtenerClave = (): string =>
  tryLsKey(CLAVES_COMPRAS.ORDENES_COMPRA) ?? CLAVES_COMPRAS.ORDENES_COMPRA;

export function cargarOrdenesCompra(): OrdenCompra[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as OrdenCompra[];
  } catch {
    return [];
  }
}

export function guardarOrdenesCompra(ordenes: OrdenCompra[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(ordenes));
    window.dispatchEvent(new Event(EVENTO_OC_CAMBIADA));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

export function persistirOrdenesCompra(
  ordenes: OrdenCompra[],
): { exito: true } | { exito: false; error: string } {
  if (typeof window === 'undefined') {
    return { exito: false, error: 'Almacenamiento no disponible en este entorno.' };
  }
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(ordenes));
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      return { exito: false, error: 'Sin espacio de almacenamiento disponible.' };
    }
    return {
      exito: false,
      error: `Error al guardar: ${causa instanceof Error ? causa.message : 'desconocido'}.`,
    };
  }
  window.dispatchEvent(new Event(EVENTO_OC_CAMBIADA));
  return { exito: true };
}

export function obtenerOCPorId(id: string): OrdenCompra | undefined {
  return cargarOrdenesCompra().find((o) => o.id === id);
}

export function agregarOActualizarOC(orden: OrdenCompra): void {
  const ordenes = cargarOrdenesCompra();
  const idx = ordenes.findIndex((o) => o.id === orden.id);
  if (idx >= 0) {
    ordenes[idx] = orden;
  } else {
    ordenes.unshift(orden);
  }
  guardarOrdenesCompra(ordenes);
}

export function eliminarOCDelStorage(ocId: string): void {
  const ordenes = cargarOrdenesCompra();
  guardarOrdenesCompra(ordenes.filter((o) => o.id !== ocId));
}
