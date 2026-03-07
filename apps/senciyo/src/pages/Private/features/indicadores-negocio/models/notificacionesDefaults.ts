import type {
  DestinatarioNotificacion,
  NotificacionIndicadorConfig,
  NotificacionIndicadorPayload,
  SegmentoIndicador,
  VigenciaNotificacion
} from './notificaciones';
import { ensureEmpresaId } from '../../../../../shared/tenant';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';

export const createDefaultVigencia = (): VigenciaNotificacion => ({
  fechaInicio: getBusinessTodayISODate()
});

export const createDefaultDestinatario = (): DestinatarioNotificacion => ({});

export const createDefaultSegmento = (): SegmentoIndicador => ({
  empresaId: ensureEmpresaId(),
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

