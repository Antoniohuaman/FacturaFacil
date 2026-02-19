import { useEffect, useRef } from 'react';
import { useUserSession } from './UserSessionContext';
import { useConfigurationContext } from '../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import { construirNombreCompleto } from '../pages/Private/features/configuracion-sistema/utilidades/usuariosAsignaciones';
import { useAuthStore } from '../pages/Private/features/autenticacion/store/AuthStore';
import { clientesClient } from '../pages/Private/features/gestion-clientes/api';
import { useTenant } from '../shared/tenant/TenantContext';
import { registrarInicioSesionExitoso } from '@/shared/analitica/analitica';

/**
 * Componente que sincroniza el UserSessionContext con ConfigurationContext
 * Inicializa la sesión del usuario con el establecimiento principal o el primero disponible
 */
export function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { session, setSession, clearSession } = useUserSession();
  const { tenantId, activeEstablecimientoId, setActiveEstablecimientoId } = useTenant();
  const { state } = useConfigurationContext();
  const initializedRef = useRef(false);
  const ensuredClienteGeneralRef = useRef<string | null>(null);
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const authUser = useAuthStore((store) => store.user);
  const authStatus = useAuthStore((store) => store.status);
  const authReady = authStatus !== 'idle' && authStatus !== 'loading';

  // Inicializar o actualizar la sesión cuando se carguen los establecimientos
  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated || !authUser) {
      if (session) {
        clearSession();
      }
      initializedRef.current = false;
      return;
    }

    if (!tenantId || state.Establecimientos.length === 0 || !state.company) return;

    const activeEstablecimientos = state.Establecimientos.filter(est => est.estaActivoEstablecimiento);
    if (activeEstablecimientos.length === 0) return;

    const mainEstablecimiento = activeEstablecimientos.find(est => est.isMainEstablecimiento);
    const defaultEstablecimiento = mainEstablecimiento || activeEstablecimientos[0];
    const establecimientoActivoTenant = activeEstablecimientos.find(
      est => est.id === activeEstablecimientoId,
    );
    const establecimientoResuelto = establecimientoActivoTenant || defaultEstablecimiento;
    const companyFromTenant = {
      ...state.company,
      id: tenantId,
    };

    if (!establecimientoResuelto) {
      return;
    }

    if (activeEstablecimientoId !== establecimientoResuelto.id) {
      setActiveEstablecimientoId(establecimientoResuelto.id);
    }

    if (!session && !initializedRef.current) {
      initializedRef.current = true;
      setSession({
        userId: authUser.id,
        userName: construirNombreCompleto(authUser.nombre, authUser.apellido),
        userEmail: authUser.email,
        currentCompanyId: tenantId,
        currentCompany: companyFromTenant,
        currentEstablecimientoId: establecimientoResuelto.id,
        currentEstablecimiento: establecimientoResuelto,
        availableEstablecimientos: activeEstablecimientos,
        permissions: ['*'],
        role: authUser.rol,
      });
      registrarInicioSesionExitoso({
        entorno:
          companyFromTenant.configuracionSunatEmpresa?.entornoSunat === 'PRODUCTION'
            ? 'produccion'
            : 'demo',
      });
      return;
    }

    if (!session) {
      return;
    }

    const establecimientoValidoSesion = activeEstablecimientos.find(
      (est) => est.id === session.currentEstablecimientoId,
    );
    const establecimientoValido = establecimientoValidoSesion && establecimientoValidoSesion.id === establecimientoResuelto.id;
    const companyDesactualizada =
      session.currentCompanyId !== tenantId ||
      session.currentCompany?.id !== tenantId ||
      session.currentCompany?.ruc !== companyFromTenant.ruc ||
      session.currentCompany?.razonSocial !== companyFromTenant.razonSocial ||
      session.currentCompany?.nombreComercial !== companyFromTenant.nombreComercial ||
      session.currentCompany?.direccionFiscal !== companyFromTenant.direccionFiscal;

    const establecimientosDesactualizados =
      session.availableEstablecimientos.length !== activeEstablecimientos.length ||
      session.availableEstablecimientos.some((est) =>
        !activeEstablecimientos.some((activeEst) => activeEst.id === est.id),
      );

    const establecimientoDesactualizado =
      !establecimientoValido ||
      !session.currentEstablecimiento ||
      session.currentEstablecimiento.id !== establecimientoResuelto.id;

    if (!companyDesactualizada && !establecimientosDesactualizados && !establecimientoDesactualizado) {
      return;
    }

    setSession({
      ...session,
      currentCompanyId: tenantId,
      currentCompany: companyFromTenant,
      currentEstablecimientoId: establecimientoResuelto.id,
      currentEstablecimiento: establecimientoResuelto,
      availableEstablecimientos: activeEstablecimientos,
    });
  }, [
    activeEstablecimientoId,
    tenantId,
    session,
    setActiveEstablecimientoId,
    setSession,
    state.company,
    state.Establecimientos,
    isAuthenticated,
    authUser,
    authReady,
    clearSession,
  ]);

  useEffect(() => {
    if (!authReady || !isAuthenticated || !session?.currentCompanyId) {
      return;
    }

    if (ensuredClienteGeneralRef.current === session.currentCompanyId) {
      return;
    }

    ensuredClienteGeneralRef.current = session.currentCompanyId;

    clientesClient.ensureClienteGeneral().catch((error) => {
      console.warn('[session] No se pudo asegurar Cliente General', error);
    });
  }, [authReady, isAuthenticated, session?.currentCompanyId]);

  return <>{children}</>;
}
