import type { EntornoOperacionEmpresa, TipoEmpresa } from '@/shared/empresas/entornoEmpresa';

export interface Workspace {
  id: string;
  tipoEmpresa?: TipoEmpresa;
  entornoOperacion?: EntornoOperacionEmpresa;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  domicilioFiscal?: string;
  isActive: boolean;
  isFavorite: boolean;
  createdAt: string;
}

export interface WorkspacePayload {
  id?: string;
  tipoEmpresa?: TipoEmpresa;
  entornoOperacion?: EntornoOperacionEmpresa;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  domicilioFiscal?: string;
  isActive?: boolean;
  isFavorite?: boolean;
}

export interface TenantContextValue {
  tenantId: string | null;
  isTenantReady: boolean;
  activeEstablecimientoId: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setTenantId: (id: string | null) => void;
  setActiveEstablecimientoId: (establecimientoId: string | null) => void;
  setActiveEstablecimientoIdParaTenant: (tenantId: string, establecimientoId: string | null) => void;
  setWorkspaceActive: (workspaceId: string, isActive: boolean) => void;
  setWorkspaceFavorite: (workspaceId: string) => void;
  createOrUpdateWorkspace: (workspace: WorkspacePayload) => Workspace;
  getActiveWorkspace: () => Workspace | null;
}
