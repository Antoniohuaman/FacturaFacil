import { useEffect, useRef } from 'react';
import { useUserSession } from './UserSessionContext';
import { useConfigurationContext } from '../pages/Private/features/configuracion-sistema/context/ConfigurationContext';

/**
 * Componente que sincroniza el UserSessionContext con ConfigurationContext
 * Inicializa la sesión del usuario con el establecimiento principal o el primero disponible
 */
export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentEstablishment, updateAvailableEstablishments } = useUserSession();
  const { state } = useConfigurationContext();
  const initializedRef = useRef(false);

  // Inicializar o actualizar la sesión cuando se carguen los establecimientos
  useEffect(() => {
    // Solo proceder si hay establecimientos disponibles
    if (state.establishments.length === 0) return;

    const activeEstablishments = state.establishments.filter(est => est.isActive);
    if (activeEstablishments.length === 0) return;

    // Si no hay sesión activa y no hemos inicializado, crear una sesión inicial
    if (!session && !initializedRef.current) {
      // Buscar el establecimiento principal
      const mainEstablishment = activeEstablishments.find(est => est.isMainEstablishment);
      // O usar el primero disponible
      const defaultEstablishment = mainEstablishment || activeEstablishments[0];

      if (defaultEstablishment && state.company) {
        initializedRef.current = true;
        // Crear sesión inicial con datos mock del usuario
        setSession({
          userId: 'user-001',
          userName: 'Antonio Huamán',
          userEmail: 'antonio@sensiyo.com',
          currentCompanyId: state.company.id,
          currentCompany: state.company,
          currentEstablishmentId: defaultEstablishment.id,
          currentEstablishment: defaultEstablishment,
          availableEstablishments: activeEstablishments,
          permissions: ['*'], // Permisos completos por defecto
          role: 'Administrador',
        });
      }
      return;
    }

    // Si ya hay sesión, solo actualizar la lista de establecimientos disponibles si cambió
    if (session) {
      const currentEstablishmentIds = session.availableEstablishments.map(e => e.id).sort().join(',');
      const newEstablishmentIds = activeEstablishments.map(e => e.id).sort().join(',');

      if (currentEstablishmentIds !== newEstablishmentIds) {
        updateAvailableEstablishments(activeEstablishments);
      }

      // Si no tiene establecimiento seleccionado, asignar uno
      if (!session.currentEstablishment) {
        const mainEstablishment = activeEstablishments.find(est => est.isMainEstablishment);
        const defaultEstablishment = mainEstablishment || activeEstablishments[0];

        if (defaultEstablishment) {
          setCurrentEstablishment(defaultEstablishment.id, defaultEstablishment);
        }
      }
    }
  }, [
    session,
    setSession,
    setCurrentEstablishment,
    updateAvailableEstablishments,
    state.company,
    state.establishments,
  ]);

  return <>{children}</>;
}
