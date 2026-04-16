import type { OpcionEstadoAnimo } from './tipos';

export const MAXIMO_COMENTARIO_BREVE_RETROALIMENTACION = 140;
export const MAXIMO_IDEA_RETROALIMENTACION = 280;
export const DIAS_MINIMOS_ENTRE_ENCUESTAS_NPS = 30;
export const HABILITAR_NPS_AUTOMATICO = false;
export const PUNTUACION_NPS_MINIMA = 1;
export const PUNTUACION_NPS_MAXIMA = 10;

export const OPCIONES_ESTADO_ANIMO: readonly OpcionEstadoAnimo[] = [
  { id: 'excelente', etiqueta: 'Excelente', emoji: '😁', descripcion: 'Todo va muy bien hoy.' },
  { id: 'bien', etiqueta: 'Bien', emoji: '🙂', descripcion: 'La operación va fluida.' },
  { id: 'neutral', etiqueta: 'Neutral', emoji: '😐', descripcion: 'Nada crítico, nada destacado.' },
  { id: 'agotado', etiqueta: 'Agotado', emoji: '😮‍💨', descripcion: 'El día se siente pesado.' },
  { id: 'frustrado', etiqueta: 'Frustrado', emoji: '😣', descripcion: 'Algo está generando fricción.' },
] as const;

export const EVENTOS_RETROALIMENTACION = {
  acceso_abierto: 'retroalimentacion_acceso_abierto',
  panel_abierto: 'retroalimentacion_panel_abierto',
  flujo_seleccionado: 'retroalimentacion_flujo_seleccionado',
  panel_cerrado: 'retroalimentacion_panel_cerrado',
  estado_animo_seleccionado: 'retroalimentacion_estado_animo_seleccionado',
  estado_animo_enviado: 'retroalimentacion_estado_animo_enviado',
  idea_iniciada: 'retroalimentacion_idea_iniciada',
  idea_enviada: 'retroalimentacion_idea_enviada',
  puntuacion_nps_seleccionada: 'retroalimentacion_puntuacion_nps_seleccionada',
  nps_respondido: 'retroalimentacion_nps_respondido',
} as const;