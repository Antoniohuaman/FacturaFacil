/* eslint-disable react-refresh/only-export-components -- archivo comparte helpers/constantes; split diferido */
// src/contexts/UserSessionContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Establishment } from '../features/configuracion-sistema/models/Establishment';
import type { Company } from '../features/configuracion-sistema/models/Company';

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
  currentEstablishmentId: string;
  currentEstablishment: Establishment | null;

  // Establecimientos disponibles para el usuario
  availableEstablishments: Establishment[];

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
  setCurrentEstablishment: (establishmentId: string, establishment: Establishment) => void;
  setCurrentCompany: (companyId: string, company: Company) => void;
  updateAvailableEstablishments: (establishments: Establishment[]) => void;
  clearSession: () => void;

  // Helpers
  hasPermission: (permission: string) => boolean;
  getEstablishmentById: (id: string) => Establishment | undefined;
}

const UserSessionContext = createContext<UserSessionContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'facturafacil_user_session';

interface UserSessionProviderProps {
  children: ReactNode;
}

export function UserSessionProvider({ children }: UserSessionProviderProps) {
  const [session, setSessionState] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión desde localStorage al montar
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        setSessionState(parsedSession);
      }
    } catch (error) {
      console.error('Error loading session from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Guardar sesión en localStorage cuando cambie
  useEffect(() => {
    if (session) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Error saving session to localStorage:', error);
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  const setSession = useCallback((newSession: UserSession) => {
    setSessionState(newSession);
  }, []);

  const setCurrentEstablishment = useCallback((establishmentId: string, establishment: Establishment) => {
    setSessionState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentEstablishmentId: establishmentId,
        currentEstablishment: establishment,
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

  const updateAvailableEstablishments = useCallback((establishments: Establishment[]) => {
    setSessionState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        availableEstablishments: establishments,
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

  const getEstablishmentById = useCallback((id: string): Establishment | undefined => {
    if (!session) return undefined;
    return session.availableEstablishments.find(est => est.id === id);
  }, [session]);

  const value: UserSessionContextValue = {
    session,
    isAuthenticated: !!session,
    loading,
    setSession,
    setCurrentEstablishment,
    setCurrentCompany,
    updateAvailableEstablishments,
    clearSession,
    hasPermission,
    getEstablishmentById,
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
export function useCurrentEstablishment(): Establishment | null {
  const { session } = useUserSession();
  return session?.currentEstablishment || null;
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
export function useCurrentEstablishmentId(): string {
  const { session } = useUserSession();
  return session?.currentEstablishmentId || '';
}

/**
 * Hook auxiliar para obtener el ID de la empresa actual
 * Retorna string vacío si no hay sesión activa
 */
export function useCurrentCompanyId(): string {
  const { session } = useUserSession();
  return session?.currentCompanyId || '';
}
