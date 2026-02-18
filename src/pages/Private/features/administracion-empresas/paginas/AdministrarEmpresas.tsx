import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, List, LayoutGrid, MoreHorizontal, Plus, Pencil } from 'lucide-react';
import { Button, PageHeader } from '@/contasis';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { generateWorkspaceId } from '../../../../../shared/tenant';
import { useFeedback } from '../../../../../shared/feedback/useFeedback';

type ModoVistaEmpresas = 'tarjetas' | 'lista';

export function AdministrarEmpresas() {
  const [modoVista, setModoVista] = useState<ModoVistaEmpresas>('tarjetas');
  const navigate = useNavigate();
  const feedback = useFeedback();
  const { workspaces, tenantId, activeWorkspace, setTenantId } = useTenant();

  const manejarCrearEmpresa = () => {
    const nuevoWorkspaceId = generateWorkspaceId();
    navigate('/configuracion/empresa', {
      state: {
        workspaceMode: 'create_workspace',
        workspaceId: nuevoWorkspaceId,
        returnTo: '/administrar-empresas',
      },
    });
  };

  const manejarEditarEmpresa = (empresaId: string) => {
    navigate('/configuracion/empresa', {
      state: {
        workspaceMode: 'edit_workspace',
        workspaceId: empresaId,
        returnTo: '/administrar-empresas',
      },
    });
  };

  const manejarSeleccionEmpresa = (empresaId: string) => {
    if (tenantId === empresaId) {
      return;
    }
    setTenantId(empresaId);
    feedback.success('Empresa activa actualizada.', 'Administrar empresas');
  };

  const obtenerNombreEmpresa = (empresa: (typeof workspaces)[number]) =>
    empresa.razonSocial || empresa.nombreComercial || 'Empresa sin nombre';

  const obtenerRucEmpresa = (empresa: (typeof workspaces)[number]) => {
    if (empresa.ruc) {
      return empresa.ruc;
    }
    return 'Sin RUC';
  };

  const obtenerDireccionEmpresa = (empresa: (typeof workspaces)[number]) => {
    if (empresa.domicilioFiscal) {
      return empresa.domicilioFiscal;
    }
    return 'Sin dirección registrada';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-900">
      <PageHeader
        title="Administrar empresas"
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-[color:var(--border-default)] bg-surface-0 p-1">
              <button
                type="button"
                onClick={() => setModoVista('tarjetas')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  modoVista === 'tarjetas'
                    ? 'bg-brand text-inverse dark:text-secondary'
                    : 'text-secondary hover:bg-surface-hover'
                }`}
              >
                <LayoutGrid size={16} />
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setModoVista('lista')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  modoVista === 'lista'
                    ? 'bg-brand text-inverse dark:text-secondary'
                    : 'text-secondary hover:bg-surface-hover'
                }`}
              >
                <List size={16} />
                Lista
              </button>
            </div>
            <Button variant="primary" icon={<Plus size={16} />} onClick={manejarCrearEmpresa}>
              Crear empresa
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="rounded-xl border border-[color:var(--border-default)] bg-surface-0 p-4">
          <p className="text-sm text-secondary mb-1">
            Crea, edita y selecciona la empresa con la que vas a trabajar.
          </p>
          <p className="text-xs text-tertiary">
            Empresa activa: {activeWorkspace?.razonSocial || activeWorkspace?.nombreComercial || 'Empresa sin nombre'}
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-surface-0 p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-1">
              <Building2 className="text-secondary" size={22} />
            </div>
            <p className="text-sm font-semibold text-primary">Aún no tienes empresas registradas.</p>
            <p className="mt-1 text-sm text-secondary">Crea tu primera empresa para comenzar.</p>
            <div className="mt-4">
              <Button variant="primary" icon={<Plus size={16} />} onClick={manejarCrearEmpresa}>
                Crear empresa
              </Button>
            </div>
          </div>
        ) : modoVista === 'tarjetas' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((empresa) => {
              const esActiva = tenantId === empresa.id;
              return (
                <article
                  key={empresa.id}
                  className={`rounded-xl border bg-surface-0 p-5 shadow-sm transition-colors ${
                    esActiva
                      ? 'border-brand/40 ring-1 ring-brand/20'
                      : 'border-[color:var(--border-default)] hover:border-brand/30'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-primary">
                        {obtenerNombreEmpresa(empresa)}
                      </h2>
                      <p className="mt-1 text-sm text-secondary">RUC: {obtenerRucEmpresa(empresa)}</p>
                    </div>
                    {esActiva ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 size={13} />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                        Sin seleccionar
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm text-secondary">
                    {obtenerDireccionEmpresa(empresa)}
                  </p>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-tertiary">
                      <MoreHorizontal size={14} />
                      Próximamente
                    </span>
                    <div className="flex items-center gap-2">
                      {!esActiva && (
                        <Button size="sm" variant="secondary" onClick={() => manejarSeleccionEmpresa(empresa.id)}>
                          Seleccionar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Pencil size={14} />}
                        onClick={() => manejarEditarEmpresa(empresa.id)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[color:var(--border-default)] bg-surface-0 shadow-sm">
            <table className="min-w-full divide-y divide-[color:var(--border-default)]">
              <thead className="bg-surface-1">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">RUC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">Dirección</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-tertiary">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-tertiary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-default)]">
                {workspaces.map((empresa) => {
                  const esActiva = tenantId === empresa.id;
                  return (
                    <tr key={empresa.id} className="hover:bg-surface-hover/40">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{obtenerNombreEmpresa(empresa)}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{obtenerRucEmpresa(empresa)}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{obtenerDireccionEmpresa(empresa)}</td>
                      <td className="px-4 py-3 text-sm">
                        {esActiva ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 size={12} />
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                            Sin seleccionar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!esActiva && (
                            <Button size="sm" variant="secondary" onClick={() => manejarSeleccionEmpresa(empresa.id)}>
                              Seleccionar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Pencil size={14} />}
                            onClick={() => manejarEditarEmpresa(empresa.id)}
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
