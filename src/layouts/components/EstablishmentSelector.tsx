import { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, MapPin, CheckCircle2 } from 'lucide-react';
import { useUserSession } from '../../contexts/UserSessionContext';
import { useConfigurationContext } from '../../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenantStore } from '../../pages/Private/features/autenticacion/store/TenantStore';

export default function SelectorEstablecimiento() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { session, setCurrentEstablecimiento } = useUserSession();
  const { state } = useConfigurationContext();
  const establecimientos = useTenantStore((state) => state.establecimientos);
  const establecimientoActivo = useTenantStore((state) => state.establecimientoActivo);
  const empresaActiva = useTenantStore((state) => state.empresaActiva);
  const cambiarEstablecimientoActivo = useTenantStore((state) => state.cambiarEstablecimientoActivo);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeEstablecimientos = establecimientos.filter(est => est.esActivo);

  const displayedEstablecimientos = activeEstablecimientos.map(est => ({
    id: est.id,
    nombreEstablecimiento: est.nombre,
    direccionEstablecimiento: est.direccion,
    distritoEstablecimiento: est.distrito,
    codigoEstablecimiento: est.codigo,
    isMainEstablecimiento: est.id === empresaActiva?.establecimientoId,
    estaActivoEstablecimiento: est.esActivo,
  }));

  const currentEstablecimientoFromTenant = establecimientoActivo
    ? {
        id: establecimientoActivo.id,
        nombreEstablecimiento: establecimientoActivo.nombre,
        direccionEstablecimiento: establecimientoActivo.direccion,
        codigoEstablecimiento: establecimientoActivo.codigo,
        isMainEstablecimiento: establecimientoActivo.id === empresaActiva?.establecimientoId,
      }
    : null;

  const currentEstablecimiento = currentEstablecimientoFromTenant || session?.currentEstablecimiento;

  const availableEstablecimientos = displayedEstablecimientos.length > 0
    ? displayedEstablecimientos
    : state.Establecimientos.filter(est => est.estaActivoEstablecimiento);

  const handleEstablecimientoChange = (EstablecimientoId: string) => {
    cambiarEstablecimientoActivo(EstablecimientoId);

    const Establecimiento = state.Establecimientos.find(est => est.id === EstablecimientoId);
    if (Establecimiento) {
      setCurrentEstablecimiento(EstablecimientoId, Establecimiento);
      setShowDropdown(false);
    }
  };

  // Si no hay establecimiento seleccionado, mostrar aviso
  if (!currentEstablecimiento) {
    return (
      <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700">
        <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Sin establecimiento
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="group flex items-center gap-3 px-2 py-1 rounded-md transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f70b4]"
        onClick={() => setShowDropdown(!showDropdown)}
        title={`Cambiar establecimiento (Actual: ${currentEstablecimiento.nombreEstablecimiento})`}
      >
        <Building2 className="w-5 h-5 text-[#2f70b4] dark:text-[#2ccdb0]" />
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {currentEstablecimiento.nombreEstablecimiento}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 dark:text-gray-500 transition-transform duration-200 ${
                showDropdown ? 'rotate-180' : ''
              }`}
            />
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
            <MapPin className="w-3 h-3" />
            {currentEstablecimiento.direccionEstablecimiento}
          </span>
        </div>
      </button>

      {/* Dropdown con lista de establecimientos */}
      {showDropdown && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg shadow-xl py-2 z-50 max-h-96 overflow-y-auto">
          <div className="px-4 pb-2 border-b border-slate-100 dark:border-gray-700">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
              Seleccionar Establecimiento
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
              Las series se filtrarán según el establecimiento seleccionado
            </p>
          </div>

          <div className="py-1">
            {availableEstablecimientos.length > 0 ? (
              availableEstablecimientos.map(Establecimiento => {
                const isSelected = Establecimiento.id === currentEstablecimiento?.id || Establecimiento.id === establecimientoActivo?.id;
                const isMain = Establecimiento.isMainEstablecimiento;

                return (
                  <button
                    key={Establecimiento.id}
                    onClick={() => handleEstablecimientoChange(Establecimiento.id)}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-400'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-semibold truncate ${
                            isSelected
                              ? 'text-blue-900 dark:text-blue-100'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                            {Establecimiento.nombreEstablecimiento}
                        </p>
                        {isMain && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            Principal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 dark:text-gray-500 flex-shrink-0" />
                        <p className="text-xs text-slate-600 dark:text-gray-400 truncate">
                          {Establecimiento.direccionEstablecimiento}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">
                        Código: {Establecimiento.codigoEstablecimiento}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center">
                <Building2 className="w-12 h-12 text-slate-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  No hay establecimientos disponibles
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  Configura tus establecimientos en la sección de configuración
                </p>
              </div>
            )}
          </div>

          {availableEstablecimientos.length > 0 && (
            <div className="border-t border-slate-100 dark:border-gray-700 pt-2 px-4">
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {availableEstablecimientos.length} establecimiento
                {availableEstablecimientos.length !== 1 ? 's' : ''} disponible
                {availableEstablecimientos.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
