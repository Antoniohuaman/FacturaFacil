import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ACTIVE_ESTABLECIMIENTO_BY_TENANT_STORAGE_KEY,
  ACTIVE_WORKSPACE_STORAGE_KEY,
  WORKSPACES_STORAGE_KEY,
  generateWorkspaceId,
} from './index';
import { TenantContext } from './TenantContext';
import type { TenantContextValue, Workspace, WorkspacePayload } from './types';

const readWorkspacesFromStorage = (): Workspace[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const serialized = window.localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (!serialized) {
      return [];
    }
    const parsed = JSON.parse(serialized) as Workspace[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('[tenant] Error reading workspaces from storage', error);
    return [];
  }
};

const readActiveWorkspaceId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    return stored || null;
  } catch (error) {
    console.error('[tenant] Error reading active workspace id', error);
    return null;
  }
};

const persistWorkspaces = (workspaces: Workspace[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
  } catch (error) {
    console.error('[tenant] Error persisting workspaces', error);
  }
};

const persistActiveWorkspaceId = (workspaceId: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (workspaceId) {
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
    } else {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    }
  } catch (error) {
    console.error('[tenant] Error persisting active workspace id', error);
  }
};

const readEstablecimientosActivosPorTenant = (): Record<string, string | null> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const serialized = window.localStorage.getItem(ACTIVE_ESTABLECIMIENTO_BY_TENANT_STORAGE_KEY);
    if (!serialized) {
      return {};
    }
    const parsed = JSON.parse(serialized) as Record<string, string | null>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.error('[tenant] Error leyendo establecimiento activo por tenant', error);
    return {};
  }
};

const persistEstablecimientosActivosPorTenant = (mapa: Record<string, string | null>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(ACTIVE_ESTABLECIMIENTO_BY_TENANT_STORAGE_KEY, JSON.stringify(mapa));
  } catch (error) {
    console.error('[tenant] Error guardando establecimiento activo por tenant', error);
  }
};

interface TenantProviderProps {
  children: ReactNode;
}

type TenantBootstrapState = {
  workspaces: Workspace[];
  tenantId: string | null;
  establecimientosActivosPorTenant: Record<string, string | null>;
};

const createBootstrapWorkspace = (): Workspace => {
  const workspaceId = generateWorkspaceId();
  const now = new Date().toISOString();

  return {
    id: workspaceId,
    ruc: '',
    razonSocial: '',
    nombreComercial: undefined,
    domicilioFiscal: undefined,
    createdAt: now,
  };
};

const resolveBootstrapState = (): TenantBootstrapState => {
  const storedWorkspaces = readWorkspacesFromStorage();
  const establecimientosActivosPorTenant = readEstablecimientosActivosPorTenant();

  if (storedWorkspaces.length === 0) {
    const bootstrapWorkspace = createBootstrapWorkspace();
    const workspaces = [bootstrapWorkspace];
    persistWorkspaces(workspaces);
    persistActiveWorkspaceId(bootstrapWorkspace.id);
    return {
      workspaces,
      tenantId: bootstrapWorkspace.id,
      establecimientosActivosPorTenant,
    };
  }

  const storedActiveId = readActiveWorkspaceId();
  const workspaceActivoValido = storedActiveId && storedWorkspaces.some((item) => item.id === storedActiveId)
    ? storedActiveId
    : storedWorkspaces[0].id;

  if (workspaceActivoValido !== storedActiveId) {
    persistActiveWorkspaceId(workspaceActivoValido);
  }

  return {
    workspaces: storedWorkspaces,
    tenantId: workspaceActivoValido,
    establecimientosActivosPorTenant,
  };
};

export function TenantProvider({ children }: TenantProviderProps) {
  // Contrato único: tenantId identifica la empresa activa del frontend.
  const bootstrapState = useMemo(resolveBootstrapState, []);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => bootstrapState.workspaces);
  const [tenantId, setTenantIdState] = useState<string | null>(() => bootstrapState.tenantId);
  const [establecimientosActivosPorTenant, setEstablecimientosActivosPorTenant] = useState<Record<string, string | null>>(
    () => bootstrapState.establecimientosActivosPorTenant,
  );
  const [isTenantReady, setIsTenantReady] = useState(false);

  useEffect(() => {
    persistWorkspaces(workspaces);
  }, [workspaces]);

  useEffect(() => {
    persistActiveWorkspaceId(tenantId);
  }, [tenantId]);

  useEffect(() => {
    persistEstablecimientosActivosPorTenant(establecimientosActivosPorTenant);
  }, [establecimientosActivosPorTenant]);

  const globalAny = globalThis as typeof globalThis & {
    __FF_ACTIVE_WORKSPACE_ID?: string;
    __FF_ACTIVE_ESTABLECIMIENTO_ID?: string;
  };

  if (tenantId) {
    globalAny.__FF_ACTIVE_WORKSPACE_ID = tenantId;
  } else if ('__FF_ACTIVE_WORKSPACE_ID' in globalAny) {
    delete globalAny.__FF_ACTIVE_WORKSPACE_ID;
  }

  const establecimientoActivo = tenantId ? establecimientosActivosPorTenant[tenantId] : null;
  if (establecimientoActivo && establecimientoActivo.trim() !== '') {
    globalAny.__FF_ACTIVE_ESTABLECIMIENTO_ID = establecimientoActivo;
  } else if ('__FF_ACTIVE_ESTABLECIMIENTO_ID' in globalAny) {
    delete globalAny.__FF_ACTIVE_ESTABLECIMIENTO_ID;
  }

  useEffect(() => {
    if (workspaces.length === 0) {
      const bootstrapWorkspace = createBootstrapWorkspace();
      setWorkspaces([bootstrapWorkspace]);
      setTenantIdState(bootstrapWorkspace.id);
      return;
    }
    if (!tenantId) {
      setTenantIdState(workspaces[0].id);
      return;
    }
    const exists = workspaces.some(workspace => workspace.id === tenantId);
    if (!exists) {
      setTenantIdState(workspaces[0].id);
    }
  }, [tenantId, workspaces]);

  useEffect(() => {
    const idsValidos = new Set(workspaces.map((workspace) => workspace.id));
    setEstablecimientosActivosPorTenant((prev) => {
      let cambio = false;
      const siguiente = { ...prev };
      Object.keys(siguiente).forEach((workspaceId) => {
        if (!idsValidos.has(workspaceId)) {
          delete siguiente[workspaceId];
          cambio = true;
        }
      });
      return cambio ? siguiente : prev;
    });
  }, [workspaces]);

  useEffect(() => {
    if (workspaces.length === 0 || !tenantId) {
      if (isTenantReady) {
        setIsTenantReady(false);
      }
      return;
    }

    const tenantValido = workspaces.some((workspace) => workspace.id === tenantId);
    if (!tenantValido) {
      if (isTenantReady) {
        setIsTenantReady(false);
      }
      return;
    }

    if (!isTenantReady) {
      setIsTenantReady(true);
    }
  }, [isTenantReady, tenantId, workspaces]);

  const setTenantId = useCallback((id: string | null) => {
    setTenantIdState(id);
  }, []);

  const setActiveEstablecimientoId = useCallback((establecimientoId: string | null) => {
    setEstablecimientosActivosPorTenant((prev) => {
      if (!tenantId) {
        return prev;
      }

      const valorNormalizado = establecimientoId && establecimientoId.trim() !== ''
        ? establecimientoId
        : null;

      if ((prev[tenantId] ?? null) === valorNormalizado) {
        return prev;
      }

      return {
        ...prev,
        [tenantId]: valorNormalizado,
      };
    });
  }, [tenantId]);

  const createOrUpdateWorkspace = useCallback((payload: WorkspacePayload): Workspace => {
    const workspaceId = payload.id ?? generateWorkspaceId();
    const now = new Date().toISOString();
    let nextWorkspace: Workspace = {
      id: workspaceId,
      ruc: payload.ruc,
      razonSocial: payload.razonSocial,
      nombreComercial: payload.nombreComercial?.trim() || undefined,
      domicilioFiscal: payload.domicilioFiscal?.trim() || undefined,
      createdAt: now,
    };

    setWorkspaces(prev => {
      const existing = prev.find(item => item.id === workspaceId);
      if (existing) {
        nextWorkspace = { ...nextWorkspace, createdAt: existing.createdAt };
        return prev.map(item => (item.id === workspaceId ? nextWorkspace : item));
      }
      return [...prev, nextWorkspace];
    });

    setTenantIdState(workspaceId);
    return nextWorkspace;
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find(workspace => workspace.id === tenantId) ?? null,
    [tenantId, workspaces]
  );

  const activeEstablecimientoId = useMemo(
    () => (tenantId ? establecimientosActivosPorTenant[tenantId] ?? null : null),
    [establecimientosActivosPorTenant, tenantId],
  );

  const getActiveWorkspace = useCallback(() => activeWorkspace, [activeWorkspace]);

  const value: TenantContextValue = {
    tenantId,
    isTenantReady,
    activeEstablecimientoId,
    workspaces,
    activeWorkspace,
    setTenantId,
    setActiveEstablecimientoId,
    createOrUpdateWorkspace,
    getActiveWorkspace,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
