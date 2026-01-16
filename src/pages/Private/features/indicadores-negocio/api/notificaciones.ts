import type {
  NotificacionIndicadorConfig,
  NotificacionIndicadorFilters,
  NotificacionIndicadorPayload
} from '../models/notificaciones';
import { createEmptyNotificacionConfig } from '../models/notificacionesDefaults';
import { formatBusinessDateTimeIso } from '@/shared/time/businessTime';

const NOTIFICACIONES_API_URL = (import.meta.env.VITE_INDICADORES_NOTIFICACIONES_API_URL ?? '').trim();

const fallbackStore: NotificacionIndicadorConfig[] = [];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const generateId = () => `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const hasRemoteApi = () => NOTIFICACIONES_API_URL.length > 0;

const sanitizePath = (path?: string) => {
  if (!path) {
    return '';
  }
  return path.startsWith('/') ? path.slice(1) : path;
};

const resolveEndpoint = (path?: string, query?: Record<string, string | undefined>) => {
  if (!hasRemoteApi()) {
    throw new Error('No se configuró VITE_INDICADORES_NOTIFICACIONES_API_URL');
  }
  const base = new URL(NOTIFICACIONES_API_URL);
  const cleanedPath = sanitizePath(path);
  if (cleanedPath) {
    base.pathname = `${base.pathname.replace(/\/$/, '')}/${cleanedPath}`;
  }
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });
    base.search = params.toString();
  }
  return base.toString();
};

const request = async <T>(path: string, init?: RequestInit, query?: Record<string, string | undefined>) => {
  const endpoint = resolveEndpoint(path, query);
  const response = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    ...init
  });
  if (!response.ok) {
    throw new Error(`Notificaciones API respondió ${response.status}`);
  }
  if (response.status === 204) {
    return null as T;
  }
  return response.json() as Promise<T>;
};

const applyFilters = (items: NotificacionIndicadorConfig[], filters?: NotificacionIndicadorFilters) => {
  if (!filters) {
    return items;
  }
  return items.filter((item) => {
    if (filters.indicatorId && item.indicadorId !== filters.indicatorId) {
      return false;
    }
    if (filters.establecimientoId && item.segmento.establecimientoId !== filters.establecimientoId) {
      return false;
    }
    if (filters.soloActivas && !item.activo) {
      return false;
    }
    return true;
  });
};

const fallbackFetch = (filters?: NotificacionIndicadorFilters) => applyFilters(clone(fallbackStore), filters);

const fallbackCreate = (payload: NotificacionIndicadorPayload): NotificacionIndicadorConfig => {
  const now = formatBusinessDateTimeIso();
  const config: NotificacionIndicadorConfig = {
    ...createEmptyNotificacionConfig(),
    ...clone(payload),
    id: generateId(),
    creadoEl: now,
    actualizadoEl: now
  };
  fallbackStore.push(config);
  return clone(config);
};

const fallbackUpdate = (id: string, updater: (current: NotificacionIndicadorConfig) => Partial<NotificacionIndicadorConfig>) => {
  const index = fallbackStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return createEmptyNotificacionConfig();
  }
  const updated = updater(fallbackStore[index]);
  fallbackStore[index] = {
    ...fallbackStore[index],
    ...updated,
    id,
    actualizadoEl: formatBusinessDateTimeIso()
  };
  return clone(fallbackStore[index]);
};

const fallbackDelete = (id: string) => {
  const index = fallbackStore.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  fallbackStore.splice(index, 1);
  return true;
};

export const fetchNotificacionesIndicador = async (
  filters?: NotificacionIndicadorFilters
): Promise<NotificacionIndicadorConfig[]> => {
  if (!hasRemoteApi()) {
    return fallbackFetch(filters);
  }
  return request<NotificacionIndicadorConfig[]>('', { method: 'GET' }, {
    indicatorId: filters?.indicatorId,
    establecimientoId: filters?.establecimientoId,
    soloActivas: filters?.soloActivas ? 'true' : undefined
  });
};

export const createNotificacionIndicador = async (
  payload: NotificacionIndicadorPayload
): Promise<NotificacionIndicadorConfig> => {
  if (!hasRemoteApi()) {
    return fallbackCreate(payload);
  }
  return request<NotificacionIndicadorConfig>('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const updateNotificacionIndicador = async (
  id: string,
  payload: NotificacionIndicadorPayload
): Promise<NotificacionIndicadorConfig> => {
  if (!hasRemoteApi()) {
    return fallbackUpdate(id, () => ({ ...payload }));
  }
  return request<NotificacionIndicadorConfig>(`${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
};

export const activateNotificacionIndicador = async (id: string): Promise<NotificacionIndicadorConfig> => {
  if (!hasRemoteApi()) {
    return fallbackUpdate(id, (item) => ({ ...item, activo: true }));
  }
  return request<NotificacionIndicadorConfig>(`${id}/activate`, { method: 'PATCH' });
};

export const deactivateNotificacionIndicador = async (id: string): Promise<NotificacionIndicadorConfig> => {
  if (!hasRemoteApi()) {
    return fallbackUpdate(id, (item) => ({ ...item, activo: false }));
  }
  return request<NotificacionIndicadorConfig>(`${id}/deactivate`, { method: 'PATCH' });
};

export const deleteNotificacionIndicador = async (id: string): Promise<boolean> => {
  if (!hasRemoteApi()) {
    return fallbackDelete(id);
  }
  await request(`${id}`, { method: 'DELETE' });
  return true;
};
