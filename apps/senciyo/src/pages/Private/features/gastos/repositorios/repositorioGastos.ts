// gastos/repositorios/repositorioGastos.ts
//
// Persistencia tenantizada de Gastos — mismo patrón exacto que
// `compras/repositorios/repositorioPagosCompra.ts` (localStorage + tryLsKey).
// Las Cuentas por Pagar y Pagos de un gasto NO se guardan aquí: viven en el
// mismo repositorio compartido de Compras
// (`repositorioCuentasPorPagar.ts`/`repositorioPagosCompra.ts`), filtrados
// por `tipoOrigen === 'gasto'` — nunca un segundo almacén de CxP/Pagos.

import { tryLsKey } from '@/shared/tenant';
import type { Gasto } from '../modelos/Gasto';

const CLAVE_GASTOS = 'gastos_registro_v1';

export const EVENTO_GASTOS_CAMBIADOS = 'gastos_cambiados';

const obtenerClave = (): string => tryLsKey(CLAVE_GASTOS) ?? CLAVE_GASTOS;

export function cargarGastos(): Gasto[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as Gasto[];
  } catch {
    return [];
  }
}

export function guardarGastos(gastos: Gasto[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(gastos));
    window.dispatchEvent(new Event(EVENTO_GASTOS_CAMBIADOS));
  } catch {
    // ignorar cuota de almacenamiento — mismo criterio best-effort que el resto del repositorio de Compras
  }
}

export function obtenerGastoPorId(id: string): Gasto | undefined {
  return cargarGastos().find((g) => g.id === id);
}

export function agregarOActualizarGasto(gasto: Gasto): void {
  const gastos = cargarGastos();
  const idx = gastos.findIndex((g) => g.id === gasto.id);
  if (idx >= 0) {
    gastos[idx] = gasto;
  } else {
    gastos.unshift(gasto);
  }
  guardarGastos(gastos);
}
