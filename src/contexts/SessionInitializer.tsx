import { useEffect, useRef } from 'react';
import { useUserSession } from './UserSessionContext';
import { useConfigurationContext } from '../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import { useAuthStore } from '../pages/Private/features/autenticacion/store/AuthStore';

/**
 * Componente que sincroniza el UserSessionContext con ConfigurationContext
 * Inicializa la sesión del usuario con el establecimiento principal o el primero disponible
 */
export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentEstablecimiento, updateAvailableEstablecimientos } = useUserSession();
  const { state } = useConfigurationContext();
  const { user } = useAuthStore();
  const initializedRef = useRef(false);

  // Inicializar o actualizar la sesión cuando se carguen los establecimientos
  useEffect(() => {
    // Solo proceder si hay establecimientos disponibles
    if (state.Establecimientos.length === 0) return;

    const activeEstablecimientos = state.Establecimientos.filter(est => est.estaActivoEstablecimiento);
    if (activeEstablecimientos.length === 0) return;

    // Si no hay sesión activa y no hemos inicializado, crear una sesión inicial
    if (!session && !initializedRef.current && user) {
      // Buscar el establecimiento principal
      const mainEstablecimiento = activeEstablecimientos.find(est => est.isMainEstablecimiento);
      // O usar el primero disponible
      const defaultEstablecimiento = mainEstablecimiento || activeEstablecimientos[0];

      if (defaultEstablecimiento && state.company) {
        initializedRef.current = true;
        // Crear sesión inicial con datos reales del usuario desde AuthStore
        setSession({
          userId: user.id,
          userName: `${user.nombre} ${user.apellido}`,
          userEmail: user.email,
          currentCompanyId: state.company.id,
          currentCompany: state.company,
          currentEstablecimientoId: defaultEstablecimiento.id,
          currentEstablecimiento: defaultEstablecimiento,
          availableEstablecimientos: activeEstablecimientos,
          permissions: [], // Los permisos reales deben venir del backend según el rol
          role: user.rol,
        });
      }
      return;
    }

    // Si ya hay sesión, solo actualizar la lista de establecimientos disponibles si cambió
    if (session) {
      const currentEstablecimientoIds = session.availableEstablecimientos.map(e => e.id).sort().join(',');
      const newEstablecimientoIds = activeEstablecimientos.map(e => e.id).sort().join(',');

      if (currentEstablecimientoIds !== newEstablecimientoIds) {
        updateAvailableEstablecimientos(activeEstablecimientos);
      }

      // Si no tiene establecimiento seleccionado, asignar uno
      if (!session.currentEstablecimiento) {
        const mainEstablecimiento = activeEstablecimientos.find(est => est.isMainEstablecimiento);
        const defaultEstablecimiento = mainEstablecimiento || activeEstablecimientos[0];

        if (defaultEstablecimiento) {
          setCurrentEstablecimiento(defaultEstablecimiento.id, defaultEstablecimiento);
        }
      }
    }
  }, [
    session,
    setSession,
    setCurrentEstablecimiento,
    updateAvailableEstablecimientos,
    state.company,
    state.Establecimientos,
    user,
  ]);

  return <>{children}</>;
}
