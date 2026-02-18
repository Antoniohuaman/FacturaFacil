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

type WorkspaceAlmacenado = Omit<Workspace, 'isActive' | 'isFavorite'> & {
  isActive?: boolean;
  isFavorite?: boolean;
};

const normalizarWorkspaces = (workspaces: WorkspaceAlmacenado[]): Workspace[] => {
  let favoritaAsignada = false;

  const normalizados = workspaces.map((workspace) => {
    const isActive = workspace.isActive ?? true;
    const favoritaSolicitada = workspace.isFavorite ?? false;
    const isFavorite = isActive && favoritaSolicitada && !favoritaAsignada;
    if (isFavorite) {
      favoritaAsignada = true;
    }

    return {
      ...workspace,
      isActive,
      isFavorite,
    } as Workspace;
  });

  return normalizados;
};

const resolverWorkspaceSeleccionado = (
  workspaces: Workspace[],
  workspacePersistidoId: string | null,
): string | null => {
  if (workspaces.length === 0) {
    return null;
  }

  const favoritaActiva = workspaces.find((workspace) => workspace.isFavorite && workspace.isActive);
  if (favoritaActiva) {
    return favoritaActiva.id;
  }

  const persistidoActivo = workspacePersistidoId
    ? workspaces.find((workspace) => workspace.id === workspacePersistidoId && workspace.isActive)
    : null;
  if (persistidoActivo) {
    return persistidoActivo.id;
  }

  const primerActivo = workspaces.find((workspace) => workspace.isActive);
  if (primerActivo) {
    return primerActivo.id;
  }

  return null;
};

const readWorkspacesFromStorage = (): Workspace[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const serialized = window.localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (!serialized) {
      return [];
    }
    const parsed = JSON.parse(serialized) as WorkspaceAlmacenado[];
    if (Array.isArray(parsed)) {
      return normalizarWorkspaces(parsed);
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
    isActive: true,
    isFavorite: false,
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
  const workspaceActivoValido = resolverWorkspaceSeleccionado(storedWorkspaces, storedActiveId);

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

    const favoritoActivo = workspaces.find((workspace) => workspace.isFavorite && workspace.isActive);
    if (favoritoActivo && tenantId !== favoritoActivo.id) {
      setTenantIdState(favoritoActivo.id);
      return;
    }

    if (!tenantId) {
      const siguienteId = resolverWorkspaceSeleccionado(workspaces, null);
      if (siguienteId) {
        setTenantIdState(siguienteId);
      }
      return;
    }

    const seleccionado = workspaces.find((workspace) => workspace.id === tenantId);
    if (!seleccionado) {
      const siguienteId = resolverWorkspaceSeleccionado(workspaces, null);
      if (siguienteId !== tenantId) {
        setTenantIdState(siguienteId);
      }
      return;
    }

    if (!seleccionado.isActive) {
      const siguienteId = resolverWorkspaceSeleccionado(workspaces, tenantId);
      if (siguienteId !== tenantId) {
        setTenantIdState(siguienteId);
      }
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
    if (workspaces.length === 0) {
      if (isTenantReady) {
        setIsTenantReady(false);
      }
      return;
    }

    if (!tenantId) {
      if (!isTenantReady) {
        setIsTenantReady(true);
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
    if (!id) {
      setTenantIdState(null);
      return;
    }

    const workspace = workspaces.find((item) => item.id === id);
    if (!workspace || !workspace.isActive) {
      return;
    }

    setTenantIdState(id);
  }, [workspaces]);

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

  const setWorkspaceFavorite = useCallback((workspaceId: string) => {
    setWorkspaces((prev) => {
      let huboCambio = false;

      const siguiente = prev.map((workspace) => {
        const marcarFavorita = workspace.id === workspaceId;
        const nuevaFavorita = marcarFavorita ? workspace.isActive : false;

        if (workspace.isFavorite !== nuevaFavorita) {
          huboCambio = true;
        }

        return {
          ...workspace,
          isFavorite: nuevaFavorita,
        };
      });

      if (!huboCambio) {
        return prev;
      }

      return siguiente;
    });
  }, []);

  const setWorkspaceActive = useCallback((workspaceId: string, isActive: boolean) => {
    setWorkspaces((prev) => {
      let huboCambio = false;

      const siguiente = prev.map((workspace) => {
        if (workspace.id !== workspaceId) {
          return workspace;
        }

        if (workspace.isActive === isActive && (!workspace.isFavorite || isActive)) {
          return workspace;
        }

        huboCambio = true;

        return {
          ...workspace,
          isActive,
          isFavorite: isActive ? workspace.isFavorite : false,
        };
      });

      if (!huboCambio) {
        return prev;
      }

      const favoritaActiva = siguiente.find((workspace) => workspace.isFavorite && workspace.isActive);
      if (favoritaActiva) {
        return siguiente;
      }

      const favoritasMarcadas = siguiente.filter((workspace) => workspace.isFavorite);
      if (favoritasMarcadas.length > 0) {
        return siguiente.map((workspace) => ({ ...workspace, isFavorite: false }));
      }

      return siguiente;
    });
  }, []);

  const createOrUpdateWorkspace = useCallback((payload: WorkspacePayload): Workspace => {
    const workspaceId = payload.id ?? generateWorkspaceId();
    const now = new Date().toISOString();
    const favoritoSolicitado = payload.isFavorite ?? false;
    const activoSolicitado = payload.isActive ?? true;
    let nextWorkspace: Workspace = {
      id: workspaceId,
      ruc: payload.ruc,
      razonSocial: payload.razonSocial,
      nombreComercial: payload.nombreComercial?.trim() || undefined,
      domicilioFiscal: payload.domicilioFiscal?.trim() || undefined,
      isActive: activoSolicitado,
      isFavorite: activoSolicitado ? favoritoSolicitado : false,
      createdAt: now,
    };

    setWorkspaces(prev => {
      const hayFavoritaActiva = prev.some((item) => item.isFavorite && item.isActive);
      const existing = prev.find(item => item.id === workspaceId);
      if (existing) {
        nextWorkspace = {
          ...nextWorkspace,
          createdAt: existing.createdAt,
          isActive: payload.isActive ?? existing.isActive,
          isFavorite: payload.isFavorite ?? existing.isFavorite,
        };

        if (!nextWorkspace.isActive) {
          nextWorkspace.isFavorite = false;
        }

        let updated = prev.map(item => (item.id === workspaceId ? nextWorkspace : item));
        if (nextWorkspace.isFavorite && nextWorkspace.isActive) {
          updated = updated.map((item) => ({
            ...item,
            isFavorite: item.id === workspaceId,
          }));
        }
        return updated;
      }

      if (!hayFavoritaActiva && nextWorkspace.isActive) {
        nextWorkspace = {
          ...nextWorkspace,
          isFavorite: true,
        };
      }

      const siguiente = [...prev, nextWorkspace];
      if (nextWorkspace.isFavorite && nextWorkspace.isActive) {
        return siguiente.map((item) => ({
          ...item,
          isFavorite: item.id === workspaceId,
        }));
      }

      return siguiente;
    });

    if (activoSolicitado) {
      setTenantIdState(workspaceId);
    }
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
    setWorkspaceActive,
    setWorkspaceFavorite,
    createOrUpdateWorkspace,
    getActiveWorkspace,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
