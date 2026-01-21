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
  const initializedRef = useRef(false);

  // Inicializar o actualizar la sesión cuando se carguen los establecimientos
  useEffect(() => {
    // Solo proceder si hay establecimientos disponibles
    if (state.Establecimientos.length === 0) return;

    const activeEstablecimientos = state.Establecimientos.filter(est => est.estaActivoEstablecimiento);
    if (activeEstablecimientos.length === 0) return;

    // Si no hay sesión activa y no hemos inicializado, crear una sesión inicial
    if (!session && !initializedRef.current) {
      // Buscar el establecimiento principal
      const mainEstablecimiento = activeEstablecimientos.find(est => est.isMainEstablecimiento);
      // O usar el primero disponible
      const defaultEstablecimiento = mainEstablecimiento || activeEstablecimientos[0];

      if (defaultEstablecimiento && state.company) {
        initializedRef.current = true;
        // Obtener datos reales del usuario desde AuthStore
        const { user } = useAuthStore.getState();

        // Crear sesión inicial con datos reales o fallback si no hay usuario (esto no debería pasar en rutas privadas)
        setSession({
          userId: user?.id || 'unknown-user',
          userName: user ? `${user.nombre} ${user.apellido}`.trim() : 'Usuario',
          userEmail: user?.email || '',
          currentCompanyId: state.company.id,
          currentCompany: state.company,
          currentEstablecimientoId: defaultEstablecimiento.id,
          currentEstablecimiento: defaultEstablecimiento,
          availableEstablecimientos: activeEstablecimientos,
          permissions: ['*'], // Permisos completos por defecto
          role: user?.rol || 'Usuario',
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
    state.company,
    state.Establecimientos,
  ]);

  // Sincronizar cambios del usuario en tiempo real
  useEffect(() => {
    // Función para sincronizar o inicializar sesión basada en AuthStore
    const syncSession = (user: any) => {
      if (!user) return;

      // Caso 1: Actualizar sesión existente
      if (session) {
        if (user.nombre !== session.userName || user.email !== session.userEmail || user.rol !== session.role) {
          setSession({
            ...session,
            userId: user.id || session.userId,
            userName: `${user.nombre} ${user.apellido}`.trim(),
            userEmail: user.email || '',
            role: user.rol || session.role || 'Usuario',
          });
        }
        return;
      }

      // Caso 2: Inicializar sesión si no existe pero tenemos datos básicos
      // Nota: Esto es un fallback, la inicialización principal debería ocurrir en el primer useEffect con establecimientos
      // Pero si ya tenemos usuario y no hay establecimientos aun, podríamos querer mostrar el usuario al menos
      // Sin embargo, UserSession requiere establishment... así que mejor esperamos al primer useEffect para la creación completa.
      // Solo actualizamos si session existe o si podemos reconstruirla parcialmente (lo cual es riesgoso sin establishment).
    };

    // Suscribirse a cambios
    const unsubscribe = useAuthStore.subscribe((state) => syncSession(state.user));

    // Ejecutar inmediatamente con el estado actual
    syncSession(useAuthStore.getState().user);

    return () => unsubscribe();
  }, [session, setSession]);

  return <>{children}</>;
}
