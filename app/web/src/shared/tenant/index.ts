// src/shared/tenant/index.ts
// Helpers comunes de tenant/multiempresa para todo el front

import { useTenantStore } from '../../features/autenticacion/store/TenantStore';

export const WORKSPACES_STORAGE_KEY = 'ff_workspaces';
export const ACTIVE_WORKSPACE_STORAGE_KEY = 'ff_active_workspace_id';

/**
 * Obtiene el ID de la empresa actual desde TenantStore o, como fallback, desde UserSession.
 * Lanza error si no hay empresa disponible.
 */
export function getTenantEmpresaId(): string {
  const contextoActual = useTenantStore.getState().contextoActual;

  if (contextoActual?.empresaId) {
    return contextoActual.empresaId;
  }

  // Fallback opcional: leer de una sesión inyectada globalmente si existe
  const globalAny = globalThis as typeof globalThis & {
    __USER_SESSION__?: { currentCompanyId?: string };
  };
  const sessionCompanyId = globalAny.__USER_SESSION__?.currentCompanyId;
  if (sessionCompanyId && sessionCompanyId.trim() !== '') {
    return sessionCompanyId;
  }

  throw new Error('[tenant] No hay empresa actual disponible en TenantStore ni en UserSession');
}

/**
 * Obtiene el ID del establecimiento actual desde TenantStore o, como fallback, desde UserSession.
 * Retorna string vacío si no hay establecimiento.
 */
export function getTenantEstablecimientoId(): string {
  const contextoActual = useTenantStore.getState().contextoActual;

  if (contextoActual?.establecimientoId) {
    return contextoActual.establecimientoId;
  }

  const globalAny = globalThis as typeof globalThis & {
    __USER_SESSION__?: { currentEstablishmentId?: string };
  };
  const sessionEstId = globalAny.__USER_SESSION__?.currentEstablishmentId;
  if (sessionEstId && sessionEstId.trim() !== '') {
    return sessionEstId;
  }

  return '';
}

/**
 * Asegura que el empresaId sea válido, usando la empresa actual por defecto.
 */
export function ensureEmpresaId(empresaId?: string): string {
  const id = empresaId || getTenantEmpresaId();

  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new Error('[tenant] empresaId inválido o no disponible');
  }

  return id;
}

/**
 * Genera una clave de localStorage con namespace de empresa.
 */
export function lsKey(base: string, empresaId?: string): string {
  return `${ensureEmpresaId(empresaId)}:${base}`;
}
