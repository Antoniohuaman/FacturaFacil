// gastos/servicios/servicioCategoriaGasto.ts
//
// Reglas puras de Categorías de gasto — extraídas de `useCategoriasGasto.ts`
// para poder probarlas sin `localStorage`/React (mismo criterio ya aplicado
// a `filtrarCuentasPorPagarPorOrigen`/`filtrarPagosPorOrigen`: separar el
// cálculo del acceso a almacenamiento). Nunca elimina físicamente una
// categoría (§8/§9 del alcance): solo activa/inactiva.

import type { CategoriaGasto, EstadoCategoriaGasto } from '../modelos/CategoriaGasto';
import type { Gasto } from '../modelos/Gasto';
import { esBorradorDescartadoGasto } from './servicioGasto';

export interface DatosCategoriaGasto {
  nombre: string;
  descripcion?: string;
}

/**
 * Cuenta las referencias históricas reales a esta categoría (§20 de la
 * corrección): borradores no descartados + gastos registrados + gastos
 * anulados — un borrador nunca fue registrado oficialmente, pero mientras
 * exista referencia igual bloquea la eliminación física de su categoría; un
 * gasto anulado, aunque sin efecto operativo, conserva su historial. Solo se
 * excluyen los borradores DESCARTADOS (`esBorradorDescartadoGasto`), que
 * nunca llegaron a comprometer nada. Fuente única de "en uso", nunca un
 * contador desincronizable guardado en la propia categoría.
 */
export function contarUsoCategoriaGasto(gastos: readonly Gasto[], categoriaId: string): number {
  let conteo = 0;
  for (const gasto of gastos) {
    if (gasto.categoriaId !== categoriaId) continue;
    if (esBorradorDescartadoGasto(gasto)) continue;
    conteo += 1;
  }
  return conteo;
}

const normalizarNombreCategoriaGasto = (nombre: string): string => nombre.trim().toLowerCase();

/**
 * Evita categorías duplicadas por nombre (ignorando mayúsculas/minúsculas y
 * espacios al inicio/fin) — "Alquileres", "alquileres" y " Alquileres " se
 * consideran el mismo nombre. `idAExcluir` permite que editar una categoría
 * sin cambiar su propio nombre nunca se detecte como un duplicado consigo
 * misma.
 */
export function existeNombreCategoriaGastoDuplicado(
  categorias: readonly CategoriaGasto[],
  nombre: string,
  idAExcluir?: string,
): boolean {
  const normalizado = normalizarNombreCategoriaGasto(nombre);
  return categorias.some((c) => c.id !== idAExcluir && normalizarNombreCategoriaGasto(c.nombre) === normalizado);
}

export function crearCategoriaGasto(
  categorias: readonly CategoriaGasto[],
  datos: DatosCategoriaGasto,
  empresaId: string,
  id: string,
  fechaCreacion: string,
): CategoriaGasto[] {
  if (existeNombreCategoriaGastoDuplicado(categorias, datos.nombre)) {
    throw new Error('Ya existe una categoría de gasto con ese nombre.');
  }
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
  if (existeNombreCategoriaGastoDuplicado(categorias, datos.nombre, id)) {
    throw new Error('Ya existe una categoría de gasto con ese nombre.');
  }
  return categorias.map((c) =>
    c.id === id ? { ...c, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || undefined } : c,
  );
}

/** Única función de cambio de estado — desactivar/reactivar son la MISMA transformación con un valor distinto, nunca dos implementaciones paralelas. */
export function cambiarEstadoCategoriaGasto(categorias: readonly CategoriaGasto[], id: string, estado: EstadoCategoriaGasto): CategoriaGasto[] {
  return categorias.map((c) => (c.id === id ? { ...c, estado } : c));
}
