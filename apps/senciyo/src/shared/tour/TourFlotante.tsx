import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PasoTour } from "./tiposTour";

interface TourFlotanteProps {
  paso: PasoTour | null;
  indicePaso: number;
  totalPasos: number;
  elementoObjetivo: HTMLElement | null;
  onSiguiente: () => void;
  onAtras: () => void;
  onOmitir: () => void;
  onSaltarPaso: () => void;
  onFinalizar: () => void;
}

type PosicionTooltip = {
  top: number;
  left: number;
};

const calcularPosicion = (
  rect: DOMRect,
  ancho: number,
  alto: number,
  posicion?: PasoTour["posicion"]
): PosicionTooltip => {
  const margen = 12;
  const viewportAncho = window.innerWidth;
  const viewportAlto = window.innerHeight;

  let top = rect.bottom + margen;
  let left = rect.left;

  switch (posicion) {
    case "arriba":
      top = rect.top - margen - alto;
      left = rect.left + rect.width / 2 - ancho / 2;
      break;
    case "izquierda":
      top = rect.top + rect.height / 2 - alto / 2;
      left = rect.left - margen - ancho;
      break;
    case "derecha":
      top = rect.top + rect.height / 2 - alto / 2;
      left = rect.right + margen;
      break;
    case "centro":
      top = rect.top + rect.height / 2 - alto / 2;
      left = rect.left + rect.width / 2 - ancho / 2;
      break;
    case "abajo":
    default:
      top = rect.bottom + margen;
      left = rect.left + rect.width / 2 - ancho / 2;
      break;
  }

  const maxLeft = viewportAncho - ancho - margen;
  const maxTop = viewportAlto - alto - margen;

  return {
    top: Math.min(Math.max(margen, top), Math.max(margen, maxTop)),
    left: Math.min(Math.max(margen, left), Math.max(margen, maxLeft)),
  };
};

export function TourFlotante({
  paso,
  indicePaso,
  totalPasos,
  elementoObjetivo,
  onSiguiente,
  onAtras,
  onOmitir,
  onSaltarPaso,
  onFinalizar,
}: TourFlotanteProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [posicion, setPosicion] = useState<PosicionTooltip | null>(null);

  const esUltimoPaso = useMemo(() => indicePaso >= totalPasos - 1, [indicePaso, totalPasos]);

  const actualizarPosicion = useCallback(() => {
    if (!elementoObjetivo) {
      setPosicion(null);
      return;
    }

    const rect = elementoObjetivo.getBoundingClientRect();
    const ancho = contenedorRef.current?.offsetWidth ?? 320;
    const alto = contenedorRef.current?.offsetHeight ?? 180;
    setPosicion(calcularPosicion(rect, ancho, alto, paso?.posicion));
  }, [elementoObjetivo, paso?.posicion]);

  useLayoutEffect(() => {
    actualizarPosicion();
  }, [actualizarPosicion, paso]);

  useEffect(() => {
    if (!paso) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOmitir();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOmitir, paso]);

  useEffect(() => {
    if (!paso) {
      return;
    }
    const handleResize = () => actualizarPosicion();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [actualizarPosicion, paso]);

  if (!paso || !elementoObjetivo) {
    return null;
  }

  const posicionSegura = posicion ?? { top: 12, left: 12 };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/10 pointer-events-none z-[70]" aria-hidden="true" />
      <div
        ref={contenedorRef}
        className="fixed z-[80] w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl p-4 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        style={{ top: posicionSegura.top, left: posicionSegura.left }}
        role="dialog"
        aria-label="Ayuda guiada"
      >
        <button
          type="button"
          onClick={onOmitir}
          aria-label="Cerrar ayuda guiada"
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
        >
          ×
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Paso {indicePaso + 1} de {totalPasos}</p>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{paso.titulo}</h3>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">{paso.descripcion}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            {indicePaso > 0 && (
              <button
                type="button"
                onClick={onAtras}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Atrás
              </button>
            )}
            {!esUltimoPaso && (
              <button
                type="button"
                onClick={onSaltarPaso}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Saltar
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={esUltimoPaso ? onFinalizar : onSiguiente}
            className="px-3 py-1.5 text-xs rounded-md bg-violet-600 text-white hover:bg-violet-700"
          >
            {esUltimoPaso ? "Finalizar" : "Siguiente"}
          </button>
        </div>
      </div>
    </>
  );
}
