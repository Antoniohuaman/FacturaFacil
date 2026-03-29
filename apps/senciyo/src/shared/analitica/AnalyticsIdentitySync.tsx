import { useEffect } from 'react';
import { useUserSession } from '../../contexts/UserSessionContext';
import { useAuthStore } from '../../pages/Private/features/autenticacion/store/AuthStore';
import { useTenant } from '../tenant/TenantContext';
import {
  resetearIdentidadAnalitica,
  sincronizarIdentidadAnalitica,
} from './analitica';
import { resolverContextoIdentidadAnalitica } from './identidadAnalitica';

export function AnalyticsIdentitySync() {
  const { session } = useUserSession();
  const { tenantId, activeEstablecimientoId } = useTenant();
  const isAuthenticated = useAuthStore((store) => store.isAuthenticated);
  const authUser = useAuthStore((store) => store.user);

  useEffect(() => {
    const contextoAnalitico = resolverContextoIdentidadAnalitica({
      isAuthenticated,
      authUser,
      session,
      tenantId,
      activeEstablecimientoId,
    });

    if (!contextoAnalitico) {
      resetearIdentidadAnalitica();
      return;
    }

    sincronizarIdentidadAnalitica(contextoAnalitico);
  }, [activeEstablecimientoId, authUser, isAuthenticated, session, tenantId]);

  return null;
}
