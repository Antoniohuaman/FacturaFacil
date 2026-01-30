import type { IdTour, PasoTour } from "./tiposTour";

export const EVENTO_SOLICITAR_TOUR = "senciyo:tour" as const;

declare global {
  interface Window {
    __senciyoTourPendiente?: string;
  }
}

export type DetalleSolicitudTour = {
  idTour: IdTour;
};

export const solicitarInicioTour = (idTour: IdTour): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.__senciyoTourPendiente = idTour;
  window.dispatchEvent(
    new CustomEvent<DetalleSolicitudTour>(EVENTO_SOLICITAR_TOUR, {
      detail: { idTour },
    })
  );
};

export const buscarElementoPaso = (selector: PasoTour["selector"]): HTMLElement | null => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.querySelector<HTMLElement>(selector);
};

export const desplazarElemento = (elemento: HTMLElement): void => {
  elemento.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
};

const CLAVE_RESALTADO = "tourResaltado";
const CLAVE_OUTLINE = "tourOutline";
const CLAVE_SOMBRA = "tourSombra";
const CLAVE_RADIO = "tourRadio";

export const aplicarResaltado = (elemento: HTMLElement): void => {
  if (elemento.dataset[CLAVE_RESALTADO] === "1") {
    return;
  }

  elemento.dataset[CLAVE_RESALTADO] = "1";
  elemento.dataset[CLAVE_OUTLINE] = elemento.style.outline;
  elemento.dataset[CLAVE_SOMBRA] = elemento.style.boxShadow;
  elemento.dataset[CLAVE_RADIO] = elemento.style.borderRadius;

  elemento.style.outline = "2px solid #7c3aed";
  elemento.style.boxShadow = "0 0 0 4px rgba(124, 58, 237, 0.2)";
  if (!elemento.style.borderRadius) {
    elemento.style.borderRadius = "8px";
  }
};

export const limpiarResaltado = (elemento?: HTMLElement | null): void => {
  if (!elemento) {
    return;
  }
  if (elemento.dataset[CLAVE_RESALTADO] !== "1") {
    return;
  }

  elemento.style.outline = elemento.dataset[CLAVE_OUTLINE] ?? "";
  elemento.style.boxShadow = elemento.dataset[CLAVE_SOMBRA] ?? "";
  elemento.style.borderRadius = elemento.dataset[CLAVE_RADIO] ?? "";

  delete elemento.dataset[CLAVE_RESALTADO];
  delete elemento.dataset[CLAVE_OUTLINE];
  delete elemento.dataset[CLAVE_SOMBRA];
  delete elemento.dataset[CLAVE_RADIO];
};
