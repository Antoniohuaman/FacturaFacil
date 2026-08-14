// gastos/repositorios/repositorioCategoriasGasto.ts
//
// Persistencia tenantizada de Categorías de gasto. Se gestionan desde
// Configuración del Sistema → Configuración de Negocio → Categorías de
// gastos, pero se persisten aquí (no en `ContextoConfiguracion`) porque las
// categorías de producto (`state.categories`) NUNCA se incluyeron en el
// snapshot persistido de ese contexto (`PersistedTenantConfig`) — replicar
// ese mismo camino perdería las categorías de gasto en cada recarga. Mismo
// patrón de repositorio que el resto de Gastos/Compras (tryLsKey + array
// completo), nunca un backend nuevo.

import { lsKey } from '@/shared/tenant';
import type { CategoriaGasto } from '../modelos/CategoriaGasto';
import { CATEGORIAS_GASTO_SEMILLA } from '../modelos/CategoriaGasto';

const CLAVE_CATEGORIAS_GASTO = 'gastos_categorias_v1';

export const EVENTO_CATEGORIAS_GASTO_CAMBIADAS = 'gastos_categorias_cambiadas';

/** GAS-P3-001: `lsKey` (nunca `tryLsKey(...) ?? CLAVE`) — las categorías de gasto son dato tenantizado obligatorio, nunca una clave sin namespace de empresa. Ver `repositorioGastos.ts`. */
const obtenerClave = (): string => lsKey(CLAVE_CATEGORIAS_GASTO);

function construirSemilla(empresaId: string): CategoriaGasto[] {
  const ts = new Date().toISOString();
  return CATEGORIAS_GASTO_SEMILLA.map((base, indice) => ({
    id: `catgasto-semilla-${indice}`,
    empresaId,
    nombre: base.nombre,
    estado: 'activa' as const,
    orden: indice,
    fechaCreacion: ts,
  }));
}

/** Carga las categorías de la empresa activa; si nunca se guardó nada, siembra el catálogo inicial (editable desde el primer momento, nunca una lista cerrada). */
export function cargarCategoriasGasto(empresaId: string): CategoriaGasto[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(obtenerClave());
    if (!raw) return construirSemilla(empresaId);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return construirSemilla(empresaId);
    return parsed as CategoriaGasto[];
  } catch {
    return construirSemilla(empresaId);
  }
}

export function guardarCategoriasGasto(categorias: CategoriaGasto[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(categorias));
    window.dispatchEvent(new Event(EVENTO_CATEGORIAS_GASTO_CAMBIADAS));
  } catch {
    // ignorar cuota de almacenamiento
  }
}
