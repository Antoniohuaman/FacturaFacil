// gestion-inventario/repositories/invalidacionPendienteValorizacionInicial.repository.ts
//
// Cola durable de invalidaciones de valorización inicial pendientes de reintento (cierre de
// bloqueante 1 de la revisión de Etapa 2). Cuando `invalidarLoteValorizacionInicialSiAfectado`
// falla DESPUÉS de que una mutación cuantitativa ya fue confirmada, la operación de stock NUNCA se
// revierte (ya se aplicó con éxito) — pero la invalidación pendiente se encola aquí de forma
// durable, nunca solo con un `console.error` que la pierde. Mismo patrón tenantizado que los demás
// repositorios de Kardex Valorizado (coleccionLocalStorageInventario.ts).

import type { ProductoAlmacenAfectado } from '../utils/invalidacionValorizacionInicial';
import { leerColeccionTenantizada, leerColeccionParaMutacion, guardarColeccionTenantizada, esObjetoPlano } from './coleccionLocalStorageInventario';

export const CLAVE_COLECCION_INVALIDACIONES_PENDIENTES_VALORIZACION_INICIAL = 'facturafacil_invalidaciones_pendientes_valorizacion_inicial';
const STORAGE_KEY = CLAVE_COLECCION_INVALIDACIONES_PENDIENTES_VALORIZACION_INICIAL;
const NOMBRE_RECURSO = 'invalidaciones pendientes de valorización inicial';

export interface InvalidacionPendienteValorizacionInicial {
  id: string;
  empresaId: string;
  afectados: ProductoAlmacenAfectado[];
  fecha: string;
}

function esAfectadoValido(valor: unknown): valor is ProductoAlmacenAfectado {
  return esObjetoPlano(valor) && typeof valor.productoId === 'string' && typeof valor.almacenId === 'string';
}

function esInvalidacionPendienteValida(valor: unknown): valor is InvalidacionPendienteValorizacionInicial {
  return (
    esObjetoPlano(valor) &&
    typeof valor.fecha === 'string' &&
    Array.isArray(valor.afectados) &&
    (valor.afectados as unknown[]).every(esAfectadoValido)
  );
}

/** Todas las invalidaciones pendientes de la empresa — vacío si nunca hubo una o si todas ya se drenaron. */
export function listarInvalidacionesPendientes(empresaId: string): InvalidacionPendienteValorizacionInicial[] {
  return leerColeccionTenantizada(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esInvalidacionPendienteValida);
}

/** Encola una invalidación que no pudo aplicarse tras confirmar una mutación de stock — escritura durable, nunca solo un log. */
export function encolarInvalidacionPendiente(pendiente: InvalidacionPendienteValorizacionInicial): void {
  const actuales = leerColeccionParaMutacion(STORAGE_KEY, pendiente.empresaId, NOMBRE_RECURSO, esInvalidacionPendienteValida);
  guardarColeccionTenantizada(STORAGE_KEY, pendiente.empresaId, [...actuales, pendiente]);
}

/** Quita UNA entrada ya resuelta con éxito — nunca vacía la cola completa (otra entrada de otra operación puede seguir pendiente). */
export function quitarInvalidacionPendiente(empresaId: string, id: string): void {
  const actuales = leerColeccionParaMutacion(STORAGE_KEY, empresaId, NOMBRE_RECURSO, esInvalidacionPendienteValida);
  guardarColeccionTenantizada(STORAGE_KEY, empresaId, actuales.filter((p) => p.id !== id));
}
