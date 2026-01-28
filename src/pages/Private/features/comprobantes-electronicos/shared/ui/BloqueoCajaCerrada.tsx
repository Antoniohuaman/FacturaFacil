import { forwardRef, useId, useMemo, useState } from 'react';

export interface BloqueoCajaCerradaProps {
  onAbrirCaja: () => void;
}

export const BloqueoCajaCerrada = forwardRef<HTMLButtonElement, BloqueoCajaCerradaProps>(({ onAbrirCaja }, abrirCajaButtonRef) => {
  const tooltipId = useId();
  const [showWhy, setShowWhy] = useState(false);

  const whyText = useMemo(() => 'La caja debe estar abierta para registrar ventas.', []);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-amber-900">Caja cerrada</h3>
            <span className="relative inline-flex">
              <button
                type="button"
                className="text-xs text-amber-900/80 underline underline-offset-2 hover:text-amber-900"
                aria-describedby={tooltipId}
                onMouseEnter={() => setShowWhy(true)}
                onMouseLeave={() => setShowWhy(false)}
                onFocus={() => setShowWhy(true)}
                onBlur={() => setShowWhy(false)}
              >
                ¿Por qué?
              </button>
              {showWhy && (
                <span
                  id={tooltipId}
                  role="tooltip"
                  className="absolute left-0 top-full z-20 mt-2 w-max max-w-[280px] rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] text-amber-900 shadow-sm"
                >
                  {whyText}
                </span>
              )}
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-800">Para vender, primero abre tu caja.</p>
        </div>

        <button
          ref={abrirCajaButtonRef}
          type="button"
          onClick={onAbrirCaja}
          className="shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/30"
        >
          Abrir caja
        </button>
      </div>
    </div>
  );
});

BloqueoCajaCerrada.displayName = 'BloqueoCajaCerrada';
