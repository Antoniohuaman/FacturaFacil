import type { PasoTour } from "./tiposTour";

export const URL_VIDEO_AYUDA_TEMPORAL = "https://www.youtube.com/watch?v=pcqTtr6Gzc4";

type AyudaTemporalPaso = Pick<
  PasoTour,
  "contenidoLectura" | "videoUrl" | "tituloVideo" | "etiquetaBotonVideo"
>;

interface CrearAyudaPasoTemporalOptions {
  contenidoLectura?: string[];
  videoUrl?: string;
  tituloVideo?: string;
  etiquetaBotonVideo?: string;
}

export const crearAyudaPasoTemporal = ({
  contenidoLectura,
  videoUrl,
  tituloVideo,
  etiquetaBotonVideo,
}: CrearAyudaPasoTemporalOptions): AyudaTemporalPaso => ({
  contenidoLectura: (contenidoLectura ?? []).map((item) => item.trim()).filter(Boolean),
  videoUrl: videoUrl ?? URL_VIDEO_AYUDA_TEMPORAL,
  tituloVideo,
  etiquetaBotonVideo,
});