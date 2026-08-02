// gastos/servicios/servicioCategoriaGasto.ts
//
// Reglas puras de Categorías de gasto — extraídas de `useCategoriasGasto.ts`
// para poder probarlas sin `localStorage`/React (mismo criterio ya aplicado
// a `filtrarCuentasPorPagarPorOrigen`/`filtrarPagosPorOrigen`: separar el
// cálculo del acceso a almacenamiento). Nunca elimina físicamente una
// categoría (§8/§9 del alcance): solo activa/inactiva.

import type { CategoriaGasto, EstadoCategoriaGasto } from '../modelos/CategoriaGasto';
import type { Gasto } from '../modelos/Gasto';

export interface DatosCategoriaGasto {
  nombre: string;
  descripcion?: string;
}

/** Cuenta los gastos NO anulados que usan esta categoría — fuente única de "en uso", nunca un contador desincronizable guardado en la propia categoría. */
export function contarUsoCategoriaGasto(gastos: readonly Gasto[], categoriaId: string): number {
  let conteo = 0;
  for (const gasto of gastos) {
    if (gasto.estadoDocumento === 'anulado') continue;
    if (gasto.categoriaId === categoriaId) conteo += 1;
  }
  return conteo;
}

export function crearCategoriaGasto(
  categorias: readonly CategoriaGasto[],
  datos: DatosCategoriaGasto,
  empresaId: string,
  id: string,
  fechaCreacion: string,
): CategoriaGasto[] {
  const nueva: CategoriaGasto = {
    id,
    empresaId,
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion?.trim() || undefined,
    estado: 'activa',
    orden: categorias.length,
    fechaCreacion,
  };
  return [...categorias, nueva];
}

export function editarCategoriaGasto(categorias: readonly CategoriaGasto[], id: string, datos: DatosCategoriaGasto): CategoriaGasto[] {
  return categorias.map((c) =>
    c.id === id ? { ...c, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || undefined } : c,
  );
}

/** Única función de cambio de estado — desactivar/reactivar son la MISMA transformación con un valor distinto, nunca dos implementaciones paralelas. */
export function cambiarEstadoCategoriaGasto(categorias: readonly CategoriaGasto[], id: string, estado: EstadoCategoriaGasto): CategoriaGasto[] {
  return categorias.map((c) => (c.id === id ? { ...c, estado } : c));
}
