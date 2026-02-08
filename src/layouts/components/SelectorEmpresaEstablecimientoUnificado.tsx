import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, MapPin } from 'lucide-react';
import { useUserSession } from '../../contexts/UserSessionContext';
import { useTenant } from '../../shared/tenant/TenantContext';
import { WorkspaceSwitcherModal } from '../../components/WorkspaceSwitcherModal';
import { generateWorkspaceId } from '../../shared/tenant';
import { useConfigurationContext } from '../../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';

export default function SelectorEmpresaEstablecimientoUnificado() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalEmpresasAbierto, setModalEmpresasAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { session, setCurrentEstablecimiento } = useUserSession();
  const { workspaces, tenantId, setTenantId, activeWorkspace } = useTenant();
  const { state } = useConfigurationContext();

  const establecimientosConfigurados = useMemo(
    () => state.Establecimientos.filter((establecimiento) => establecimiento.estaActivoEstablecimiento),
    [state.Establecimientos]
  );

  const establecimientosDisponibles = useMemo(
    () => (establecimientosConfigurados.length > 0
      ? establecimientosConfigurados
      : session?.availableEstablecimientos ?? []),
    [establecimientosConfigurados, session?.availableEstablecimientos]
  );

  const establecimientoActual =
    establecimientosDisponibles.find((item) => item.id === session?.currentEstablecimientoId) ||
    session?.currentEstablecimiento ||
    establecimientosDisponibles[0] ||
    null;

  const nombreEmpresa =
    activeWorkspace?.razonSocial ||
    session?.currentCompany?.razonSocial ||
    activeWorkspace?.nombreComercial ||
    session?.currentCompany?.nombreComercial ||
    'Empresa sin nombre';

  const nombreEstablecimiento = establecimientoActual?.nombreEstablecimiento || 'Sin establecimiento';

  const direccionEstablecimiento = establecimientoActual?.direccionEstablecimiento || '';
  const tieneMultiplesEstablecimientos = establecimientosDisponibles.length > 1;

  useEffect(() => {
    const manejarClickFuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };

    if (menuAbierto) {
      document.addEventListener('mousedown', manejarClickFuera);
    }

    return () => {
      document.removeEventListener('mousedown', manejarClickFuera);
    };
  }, [menuAbierto]);

  const manejarCambioEstablecimiento = (establecimientoId: string) => {
    const establecimiento = establecimientosDisponibles.find((item) => item.id === establecimientoId);
    if (!establecimiento) {
      return;
    }
    setCurrentEstablecimiento(establecimientoId, establecimiento);
    setMenuAbierto(false);
  };

  const navegarGestionEmpresa = (modo: 'create_workspace' | 'edit_workspace', workspaceId?: string) => {
    navigate('/configuracion/empresa', { state: { workspaceMode: modo, workspaceId } });
  };

  const manejarAbrirSelectorEmpresas = () => {
    setMenuAbierto(false);

    if (workspaces.length === 0) {
      navegarGestionEmpresa('create_workspace', generateWorkspaceId());
      return;
    }

    setModalEmpresasAbierto(true);
  };

  const manejarSeleccionWorkspace = (workspaceId: string) => {
    if (tenantId !== workspaceId) {
      setTenantId(workspaceId);
    }
    setModalEmpresasAbierto(false);
  };

  const manejarCrearWorkspace = () => {
    setModalEmpresasAbierto(false);
    navegarGestionEmpresa('create_workspace', generateWorkspaceId());
  };

  const manejarEditarWorkspace = (workspaceId: string) => {
    setModalEmpresasAbierto(false);
    navegarGestionEmpresa('edit_workspace', workspaceId);
  };

  if (!session || !session.currentCompany) {
    return null;
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        className="h-10 max-w-[280px] flex items-center gap-2.5 px-3 bg-surface-2/30 hover:bg-surface-hover rounded-lg cursor-pointer transition-all duration-200"
        onClick={() => setMenuAbierto(!menuAbierto)}
        aria-expanded={menuAbierto}
        aria-haspopup
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm bg-gradient-to-br from-amber-400 to-amber-600">
          <Building2 size={16} className="text-white" />
        </div>

        <div className="h-6 w-px bg-secondary/30"></div>

        <div className="flex flex-col items-start justify-center min-w-0 pr-1 gap-0.5">
          <div
            className="text-[13px] font-semibold text-primary leading-tight w-full text-left truncate"
            title={nombreEmpresa}
          >
            {nombreEmpresa}
          </div>
          <div
            className="text-[10px] text-secondary leading-tight w-full text-left truncate flex items-center gap-1"
            title={direccionEstablecimiento || nombreEstablecimiento}
          >
            <MapPin size={10} className="flex-shrink-0" />
            <span className="truncate">{nombreEstablecimiento}</span>
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`text-secondary flex-shrink-0 transition-transform duration-200 ${
            menuAbierto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {menuAbierto && (
        <div
          className="absolute top-full left-0 mt-2 w-[320px] bg-surface-0 border border-secondary rounded-xl shadow-lg z-[1000] overflow-hidden"
          style={{
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
        >
          {tieneMultiplesEstablecimientos && (
            <div className="py-2">
              <div className="px-4 pt-2 pb-1">
                <div className="text-[10px] font-semibold text-tertiary uppercase tracking-wide">
                  Establecimientos
                </div>
              </div>
              <div className="px-3 pb-2">
                {establecimientosDisponibles.map((establecimiento) => {
                  const esSeleccionado = establecimiento.id === establecimientoActual?.id;
                  return (
                    <button
                      key={establecimiento.id}
                      type="button"
                      onClick={() => manejarCambioEstablecimiento(establecimiento.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-150 border-l-2 ${
                        esSeleccionado
                          ? 'bg-primary-light dark:bg-surface-2 border-primary text-primary'
                          : 'hover:bg-surface-hover border-transparent text-primary'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">
                        {establecimiento.nombreEstablecimiento}
                      </div>
                      <div className="text-[11px] text-secondary truncate">
                        {establecimiento.direccionEstablecimiento}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-secondary px-3 py-2">
            <button
              type="button"
              onClick={manejarAbrirSelectorEmpresas}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors text-sm font-semibold text-primary"
            >
              <Building2 size={16} />
              Cambiar empresa
            </button>
          </div>
        </div>
      )}

      <WorkspaceSwitcherModal
        isOpen={modalEmpresasAbierto}
        workspaces={workspaces}
        activeWorkspaceId={tenantId}
        onClose={() => setModalEmpresasAbierto(false)}
        onSelect={manejarSeleccionWorkspace}
        onCreate={manejarCrearWorkspace}
        onEdit={manejarEditarWorkspace}
      />
    </div>
  );
}
