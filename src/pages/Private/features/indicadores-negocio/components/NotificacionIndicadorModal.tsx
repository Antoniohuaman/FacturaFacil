import { useEffect, useMemo, useState } from 'react';
import { Bell, Edit3, Plus, Trash2, X } from 'lucide-react';
import type { NotificacionIndicadorConfig, NotificacionIndicadorPayload } from '../models/notificaciones';
import { NotificacionIndicadorForm } from './NotificacionIndicadorForm';
import type { UseNotificacionesIndicadorResult } from '../hooks/useNotificacionesIndicador';

interface SelectOption {
  value: string;
  label: string;
}

interface NotificacionIndicadorModalProps {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  establishments: SelectOption[];
  currencies: SelectOption[];
  createPayload: () => NotificacionIndicadorPayload;
  notificationsState: UseNotificacionesIndicadorResult;
}

const mapConfigToPayload = (config: NotificacionIndicadorConfig): NotificacionIndicadorPayload => ({
  indicadorId: config.indicadorId,
  nombre: config.nombre,
  descripcion: config.descripcion,
  medio: config.medio,
  horario: config.horario,
  diasActivos: [...config.diasActivos],
  destinatario: {
    email: config.destinatario.email ?? '',
    telefono: config.destinatario.telefono ?? ''
  },
  vigencia: {
    fechaInicio: config.vigencia.fechaInicio,
    fechaFin: config.vigencia.fechaFin ?? ''
  },
  segmento: {
    empresaId: config.segmento.empresaId,
    establecimientoId: config.segmento.establecimientoId ?? 'Todos',
    moneda: config.segmento.moneda
  },
  limiteTop: config.limiteTop,
  activo: config.activo
});

export const NotificacionIndicadorModal: React.FC<NotificacionIndicadorModalProps> = ({
  open,
  onClose,
  companyName,
  establishments,
  currencies,
  createPayload,
  notificationsState
}) => {
  const { notificaciones, isLoading, isSaving, error, refetch, activate, deactivate, remove, create, update } = notificationsState;
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<NotificacionIndicadorPayload>(createPayload());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void refetch();
      setMode('list');
      setEditingId(null);
      setFormError(null);
      setFormValue(createPayload());
    }
  }, [open, refetch, createPayload]);

  useEffect(() => {
    if (!open) {
      setMode('list');
      setEditingId(null);
      setFormError(null);
    }
  }, [open]);

  const sortedNotificaciones = useMemo(
    () => [...notificaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [notificaciones]
  );

  const handleCreate = () => {
    setMode('create');
    setEditingId(null);
    setFormValue(createPayload());
    setFormError(null);
  };

  const handleEdit = (config: NotificacionIndicadorConfig) => {
    setMode('edit');
    setEditingId(config.id);
    setFormValue(mapConfigToPayload(config));
    setFormError(null);
  };

  const handleSubmit = async (payload: NotificacionIndicadorPayload) => {
    try {
      if (editingId) {
        await update(editingId, payload);
      } else {
        await create(payload);
      }
      setMode('list');
      setEditingId(null);
      setFormError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la notificación';
      setFormError(message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('¿Eliminar esta configuración de notificación?');
    if (!confirmed) {
      return;
    }
    try {
      await remove(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la notificación';
      setFormError(message);
    }
  };

  const handleToggle = async (config: NotificacionIndicadorConfig) => {
    try {
      if (config.activo) {
        await deactivate(config.id);
      } else {
        await activate(config.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el estado';
      setFormError(message);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <header className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Configuración de notificaciones</h2>
            <p className="text-sm text-gray-500">Define alertas para tus indicadores clave.</p>
          </div>
          {mode === 'list' && (
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" /> Nueva configuración
            </button>
          )}
        </header>

        {mode === 'list' && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando configuraciones...</p>
            ) : sortedNotificaciones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="text-sm text-gray-600">Aún no has configurado notificaciones. Crea la primera para recibir alertas personalizadas.</p>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  Crear notificación
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {sortedNotificaciones.map((item) => (
                  <li key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{item.nombre}</p>
                        <p className="text-xs text-gray-500">{item.medio === 'AMBOS' ? 'Email y SMS' : item.medio}</p>
                        <p className="text-xs text-gray-400">{item.horario} · {item.diasActivos.join(', ') || 'Sin días'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.activo ? 'Activa' : 'Inactiva'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                          disabled={isSaving}
                        >
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mode !== 'list' && (
          <NotificacionIndicadorForm
            mode={mode}
            initialValue={formValue}
            isSaving={isSaving}
            generalError={formError}
            establishments={establishments}
            currencies={currencies}
            companyName={companyName}
            onSubmit={handleSubmit}
            onCancel={() => {
              setMode('list');
              setEditingId(null);
              setFormError(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default NotificacionIndicadorModal;
