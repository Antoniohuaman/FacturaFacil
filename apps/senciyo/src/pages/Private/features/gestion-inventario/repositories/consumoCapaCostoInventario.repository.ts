// gestion-inventario/repositories/consumoCapaCostoInventario.repository.ts
//
// Persistencia de ConsumoCapaCostoInventario (§9.3 del diseño aprobado). Etapa 1A: solo CRUD +
// consultas de aislamiento — no implementa la función que consume capas FIFO (etapa posterior).

import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

const STORAGE_KEY = 'facturafacil_consumos_capas_inventario';
const NOMBRE_RECURSO = 'consumos de capas de inventario';

/** Expuesta para el motor de Etapa 1E, que necesita incluir esta colección como una escritura más de un `PlanUnidadTrabajoInventario` atómico (transferencias/reversos valorizados). */
export const CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO = STORAGE_KEY;

/** Campos propios del modelo, además de id/empresaId (ya validados por el helper compartido antes de invocar este guard). */
function esConsumoCapaCostoInventarioValido(valor: unknown): valor is ConsumoCapaCostoInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.movimientoSalidaId === 'string' &&
    typeof valor.capaId === 'string' &&
    typeof valor.cantidadConsumida === 'number'
  );
}

function leerTodos(empresaId: string): ConsumoCapaCostoInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esConsumoCapaCostoInventarioValido);
}

/** Paso previo obligatorio a guardar/actualizar/eliminar: bloquea si la colección física tiene registros válidos de otra empresa (ver coleccionLocalStorageInventario.ts). */
function leerTodosParaMutar(empresaId: string): ConsumoCapaCostoInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esConsumoCapaCostoInventarioValido);
}

function guardarTodos(empresaId: string, consumos: readonly ConsumoCapaCostoInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, consumos);
}

function validarEmpresaCoincide(empresaId: string, entidadEmpresaId: string): void {
  if (empresaId !== entidadEmpresaId) {
    throw new Error(
      `consumoCapaCostoInventario.repository: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${entidadEmpresaId}").`
    );
  }
}

/** Inserta un consumo nuevo. Rechaza explícitamente si ya existe un consumo con el mismo `id` para esta empresa. */
export function guardarConsumoCapaCostoInventario(consumo: ConsumoCapaCostoInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, consumo.empresaId);
  const consumos = leerTodosParaMutar(empresaId);
  if (consumos.some((c) => c.id === consumo.id)) {
    throw new Error(`consumoCapaCostoInventario.repository: ya existe un consumo con id "${consumo.id}" para la empresa "${empresaId}".`);
  }
  guardarTodos(empresaId, [...consumos, consumo]);
}

export function obtenerConsumoCapaCostoInventarioPorId(id: string, empresaId: string): ConsumoCapaCostoInventario | undefined {
  return leerTodos(empresaId).find((c) => c.id === id);
}

export function listarConsumosCapaCostoInventarioPorEmpresa(empresaId: string): ConsumoCapaCostoInventario[] {
  return leerTodos(empresaId);
}

/** Actualiza un consumo existente. Rechaza si no existe o si el empresaId no coincide. */
export function actualizarConsumoCapaCostoInventario(consumo: ConsumoCapaCostoInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, consumo.empresaId);
  const consumos = leerTodosParaMutar(empresaId);
  const indice = consumos.findIndex((c) => c.id === consumo.id);
  if (indice === -1) {
    throw new Error(`consumoCapaCostoInventario.repository: no existe un consumo con id "${consumo.id}" para la empresa "${empresaId}".`);
  }
  const siguientes = [...consumos];
  siguientes[indice] = consumo;
  guardarTodos(empresaId, siguientes);
}

export function eliminarConsumoCapaCostoInventario(id: string, empresaId: string): void {
  const consumos = leerTodosParaMutar(empresaId);
  guardarTodos(empresaId, consumos.filter((c) => c.id !== id));
}

/** Consulta por `movimientoSalidaId`, exigiendo empresaId — nunca devuelve consumos de otra empresa aunque compartan el mismo `movimientoSalidaId`. */
export function listarConsumosPorMovimientoSalida(movimientoSalidaId: string, empresaId: string): ConsumoCapaCostoInventario[] {
  return leerTodos(empresaId).filter((c) => c.movimientoSalidaId === movimientoSalidaId);
}

/** Consulta por `capaId`, exigiendo empresaId — nunca devuelve consumos de otra empresa aunque compartan el mismo `capaId`. */
export function listarConsumosPorCapa(capaId: string, empresaId: string): ConsumoCapaCostoInventario[] {
  return leerTodos(empresaId).filter((c) => c.capaId === capaId);
}
