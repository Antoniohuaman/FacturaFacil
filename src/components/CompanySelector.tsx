import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, MapPin } from 'lucide-react';
import { useUserSession } from '../contexts/UserSessionContext';
import { useTenant } from '../shared/tenant/TenantContext';
import { WorkspaceSwitcherModal } from './WorkspaceSwitcherModal';
import { generateWorkspaceId } from '../shared/tenant';

const CompanySelector = () => {
  const { session, setCurrentEstablecimiento } = useUserSession();
  const { workspaces, tenantId, setTenantId, activeWorkspace } = useTenant();
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const navigate = useNavigate();

  const selectedCompany = session?.currentCompany;
  const selectedEstablecimiento = session?.currentEstablecimiento;
  const availableEstablecimientos = session?.availableEstablecimientos || [];

  const handleSelectEstablecimiento = (EstablecimientoId: string) => {
    const Establecimiento = availableEstablecimientos.find(e => e.id === EstablecimientoId);
    if (Establecimiento) {
      setCurrentEstablecimiento(EstablecimientoId, Establecimiento);
      setShowCompanyDropdown(false);
    }
  };

  const workspaceDisplayName = activeWorkspace?.nombreComercial || activeWorkspace?.razonSocial;
  const displayCompanyName = workspaceDisplayName || selectedCompany?.nombreComercial || selectedCompany?.razonSocial;
  const displayEstablecimientoName = activeWorkspace?.domicilioFiscal || selectedEstablecimiento?.nombreEstablecimiento || 'Sin establecimiento';

  const handleNavigateToWorkspace = (mode: 'create_workspace' | 'edit_workspace', workspaceId?: string) => {
    navigate('/configuracion/empresa', { state: { workspaceMode: mode, workspaceId } });
  };

  const handleChangeCompany = () => {
    setShowCompanyDropdown(false);
    if (workspaces.length === 0) {
      handleNavigateToWorkspace('create_workspace');
      return;
    }
    setShowWorkspaceModal(true);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    if (tenantId !== workspaceId) {
      setTenantId(workspaceId);
    }
    setShowWorkspaceModal(false);
  };

  const handleCreateWorkspace = () => {
    setShowWorkspaceModal(false);
    handleNavigateToWorkspace('create_workspace', generateWorkspaceId());
  };

  const handleEditWorkspace = (workspaceId: string) => {
    setShowWorkspaceModal(false);
    handleNavigateToWorkspace('edit_workspace', workspaceId);
  };

  if (!session || !selectedCompany) {
    return null;
  }

  return (
    <div className="p-4 border-b border-gray-100/50 dark:border-gray-700/50">
      <div className="relative">
        <button
          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200/50 dark:border-gray-600/50
                   hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50
                   transition-all duration-150 flex items-center justify-between group backdrop-blur-sm
                   hover:shadow-md bg-white dark:bg-gray-800/70"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600
                          flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30
                          group-hover:scale-105 transition-transform">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="text-left min-w-0 flex-1 overflow-hidden">
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate w-full" 
                   title={displayCompanyName || 'Sin empresa'}>
                {displayCompanyName || 'Sin empresa'}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 min-w-0"
                   title={displayEstablecimientoName}>
                <MapPin size={11} className="flex-shrink-0" />
                <span className="truncate">{displayEstablecimientoName}</span>
              </div>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${
              showCompanyDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showCompanyDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-600">
            <div className="p-2">
                <div className="text-xs font-medium px-2 py-1.5 text-gray-500 dark:text-gray-400 truncate" 
                   title={`Establecimientos de ${selectedCompany.nombreComercial || selectedCompany.razonSocial}`}>
                 Establecimientos de {selectedCompany.nombreComercial || selectedCompany.razonSocial}
              </div>

              <div className="space-y-1">
                {availableEstablecimientos.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay establecimientos disponibles
                  </div>
                ) : (
                  availableEstablecimientos.map((Establecimiento) => (
                    <button
                      key={Establecimiento.id}
                      onClick={() => handleSelectEstablecimiento(Establecimiento.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                        Establecimiento.id === selectedEstablecimiento?.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-3 border-blue-600 dark:border-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/70 text-gray-700 dark:text-gray-300 border-l-3 border-transparent'
                      }`}
                    >
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-2 text-gray-400 dark:text-gray-500" />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {Establecimiento.nombreEstablecimiento}
                            {Establecimiento.isMainEstablecimiento && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                                Principal
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {Establecimiento.direccionEstablecimiento}, {Establecimiento.distritoEstablecimiento}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <button
                  onClick={() => {
                    setShowCompanyDropdown(false);
                    handleChangeCompany();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/70 transition-colors text-sm text-blue-600 dark:text-blue-400 font-medium"
                >
                  <Building2 size={16} />
                  <span>Cambiar empresa</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <WorkspaceSwitcherModal
        isOpen={showWorkspaceModal}
        workspaces={workspaces}
        activeWorkspaceId={tenantId}
        onClose={() => setShowWorkspaceModal(false)}
        onSelect={handleSelectWorkspace}
        onCreate={handleCreateWorkspace}
        onEdit={handleEditWorkspace}
      />
    </div>
  );
};

export default CompanySelector;
