import { BookOpen, ExternalLink, Play, Video } from "lucide-react";
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

type ModoAyuda = "ver" | "leer";

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

const obtenerContenidoLectura = (paso: PasoTour | null): string[] => {
  if (!paso?.contenidoLectura?.length) {
    return [];
  }

  return paso.contenidoLectura.map((item) => item.trim()).filter(Boolean);
};

const resolverModoInicial = (tieneLectura: boolean, tieneVideo: boolean): ModoAyuda => {
  if (tieneLectura) {
    return "leer";
  }

  return tieneVideo ? "ver" : "leer";
};

const extraerVideoYouTubeId = (videoUrl: string): string | null => {
  try {
    const url = new URL(videoUrl);

    if (url.hostname.includes("youtu.be")) {
      const idCorto = url.pathname.replace(/^\/+/, "").split("/")[0];
      return idCorto || null;
    }

    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      if (id) {
        return id;
      }

      const segmentos = url.pathname.split("/").filter(Boolean);
      const indiceEmbed = segmentos.findIndex((segmento) => segmento === "embed" || segmento === "shorts");

      if (indiceEmbed >= 0) {
        return segmentos[indiceEmbed + 1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const construirMiniaturaVideo = (videoUrl?: string): string | null => {
  if (!videoUrl) {
    return null;
  }

  const videoId = extraerVideoYouTubeId(videoUrl);
  if (!videoId) {
    return null;
  }

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

const construirUrlEmbedVideo = (videoUrl?: string): string | null => {
  if (!videoUrl) {
    return null;
  }

  const videoId = extraerVideoYouTubeId(videoUrl);
  if (!videoId) {
    return null;
  }

  const parametros = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${parametros.toString()}`;
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
  const [modoAyuda, setModoAyuda] = useState<ModoAyuda>("leer");
  const [videoEmbebidoActivo, setVideoEmbebidoActivo] = useState(false);

  const contenidoLectura = useMemo(() => obtenerContenidoLectura(paso), [paso]);
  const tieneLectura = contenidoLectura.length > 0;
  const tieneVideo = Boolean(paso?.videoUrl?.trim());
  const miniaturaVideo = useMemo(
    () => construirMiniaturaVideo(paso?.videoUrl),
    [paso?.videoUrl]
  );
  const urlVideoEmbebido = useMemo(
    () => construirUrlEmbedVideo(paso?.videoUrl),
    [paso?.videoUrl]
  );
  const puedeEmbeberVideo = Boolean(urlVideoEmbebido);

  const esUltimoPaso = useMemo(() => indicePaso >= totalPasos - 1, [indicePaso, totalPasos]);

  const actualizarPosicion = useCallback(() => {
    if (!elementoObjetivo) {
      setPosicion(null);
      return;
    }

    const rect = elementoObjetivo.getBoundingClientRect();
    const ancho = contenedorRef.current?.offsetWidth ?? 384;
    const alto = contenedorRef.current?.offsetHeight ?? 320;
    setPosicion(calcularPosicion(rect, ancho, alto, paso?.posicion));
  }, [elementoObjetivo, paso?.posicion]);

  useLayoutEffect(() => {
    actualizarPosicion();
  }, [actualizarPosicion, modoAyuda, paso, videoEmbebidoActivo]);

  useEffect(() => {
    setModoAyuda(resolverModoInicial(tieneLectura, tieneVideo));
  }, [paso?.idPaso, tieneLectura, tieneVideo]);

  useEffect(() => {
    setVideoEmbebidoActivo(false);
  }, [paso?.idPaso]);

  useEffect(() => {
    if (modoAyuda !== "ver" && videoEmbebidoActivo) {
      setVideoEmbebidoActivo(false);
    }
  }, [modoAyuda, videoEmbebidoActivo]);

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
  const mostrarSelectorModo = tieneLectura && tieneVideo;
  const mostrandoVideo = tieneVideo && (modoAyuda === "ver" || !tieneLectura);
  const mostrandoLectura = tieneLectura && (modoAyuda === "leer" || !tieneVideo);
  const estaReproduciendoVideo = mostrandoVideo && puedeEmbeberVideo && videoEmbebidoActivo;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/10 pointer-events-none z-[70]" aria-hidden="true" />
      <div
        ref={contenedorRef}
        className="fixed z-[80] w-[24rem] max-w-[94vw] rounded-xl border border-slate-200 bg-white shadow-xl p-4 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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
        {(tieneLectura || tieneVideo) && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-gray-700 dark:bg-gray-900/60">
            {mostrarSelectorModo && (
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-white/80 p-1 dark:bg-gray-800/80">
                <button
                  type="button"
                  onClick={() => setModoAyuda("ver")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    modoAyuda === "ver"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <Video className="h-3.5 w-3.5" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => setModoAyuda("leer")}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    modoAyuda === "leer"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Leer
                </button>
              </div>
            )}

            {mostrandoVideo && paso.videoUrl && (
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <div className="p-3">
                  {estaReproduciendoVideo ? (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 shadow-sm dark:border-gray-700">
                      <div className="aspect-video w-full">
                        <iframe
                          src={urlVideoEmbebido ?? undefined}
                          title={paso.tituloVideo ?? `Video del paso ${paso.titulo}`}
                          className="h-full w-full border-0"
                          allow="autoplay; encrypted-media; picture-in-picture; web-share"
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {puedeEmbeberVideo ? (
                        <button
                          type="button"
                          onClick={() => setVideoEmbebidoActivo(true)}
                          className="group relative block h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-200 text-left dark:bg-gray-700"
                          aria-label={`Reproducir video de ${paso.titulo} dentro del tour`}
                        >
                          {miniaturaVideo ? (
                            <img
                              src={miniaturaVideo}
                              alt={`Vista previa del video para ${paso.titulo}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500 dark:from-gray-700 dark:to-gray-800 dark:text-gray-300">
                              <Video className="h-5 w-5" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/15" aria-hidden="true" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-violet-600 shadow-sm dark:bg-gray-900/90 dark:text-violet-300">
                              <Play className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300">
                          <Video className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-red-500">Ver</p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                          {paso.tituloVideo ?? "Video rapido del paso"}
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-gray-400">
                          {puedeEmbeberVideo
                            ? "Reproduce este paso dentro del tour para seguir en contexto sin salir del sistema."
                            : "No pudimos preparar una vista embebida para este enlace. Puedes abrirlo externamente sin romper el flujo."}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="min-h-[20px] text-[11px] font-medium text-slate-500 dark:text-gray-400">
                      {estaReproduciendoVideo ? "Reproduciendo dentro del tour" : "Video contextual del paso"}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {puedeEmbeberVideo ? (
                        <button
                          type="button"
                          onClick={() => setVideoEmbebidoActivo(true)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {paso.etiquetaBotonVideo ?? "Ver video"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-gray-600 dark:text-gray-300">
                          <Video className="h-3.5 w-3.5" />
                          Embed no disponible
                        </span>
                      )}
                      <a
                        href={paso.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir en YouTube
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mostrandoLectura && (
              <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <BookOpen className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Leer
                  </p>
                </div>
                <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600 dark:text-gray-300">
                  {contenidoLectura.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
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
