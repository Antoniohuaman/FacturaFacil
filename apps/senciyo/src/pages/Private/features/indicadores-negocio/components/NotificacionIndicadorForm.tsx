import { useEffect, useState } from 'react';
import type {
  DiaSemana,
  HorarioNotificacion,
  MedioNotificacion,
  NotificacionIndicadorPayload
} from '../models/notificaciones';

const MEDIOS: Array<{ value: MedioNotificacion; label: string }> = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'AMBOS', label: 'Email y SMS' }
];

const DIAS: Array<{ value: DiaSemana; label: string }> = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' }
];

export type NotificacionFormErrors = Partial<{
  nombre: string;
  horario: string;
  diasActivos: string;
  destinatario: string;
  vigencia: string;
  limiteTop: string;
}>;

interface SelectOption {
  value: string;
  label: string;
}

interface NotificacionIndicadorFormProps {
  mode: 'create' | 'edit';
  initialValue: NotificacionIndicadorPayload;
  isSaving?: boolean;
  generalError?: string | null;
  Establecimientos: SelectOption[];
  currencies: SelectOption[];
  companyName?: string;
  onSubmit: (value: NotificacionIndicadorPayload) => void;
  onCancel: () => void;
}

const inputClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

const normalizeValue = (value: NotificacionIndicadorPayload): NotificacionIndicadorPayload => ({
  ...value,
  nombre: value.nombre.trim(),
  destinatario: {
    email: value.destinatario.email?.trim() || undefined,
    telefono: value.destinatario.telefono?.trim() || undefined
  },
  vigencia: {
    fechaInicio: value.vigencia.fechaInicio,
    fechaFin: value.vigencia.fechaFin || undefined
  },
  segmento: {
    ...value.segmento,
    establecimientoId: value.segmento.establecimientoId === 'Todos' ? undefined : value.segmento.establecimientoId
  },
  limiteTop: typeof value.limiteTop === 'number' && !Number.isNaN(value.limiteTop) ? value.limiteTop : undefined
});

const runValidations = (value: NotificacionIndicadorPayload): NotificacionFormErrors => {
  const errors: NotificacionFormErrors = {};
  const normalized = normalizeValue(value);

  if (!normalized.nombre) {
    errors.nombre = 'El nombre es obligatorio';
  }

  if (normalized.activo && !normalized.horario) {
    errors.horario = 'Define un horario de envío';
  }

  const hasContacto = Boolean(normalized.destinatario.email || normalized.destinatario.telefono);
  if (normalized.activo && !hasContacto) {
    errors.destinatario = 'Indica correo o teléfono';
  }

  if (normalized.activo && normalized.diasActivos.length === 0) {
    errors.diasActivos = 'Selecciona al menos un día';
  }

  if (normalized.vigencia.fechaFin && normalized.vigencia.fechaFin < normalized.vigencia.fechaInicio) {
    errors.vigencia = 'La vigencia no es válida';
  }

  if (normalized.limiteTop !== undefined && normalized.limiteTop <= 0) {
    errors.limiteTop = 'Debe ser mayor a 0';
  }

  return errors;
};

export const NotificacionIndicadorForm: React.FC<NotificacionIndicadorFormProps> = ({
  mode,
  initialValue,
  isSaving,
  generalError,
  Establecimientos,
  currencies,
  companyName,
  onSubmit,
  onCancel
}) => {
  const [formValue, setFormValue] = useState<NotificacionIndicadorPayload>(initialValue);
  const [errors, setErrors] = useState<NotificacionFormErrors>({});

  useEffect(() => {
    setFormValue(initialValue);
    setErrors({});
  }, [initialValue]);

  const handleChange = <K extends keyof NotificacionIndicadorPayload>(field: K, val: NotificacionIndicadorPayload[K]) => {
    setFormValue((prev) => ({ ...prev, [field]: val }));
  };

  const handleDestinatarioChange = (field: 'email' | 'telefono', val: string) => {
    setFormValue((prev) => ({
      ...prev,
      destinatario: {
        ...prev.destinatario,
        [field]: val
      }
    }));
  };

  const handleSegmentoChange = (field: 'establecimientoId' | 'moneda', val: string) => {
    setFormValue((prev) => ({
      ...prev,
      segmento: {
        ...prev.segmento,
        [field]: val
      }
    }));
  };

  const toggleDia = (dia: DiaSemana) => {
    setFormValue((prev) => {
      const exists = prev.diasActivos.includes(dia);
      return {
        ...prev,
        diasActivos: exists
          ? prev.diasActivos.filter((item) => item !== dia)
          : [...prev.diasActivos, dia]
      };
    });
  };

  const handleVigenciaChange = (field: 'fechaInicio' | 'fechaFin', val: string) => {
    setFormValue((prev) => ({
      ...prev,
      vigencia: {
        ...prev.vigencia,
        [field]: val
      }
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = runValidations(formValue);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }
    onSubmit(normalizeValue(formValue));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notificación {mode === 'create' ? 'nueva' : 'existente'}</p>
          <p className="text-xs text-gray-500">Define cómo y cuándo avisar cambios relevantes.</p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <span className="mr-3 text-sm text-gray-600">Activa</span>
          <input
            type="checkbox"
            className="sr-only"
            checked={formValue.activo}
            onChange={(event) => handleChange('activo', event.target.checked)}
          />
          <span className={`w-11 h-6 flex items-center rounded-full p-1 ${formValue.activo ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <span className={`bg-white w-4 h-4 rounded-full shadow transform ${formValue.activo ? 'translate-x-5' : 'translate-x-0'}`} />
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nombre*</label>
          <input
            type="text"
            value={formValue.nombre}
            onChange={(event) => handleChange('nombre', event.target.value)}
            className={`${inputClass} mt-1`}
            placeholder="Alerta KPI semanal"
          />
          {errors.nombre && <p className="text-xs text-red-600 mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Indicador / Medio*</label>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <select
              value={formValue.medio}
              onChange={(event) => handleChange('medio', event.target.value as MedioNotificacion)}
              className={inputClass}
            >
              {MEDIOS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="time"
              value={formValue.horario}
              onChange={(event) => handleChange('horario', event.target.value as HorarioNotificacion)}
              className={inputClass}
            />
          </div>
          {errors.horario && <p className="text-xs text-red-600 mt-1">{errors.horario}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Días de envío</label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DIAS.map((dia) => (
            <label key={dia.value} className={`flex items-center space-x-2 rounded-lg border px-3 py-2 text-sm ${formValue.diasActivos.includes(dia.value) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
              <input
                type="checkbox"
                checked={formValue.diasActivos.includes(dia.value)}
                onChange={() => toggleDia(dia.value)}
                className="hidden"
              />
              <span>{dia.label}</span>
            </label>
          ))}
        </div>
        {errors.diasActivos && <p className="text-xs text-red-600 mt-1">{errors.diasActivos}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Vigencia</label>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <input
              type="date"
              className={inputClass}
              value={formValue.vigencia.fechaInicio}
              onChange={(event) => handleVigenciaChange('fechaInicio', event.target.value)}
            />
            <input
              type="date"
              className={inputClass}
              value={formValue.vigencia.fechaFin ?? ''}
              onChange={(event) => handleVigenciaChange('fechaFin', event.target.value)}
            />
          </div>
          {errors.vigencia && <p className="text-xs text-red-600 mt-1">{errors.vigencia}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Límite Top (opcional)</label>
          <input
            type="number"
            className={`${inputClass} mt-1`}
            value={formValue.limiteTop ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              handleChange('limiteTop', value === '' ? undefined : Number(value));
            }}
            placeholder="Ej. 5 principales"
            min={1}
          />
          {errors.limiteTop && <p className="text-xs text-red-600 mt-1">{errors.limiteTop}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Correo</label>
          <input
            type="email"
            className={`${inputClass} mt-1`}
            value={formValue.destinatario.email ?? ''}
            onChange={(event) => handleDestinatarioChange('email', event.target.value)}
            placeholder="alertas@empresa.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Teléfono</label>
          <input
            type="tel"
            className={`${inputClass} mt-1`}
            value={formValue.destinatario.telefono ?? ''}
            onChange={(event) => handleDestinatarioChange('telefono', event.target.value)}
            placeholder="999 999 999"
          />
        </div>
      </div>
      {errors.destinatario && <p className="text-xs text-red-600">{errors.destinatario}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Establecimiento</label>
          <select
            className={`${inputClass} mt-1`}
            value={formValue.segmento.establecimientoId ?? 'Todos'}
            onChange={(event) => handleSegmentoChange('establecimientoId', event.target.value)}
          >
            {Establecimientos.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Moneda</label>
          <select
            className={`${inputClass} mt-1`}
            value={formValue.segmento.moneda}
            onChange={(event) => handleSegmentoChange('moneda', event.target.value)}
          >
            {currencies.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
      {companyName && (
        <p className="text-xs text-gray-500">Empresa: {companyName}</p>
      )}

      {generalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {generalError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          disabled={isSaving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
};

export default NotificacionIndicadorForm;
