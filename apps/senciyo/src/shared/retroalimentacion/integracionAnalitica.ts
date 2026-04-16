import { registrarEventoTecnico } from '../analitica/analitica';
import { EVENTOS_RETROALIMENTACION } from './constantes';
import type { EstadoAnimoId, FlujoRetroalimentacion, OrigenAperturaRetroalimentacion } from './tipos';

export function registrarAperturaAccesoRetroalimentacion(origen: OrigenAperturaRetroalimentacion): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.acceso_abierto, { origen_apertura: origen });
}

export function registrarAperturaPanelRetroalimentacion(
  flujo: FlujoRetroalimentacion,
  origen: OrigenAperturaRetroalimentacion,
): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.panel_abierto, {
    flujo_retroalimentacion: flujo,
    origen_apertura: origen,
  });
}

export function registrarCambioFlujoRetroalimentacion(flujo: FlujoRetroalimentacion): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.flujo_seleccionado, {
    flujo_retroalimentacion: flujo,
  });
}

export function registrarCierrePanelRetroalimentacion(flujo: FlujoRetroalimentacion): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.panel_cerrado, {
    flujo_retroalimentacion: flujo,
  });
}

export function registrarSeleccionEstadoAnimo(estado: EstadoAnimoId): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.estado_animo_seleccionado, {
    estado_animo: estado,
  });
}

export function registrarEstadoAnimoEnviado(estado: EstadoAnimoId): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.estado_animo_enviado, {
    estado_animo: estado,
  });
}

export function registrarInicioIdea(): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.idea_iniciada);
}

export function registrarIdeaEnviada(): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.idea_enviada);
}

export function registrarSeleccionPuntuacionNps(puntuacion: number): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.puntuacion_nps_seleccionada, {
    puntuacion_nps: puntuacion,
  });
}

export function registrarNpsRespondido(puntuacion: number): void {
  registrarEventoTecnico(EVENTOS_RETROALIMENTACION.nps_respondido, {
    puntuacion_nps: puntuacion,
  });
}