export interface Workspace {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  domicilioFiscal?: string;
  createdAt: string;
}

export interface WorkspacePayload {
  id?: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  domicilioFiscal?: string;
}

export interface TenantContextValue {
  tenantId: string | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setTenantId: (id: string | null) => void;
  createOrUpdateWorkspace: (workspace: WorkspacePayload) => Workspace;
  getActiveWorkspace: () => Workspace | null;
}
