// gestion-inventario/repositories/transaccionInventario.repository.ts
//
// Persistencia del diario transaccional (§9.6 del diseño aprobado). Etapa 1A: solo
// almacenamiento y consulta — NO implementa `unidadTrabajoInventario.ts`, recuperación,
// confirmación, replay, rollback ni control optimista de versión (Etapa 1B en adelante). No
// ejecuta ni interpreta `datosPropuestos` — se conservan tal cual fueron entregados.

import type { EstadoTransaccionInventario, TransaccionInventario } from '../models/transaccionInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

const STORAGE_KEY = 'facturafacil_transacciones_inventario';
const NOMBRE_RECURSO = 'transacciones de inventario';

/** Campos propios del modelo, además de id/empresaId (ya validados por el helper compartido antes de invocar este guard). */
function esTransaccionInventarioValida(valor: unknown): valor is TransaccionInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.tipoOperacion === 'string' &&
    typeof valor.claveIdempotencia === 'string' &&
    typeof valor.estado === 'string' &&
    typeof valor.hashEntrada === 'string' &&
    Array.isArray(valor.clavesAfectadas) &&
    esObjetoPlano(valor.datosAnteriores) &&
    esObjetoPlano(valor.datosPropuestos) &&
    Array.isArray(valor.resultadoIds)
  );
}

function leerTodas(empresaId: string): TransaccionInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esTransaccionInventarioValida);
}

/** Paso previo obligatorio a guardar/actualizar/eliminar: bloquea si la colección física tiene registros válidos de otra empresa (ver coleccionLocalStorageInventario.ts). */
function leerTodasParaMutar(empresaId: string): TransaccionInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esTransaccionInventarioValida);
}

function guardarTodas(empresaId: string, transacciones: readonly TransaccionInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, transacciones);
}

function validarEmpresaCoincide(empresaId: string, entidadEmpresaId: string): void {
  if (empresaId !== entidadEmpresaId) {
    throw new Error(
      `transaccionInventario.repository: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${entidadEmpresaId}").`
    );
  }
}

/** Inserta una transacción nueva. Rechaza explícitamente si ya existe una transacción con el mismo `id` para esta empresa. */
export function guardarTransaccionInventario(transaccion: TransaccionInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, transaccion.empresaId);
  const transacciones = leerTodasParaMutar(empresaId);
  if (transacciones.some((t) => t.id === transaccion.id)) {
    throw new Error(`transaccionInventario.repository: ya existe una transacción con id "${transaccion.id}" para la empresa "${empresaId}".`);
  }
  guardarTodas(empresaId, [...transacciones, transaccion]);
}

export function obtenerTransaccionInventarioPorId(id: string, empresaId: string): TransaccionInventario | undefined {
  return leerTodas(empresaId).find((t) => t.id === id);
}

export function listarTransaccionesInventarioPorEmpresa(empresaId: string): TransaccionInventario[] {
  return leerTodas(empresaId);
}

/** Actualiza una transacción existente. Rechaza si no existe o si el empresaId no coincide. */
export function actualizarTransaccionInventario(transaccion: TransaccionInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, transaccion.empresaId);
  const transacciones = leerTodasParaMutar(empresaId);
  const indice = transacciones.findIndex((t) => t.id === transaccion.id);
  if (indice === -1) {
    throw new Error(`transaccionInventario.repository: no existe una transacción con id "${transaccion.id}" para la empresa "${empresaId}".`);
  }
  const siguientes = [...transacciones];
  siguientes[indice] = transaccion;
  guardarTodas(empresaId, siguientes);
}

export function eliminarTransaccionInventario(id: string, empresaId: string): void {
  const transacciones = leerTodasParaMutar(empresaId);
  guardarTodas(empresaId, transacciones.filter((t) => t.id !== id));
}

/** Consulta por `claveIdempotencia` dentro de una empresa. */
export function buscarTransaccionesPorClaveIdempotencia(empresaId: string, claveIdempotencia: string): TransaccionInventario[] {
  return leerTodas(empresaId).filter((t) => t.claveIdempotencia === claveIdempotencia);
}

/** Filtra por `estado` dentro de una empresa. */
export function filtrarTransaccionesInventarioPorEstado(empresaId: string, estado: EstadoTransaccionInventario): TransaccionInventario[] {
  return leerTodas(empresaId).filter((t) => t.estado === estado);
}
