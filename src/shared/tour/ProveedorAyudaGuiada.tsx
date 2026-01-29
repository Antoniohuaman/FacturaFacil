import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EstadoAyudaGuiada, IdTour } from "./tiposTour";
import { guardarEstadoAyudaGuiada, leerEstadoAyudaGuiada } from "./almacenTour";
import { ContextoAyudaGuiada, type ContextoAyudaGuiada as TipoContextoAyudaGuiada } from "./ContextoAyudaGuiada";

interface ProveedorAyudaGuiadaProps {
  children: ReactNode;
}

const crearEstadoInicial = (): EstadoAyudaGuiada => leerEstadoAyudaGuiada();

const asegurarEnLista = (lista: IdTour[], id: IdTour): IdTour[] => {
  if (lista.includes(id)) {
    return lista;
  }
  return [...lista, id];
};

const quitarDeLista = (lista: IdTour[], id: IdTour): IdTour[] => lista.filter((item) => item !== id);

export function ProveedorAyudaGuiada({ children }: ProveedorAyudaGuiadaProps) {
  const [estado, setEstado] = useState<EstadoAyudaGuiada>(crearEstadoInicial);

  useEffect(() => {
    guardarEstadoAyudaGuiada(estado);
  }, [estado]);

  const cambiarAyudaActivada = useCallback((valor: boolean) => {
    setEstado((prev) => ({
      ...prev,
      ayudaActivada: valor,
      fechaUltimaActualizacion: new Date().toISOString(),
    }));
  }, []);

  const marcarTourCompletado = useCallback((id: IdTour, version: number) => {
    setEstado((prev) => ({
      ...prev,
      toursCompletados: asegurarEnLista(prev.toursCompletados, id),
      toursOmitidos: quitarDeLista(prev.toursOmitidos, id),
      versionPorTour: { ...prev.versionPorTour, [id]: version },
      fechaUltimaActualizacion: new Date().toISOString(),
    }));
  }, []);

  const marcarTourOmitido = useCallback((id: IdTour, version: number) => {
    setEstado((prev) => ({
      ...prev,
      toursOmitidos: asegurarEnLista(prev.toursOmitidos, id),
      toursCompletados: quitarDeLista(prev.toursCompletados, id),
      versionPorTour: { ...prev.versionPorTour, [id]: version },
      fechaUltimaActualizacion: new Date().toISOString(),
    }));
  }, []);

  const estaTourCompletado = useCallback(
    (id: IdTour, version: number) =>
      estado.toursCompletados.includes(id) && estado.versionPorTour[id] === version,
    [estado.toursCompletados, estado.versionPorTour]
  );

  const estaTourOmitido = useCallback(
    (id: IdTour, version: number) =>
      estado.toursOmitidos.includes(id) && estado.versionPorTour[id] === version,
    [estado.toursOmitidos, estado.versionPorTour]
  );

  const reiniciarAyudaGuiada = useCallback(() => {
    setEstado({
      ayudaActivada: true,
      toursCompletados: [],
      toursOmitidos: [],
      versionPorTour: {},
      fechaUltimaActualizacion: new Date().toISOString(),
    });
  }, []);

  const value = useMemo<TipoContextoAyudaGuiada>(
    () => ({
      ayudaActivada: estado.ayudaActivada,
      marcarTourCompletado,
      marcarTourOmitido,
      estaTourCompletado,
      estaTourOmitido,
      cambiarAyudaActivada,
      reiniciarAyudaGuiada,
    }),
    [
      estado.ayudaActivada,
      marcarTourCompletado,
      marcarTourOmitido,
      estaTourCompletado,
      estaTourOmitido,
      cambiarAyudaActivada,
      reiniciarAyudaGuiada,
    ]
  );

  return <ContextoAyudaGuiada.Provider value={value}>{children}</ContextoAyudaGuiada.Provider>;
}
