import { Building2, Plus, X } from 'lucide-react';
import type { Workspace } from '../shared/tenant/types';

interface WorkspaceSwitcherModalProps {
  isOpen: boolean;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onClose: () => void;
  onSelect: (workspaceId: string) => void;
  onCreate: () => void;
  onEdit: (workspaceId: string) => void;
}

export function WorkspaceSwitcherModal({
  isOpen,
  workspaces,
  activeWorkspaceId,
  onClose,
  onSelect,
  onCreate,
  onEdit,
}: WorkspaceSwitcherModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Multiempresa</p>
            <h2 className="text-lg font-bold text-slate-900">Selecciona una empresa</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto px-6 py-4">
          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <Building2 size={40} className="text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                Aún no registras empresas.
              </p>
              <p className="text-xs text-slate-500">
                Crea tu primer espacio de trabajo para empezar a configurar FacturaFácil.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workspaces.map(workspace => {
                const isActive = workspace.id === activeWorkspaceId;
                return (
                  <div
                    key={workspace.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isActive
                        ? 'border-blue-200 bg-blue-50/60'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {workspace.nombreComercial || workspace.razonSocial}
                        </p>
                        <p className="text-xs text-slate-500">RUC: {workspace.ruc}</p>
                        {workspace.domicilioFiscal && (
                          <p className="mt-1 text-xs text-slate-400">{workspace.domicilioFiscal}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {isActive ? (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            Activa
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                            onClick={() => onSelect(workspace.id)}
                          >
                            Seleccionar
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800"
                          onClick={() => onEdit(workspace.id)}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
            onClick={onCreate}
          >
            <Plus size={16} className="mr-2" />
            Crear nuevo espacio de trabajo
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
