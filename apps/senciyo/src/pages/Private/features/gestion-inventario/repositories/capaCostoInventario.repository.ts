// gestion-inventario/repositories/capaCostoInventario.repository.ts
//
// Persistencia de CapaCostoInventario (§9.2 del diseño aprobado). Etapa 1A: solo CRUD +
// consultas de aislamiento — sin ordenamiento FIFO, sin consumo de capas, sin cálculo de costos
// (eso corresponde a Etapas posteriores). Mismo patrón de `localStorage` que StockRepository
// (gestion-inventario/repositories/stock.repository.ts), con una verificación adicional: cada
// registro conserva su propio `empresaId` explícito y toda lectura/escritura lo valida — el
// namespace de `lsKey()` es una protección adicional, nunca el único aislamiento (invariante 21,
// R-19/R-20 del diseño aprobado).

import type { CapaCostoInventario, EstadoCapaCosto } from '../models/capaCostoInventario.types';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

const STORAGE_KEY = 'facturafacil_capas_costo_inventario';
const NOMBRE_RECURSO = 'capas de costo de inventario';

/** Expuesta para el motor de Etapa 1E, que necesita incluir esta colección como una escritura más de un `PlanUnidadTrabajoInventario` atómico (transferencias/reversos valorizados). */
export const CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO = STORAGE_KEY;

/** Campos propios del modelo, además de id/empresaId (ya validados por el helper compartido antes de invocar este guard). */
function esCapaCostoInventarioValida(valor: unknown): valor is CapaCostoInventario {
  return (
    esObjetoPlano(valor) &&
    typeof valor.establecimientoId === 'string' &&
    typeof valor.productoId === 'string' &&
    typeof valor.almacenId === 'string' &&
    typeof valor.movimientoEntradaId === 'string' &&
    typeof valor.cantidadInicial === 'number' &&
    typeof valor.cantidadDisponible === 'number'
  );
}

function leerTodas(empresaId: string): CapaCostoInventario[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esCapaCostoInventarioValida);
}

/** Paso previo obligatorio a guardar/actualizar/eliminar: bloquea si la colección física tiene registros válidos de otra empresa (ver coleccionLocalStorageInventario.ts). */
function leerTodasParaMutar(empresaId: string): CapaCostoInventario[] {
  return leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esCapaCostoInventarioValida);
}

function guardarTodas(empresaId: string, capas: readonly CapaCostoInventario[]): void {
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, capas);
}

function validarEmpresaCoincide(empresaId: string, entidadEmpresaId: string): void {
  if (empresaId !== entidadEmpresaId) {
    throw new Error(
      `capaCostoInventario.repository: empresaId del parámetro ("${empresaId}") no coincide con empresaId de la entidad ("${entidadEmpresaId}").`
    );
  }
}

/** Inserta una capa nueva. Rechaza explícitamente si ya existe una capa con el mismo `id` para esta empresa — nunca sobrescribe en silencio. */
export function guardarCapaCostoInventario(capa: CapaCostoInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, capa.empresaId);
  const capas = leerTodasParaMutar(empresaId);
  if (capas.some((c) => c.id === capa.id)) {
    throw new Error(`capaCostoInventario.repository: ya existe una capa con id "${capa.id}" para la empresa "${empresaId}".`);
  }
  guardarTodas(empresaId, [...capas, capa]);
}

/** Obtiene una capa por id, exigiendo que pertenezca a la empresa indicada. */
export function obtenerCapaCostoInventarioPorId(id: string, empresaId: string): CapaCostoInventario | undefined {
  return leerTodas(empresaId).find((c) => c.id === id);
}

/** Lista todas las capas de una empresa. */
export function listarCapasCostoInventarioPorEmpresa(empresaId: string): CapaCostoInventario[] {
  return leerTodas(empresaId);
}

/** Actualiza una capa existente. Rechaza si no existe o si el empresaId no coincide. */
export function actualizarCapaCostoInventario(capa: CapaCostoInventario, empresaId: string): void {
  validarEmpresaCoincide(empresaId, capa.empresaId);
  const capas = leerTodasParaMutar(empresaId);
  const indice = capas.findIndex((c) => c.id === capa.id);
  if (indice === -1) {
    throw new Error(`capaCostoInventario.repository: no existe una capa con id "${capa.id}" para la empresa "${empresaId}".`);
  }
  const siguientes = [...capas];
  siguientes[indice] = capa;
  guardarTodas(empresaId, siguientes);
}

/** Elimina una capa, exigiendo empresaId explícito. */
export function eliminarCapaCostoInventario(id: string, empresaId: string): void {
  const capas = leerTodasParaMutar(empresaId);
  guardarTodas(empresaId, capas.filter((c) => c.id !== id));
}

export interface FiltroAgrupacionFifoCapas {
  empresaId: string;
  establecimientoId: string;
  productoId: string;
  almacenId: string;
  /** Filtro opcional adicional — sin valor por defecto: si se omite, no filtra por estado. */
  estado?: EstadoCapaCosto;
}

/**
 * Consulta por la agrupación FIFO completa (empresaId + establecimientoId + productoId +
 * almacenId) — los cuatro campos son obligatorios, sin default alguno (R-20): omitir
 * `establecimientoId` o `almacenId` mezclaría capas de distintos almacenes/establecimientos.
 * No ordena por `fechaEntrada` ni implementa consumo — eso es responsabilidad de una etapa
 * posterior (`consumirCapasFIFO`).
 */
export function listarCapasCostoInventarioPorAgrupacionFifo(
  filtro: FiltroAgrupacionFifoCapas
): CapaCostoInventario[] {
  return leerTodas(filtro.empresaId).filter(
    (c) =>
      c.establecimientoId === filtro.establecimientoId &&
      c.productoId === filtro.productoId &&
      c.almacenId === filtro.almacenId &&
      (filtro.estado === undefined || c.estado === filtro.estado)
  );
}
