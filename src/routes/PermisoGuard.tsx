import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserSession } from '../contexts/UserSessionContext';
import { useConfigurationContext } from '../pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion';
import { obtenerUsuarioDesdeSesion, tieneAlgunoDePermisos } from '../pages/Private/features/configuracion-sistema/utilidades/permisos';

interface PermisoGuardProps {
  children: ReactNode;
  permisos: string[];
  fallbackPath?: string;
}

export function PermisoGuard({ children, permisos, fallbackPath = '/sin-permiso' }: PermisoGuardProps) {
  const location = useLocation();
  const { session } = useUserSession();
  const { state, rolesConfigurados } = useConfigurationContext();

  if (!permisos.length) {
    return <>{children}</>;
  }

  if (session?.permissions?.includes('*')) {
    return <>{children}</>;
  }

  const usuarioActual = obtenerUsuarioDesdeSesion(state.users, session);
  const tieneAcceso = tieneAlgunoDePermisos({
    usuario: usuarioActual,
    permisos,
    rolesDisponibles: rolesConfigurados,
    establecimientoId: session?.currentEstablecimientoId,
  });

  if (!tieneAcceso) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
