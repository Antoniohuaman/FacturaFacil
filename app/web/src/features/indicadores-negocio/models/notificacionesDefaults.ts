import type {
  DestinatarioNotificacion,
  NotificacionIndicadorConfig,
  NotificacionIndicadorPayload,
  SegmentoIndicador,
  VigenciaNotificacion
} from './notificaciones';

const nowIsoDate = (): string => new Date().toISOString().slice(0, 10);

export const createDefaultVigencia = (): VigenciaNotificacion => ({
  fechaInicio: nowIsoDate()
});

export const createDefaultDestinatario = (): DestinatarioNotificacion => ({});

export const createDefaultSegmento = (): SegmentoIndicador => ({
  empresaId: 'actual',
  moneda: 'PEN'
});

export const createEmptyNotificacionConfig = (): NotificacionIndicadorConfig => ({
  id: '',
  indicadorId: '',
  nombre: '',
  descripcion: '',
  medio: 'EMAIL',
  horario: '09:00',
  diasActivos: [],
  destinatario: createDefaultDestinatario(),
  vigencia: createDefaultVigencia(),
  segmento: createDefaultSegmento(),
  limiteTop: undefined,
  activo: false
});

export const createEmptyNotificacionPayload = (): NotificacionIndicadorPayload => {
  const config = createEmptyNotificacionConfig();
  const { id, creadoEl, actualizadoEl, ...payload } = config;
  void id;
  void creadoEl;
  void actualizadoEl;
  return payload;
};
