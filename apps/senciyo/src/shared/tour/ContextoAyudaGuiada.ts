import { createContext } from "react";
import type { IdTour } from "./tiposTour";

export interface ContextoAyudaGuiada {
  ayudaActivada: boolean;
  marcarTourCompletado: (id: IdTour, version: number) => void;
  marcarTourOmitido: (id: IdTour, version: number) => void;
  estaTourCompletado: (id: IdTour, version: number) => boolean;
  estaTourOmitido: (id: IdTour, version: number) => boolean;
  cambiarAyudaActivada: (valor: boolean) => void;
  reiniciarAyudaGuiada: () => void;
}

export const ContextoAyudaGuiada = createContext<ContextoAyudaGuiada | undefined>(undefined);
