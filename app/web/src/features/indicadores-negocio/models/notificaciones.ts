export type MedioNotificacion = 'EMAIL' | 'SMS' | 'AMBOS';

export type HorarioNotificacion = `${number}${number}:${number}${number}` | `${number}:${number}`;

export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

export type DiasSemanaNotificacion = DiaSemana[];

export interface DestinatarioNotificacion {
  email?: string;
  telefono?: string;
}

export interface VigenciaNotificacion {
  fechaInicio: string; // ISO-8601 (YYYY-MM-DD)
  fechaFin?: string; // ISO-8601 (YYYY-MM-DD)
}

export interface SegmentoIndicador {
  empresaId: string;
  establecimientoId?: string;
  moneda: string;
}

export type LimiteTop = number;

export interface NotificacionIndicadorConfig {
  id: string;
  indicadorId: string;
  nombre: string;
  descripcion?: string;
  medio: MedioNotificacion;
  horario: HorarioNotificacion;
  diasActivos: DiasSemanaNotificacion;
  destinatario: DestinatarioNotificacion;
  vigencia: VigenciaNotificacion;
  segmento: SegmentoIndicador;
  limiteTop?: LimiteTop;
  activo: boolean;
  creadoEl?: string;
  actualizadoEl?: string;
}

export interface NotificacionIndicadorFilters {
  indicatorId?: string;
  establecimientoId?: string;
  soloActivas?: boolean;
}

export type NotificacionIndicadorPayload = Omit<NotificacionIndicadorConfig, 'id' | 'creadoEl' | 'actualizadoEl'>;
