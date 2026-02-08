import { cloneElement, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INDICE_Z_TOOLTIP, VALORES_PREDETERMINADOS_TOOLTIP } from "../constants";
import type { AlineacionTooltip, PropsTooltip, UbicacionTooltip } from "./types";
import type { CSSProperties, KeyboardEvent as EventoTeclado, MutableRefObject, Ref, SyntheticEvent } from "react";

const MARGEN_VENTANA_PX = 8;

const aplicarAlineacionHorizontal = (
  rect: DOMRect,
  anchoTooltip: number,
  alineacion: AlineacionTooltip
) => {
  switch (alineacion) {
    case "inicio":
      return rect.left;
    case "fin":
      return rect.right - anchoTooltip;
    case "centro":
    default:
      return rect.left + rect.width / 2 - anchoTooltip / 2;
  }
};

const aplicarAlineacionVertical = (
  rect: DOMRect,
  altoTooltip: number,
  alineacion: AlineacionTooltip
) => {
  switch (alineacion) {
    case "inicio":
      return rect.top;
    case "fin":
      return rect.bottom - altoTooltip;
    case "centro":
    default:
      return rect.top + rect.height / 2 - altoTooltip / 2;
  }
};

const calcularPosicionTooltip = (
  rect: DOMRect,
  anchoTooltip: number,
  altoTooltip: number,
  ubicacion: UbicacionTooltip,
  alineacion: AlineacionTooltip,
  desplazamientoPx: number
) => {
  let top = 0;
  let left = 0;

  if (ubicacion === "arriba" || ubicacion === "abajo") {
    left = aplicarAlineacionHorizontal(rect, anchoTooltip, alineacion);
    top =
      ubicacion === "arriba"
        ? rect.top - altoTooltip - desplazamientoPx
        : rect.bottom + desplazamientoPx;
  } else {
    top = aplicarAlineacionVertical(rect, altoTooltip, alineacion);
    left =
      ubicacion === "izquierda"
        ? rect.left - anchoTooltip - desplazamientoPx
        : rect.right + desplazamientoPx;
  }

  const maxLeft = window.innerWidth - anchoTooltip - MARGEN_VENTANA_PX;
  const maxTop = window.innerHeight - altoTooltip - MARGEN_VENTANA_PX;

  return {
    left: Math.min(Math.max(MARGEN_VENTANA_PX, left), Math.max(MARGEN_VENTANA_PX, maxLeft)),
    top: Math.min(Math.max(MARGEN_VENTANA_PX, top), Math.max(MARGEN_VENTANA_PX, maxTop)),
  };
};

const combinarHandlers = <E extends SyntheticEvent>(
  propio?: (evento: E) => void,
  externo?: (evento: E) => void
) => {
  return (evento: E) => {
    externo?.(evento);
    propio?.(evento);
  };
};

const asignarRef = <T,>(ref: Ref<T> | undefined, valor: T | null) => {
  if (typeof ref === "function") {
    ref(valor);
  } else if (ref && typeof ref === "object") {
    (ref as MutableRefObject<T | null>).current = valor;
  }
};

export const Tooltip = ({
  contenido,
  children,
  ubicacion = VALORES_PREDETERMINADOS_TOOLTIP.ubicacion,
  alineacion = VALORES_PREDETERMINADOS_TOOLTIP.alineacion,
  retrasoMostrarMs = VALORES_PREDETERMINADOS_TOOLTIP.retrasoMostrarMs,
  retrasoOcultarMs = VALORES_PREDETERMINADOS_TOOLTIP.retrasoOcultarMs,
  desplazamientoPx = VALORES_PREDETERMINADOS_TOOLTIP.desplazamientoPx,
  deshabilitado = false,
  multilinea = false,
  portal = true,
  id,
  claseContenedor,
}: PropsTooltip) => {
  const elementoHijo = children as typeof children & { ref?: Ref<HTMLElement> };
  const propsHijo = elementoHijo.props as {
    onMouseEnter?: (evento: SyntheticEvent) => void;
    onMouseLeave?: (evento: SyntheticEvent) => void;
    onFocus?: (evento: SyntheticEvent) => void;
    onBlur?: (evento: SyntheticEvent) => void;
    onKeyDown?: (evento: EventoTeclado) => void;
  };
  const idInterno = useId();
  const idTooltip = id ?? idInterno;
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const refTrigger = useRef<HTMLElement | null>(null);
  const refTooltip = useRef<HTMLDivElement | null>(null);
  const refTimerMostrar = useRef<number | null>(null);
  const refTimerOcultar = useRef<number | null>(null);

  const limpiarTimers = useCallback(() => {
    if (refTimerMostrar.current !== null) {
      window.clearTimeout(refTimerMostrar.current);
      refTimerMostrar.current = null;
    }
    if (refTimerOcultar.current !== null) {
      window.clearTimeout(refTimerOcultar.current);
      refTimerOcultar.current = null;
    }
  }, []);

  const abrir = useCallback(() => {
    limpiarTimers();
    refTimerMostrar.current = window.setTimeout(() => {
      setAbierto(true);
    }, retrasoMostrarMs);
  }, [limpiarTimers, retrasoMostrarMs]);

  const cerrar = useCallback(() => {
    limpiarTimers();
    refTimerOcultar.current = window.setTimeout(() => {
      setAbierto(false);
    }, retrasoOcultarMs);
  }, [limpiarTimers, retrasoOcultarMs]);

  const cerrarInmediato = useCallback(() => {
    limpiarTimers();
    setAbierto(false);
  }, [limpiarTimers]);

  const actualizarPosicion = useCallback(() => {
    if (!refTrigger.current || !refTooltip.current) {
      return;
    }

    const rect = refTrigger.current.getBoundingClientRect();
    const anchoTooltip = refTooltip.current.offsetWidth;
    const altoTooltip = refTooltip.current.offsetHeight;

    const nuevaPosicion = calcularPosicionTooltip(
      rect,
      anchoTooltip,
      altoTooltip,
      ubicacion,
      alineacion,
      desplazamientoPx
    );

    setPosicion(nuevaPosicion);
  }, [alineacion, desplazamientoPx, ubicacion]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      actualizarPosicion();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [abierto, actualizarPosicion, contenido, multilinea]);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const manejarRecalculo = () => actualizarPosicion();

    window.addEventListener("resize", manejarRecalculo);
    window.addEventListener("scroll", manejarRecalculo, true);

    return () => {
      window.removeEventListener("resize", manejarRecalculo);
      window.removeEventListener("scroll", manejarRecalculo, true);
    };
  }, [abierto, actualizarPosicion]);

  useEffect(() => {
    return () => limpiarTimers();
  }, [limpiarTimers]);

  const manejarTecla = useCallback(
    (evento: EventoTeclado) => {
      if (evento.key === "Escape") {
        cerrarInmediato();
      }
    },
    [cerrarInmediato]
  );

  const propsTrigger = useMemo(() => {
    if (deshabilitado) {
      return {
        ref: (valor: HTMLElement | null) => {
          asignarRef(elementoHijo.ref as Ref<HTMLElement> | undefined, valor);
          refTrigger.current = valor;
        },
      };
    }

    return {
      ref: (valor: HTMLElement | null) => {
        asignarRef(elementoHijo.ref as Ref<HTMLElement> | undefined, valor);
        refTrigger.current = valor;
      },
      onMouseEnter: combinarHandlers(abrir, propsHijo.onMouseEnter),
      onMouseLeave: combinarHandlers(cerrar, propsHijo.onMouseLeave),
      onFocus: combinarHandlers(abrir, propsHijo.onFocus),
      onBlur: combinarHandlers(cerrar, propsHijo.onBlur),
      onKeyDown: combinarHandlers(manejarTecla, propsHijo.onKeyDown),
      "aria-describedby": idTooltip,
    };
  }, [abrir, cerrar, deshabilitado, elementoHijo.ref, idTooltip, manejarTecla, propsHijo.onBlur, propsHijo.onFocus, propsHijo.onKeyDown, propsHijo.onMouseEnter, propsHijo.onMouseLeave]);

  const claseBase =
    "rounded-lg px-3 py-2 text-xs leading-snug shadow-lg ring-1 ring-black/5 pointer-events-none";
  const claseTema =
    "bg-gray-900 text-gray-100 dark:bg-gray-100 dark:text-gray-900";
  const claseTexto = multilinea ? "whitespace-normal" : "whitespace-nowrap";

  const estiloTooltip: CSSProperties = {
    position: "fixed",
    zIndex: INDICE_Z_TOOLTIP,
    top: posicion?.top ?? -9999,
    left: posicion?.left ?? -9999,
    maxWidth: multilinea ? VALORES_PREDETERMINADOS_TOOLTIP.anchoMaximoPx : undefined,
  };

  const nodoTooltip = !abierto || deshabilitado ? null : (
    <div
      ref={refTooltip}
      id={idTooltip}
      role="tooltip"
      className={[claseBase, claseTema, claseTexto, claseContenedor].filter(Boolean).join(" ")}
      style={estiloTooltip}
    >
      {contenido}
    </div>
  );

  const contenidoTooltip = portal && typeof document !== "undefined"
    ? nodoTooltip && createPortal(nodoTooltip, document.body)
    : nodoTooltip;

  const elementoTrigger = useMemo(() => cloneElement(elementoHijo, propsTrigger), [elementoHijo, propsTrigger]);

  return (
    <>
      {elementoTrigger}
      {contenidoTooltip}
    </>
  );
};
