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

  if (!session) {
    return null;
  }

  const usuarioActual = obtenerUsuarioDesdeSesion(state.users, session);

  if (!usuarioActual) {
    // El usuario autenticado todavía no tiene un registro de configuración
    // (roles/permisos) aprovisionado en este tenant — ocurre por un instante
    // en el primer render tras iniciar sesión, mientras ConfigurationContext
    // le asigna su rol de propietario. No es una denegación real: se espera
    // a que el registro exista antes de decidir, igual que se espera a que
    // `session` exista más arriba.
    return null;
  }

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
