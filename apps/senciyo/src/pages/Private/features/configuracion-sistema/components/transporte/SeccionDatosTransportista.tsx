import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import type { Company } from '../../modelos/Company';
import type { DatosTransportista, EstadoTransportista } from '../../modelos/Transporte';
import type { IDatosTransportistaDataSource } from '../../api/fuenteDatosTransporte';
import { ENTIDADES_AUTORIZADORAS_D37 } from '../../datos/catalogosGRE';

interface SeccionDatosTransportistaProps {
  empresa: Company;
  datasource: IDatosTransportistaDataSource;
}

interface FormState {
  numeroRegistroMTC: string;
  estado: EstadoTransportista;
  codigoEntidadAutorizadora: string;
  numeroAutorizacion: string;
}

interface FormErrors {
  numeroRegistroMTC?: string;
  numeroAutorizacion?: string;
}

function validar(form: FormState): FormErrors {
  const e: FormErrors = {};
  if (!form.numeroRegistroMTC.trim()) {
    e.numeroRegistroMTC = 'El número de registro MTC es obligatorio';
  }
  if (form.codigoEntidadAutorizadora && !form.numeroAutorizacion.trim()) {
    e.numeroAutorizacion = 'Indica el número de autorización de la entidad seleccionada';
  }
  return e;
}

const FORM_VACIO: FormState = {
  numeroRegistroMTC: '',
  estado: 'HABILITADO',
  codigoEntidadAutorizadora: '',
  numeroAutorizacion: '',
};

export function SeccionDatosTransportista({ empresa, datasource }: SeccionDatosTransportistaProps) {
  const { showSuccess, showError } = useNotifications();
  const [datos, setDatos] = useState<DatosTransportista | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [errors, setErrors] = useState<FormErrors>({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    datasource
      .get(empresa.id)
      .then((res) => {
        if (cancelado) return;
        setDatos(res);
        if (res) {
          setForm({
            numeroRegistroMTC: res.numeroRegistroMTC,
            estado: res.estado,
            codigoEntidadAutorizadora: res.codigoEntidadAutorizadora ?? '',
            numeroAutorizacion: res.numeroAutorizacion ?? '',
          });
        }
      })
      .catch(() => {
        if (!cancelado) showError('Error', 'No se pudieron cargar los datos del transportista.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [datasource, empresa.id, showError]);

  const setField = (campo: keyof FormState, valor: string) => {
    const next = { ...form, [campo]: valor };
    if (campo === 'codigoEntidadAutorizadora' && !valor) {
      next.numeroAutorizacion = '';
    }
    setForm(next);
    const err = validar(next);
    setErrors({ ...errors, [campo]: err[campo as keyof FormErrors] });
  };

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar(form);
    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }
    setErrors({});
    setGuardando(true);
    try {
      const resultado = await datasource.save(empresa.id, {
        numeroRegistroMTC: form.numeroRegistroMTC.trim(),
        estado: form.estado,
        codigoEntidadAutorizadora: form.codigoEntidadAutorizadora || undefined,
        numeroAutorizacion: form.codigoEntidadAutorizadora
          ? form.numeroAutorizacion.trim() || undefined
          : undefined,
      });
      setDatos(resultado);
      showSuccess('Datos guardados', 'Los datos del transportista se actualizaron correctamente.');
    } catch {
      showError('Error al guardar', 'No se pudieron guardar los datos del transportista.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">Cargando datos del transportista…</div>
    );
  }

  return (
    <form onSubmit={manejarGuardar} className="space-y-5">
      {/* Datos de empresa (solo lectura) */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos de empresa</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">RUC</p>
            <p className="text-sm font-mono font-medium text-gray-800">{empresa.ruc}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Razón social</p>
            <p className="text-sm font-medium text-gray-800 truncate" title={empresa.razonSocial}>
              {empresa.razonSocial}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Estos datos provienen de Datos de Empresa y no se editan desde aquí.
        </p>
      </div>

      {/* Registro MTC y estado — 2 columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Registro MTC *
          </label>
          <input
            type="text"
            value={form.numeroRegistroMTC}
            onChange={(e) => setField('numeroRegistroMTC', e.target.value)}
            disabled={guardando}
            placeholder="Número asignado por el MTC"
            className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${
              errors.numeroRegistroMTC
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.numeroRegistroMTC && (
            <p className="text-xs text-red-600 mt-1">{errors.numeroRegistroMTC}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado operativo</label>
          <select
            value={form.estado}
            onChange={(e) => setField('estado', e.target.value)}
            disabled={guardando}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
          >
            <option value="HABILITADO">Habilitado</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            No representa una certificación oficial del MTC ni de SUNAT.
          </p>
        </div>
      </div>

      {/* Autorización especial — 2 columnas */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Autorización especial para el traslado
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entidad emisora
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <select
              value={form.codigoEntidadAutorizadora}
              onChange={(e) => setField('codigoEntidadAutorizadora', e.target.value)}
              disabled={guardando}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
            >
              <option value="">— Sin autorización especial —</option>
              {ENTIDADES_AUTORIZADORAS_D37.filter((ent) => ent.estado === 'Vigente').map((ent) => (
                <option key={ent.codigo} value={ent.codigo}>
                  {ent.abreviatura} — {ent.entidad}
                </option>
              ))}
            </select>
          </div>

          {form.codigoEntidadAutorizadora ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de autorización *
              </label>
              <input
                type="text"
                value={form.numeroAutorizacion}
                onChange={(e) => setField('numeroAutorizacion', e.target.value)}
                disabled={guardando}
                placeholder="Número de autorización"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  errors.numeroAutorizacion
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.numeroAutorizacion && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroAutorizacion}</p>
              )}
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {datos?.actualizadoEl ? (
          <p className="text-xs text-gray-400">
            Última actualización:{' '}
            {datos.actualizadoEl.toLocaleDateString('es-PE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : (
          <span />
        )}
        <Button
          variant="primary"
          type="submit"
          disabled={guardando}
          icon={<Save className="w-4 h-4" />}
        >
          {guardando ? 'Guardando…' : datos ? 'Actualizar datos' : 'Guardar datos'}
        </Button>
      </div>
    </form>
  );
}
