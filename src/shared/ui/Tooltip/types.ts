import type { ReactElement, ReactNode } from "react";

export type UbicacionTooltip = "arriba" | "derecha" | "abajo" | "izquierda";
export type AlineacionTooltip = "inicio" | "centro" | "fin";

export interface PropsTooltip {
  contenido: ReactNode;
  children: ReactElement<Record<string, unknown>>;
  ubicacion?: UbicacionTooltip;
  alineacion?: AlineacionTooltip;
  retrasoMostrarMs?: number;
  retrasoOcultarMs?: number;
  desplazamientoPx?: number;
  deshabilitado?: boolean;
  multilinea?: boolean;
  portal?: boolean;
  id?: string;
  claseContenedor?: string;
}
