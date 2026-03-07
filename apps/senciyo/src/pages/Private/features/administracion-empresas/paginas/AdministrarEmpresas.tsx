import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, List, LayoutGrid, Plus, Pencil, Star } from 'lucide-react';
import { Button, PageHeader } from '@/contasis';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { generateWorkspaceId } from '../../../../../shared/tenant';
import { useFeedback } from '../../../../../shared/feedback/useFeedback';

type ModoVistaEmpresas = 'tarjetas' | 'lista';
type FiltroEstado = 'activas' | 'inactivas' | 'todas';

export function AdministrarEmpresas() {
  const [modoVista, setModoVista] = useState<ModoVistaEmpresas>('tarjetas');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('activas');
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const navigate = useNavigate();
  const feedback = useFeedback();
  const {
    workspaces,
    tenantId,
    activeWorkspace,
    setTenantId,
    setWorkspaceActive,
    setWorkspaceFavorite,
  } = useTenant();

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
    feedback.success('Empresa seleccionada.', 'Administrar empresas');
  };

  const manejarFavorita = (evento: MouseEvent, empresaId: string) => {
    evento.stopPropagation();
    setWorkspaceFavorite(empresaId);
    feedback.success('Empresa favorita actualizada.', 'Administrar empresas');
  };

  const manejarCambioEstadoActivo = (evento: MouseEvent, empresaId: string, estadoActual: boolean) => {
    evento.stopPropagation();
    const nuevoEstado = !estadoActual;
    setWorkspaceActive(empresaId, nuevoEstado);
    feedback.success(
      nuevoEstado ? 'Empresa activada.' : 'Empresa inactivada.',
      'Administrar empresas',
    );
  };

  const manejarEditarDesdeAccion = (evento: MouseEvent, empresaId: string) => {
    evento.stopPropagation();
    manejarEditarEmpresa(empresaId);
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

  const criterioBusqueda = textoBusqueda.trim().toLowerCase();

  const empresasFiltradas = workspaces
    .filter((empresa) => {
      if (filtroEstado === 'activas') {
        return empresa.isActive;
      }
      if (filtroEstado === 'inactivas') {
        return !empresa.isActive;
      }
      return true;
    })
    .filter((empresa) => {
      if (!criterioBusqueda) {
        return true;
      }
      const nombre = obtenerNombreEmpresa(empresa).toLowerCase();
      const ruc = (empresa.ruc || '').toLowerCase();
      return nombre.includes(criterioBusqueda) || ruc.includes(criterioBusqueda);
    })
    .sort((empresaA, empresaB) => {
      if (empresaA.isFavorite !== empresaB.isFavorite) {
        return empresaA.isFavorite ? -1 : 1;
      }
      return obtenerNombreEmpresa(empresaA).localeCompare(obtenerNombreEmpresa(empresaB), 'es', {
        sensitivity: 'base',
      });
    });

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

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="rounded-xl border border-[color:var(--border-default)] bg-surface-0 p-3">
          <p className="text-sm text-secondary">
            Crea, edita y selecciona la empresa con la que vas a trabajar.
          </p>
          <p className="text-xs text-tertiary">
            Empresa seleccionada: {activeWorkspace?.razonSocial || activeWorkspace?.nombreComercial || 'Empresa sin nombre'}
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--border-default)] bg-surface-0 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center rounded-lg border border-[color:var(--border-default)] bg-surface-0 p-1">
              <button
                type="button"
                onClick={() => setFiltroEstado('activas')}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroEstado === 'activas'
                    ? 'bg-brand text-inverse dark:text-secondary'
                    : 'text-secondary hover:bg-surface-hover'
                }`}
              >
                Activas
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('inactivas')}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroEstado === 'inactivas'
                    ? 'bg-brand text-inverse dark:text-secondary'
                    : 'text-secondary hover:bg-surface-hover'
                }`}
              >
                Inactivas
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstado('todas')}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroEstado === 'todas'
                    ? 'bg-brand text-inverse dark:text-secondary'
                    : 'text-secondary hover:bg-surface-hover'
                }`}
              >
                Todas
              </button>
            </div>

            <input
              type="text"
              value={textoBusqueda}
              onChange={(evento) => setTextoBusqueda(evento.target.value)}
              placeholder="Buscar por razón social o RUC"
              className="h-9 w-full md:w-72 rounded-lg border border-[color:var(--border-default)] bg-surface-0 px-3 text-sm text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-surface-0 p-8 text-center">
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
        ) : empresasFiltradas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-surface-0 p-8 text-center">
            <p className="text-sm font-semibold text-primary">No se encontraron empresas para este filtro.</p>
            <p className="mt-1 text-sm text-secondary">Ajusta el estado o el texto de búsqueda.</p>
          </div>
        ) : modoVista === 'tarjetas' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {empresasFiltradas.map((empresa) => {
              const esSeleccionada = tenantId === empresa.id;
              return (
                <article
                  key={empresa.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => manejarSeleccionEmpresa(empresa.id)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      manejarSeleccionEmpresa(empresa.id);
                    }
                  }}
                  className={`rounded-xl border bg-surface-0 p-5 shadow-sm transition-colors ${
                    esSeleccionada
                      ? 'border-brand/40 ring-1 ring-brand/20'
                      : 'border-[color:var(--border-default)] hover:border-brand/30'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-primary">
                        {obtenerNombreEmpresa(empresa)}
                      </h2>
                      <p className="mt-0.5 text-sm text-secondary">RUC: {obtenerRucEmpresa(empresa)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {empresa.isFavorite && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <Star size={11} className="fill-current" />
                          Favorita
                        </span>
                      )}
                      {esSeleccionada && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 size={11} />
                          Seleccionada
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm text-secondary">
                    {obtenerDireccionEmpresa(empresa)}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        empresa.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {empresa.isActive ? 'Activa' : 'Inactiva'}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="tertiary"
                        iconOnly
                        icon={<Star size={15} className={empresa.isFavorite ? 'fill-current' : ''} />}
                        title={empresa.isFavorite ? 'Empresa favorita' : 'Marcar como favorita'}
                        aria-label={empresa.isFavorite ? 'Empresa favorita' : 'Marcar como favorita'}
                        onClick={(evento) => manejarFavorita(evento, empresa.id)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(evento) => manejarCambioEstadoActivo(evento, empresa.id, empresa.isActive)}
                      >
                        {empresa.isActive ? 'Inactivar' : 'Activar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="tertiary"
                        iconOnly
                        icon={<Pencil size={15} />}
                        title="Editar empresa"
                        aria-label="Editar empresa"
                        onClick={(evento) => manejarEditarDesdeAccion(evento, empresa.id)}
                      />
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
                {empresasFiltradas.map((empresa) => {
                  const esSeleccionada = tenantId === empresa.id;
                  return (
                    <tr
                      key={empresa.id}
                      className="hover:bg-surface-hover/40 cursor-pointer"
                      onClick={() => manejarSeleccionEmpresa(empresa.id)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{obtenerNombreEmpresa(empresa)}</span>
                          {esSeleccionada && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 size={11} />
                              Seleccionada
                            </span>
                          )}
                          {empresa.isFavorite && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star size={11} className="fill-current" />
                              Favorita
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">{obtenerRucEmpresa(empresa)}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{obtenerDireccionEmpresa(empresa)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            empresa.isActive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {empresa.isActive ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(evento) => evento.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="tertiary"
                            iconOnly
                            icon={<Star size={15} className={empresa.isFavorite ? 'fill-current' : ''} />}
                            title={empresa.isFavorite ? 'Empresa favorita' : 'Marcar como favorita'}
                            aria-label={empresa.isFavorite ? 'Empresa favorita' : 'Marcar como favorita'}
                            onClick={(evento) => manejarFavorita(evento, empresa.id)}
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(evento) => manejarCambioEstadoActivo(evento, empresa.id, empresa.isActive)}
                          >
                            {empresa.isActive ? 'Inactivar' : 'Activar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="tertiary"
                            iconOnly
                            icon={<Pencil size={15} />}
                            title="Editar empresa"
                            aria-label="Editar empresa"
                            onClick={(evento) => manejarEditarDesdeAccion(evento, empresa.id)}
                          />
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
