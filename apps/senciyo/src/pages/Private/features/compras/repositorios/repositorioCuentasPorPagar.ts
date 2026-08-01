import { tryLsKey } from '@/shared/tenant';
import { CLAVES_COMPRAS } from '../constantes/clavesAlmacenamientoCompras';
import type { CuentaPorPagar, TipoOrigenCxP } from '../modelos/CuentaPorPagar';

export const EVENTO_CXP_CAMBIADA = 'compras_cuentas_por_pagar_cambiada';

const obtenerClave = (): string =>
  tryLsKey(CLAVES_COMPRAS.CUENTAS_POR_PAGAR) ?? CLAVES_COMPRAS.CUENTAS_POR_PAGAR;

/** Normaliza registros persistidos ANTES de la generalización de origen documental (§10): sin `tipoOrigen`, se asume 'compra' y `documentoOrigenId` espeja `comprobanteCompraId` — nunca una segunda fuente que pueda desincronizarse. Exportada (pura, sin storage) para poder probarla directamente. */
export function normalizarOrigenCxP(cxp: CuentaPorPagar): CuentaPorPagar {
  if (cxp.tipoOrigen) return cxp;
  return { ...cxp, tipoOrigen: 'compra', documentoOrigenId: cxp.comprobanteCompraId };
}

export function cargarCuentasPorPagar(): CuentaPorPagar[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as CuentaPorPagar[]).map(normalizarOrigenCxP);
  } catch {
    return [];
  }
}

export function guardarCuentasPorPagar(cuentas: CuentaPorPagar[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(cuentas));
    window.dispatchEvent(new Event(EVENTO_CXP_CAMBIADA));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

export function persistirCuentasPorPagar(
  cuentas: CuentaPorPagar[],
): { exito: true } | { exito: false; error: string } {
  if (typeof window === 'undefined') {
    return { exito: false, error: 'Almacenamiento no disponible en este entorno.' };
  }
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(cuentas));
  } catch (causa) {
    if (causa instanceof DOMException && causa.name === 'QuotaExceededError') {
      return { exito: false, error: 'Sin espacio de almacenamiento disponible.' };
    }
    return {
      exito: false,
      error: `Error al guardar: ${causa instanceof Error ? causa.message : 'desconocido'}.`,
    };
  }
  window.dispatchEvent(new Event(EVENTO_CXP_CAMBIADA));
  return { exito: true };
}

export function obtenerCxPPorId(id: string): CuentaPorPagar | undefined {
  return cargarCuentasPorPagar().find((c) => c.id === id);
}

/** Filtro puro (sin storage) reutilizado por `listarCuentasPorPagarPorOrigen` y por las pruebas — separado del acceso a localStorage para poder probarlo de forma aislada. */
export function filtrarCuentasPorPagarPorOrigen(
  cuentas: readonly CuentaPorPagar[],
  origen: TipoOrigenCxP,
): CuentaPorPagar[] {
  return cuentas.filter((cxp) => cxp.tipoOrigen === origen);
}

/**
 * Selector único de aislamiento por origen documental — Compras y Gastos
 * consumen el MISMO almacén a través de esta función en vez de leer el
 * arreglo completo sin filtrar (§10 del alcance: las pestañas de CxP de
 * Compras deben mostrar SOLO origen compra, y Gastos solo sus propias
 * obligaciones). `cargarCuentasPorPagar()` ya normaliza los registros
 * históricos sin `tipoOrigen` a `'compra'`, por lo que ese filtrado queda
 * correcto también para los datos anteriores a esta generalización.
 */
export function listarCuentasPorPagarPorOrigen(origen: TipoOrigenCxP): CuentaPorPagar[] {
  return filtrarCuentasPorPagarPorOrigen(cargarCuentasPorPagar(), origen);
}

export function agregarOActualizarCxP(cuenta: CuentaPorPagar): void {
  const cuentas = cargarCuentasPorPagar();
  const idx = cuentas.findIndex((c) => c.id === cuenta.id);
  if (idx >= 0) {
    cuentas[idx] = cuenta;
  } else {
    cuentas.unshift(cuenta);
  }
  guardarCuentasPorPagar(cuentas);
}

export function eliminarCxPDelStorage(cxpId: string): void {
  const cuentas = cargarCuentasPorPagar();
  guardarCuentasPorPagar(cuentas.filter((c) => c.id !== cxpId));
}
