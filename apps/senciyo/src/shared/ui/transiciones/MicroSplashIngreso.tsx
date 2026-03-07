import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AUTH_PATHS } from '../../../pages/Private/features/autenticacion/utils/path';
import { useTransicionIngresoStore } from './useTransicionIngresoStore';

type MicroSplashIngresoProps = {
  activa: boolean;
  motivo?: 'login' | 'registro' | 'logout' | null;
};

const MIN_MS = 220;
const MAX_MS = 320;
const FAIL_SAFE_MS = 1200;

export function MicroSplashIngreso({ activa, motivo }: MicroSplashIngresoProps) {
  const location = useLocation();
  const { inicioMs, finalizar } = useTransicionIngresoStore();

  useEffect(() => {
    if (!activa) {
      return;
    }

    const start = inicioMs ?? performance.now();
    const elapsed = performance.now() - start;

    const minRemaining = Math.max(0, MIN_MS - elapsed);
    const maxRemaining = Math.max(0, MAX_MS - elapsed);
    const failSafeRemaining = Math.max(0, FAIL_SAFE_MS - elapsed);

    let minTimer: number | undefined;

    if (location.pathname === AUTH_PATHS.DASHBOARD) {
      minTimer = window.setTimeout(() => {
        finalizar();
      }, minRemaining);
    }

    const maxTimer = window.setTimeout(() => {
      finalizar();
    }, maxRemaining);

    const failSafeTimer = window.setTimeout(() => {
      finalizar();
    }, failSafeRemaining);

    return () => {
      if (minTimer) {
        window.clearTimeout(minTimer);
      }
      window.clearTimeout(maxTimer);
      window.clearTimeout(failSafeTimer);
    };
  }, [activa, inicioMs, location.pathname, finalizar]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-900 transition-all duration-200 ease-out ${
        activa ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97] pointer-events-none'
      }`}
      aria-hidden={activa ? undefined : true}
      role={activa ? 'status' : undefined}
      aria-live={activa ? 'polite' : undefined}
      data-motivo={motivo ?? undefined}
    >
      <div className="flex flex-col items-center justify-center">
        <img
          src="/Senciyo_Logo.png"
          alt="SenciYO"
          className="h-10 w-auto object-contain"
        />
      </div>
    </div>
  );
}
