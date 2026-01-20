/* eslint-disable react-refresh/only-export-components -- archivo comparte helpers/constantes; split diferido */
// src/contexts/UserSessionContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Establecimiento } from '../pages/Private/features/configuracion-sistema/modelos/Establecimiento';
import type { Company } from '../pages/Private/features/configuracion-sistema/modelos/Company';

/**
 * User Session Context
 * Mantiene el estado global de la sesión del usuario:
 * - Empresa activa
 * - Establecimiento activo
 * - Permisos y configuración
 */

interface UserSession {
  // Identificación del usuario
  userId: string;
  userName: string;
  userEmail?: string;

  // Empresa y establecimiento activos
  currentCompanyId: string;
  currentCompany: Company | null;
  currentEstablecimientoId: string;
  currentEstablecimiento: Establecimiento | null;

  // Establecimientos disponibles para el usuario
  availableEstablecimientos: Establecimiento[];

  // Permisos y configuración
  permissions: string[];
  role?: string;
}

interface UserSessionContextValue {
  session: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;

  // Acciones
  setSession: (session: UserSession) => void;
  setCurrentEstablecimiento: (EstablecimientoId: string, Establecimiento: Establecimiento) => void;
  setCurrentCompany: (companyId: string, company: Company) => void;
  updateAvailableEstablecimientos: (Establecimientos: Establecimiento[]) => void;
  clearSession: () => void;

  // Helpers
  hasPermission: (permission: string) => boolean;
  getEstablecimientoById: (id: string) => Establecimiento | undefined;
}

const UserSessionContext = createContext<UserSessionContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'facturafacil_user_session';

type GlobalUserSession = {
  currentCompanyId?: string;
  currentEstablecimientoId?: string;
};

const syncGlobalSession = (session: UserSession | null) => {
  const globalAny = globalThis as typeof globalThis & {
    __USER_SESSION__?: GlobalUserSession;
  };

  if (session) {
    globalAny.__USER_SESSION__ = {
      currentCompanyId: session.currentCompanyId,
      currentEstablecimientoId: session.currentEstablecimientoId,
    };
  } else if (globalAny.__USER_SESSION__) {
    delete globalAny.__USER_SESSION__;
  }
};

const readStoredSession = (): UserSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedSession) {
      return null;
    }
    const parsedSession = JSON.parse(storedSession) as UserSession;
    syncGlobalSession(parsedSession);
    return parsedSession;
  } catch (error) {
    console.error('Error loading session from localStorage:', error);
    return null;
  }
};

interface UserSessionProviderProps {
  children: ReactNode;
}

export function UserSessionProvider({ children }: UserSessionProviderProps) {
  const [session, setSessionState] = useState<UserSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Guardar sesión en localStorage cuando cambie
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (session) {
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Error saving session to localStorage:', error);
      }
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    syncGlobalSession(session);
  }, [session]);

  const setSession = useCallback((newSession: UserSession) => {
    setSessionState(newSession);
  }, []);

  const setCurrentEstablecimiento = useCallback((EstablecimientoId: string, Establecimiento: Establecimiento) => {
    setSessionState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentEstablecimientoId: EstablecimientoId,
        currentEstablecimiento: Establecimiento,
      };
    });
  }, []);

  const setCurrentCompany = useCallback((companyId: string, company: Company) => {
    setSessionState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentCompanyId: companyId,
        currentCompany: company,
      };
    });
  }, []);

  const updateAvailableEstablecimientos = useCallback((Establecimientos: Establecimiento[]) => {
    setSessionState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        availableEstablecimientos: Establecimientos,
      };
    });
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!session) return false;
    return session.permissions.includes(permission) || session.permissions.includes('*');
  }, [session]);

  const getEstablecimientoById = useCallback((id: string): Establecimiento | undefined => {
    if (!session) return undefined;
    return session.availableEstablecimientos.find(est => est.id === id);
  }, [session]);

  const value: UserSessionContextValue = {
    session,
    isAuthenticated: !!session,
    loading,
    setSession,
    setCurrentEstablecimiento,
    setCurrentCompany,
    updateAvailableEstablecimientos,
    clearSession,
    hasPermission,
    getEstablecimientoById,
  };

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de sesión de usuario
 * @throws Error si se usa fuera del UserSessionProvider
 */
export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (context === undefined) {
    throw new Error('useUserSession must be used within a UserSessionProvider');
  }
  return context;
}

/**
 * Hook auxiliar para obtener el establecimiento actual
 * Retorna null si no hay sesión activa
 */
export function useCurrentEstablecimiento(): Establecimiento | null {
  const { session } = useUserSession();
  return session?.currentEstablecimiento || null;
}

/**
 * Hook auxiliar para obtener la empresa actual
 * Retorna null si no hay sesión activa
 */
export function useCurrentCompany(): Company | null {
  const { session } = useUserSession();
  return session?.currentCompany || null;
}

/**
 * Hook auxiliar para obtener el ID del establecimiento actual
 * Retorna string vacío si no hay sesión activa
 */
export function useCurrentEstablecimientoId(): string {
  const { session } = useUserSession();
  return session?.currentEstablecimientoId || '';
}

/**
 * Hook auxiliar para obtener el ID de la empresa actual
 * Retorna string vacío si no hay sesión activa
 */
export function useCurrentCompanyId(): string {
  const { session } = useUserSession();
  return session?.currentCompanyId || '';
}
