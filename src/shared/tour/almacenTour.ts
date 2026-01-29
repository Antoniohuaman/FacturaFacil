import type { EstadoAyudaGuiada, IdTour } from "./tiposTour";

const CLAVE_BASE = "senciyo_ayuda_guiada_v1";

type IdentidadAlmacen = {
  tenantId?: string;
  usuarioId?: string;
};

const construirClaveAlmacen = (identidad?: IdentidadAlmacen): string => {
  if (!identidad?.tenantId && !identidad?.usuarioId) {
    return CLAVE_BASE;
  }
  const partes = [CLAVE_BASE];
  if (identidad.tenantId) {
    partes.push(`tenant:${identidad.tenantId}`);
  }
  if (identidad.usuarioId) {
    partes.push(`usuario:${identidad.usuarioId}`);
  }
  return partes.join(":");
};

const crearEstadoVacio = (): EstadoAyudaGuiada => ({
  ayudaActivada: true,
  toursCompletados: [],
  toursOmitidos: [],
  versionPorTour: {},
  fechaUltimaActualizacion: new Date().toISOString(),
});

const normalizarLista = (valor: unknown): IdTour[] => {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor.filter((item): item is string => typeof item === "string");
};

const normalizarVersiones = (valor: unknown): Record<IdTour, number> => {
  if (!valor || typeof valor !== "object") {
    return {};
  }
  const entries = Object.entries(valor as Record<string, unknown>)
    .filter(([, version]) => typeof version === "number" && Number.isFinite(version))
    .map(([id, version]) => [id, version as number]);
  return Object.fromEntries(entries);
};

const normalizarEstado = (valor: unknown): EstadoAyudaGuiada => {
  if (!valor || typeof valor !== "object") {
    return crearEstadoVacio();
  }

  const raw = valor as Partial<EstadoAyudaGuiada>;

  return {
    ayudaActivada: typeof raw.ayudaActivada === "boolean" ? raw.ayudaActivada : true,
    toursCompletados: normalizarLista(raw.toursCompletados),
    toursOmitidos: normalizarLista(raw.toursOmitidos),
    versionPorTour: normalizarVersiones(raw.versionPorTour),
    fechaUltimaActualizacion:
      typeof raw.fechaUltimaActualizacion === "string"
        ? raw.fechaUltimaActualizacion
        : new Date().toISOString(),
  };
};

export const leerEstadoAyudaGuiada = (): EstadoAyudaGuiada => {
  if (typeof window === "undefined") {
    return crearEstadoVacio();
  }

  const clave = construirClaveAlmacen();

  try {
    const raw = window.localStorage.getItem(clave);
    if (!raw) {
      return crearEstadoVacio();
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizarEstado(parsed);
  } catch (error) {
    console.error("[ayuda-guiada] Error leyendo estado", error);
    return crearEstadoVacio();
  }
};

export const guardarEstadoAyudaGuiada = (estado: EstadoAyudaGuiada): void => {
  if (typeof window === "undefined") {
    return;
  }

  const clave = construirClaveAlmacen();

  try {
    window.localStorage.setItem(clave, JSON.stringify(estado));
  } catch (error) {
    console.error("[ayuda-guiada] Error guardando estado", error);
  }
};
