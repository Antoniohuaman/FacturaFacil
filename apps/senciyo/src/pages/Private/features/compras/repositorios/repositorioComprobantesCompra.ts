import { lsKey } from '@/shared/tenant';
import { CLAVES_COMPRAS } from '../constantes/clavesAlmacenamientoCompras';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';

export const EVENTO_CC_CAMBIADA = 'compras_comprobantes_cambiada';

/**
 * GAS-P3-001: `lsKey` (nunca `tryLsKey(...) ?? CLAVE`) — el Comprobante de
 * Compra es dato tenantizado obligatorio (y desde GAS-P2-001 también lo
 * consume la proyección consolidada de gasto operativo), nunca debe caer a
 * una clave sin namespace de empresa. Ver `repositorioCuentasPorPagar.ts`.
 */
const obtenerClave = (): string => lsKey(CLAVES_COMPRAS.COMPROBANTES_COMPRA);

export function cargarComprobantesCompra(): ComprobanteCompra[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ComprobanteCompra[];
  } catch {
    return [];
  }
}

export function guardarComprobantesCompra(comprobantes: ComprobanteCompra[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(comprobantes));
    window.dispatchEvent(new Event(EVENTO_CC_CAMBIADA));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

export function persistirComprobantesCompra(
  comprobantes: ComprobanteCompra[],
): { exito: true } | { exito: false; error: string } {
  if (typeof window === 'undefined') {
    return { exito: false, error: 'Almacenamiento no disponible en este entorno.' };
  }
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(comprobantes));
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      return { exito: false, error: 'Sin espacio de almacenamiento disponible.' };
    }
    return {
      exito: false,
      error: `Error al guardar: ${causa instanceof Error ? causa.message : 'desconocido'}.`,
    };
  }
  window.dispatchEvent(new Event(EVENTO_CC_CAMBIADA));
  return { exito: true };
}

export function obtenerCCPorId(id: string): ComprobanteCompra | undefined {
  return cargarComprobantesCompra().find((c) => c.id === id);
}

export function agregarOActualizarCC(comprobante: ComprobanteCompra): void {
  const comprobantes = cargarComprobantesCompra();
  const idx = comprobantes.findIndex((c) => c.id === comprobante.id);
  if (idx >= 0) {
    comprobantes[idx] = comprobante;
  } else {
    comprobantes.unshift(comprobante);
  }
  guardarComprobantesCompra(comprobantes);
}

export function eliminarCCDelStorage(ccId: string): void {
  const comprobantes = cargarComprobantesCompra();
  guardarComprobantesCompra(comprobantes.filter((c) => c.id !== ccId));
}
