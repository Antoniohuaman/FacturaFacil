import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ACTIVE_WORKSPACE_STORAGE_KEY, WORKSPACES_STORAGE_KEY } from './index';
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

const generateWorkspaceId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `ws_${Date.now()}`;
};

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => readWorkspacesFromStorage());
  const [tenantId, setTenantIdState] = useState<string | null>(() => {
    const storedActiveId = readActiveWorkspaceId();
    if (storedActiveId) {
      return storedActiveId;
    }
    const storedWorkspaces = readWorkspacesFromStorage();
    return storedWorkspaces[0]?.id ?? null;
  });

  useEffect(() => {
    persistWorkspaces(workspaces);
  }, [workspaces]);

  useEffect(() => {
    persistActiveWorkspaceId(tenantId);
  }, [tenantId]);

  useEffect(() => {
    if (workspaces.length === 0) {
      if (tenantId !== null) {
        setTenantIdState(null);
      }
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

  const setTenantId = useCallback((id: string | null) => {
    setTenantIdState(id);
  }, []);

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

  const getActiveWorkspace = useCallback(() => activeWorkspace, [activeWorkspace]);

  const value: TenantContextValue = {
    tenantId,
    workspaces,
    activeWorkspace,
    setTenantId,
    createOrUpdateWorkspace,
    getActiveWorkspace,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
