import { useEffect, useRef } from 'react';
import { useUserSession } from './UserSessionContext';
import { useConfigurationContext } from '../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import { useAuthStore } from '../pages/Private/features/autenticacion/store/AuthStore';

/**
 * Componente que sincroniza el UserSessionContext con ConfigurationContext
 * Inicializa la sesión del usuario con el establecimiento principal o el primero disponible
 */
export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentEstablecimiento, updateAvailableEstablecimientos, clearSession } = useUserSession();
  const { state } = useConfigurationContext();
  const initializedRef = useRef(false);
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const authUser = useAuthStore((store) => store.user);

  // Inicializar o actualizar la sesión cuando se carguen los establecimientos
  useEffect(() => {
    if (!isAuthenticated || !authUser) {
      if (session) {
        clearSession();
      }
      initializedRef.current = false;
      return;
    }

    // Solo proceder si hay establecimientos disponibles
    if (state.Establecimientos.length === 0 || !state.company) return;

    const activeEstablecimientos = state.Establecimientos.filter(est => est.estaActivoEstablecimiento);
    if (activeEstablecimientos.length === 0) return;

    // Si no hay sesión activa y no hemos inicializado, crear una sesión inicial
    if (!session && !initializedRef.current) {
      // Buscar el establecimiento principal
      const mainEstablecimiento = activeEstablecimientos.find(est => est.isMainEstablecimiento);
      // O usar el primero disponible
      const defaultEstablecimiento = mainEstablecimiento || activeEstablecimientos[0];

      if (defaultEstablecimiento) {
        initializedRef.current = true;
        // Crear sesión inicial basada en el usuario autenticado
        setSession({
          userId: authUser.id,
          userName: authUser.nombre,
          userEmail: authUser.email,
          currentCompanyId: state.company.id,
          currentCompany: state.company,
          currentEstablecimientoId: defaultEstablecimiento.id,
          currentEstablecimiento: defaultEstablecimiento,
          availableEstablecimientos: activeEstablecimientos,
          permissions: ['*'], // Permisos completos por defecto
          role: authUser.rol,
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
    isAuthenticated,
    authUser,
    clearSession,
  ]);

  return <>{children}</>;
}
