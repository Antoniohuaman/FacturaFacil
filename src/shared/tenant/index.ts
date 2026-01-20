// src/shared/tenant/index.ts
// Helpers comunes de tenant/multiempresa para todo el front

import { useTenantStore } from '../../pages/Private/features/autenticacion/store/TenantStore';

export const WORKSPACES_STORAGE_KEY = 'ff_workspaces';
export const ACTIVE_WORKSPACE_STORAGE_KEY = 'ff_active_workspace_id';

export const generateWorkspaceId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ws_${Date.now()}`;
};

type GlobalSession = {
  __USER_SESSION__?: { currentCompanyId?: string; currentEstablecimientoId?: string };
  __FF_ACTIVE_WORKSPACE_ID?: string;
};

/**
 * Obtiene el ID de la empresa actual desde TenantStore o, como fallback, desde UserSession.
 * Lanza error si no hay empresa disponible.
 */
export function getTenantEmpresaId(): string {
  const contextoActual = useTenantStore.getState().contextoActual;

  if (contextoActual?.empresaId) {
    return contextoActual.empresaId;
  }

  const globalAny = globalThis as typeof globalThis & GlobalSession;
  const activeWorkspaceId = getFrontendWorkspaceId(globalAny);
  if (activeWorkspaceId) {
    return activeWorkspaceId;
  }

  // Fallback opcional: leer de una sesión inyectada globalmente si existe
  const sessionCompanyId = globalAny.__USER_SESSION__?.currentCompanyId;
  if (sessionCompanyId && sessionCompanyId.trim() !== '') {
    return sessionCompanyId;
  }

  throw new Error('[tenant] No hay empresa actual disponible en TenantStore ni en UserSession');
}

export function tryGetTenantEmpresaId(): string | null {
  try {
    return getTenantEmpresaId();
  } catch {
    return null;
  }
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

  const globalAny = globalThis as typeof globalThis & GlobalSession;
  const sessionEstId = globalAny.__USER_SESSION__?.currentEstablecimientoId;
  if (sessionEstId && sessionEstId.trim() !== '') {
    return sessionEstId;
  }

  return '';
}

export function tryGetTenantEstablecimientoId(): string | null {
  try {
    const id = getTenantEstablecimientoId();
    return id || null;
  } catch {
    return null;
  }
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

export function tryEnsureEmpresaId(empresaId?: string): string | null {
  try {
    return ensureEmpresaId(empresaId);
  } catch {
    return null;
  }
}

/**
 * Genera una clave de localStorage con namespace de empresa.
 */
export function lsKey(base: string, empresaId?: string): string {
  return `${ensureEmpresaId(empresaId)}:${base}`;
}

export function tryLsKey(base: string, empresaId?: string): string | null {
  const id = tryEnsureEmpresaId(empresaId);
  if (!id) return null;
  return `${id}:${base}`;
}

function getFrontendWorkspaceId(globalAny: typeof globalThis & GlobalSession): string | null {
  const activeFromGlobal = globalAny.__FF_ACTIVE_WORKSPACE_ID;
  if (activeFromGlobal && activeFromGlobal.trim() !== '') {
    return activeFromGlobal;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    if (stored && stored.trim() !== '') {
      return stored;
    }
  } catch {
    // Ignorar errores de acceso a localStorage
  }

  return null;
}
