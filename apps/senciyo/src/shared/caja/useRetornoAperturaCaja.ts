import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCaja } from '@/pages/Private/features/control-caja/context/CajaContext';

export const CLAVE_RETORNO_APERTURA_CAJA = 'return_to_post_apertura_caja';

const buildFullPath = (pathname: string, search: string): string => `${pathname}${search ?? ''}`;

const safeSessionStorageGet = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSessionStorageSet = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // no-op
  }
};

const safeSessionStorageRemove = (key: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
};

export interface UseRetornoAperturaCajaResult {
  iniciarAperturaCaja: () => void;
}

export const useRetornoAperturaCaja = (): UseRetornoAperturaCajaResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useCaja();

  const didAutoReturnRef = useRef(false);

  const iniciarAperturaCaja = useCallback(() => {
    const returnTo = buildFullPath(location.pathname, location.search);
    safeSessionStorageSet(CLAVE_RETORNO_APERTURA_CAJA, returnTo);
    navigate('/control-caja?tab=apertura');
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (didAutoReturnRef.current) return;
    if (status !== 'abierta') return;

    const returnTo = safeSessionStorageGet(CLAVE_RETORNO_APERTURA_CAJA);
    if (!returnTo) return;

    didAutoReturnRef.current = true;
    safeSessionStorageRemove(CLAVE_RETORNO_APERTURA_CAJA);
    navigate(returnTo, { replace: true });
  }, [navigate, status]);

  return { iniciarAperturaCaja };
};
