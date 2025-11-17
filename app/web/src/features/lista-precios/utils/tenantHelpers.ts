// src/features/lista-precios/utils/tenantHelpers.ts
import { useTenantStore } from '../../autenticacion/store/TenantStore';

/**
 * Obtiene el ID de la empresa actual desde el store de tenant
 * @returns El ID de la empresa actual o 'DEFAULT_EMPRESA' como fallback
 */
export function getTenantEmpresaId(): string {
  const contextoActual = useTenantStore.getState().contextoActual;

  if (contextoActual?.empresaId) {
    return contextoActual.empresaId;
  }

  // Fallback para desarrollo/testing cuando no hay contexto
  console.warn('[getTenantEmpresaId] No hay contexto actual, usando DEFAULT_EMPRESA');
  return 'DEFAULT_EMPRESA';
}

/**
 * Asegura que el empresaId sea válido
 * @param empresaId - ID opcional de empresa
 * @returns El empresaId validado
 * @throws Error si el empresaId es inválido
 */
export function ensureEmpresaId(empresaId?: string): string {
  const id = empresaId || getTenantEmpresaId();

  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('empresaId inválido o no disponible');
  }

  return id;
}

/**
 * Genera una clave de localStorage con namespace de empresa
 * @param base - Clave base
 * @returns Clave con namespace de empresa
 */
export function lsKey(base: string): string {
  return `${ensureEmpresaId()}:${base}`;
}
