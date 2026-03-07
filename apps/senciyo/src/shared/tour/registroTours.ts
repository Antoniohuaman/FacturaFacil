import type { DefinicionTour, IdTour } from "./tiposTour";

export const REGISTRO_TOURS: Record<IdTour, DefinicionTour> = {};

export const registrarTour = (definicion: DefinicionTour): void => {
	REGISTRO_TOURS[definicion.id] = definicion;
};

export const obtenerTour = (id: IdTour): DefinicionTour | undefined => REGISTRO_TOURS[id];
