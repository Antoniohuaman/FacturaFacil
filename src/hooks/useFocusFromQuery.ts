import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type FocusOptions = {
  /** Selector base donde buscar el atributo data-focus */
  selector?: string; // default: [data-focus]
  /** Clases temporales para resaltar */
  highlightClassName?: string; // default: ring...
  /** Cuánto dura el resaltado */
  highlightMs?: number; // default: 1400
  /** Reintentos por si el DOM todavía no renderiza (listas async) */
  retries?: number; // default: 8
  /** Delay entre reintentos */
  retryDelayMs?: number; // default: 120
  /** Si quieres limpiar focus del query luego de enfocar */
  clearFocusParam?: boolean; // default: true
};

const DEFAULT_HIGHLIGHT = 'ring-2 ring-blue-500/30 bg-blue-50/40 dark:bg-blue-900/20';

export function useFocusFromQuery(options?: FocusOptions) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const focus = params.get('focus');
    if (!focus) return;

    const selector = options?.selector ?? '[data-focus]';
    const highlightClassName = options?.highlightClassName ?? DEFAULT_HIGHLIGHT;
    const highlightMs = options?.highlightMs ?? 1400;
    const retries = options?.retries ?? 8;
    const retryDelayMs = options?.retryDelayMs ?? 120;
    const clearFocusParam = options?.clearFocusParam ?? true;

    let cancelled = false;
    let attempt = 0;
    let highlightTimer: number | undefined;

    const focusOnce = () => {
      if (cancelled) return;

      // Buscamos EXACTO el data-focus
      const el = document.querySelector(
        `${selector}[data-focus="${CSS.escape(focus)}"]`
      ) as HTMLElement | null;

      if (!el) {
        attempt += 1;
        if (attempt <= retries) {
          window.setTimeout(focusOnce, retryDelayMs);
        }
        return;
      }

      el.scrollIntoView({ block: 'center', behavior: 'smooth' });

      const classes = highlightClassName.split(' ').filter(Boolean);
      if (classes.length) el.classList.add(...classes);

      highlightTimer = window.setTimeout(() => {
        if (classes.length) el.classList.remove(...classes);
      }, highlightMs);

      // Limpia el focus de la URL para que no “re-enfoque” cada vez
      if (clearFocusParam) {
        params.delete('focus');
        const next = params.toString();
        navigate(`${location.pathname}${next ? `?${next}` : ''}`, { replace: true });
      }
    };

    focusOnce();

    return () => {
      cancelled = true;
      if (highlightTimer) window.clearTimeout(highlightTimer);
    };
  }, [location.pathname, location.search, navigate, options]);
}
