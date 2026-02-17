// src/shared/tenant/index.ts
// Helpers comunes de tenant/multiempresa para todo el front

export const WORKSPACES_STORAGE_KEY = 'ff_workspaces';
export const ACTIVE_WORKSPACE_STORAGE_KEY = 'ff_active_workspace_id';
export const ACTIVE_ESTABLECIMIENTO_BY_TENANT_STORAGE_KEY = 'ff_active_establecimiento_by_tenant';

export const generateWorkspaceId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ws_${Date.now()}`;
};

type GlobalSesionTenant = {
  __FF_ACTIVE_WORKSPACE_ID?: string;
  __FF_ACTIVE_ESTABLECIMIENTO_ID?: string;
};

/**
 * Contrato tenant: el ID de empresa activa SIEMPRE proviene de TenantProvider.
 * Lanza error si no hay empresa disponible.
 */
export function getTenantEmpresaId(): string {
  const globalAny = globalThis as typeof globalThis & GlobalSesionTenant;
  const activeWorkspaceId = getFrontendWorkspaceId(globalAny);
  if (activeWorkspaceId) {
    return activeWorkspaceId;
  }

  throw new Error('[tenant] No hay empresa activa disponible en TenantProvider');
}

export function tryGetTenantEmpresaId(): string | null {
  try {
    return getTenantEmpresaId();
  } catch {
    return null;
  }
}

/**
 * Contrato tenant: el establecimiento activo se persiste por tenant.
 * Retorna string vacío si no hay establecimiento activo válido.
 */
export function getTenantEstablecimientoId(): string {
  const globalAny = globalThis as typeof globalThis & GlobalSesionTenant;
  const activoMemoria = globalAny.__FF_ACTIVE_ESTABLECIMIENTO_ID;
  if (activoMemoria && activoMemoria.trim() !== '') {
    return activoMemoria;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const empresaId = getTenantEmpresaId();
    const raw = window.localStorage.getItem(ACTIVE_ESTABLECIMIENTO_BY_TENANT_STORAGE_KEY);
    if (!raw) {
      return '';
    }

    const parsed = JSON.parse(raw) as Record<string, string | null>;
    const establecimientoId = parsed[empresaId];
    if (establecimientoId && establecimientoId.trim() !== '') {
      return establecimientoId;
    }
  } catch {
    // Ignorar errores de parseo/acceso
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

function getFrontendWorkspaceId(globalAny: typeof globalThis & GlobalSesionTenant): string | null {
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
