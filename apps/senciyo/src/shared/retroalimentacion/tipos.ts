export type FlujoRetroalimentacion = 'estado_animo' | 'buzon_ideas' | 'nps';

export type OrigenAperturaRetroalimentacion = 'header' | 'automatico';

export type EstadoAnimoId = 'excelente' | 'bien' | 'neutral' | 'agotado' | 'frustrado';

export interface OpcionEstadoAnimo {
  id: EstadoAnimoId;
  etiqueta: string;
  emoji: string;
  descripcion: string;
}

export interface EnvioEstadoAnimo {
  estado: EstadoAnimoId;
  comentario?: string;
}

export interface EnvioIdea {
  contenido: string;
}

export interface EnvioRespuestaNps {
  puntuacion: number;
  comentario?: string;
}

export interface EvaluacionFrecuenciaNps {
  habilitado: boolean;
  ahora: Date;
  ultimaRespuestaNpsEn: string | null;
  diasMinimosEntreEncuestas: number;
}

export interface RetroalimentacionApi {
  panelAbierto: boolean;
  flujoActivo: FlujoRetroalimentacion;
  ultimaRespuestaNpsEn: string | null;
  abrirPanel: (flujo?: FlujoRetroalimentacion, origen?: OrigenAperturaRetroalimentacion) => void;
  cerrarPanel: () => void;
  cambiarFlujo: (flujo: FlujoRetroalimentacion) => void;
  solicitarEncuestaNps: () => void;
  enviarEstadoAnimo: (entrada: EnvioEstadoAnimo) => Promise<boolean>;
  enviarIdea: (entrada: EnvioIdea) => Promise<boolean>;
  enviarRespuestaNps: (entrada: EnvioRespuestaNps) => Promise<boolean>;
}