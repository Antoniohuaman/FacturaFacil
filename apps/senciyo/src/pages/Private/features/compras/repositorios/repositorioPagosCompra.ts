import { tryLsKey } from '@/shared/tenant';
import { CLAVES_COMPRAS } from '../constantes/clavesAlmacenamientoCompras';
import type { PagoCompra } from '../modelos/PagoCompra';

export const EVENTO_PAGOS_CAMBIADOS = 'compras_pagos_cambiados';

const obtenerClave = (): string =>
  tryLsKey(CLAVES_COMPRAS.PAGOS) ?? CLAVES_COMPRAS.PAGOS;

export function cargarPagosCompra(): PagoCompra[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PagoCompra[];
  } catch {
    return [];
  }
}

export function guardarPagosCompra(pagos: PagoCompra[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(pagos));
    window.dispatchEvent(new Event(EVENTO_PAGOS_CAMBIADOS));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

export function persistirPagosCompra(
  pagos: PagoCompra[],
): { exito: true } | { exito: false; error: string } {
  if (typeof window === 'undefined') {
    return { exito: false, error: 'Almacenamiento no disponible en este entorno.' };
  }
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(pagos));
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      return { exito: false, error: 'Sin espacio de almacenamiento disponible.' };
    }
    return {
      exito: false,
      error: `Error al guardar: ${causa instanceof Error ? causa.message : 'desconocido'}.`,
    };
  }
  window.dispatchEvent(new Event(EVENTO_PAGOS_CAMBIADOS));
  return { exito: true };
}

export function obtenerPagoPorId(id: string): PagoCompra | undefined {
  return cargarPagosCompra().find((p) => p.id === id);
}

/** Filtro puro (sin storage) reutilizado por `listarPagosPorOrigen` y por las pruebas — separado del acceso a localStorage para poder probarlo de forma aislada. `PagoCompra.tipoOrigen` es opcional: un pago histórico sin el campo se interpreta como `'compra'` (§10/§11 del alcance: se creó antes de existir Gastos). */
export function filtrarPagosPorOrigen(pagos: readonly PagoCompra[], origen: 'compra' | 'gasto'): PagoCompra[] {
  return pagos.filter((pago) => (pago.tipoOrigen ?? 'compra') === origen);
}

/**
 * Selector único de aislamiento por origen documental (mismo criterio que
 * `listarCuentasPorPagarPorOrigen` en `repositorioCuentasPorPagar.ts`):
 * Compras y Gastos consumen el MISMO almacén de pagos a través de esta
 * función, nunca el arreglo completo sin filtrar.
 */
export function listarPagosPorOrigen(origen: 'compra' | 'gasto'): PagoCompra[] {
  return filtrarPagosPorOrigen(cargarPagosCompra(), origen);
}

export function agregarOActualizarPago(pago: PagoCompra): void {
  const pagos = cargarPagosCompra();
  const idx = pagos.findIndex((p) => p.id === pago.id);
  if (idx >= 0) {
    pagos[idx] = pago;
  } else {
    pagos.unshift(pago);
  }
  guardarPagosCompra(pagos);
}

export function eliminarPagoDelStorage(pagoId: string): void {
  const pagos = cargarPagosCompra();
  guardarPagosCompra(pagos.filter((p) => p.id !== pagoId));
}
