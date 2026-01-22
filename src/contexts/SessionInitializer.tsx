import { useEffect, useRef } from 'react';
import { useUserSession } from './UserSessionContext';
import { useConfigurationContext } from '../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import { useTenantStore } from '../pages/Private/features/autenticacion/store/TenantStore';
import { useAuthStore } from '../pages/Private/features/autenticacion/store/AuthStore';
import { empresasClient } from '../pages/Private/features/autenticacion/services/EmpresasClient';

export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { session, setSession, setCurrentEstablecimiento, updateAvailableEstablecimientos } = useUserSession();
  const { state } = useConfigurationContext();
  const tenantStore = useTenantStore();
  const user = useAuthStore((state) => state.user);
  const initializedRef = useRef(false);
  const empresaLoadedRef = useRef(false);

  // Inicializar o actualizar la sesión cuando se carguen los establecimientos
  useEffect(() => {
    if (state.Establecimientos.length === 0) return;

    const activeEstablecimientos = state.Establecimientos.filter(est => est.estaActivoEstablecimiento);
    if (activeEstablecimientos.length === 0) return;

    if (!session && !initializedRef.current && user) {
      const mainEstablecimiento = activeEstablecimientos.find(est => est.isMainEstablecimiento);
      const defaultEstablecimiento = mainEstablecimiento || activeEstablecimientos[0];

      if (defaultEstablecimiento && state.company) {
        initializedRef.current = true;
        setSession({
          userId: user.id,
          userName: `${user.nombre} ${user.apellido}`,
          userEmail: user.email,
          currentCompanyId: state.company.id,
          currentCompany: state.company,
          currentEstablecimientoId: defaultEstablecimiento.id,
          currentEstablecimiento: defaultEstablecimiento,
          availableEstablecimientos: activeEstablecimientos,
          permissions: ['*'],
          role: user.rol,
        });
      }
      return;
    }

    if (session) {
      const currentEstablecimientoIds = session.availableEstablecimientos.map(e => e.id).sort().join(',');
      const newEstablecimientoIds = activeEstablecimientos.map(e => e.id).sort().join(',');

      if (currentEstablecimientoIds !== newEstablecimientoIds) {
        updateAvailableEstablecimientos(activeEstablecimientos);
      }

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

  useEffect(() => {
    const { empresaActiva, empresaCompleta, isLoading } = tenantStore;

    if (empresaLoadedRef.current || isLoading) return;

    if (empresaActiva && !empresaCompleta) {
      empresaLoadedRef.current = true;

      const cargarEmpresaCompleta = async () => {
        try {
          useTenantStore.setState({ isLoading: true });

          const empresaData = await empresasClient.fetchEmpresa(empresaActiva.empresaId);

          useTenantStore.getState().setEmpresaCompleta(empresaData);
        } catch (error) {
          console.error('[SessionInitializer] Error al cargar empresa completa:', error);
          useTenantStore.setState({ isLoading: false });
        }
      };

      cargarEmpresaCompleta();
    }
  }, [tenantStore.empresaActiva, tenantStore.empresaCompleta, tenantStore.isLoading]);

  useEffect(() => {
    const { empresaActiva, establecimientoActivo } = tenantStore;

    if (empresaActiva && establecimientoActivo && session && state.company) {
      const isSynced =
        session.currentCompany?.razonSocial === empresaActiva.empresaRazonSocial &&
        session.currentEstablecimiento?.nombreEstablecimiento === establecimientoActivo.nombre;

      if (!isSynced) {
        const updatedSession = {
          ...session,
          currentCompanyId: empresaActiva.empresaId,
          currentCompany: {
            ...state.company,
            id: empresaActiva.empresaId,
            ruc: empresaActiva.empresaRuc,
            razonSocial: empresaActiva.empresaRazonSocial,
            nombreComercial: empresaActiva.empresaRazonSocial,
          },
          currentEstablecimientoId: establecimientoActivo.id,
          currentEstablecimiento: {
            id: establecimientoActivo.id,
            codigoEstablecimiento: establecimientoActivo.codigo,
            nombreEstablecimiento: establecimientoActivo.nombre,
            direccionEstablecimiento: establecimientoActivo.direccion,
            isMainEstablecimiento: false,
            estaActivoEstablecimiento: establecimientoActivo.esActivo,
          },
        };

        setSession(updatedSession);
      }
    }
  }, [
    tenantStore.empresaActiva,
    tenantStore.establecimientoActivo,
    session,
    state.company,
    setSession,
  ]);

  return <>{children}</>;
}
