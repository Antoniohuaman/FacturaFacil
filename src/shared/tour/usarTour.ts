import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DefinicionTour, PasoTour } from "./tiposTour";
import {
  EVENTO_SOLICITAR_TOUR,
  aplicarResaltado,
  buscarElementoPaso,
  limpiarResaltado,
  desplazarElemento,
  type DetalleSolicitudTour,
} from "./motorTour";
import { obtenerTour } from "./registroTours";
import { usarAyudaGuiada } from "./usarAyudaGuiada";

interface EstadoTourActivo {
  definicion: DefinicionTour;
  indicePaso: number;
  paso: PasoTour;
  elemento: HTMLElement;
}

const resolverPasoDisponible = (
  definicion: DefinicionTour,
  indiceInicial: number,
  direccion: 1 | -1
): EstadoTourActivo | null => {
  let indice = indiceInicial;
  while (indice >= 0 && indice < definicion.pasos.length) {
    const paso = definicion.pasos[indice];
    const elemento = buscarElementoPaso(paso.selector);
    if (elemento) {
      return { definicion, indicePaso: indice, paso, elemento };
    }
    indice += direccion;
  }
  return null;
};

export function useTourGuiado() {
  const { marcarTourCompletado, marcarTourOmitido } = usarAyudaGuiada();
  const [estado, setEstado] = useState<EstadoTourActivo | null>(null);
  const elementoResaltadoRef = useRef<HTMLElement | null>(null);

  const limpiarResaltadoActual = useCallback(() => {
    limpiarResaltado(elementoResaltadoRef.current);
    elementoResaltadoRef.current = null;
  }, []);

  const cerrarTour = useCallback(() => {
    limpiarResaltadoActual();
    setEstado(null);
  }, [limpiarResaltadoActual]);

  const aplicarPaso = useCallback(
    (nuevoEstado: EstadoTourActivo | null) => {
      limpiarResaltadoActual();
      if (!nuevoEstado) {
        setEstado(null);
        return;
      }
      desplazarElemento(nuevoEstado.elemento);
      aplicarResaltado(nuevoEstado.elemento);
      elementoResaltadoRef.current = nuevoEstado.elemento;
      setEstado(nuevoEstado);
    },
    [limpiarResaltadoActual]
  );

  const iniciarTour = useCallback(
    (definicion: DefinicionTour) => {
      const primerPaso = resolverPasoDisponible(definicion, 0, 1);
      if (!primerPaso) {
        cerrarTour();
        return;
      }
      aplicarPaso(primerPaso);
    },
    [aplicarPaso, cerrarTour]
  );

  const avanzar = useCallback(() => {
    if (!estado) {
      return;
    }
    const siguiente = resolverPasoDisponible(estado.definicion, estado.indicePaso + 1, 1);
    if (!siguiente) {
      marcarTourCompletado(estado.definicion.id, estado.definicion.version);
      cerrarTour();
      return;
    }
    aplicarPaso(siguiente);
  }, [aplicarPaso, cerrarTour, estado, marcarTourCompletado]);

  const retroceder = useCallback(() => {
    if (!estado) {
      return;
    }
    const anterior = resolverPasoDisponible(estado.definicion, estado.indicePaso - 1, -1);
    if (!anterior) {
      return;
    }
    aplicarPaso(anterior);
  }, [aplicarPaso, estado]);

  const omitir = useCallback(() => {
    if (!estado) {
      return;
    }
    marcarTourOmitido(estado.definicion.id, estado.definicion.version);
    cerrarTour();
  }, [cerrarTour, estado, marcarTourOmitido]);

  const finalizar = useCallback(() => {
    if (!estado) {
      return;
    }
    marcarTourCompletado(estado.definicion.id, estado.definicion.version);
    cerrarTour();
  }, [cerrarTour, estado, marcarTourCompletado]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const idPendiente = window.__senciyoTourPendiente;
    if (idPendiente) {
      const definicionPendiente = obtenerTour(idPendiente);
      if (definicionPendiente) {
        iniciarTour(definicionPendiente);
      }
      window.__senciyoTourPendiente = undefined;
    }

    const handleSolicitud = (event: Event) => {
      const detail = (event as CustomEvent<DetalleSolicitudTour>).detail;
      if (!detail?.idTour) {
        return;
      }
      const definicion = obtenerTour(detail.idTour);
      if (!definicion) {
        return;
      }
      iniciarTour(definicion);
    };

    window.addEventListener(EVENTO_SOLICITAR_TOUR, handleSolicitud);
    return () => {
      window.removeEventListener(EVENTO_SOLICITAR_TOUR, handleSolicitud);
    };
  }, [iniciarTour]);

  useEffect(() => () => limpiarResaltadoActual(), [limpiarResaltadoActual]);

  return useMemo(
    () => ({
      tourActivo: estado?.definicion ?? null,
      pasoActual: estado?.paso ?? null,
      indicePaso: estado?.indicePaso ?? 0,
      totalPasos: estado?.definicion.pasos.length ?? 0,
      elementoObjetivo: estado?.elemento ?? null,
      iniciarTour,
      avanzar,
      retroceder,
      omitir,
      finalizar,
      cerrarTour,
    }),
    [avanzar, cerrarTour, estado, finalizar, iniciarTour, omitir, retroceder]
  );
}
