// gestion-inventario/repositories/valorizacionInicialInventario.repository.ts
//
// Persistencia de ValorizacionInicialInventario (Etapa 2, §9.4). Mismo patrón tenantizado que
// capaCostoInventario.repository.ts/consumoCapaCostoInventario.repository.ts (Etapa 1A): lectura y
// escritura defensiva vía coleccionLocalStorageInventario.ts, cada registro conserva su propio
// `empresaId` explícito y toda lectura/escritura lo valida — el namespace de `lsKey()` es una
// protección adicional, nunca el único aislamiento (invariante 21).
//
// "Un solo lote activo por empresa": el lote activo es el de fecha de creación más reciente entre
// todos los lotes de la empresa. Los lotes cancelados nunca se eliminan (auditoría) — simplemente
// dejan de ser el lote activo en cuanto se crea uno nuevo (reinicio tras cancelación).

import type { ValorizacionInicialInventario, DetalleValorizacionInicial } from '../models/valorizacionInicialInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

const STORAGE_KEY = 'facturafacil_valorizacion_inicial_inventario';
const NOMBRE_RECURSO = 'lotes de valorización inicial de inventario';

export const CLAVE_COLECCION_VALORIZACION_INICIAL_INVENTARIO = STORAGE_KEY;

function esDetalleValorizacionInicialValido(valor: unknown): valor is DetalleValorizacionInicial {
  if (!esObjetoPlano(valor)) return false;
  return (
    typeof valor.productoId === 'string' &&
    typeof valor.almacenId === 'string' &&
    typeof valor.cantidadDetectada === 'number' &&
    typeof valor.costoPropuesto === 'number' &&
    typeof valor.origenPropuesta === 'string' &&
    typeof valor.confirmado === 'boolean' &&
    typeof valor.requiereRecalculo === 'boolean'
  );
}

function esValorizacionInicialInventarioValida(valor: unknown): valor is ValorizacionInicialInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.usuario === 'string' &&
    typeof valor.fechaCreacion === 'string' &&
    typeof valor.estado === 'string' &&
    Array.isArray(valor.detalles) &&
    (valor.detalles as unknown[]).every(esDetalleValorizacionInicialValido)
  );
}

function leerTodos(empresaId: string): ValorizacionInicialInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esValorizacionInicialInventarioValida);
}

function leerTodosParaMutar(empresaId: string): ValorizacionInicialInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esValorizacionInicialInventarioValida);
}

function guardarTodos(empresaId: string, lotes: readonly ValorizacionInicialInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, lotes);
}

function validarEmpresaCoincide(empresaId: string, entidadEmpresaId: string): void {
  if (empresaId !== entidadEmpresaId) {
    throw new Error(
      `valorizacionInicialInventario.repository: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${entidadEmpresaId}").`
    );
  }
}

/** Inserta un lote nuevo. Rechaza explícitamente si ya existe un lote con el mismo `id` para esta empresa. */
export function guardarValorizacionInicialInventario(lote: ValorizacionInicialInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, lote.empresaId);
  const lotes = leerTodosParaMutar(empresaId);
  if (lotes.some((l) => l.id === lote.id)) {
    throw new Error(`valorizacionInicialInventario.repository: ya existe un lote con id "${lote.id}" para la empresa "${empresaId}".`);
  }
  guardarTodos(empresaId, [...lotes, lote]);
}

/** Obtiene un lote por id, exigiendo que pertenezca a la empresa indicada. */
export function obtenerValorizacionInicialInventarioPorId(id: string, empresaId: string): ValorizacionInicialInventario | undefined {
  return leerTodos(empresaId).find((l) => l.id === id);
}

/** Lista todos los lotes (activos e históricos/cancelados) de una empresa — orden de auditoría, no filtra por estado. */
export function listarValorizacionInicialInventarioPorEmpresa(empresaId: string): ValorizacionInicialInventario[] {
  return leerTodos(empresaId);
}

/**
 * El lote ACTIVO de la empresa — el de `fechaCreacion` más reciente (desempate por `id`, nunca por
 * el orden físico del arreglo). `undefined` si la empresa nunca inició una preparación. Un lote
 * "activo" puede estar en cualquier estado, incluyendo 'cancelada' (le corresponde al llamador
 * decidir si eso habilita reiniciar) — esta función nunca filtra por estado.
 */
export function obtenerLoteActivoPorEmpresa(empresaId: string): ValorizacionInicialInventario | undefined {
  const lotes = leerTodos(empresaId);
  if (lotes.length === 0) return undefined;
  return [...lotes].sort((a, b) => {
    const fa = new Date(a.fechaCreacion).getTime();
    const fb = new Date(b.fechaCreacion).getTime();
    if (fa !== fb) return fb - fa;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  })[0];
}

/** Actualiza un lote existente (reemplazo completo). Rechaza si no existe o si el empresaId no coincide. */
export function actualizarValorizacionInicialInventario(lote: ValorizacionInicialInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, lote.empresaId);
  const lotes = leerTodosParaMutar(empresaId);
  const indice = lotes.findIndex((l) => l.id === lote.id);
  if (indice === -1) {
    throw new Error(`valorizacionInicialInventario.repository: no existe un lote con id "${lote.id}" para la empresa "${empresaId}".`);
  }
  const siguientes = [...lotes];
  siguientes[indice] = lote;
  guardarTodos(empresaId, siguientes);
}
