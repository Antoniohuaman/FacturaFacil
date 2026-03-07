import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  NotificacionIndicadorConfig,
  NotificacionIndicadorFilters,
  NotificacionIndicadorPayload
} from '../models/notificaciones';
import {
  activateNotificacionIndicador,
  createNotificacionIndicador,
  deactivateNotificacionIndicador,
  deleteNotificacionIndicador,
  fetchNotificacionesIndicador,
  updateNotificacionIndicador
} from '../api/notificaciones';

interface UseNotificacionesIndicadorOptions {
  autoLoad?: boolean;
}

export interface UseNotificacionesIndicadorResult {
  notificaciones: NotificacionIndicadorConfig[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasActivas: boolean;
  refetch: () => Promise<void>;
  create: (payload: NotificacionIndicadorPayload) => Promise<void>;
  update: (id: string, payload: NotificacionIndicadorPayload) => Promise<void>;
  remove: (id: string) => Promise<void>;
  activate: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
}

const INITIAL_STATE: UseNotificacionesIndicadorResult = {
  notificaciones: [],
  isLoading: false,
  isSaving: false,
  error: null,
  hasActivas: false,
  refetch: async () => undefined,
  create: async () => undefined,
  update: async () => undefined,
  remove: async () => undefined,
  activate: async () => undefined,
  deactivate: async () => undefined
};

export const useNotificacionesIndicador = (
  filters?: NotificacionIndicadorFilters,
  options?: UseNotificacionesIndicadorOptions
): UseNotificacionesIndicadorResult => {
  const [notificaciones, setNotificaciones] = useState<NotificacionIndicadorConfig[]>(INITIAL_STATE.notificaciones);
  const [isLoading, setIsLoading] = useState(INITIAL_STATE.isLoading);
  const [isSaving, setIsSaving] = useState(INITIAL_STATE.isSaving);
  const [error, setError] = useState<string | null>(INITIAL_STATE.error);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNotificacionesIndicador(filters);
      setNotificaciones(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron obtener las notificaciones';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const runMutation = useCallback(async (mutation: () => Promise<unknown>) => {
    setIsSaving(true);
    setError(null);
    try {
      await mutation();
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la notificación';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [load]);

  useEffect(() => {
    if (options?.autoLoad === false) {
      return;
    }
    void load();
  }, [load, options?.autoLoad]);

  const hasActivas = useMemo(() => notificaciones.some((item) => item.activo), [notificaciones]);

  const create = useCallback((payload: NotificacionIndicadorPayload) => runMutation(() => createNotificacionIndicador(payload)), [runMutation]);
  const update = useCallback((id: string, payload: NotificacionIndicadorPayload) => runMutation(() => updateNotificacionIndicador(id, payload)), [runMutation]);
  const remove = useCallback((id: string) => runMutation(() => deleteNotificacionIndicador(id)), [runMutation]);
  const activate = useCallback((id: string) => runMutation(() => activateNotificacionIndicador(id)), [runMutation]);
  const deactivate = useCallback((id: string) => runMutation(() => deactivateNotificacionIndicador(id)), [runMutation]);

  return {
    notificaciones,
    isLoading,
    isSaving,
    error,
    hasActivas,
    refetch: load,
    create,
    update,
    remove,
    activate,
    deactivate
  };
};
