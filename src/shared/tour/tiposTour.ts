export type IdTour = string;

export type PosicionPasoTour =
  | "arriba"
  | "abajo"
  | "izquierda"
  | "derecha"
  | "centro";

export interface PasoTour {
  idPaso: string;
  selector: string;
  titulo: string;
  descripcion: string;
  posicion?: PosicionPasoTour;
}

export interface DefinicionTour {
  id: IdTour;
  version: number;
  pasos: PasoTour[];
}

export interface EstadoAyudaGuiada {
  ayudaActivada: boolean;
  toursCompletados: IdTour[];
  toursOmitidos: IdTour[];
  versionPorTour: Record<IdTour, number>;
  fechaUltimaActualizacion: string;
}
