// gestion-inventario/repositories/operacionIdempotenteInventario.repository.ts
//
// Persistencia del ledger de idempotencia (§9.5 del diseño aprobado). Etapa 1A: solo
// almacenamiento y consulta — NO implementa generación/comparación de hash, `ConflictoIdempotencia`,
// reserva previa, reintentos ni recuperación (Etapa 1B en adelante).
//
// Unicidad lógica real: SIEMPRE (empresaId, clave), nunca `clave` sola — la misma clave puede
// existir en empresas distintas, pero la misma empresa nunca puede tener dos operaciones con la
// misma clave (invariante 8/9/10, §32).

import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

const STORAGE_KEY = 'facturafacil_operaciones_idempotentes_inventario';
const NOMBRE_RECURSO = 'operaciones idempotentes de inventario';

/** Campos propios del modelo, además de id/empresaId (ya validados por el helper compartido antes de invocar este guard). */
function esOperacionIdempotenteValida(valor: unknown): valor is OperacionIdempotenteInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.clave === 'string' &&
    typeof valor.tipoOperacion === 'string' &&
    typeof valor.estado === 'string' &&
    typeof valor.hashEntrada === 'string' &&
    Array.isArray(valor.resultadoIds) &&
    typeof valor.transaccionInventarioId === 'string'
  );
}

function leerTodas(empresaId: string): OperacionIdempotenteInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esOperacionIdempotenteValida);
}

/** Paso previo obligatorio a guardar/actualizar/eliminar: bloquea si la colección física tiene registros válidos de otra empresa (ver coleccionLocalStorageInventario.ts). */
function leerTodasParaMutar(empresaId: string): OperacionIdempotenteInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esOperacionIdempotenteValida);
}

function guardarTodas(empresaId: string, operaciones: readonly OperacionIdempotenteInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, operaciones);
}

function validarEmpresaCoincide(empresaId: string, entidadEmpresaId: string): void {
  if (empresaId !== entidadEmpresaId) {
    throw new Error(
      `operacionIdempotenteInventario.repository: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${entidadEmpresaId}").`
    );
  }
}

/**
 * Inserta una operación nueva en el ledger. Rechaza explícitamente (nunca sobrescribe en
 * silencio) si ya existe una operación con el mismo `id`, o si ya existe otra operación con la
 * misma combinación (empresaId, clave) — esa es la unicidad lógica real del ledger.
 */
export function guardarOperacionIdempotente(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, operacion.empresaId);
  const operaciones = leerTodasParaMutar(empresaId);
  if (operaciones.some((o) => o.id === operacion.id)) {
    throw new Error(`operacionIdempotenteInventario.repository: ya existe una operación con id "${operacion.id}" para la empresa "${empresaId}".`);
  }
  if (operaciones.some((o) => o.clave === operacion.clave)) {
    throw new Error(
      `operacionIdempotenteInventario.repository: ya existe una operación con clave "${operacion.clave}" para la empresa "${empresaId}" — la combinación (empresaId, clave) debe ser única.`
    );
  }
  guardarTodas(empresaId, [...operaciones, operacion]);
}

export function obtenerOperacionIdempotentePorId(id: string, empresaId: string): OperacionIdempotenteInventario | undefined {
  return leerTodas(empresaId).find((o) => o.id === id);
}

/** Busca por la clave compuesta real (empresaId + clave). */
export function buscarOperacionIdempotentePorClave(empresaId: string, clave: string): OperacionIdempotenteInventario | undefined {
  return leerTodas(empresaId).find((o) => o.clave === clave);
}

export function listarOperacionesIdempotentesPorEmpresa(empresaId: string): OperacionIdempotenteInventario[] {
  return leerTodas(empresaId);
}

/**
 * Actualiza una operación existente. Rechaza si no existe, si el empresaId no coincide, o si la
 * clave que trae `operacion` ya pertenece a OTRA operación de la misma empresa — la unicidad
 * lógica (empresaId, clave) debe protegerse tanto al insertar como al actualizar; de lo
 * contrario, una actualización podría "robarle" la clave a otra operación ya existente. No
 * modifica ninguna operación ni escribe en `localStorage` cuando rechaza.
 */
export function actualizarOperacionIdempotente(operacion: OperacionIdempotenteInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, operacion.empresaId);
  const operaciones = leerTodasParaMutar(empresaId);
  const indice = operaciones.findIndex((o) => o.id === operacion.id);
  if (indice === -1) {
    throw new Error(`operacionIdempotenteInventario.repository: no existe una operación con id "${operacion.id}" para la empresa "${empresaId}".`);
  }
  const otraConMismaClave = operaciones.some((o) => o.id !== operacion.id && o.clave === operacion.clave);
  if (otraConMismaClave) {
    throw new Error(
      `operacionIdempotenteInventario.repository: ya existe otra operación con clave "${operacion.clave}" para la empresa "${empresaId}" — la combinación (empresaId, clave) debe ser única, incluso al actualizar.`
    );
  }
  const siguientes = [...operaciones];
  siguientes[indice] = operacion;
  guardarTodas(empresaId, siguientes);
}

export function eliminarOperacionIdempotente(id: string, empresaId: string): void {
  const operaciones = leerTodasParaMutar(empresaId);
  guardarTodas(empresaId, operaciones.filter((o) => o.id !== id));
}
