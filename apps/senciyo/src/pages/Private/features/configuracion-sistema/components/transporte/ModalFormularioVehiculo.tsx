import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/contasis';
import type { Vehiculo, CreateVehiculoInput, EstadoVehiculo } from '../../modelos/Transporte';
import { ENTIDADES_AUTORIZADORAS_D37 } from '../../datos/catalogosGRE';

interface FormState {
  placa: string;
  marca: string;
  configuracionVehicular: string;
  numeroCertificado: string;
  codigoEntidadAutorizadora: string;
  numeroAutorizacion: string;
  estado: EstadoVehiculo;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const FORM_VACIO: FormState = {
  placa: '',
  marca: '',
  configuracionVehicular: '',
  numeroCertificado: '',
  codigoEntidadAutorizadora: '',
  numeroAutorizacion: '',
  estado: 'ACTIVO',
};

interface ModalFormularioVehiculoProps {
  isOpen: boolean;
  modo: 'crear' | 'editar';
  vehiculo?: Vehiculo;
  vehiculosExistentes: Vehiculo[];
  onClose: () => void;
  onSubmit: (datos: CreateVehiculoInput) => Promise<void>;
  cargando?: boolean;
}

const PLACA_REGEX = /^[A-Z0-9]{3}-?[A-Z0-9]{3}$/i;

function validar(form: FormState, vehiculosExistentes: Vehiculo[], vehiculoId?: string): FormErrors {
  const e: FormErrors = {};

  if (!form.placa.trim()) {
    e.placa = 'La placa es obligatoria';
  } else if (!PLACA_REGEX.test(form.placa.replace(/-/g, ''))) {
    e.placa = 'Formato de placa no válido (ej: ABC123 o ABC-123)';
  } else {
    const normalizada = form.placa.toUpperCase().replace(/-/g, '');
    const duplicado = vehiculosExistentes.some(
      (v) => v.id !== vehiculoId && v.placa.toUpperCase().replace(/-/g, '') === normalizada,
    );
    if (duplicado) e.placa = 'Ya existe un vehículo con esta placa';
  }

  if (!form.marca.trim()) e.marca = 'La marca es obligatoria';
  if (!form.configuracionVehicular.trim()) e.configuracionVehicular = 'La configuración vehicular es obligatoria';
  if (!form.numeroCertificado.trim()) e.numeroCertificado = 'El número de certificado es obligatorio';

  if (form.codigoEntidadAutorizadora && !form.numeroAutorizacion.trim()) {
    e.numeroAutorizacion = 'Indica el número de autorización de la entidad seleccionada';
  }

  return e;
}

export function ModalFormularioVehiculo({
  isOpen,
  modo,
  vehiculo,
  vehiculosExistentes,
  onClose,
  onSubmit,
  cargando = false,
}: ModalFormularioVehiculoProps) {
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tocados, setTocados] = useState<Set<keyof FormState>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    if (vehiculo) {
      setForm({
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        configuracionVehicular: vehiculo.configuracionVehicular,
        numeroCertificado: vehiculo.numeroCertificado,
        codigoEntidadAutorizadora: vehiculo.codigoEntidadAutorizadora ?? '',
        numeroAutorizacion: vehiculo.numeroAutorizacion ?? '',
        estado: vehiculo.estado,
      });
    } else {
      setForm(FORM_VACIO);
    }
    setErrors({});
    setTocados(new Set());
  }, [isOpen, vehiculo]);

  const set = (campo: keyof FormState, valor: string) => {
    const next = { ...form, [campo]: valor };
    if (campo === 'codigoEntidadAutorizadora' && !valor) {
      next.numeroAutorizacion = '';
    }
    setForm(next);
    setTocados((prev) => new Set(prev).add(campo));
    const err = validar(next, vehiculosExistentes, vehiculo?.id);
    setErrors((prev) => ({ ...prev, [campo]: err[campo], numeroAutorizacion: err.numeroAutorizacion }));
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar(form, vehiculosExistentes, vehiculo?.id);
    if (Object.keys(err).length > 0) {
      setErrors(err);
      setTocados(new Set(Object.keys(form) as Array<keyof FormState>));
      return;
    }
    await onSubmit({
      placa: form.placa.toUpperCase().replace(/-/g, ''),
      marca: form.marca.trim(),
      configuracionVehicular: form.configuracionVehicular.trim(),
      numeroCertificado: form.numeroCertificado.trim(),
      codigoEntidadAutorizadora: form.codigoEntidadAutorizadora || undefined,
      numeroAutorizacion: form.codigoEntidadAutorizadora ? form.numeroAutorizacion.trim() || undefined : undefined,
      estado: form.estado,
    });
  };

  const estiloInput = (id: keyof FormState) =>
    tocados.has(id) && errors[id]
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:ring-blue-500';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {modo === 'crear' ? 'Nuevo vehículo' : 'Editar vehículo'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {modo === 'crear' ? 'Registra un vehículo para traslados' : 'Modifica los datos del vehículo'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={cargando}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={manejarEnvio} className="p-6 space-y-4">
          {/* Placa y marca */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Número de placa *</label>
              <input
                type="text"
                value={form.placa}
                onChange={(e) => set('placa', e.target.value.toUpperCase())}
                disabled={cargando}
                placeholder="ABC123"
                maxLength={7}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 font-mono uppercase ${estiloInput('placa')}`}
              />
              {tocados.has('placa') && errors.placa && (
                <p className="text-xs text-red-600 mt-1">{errors.placa}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Marca del vehículo *</label>
              <input
                type="text"
                value={form.marca}
                onChange={(e) => set('marca', e.target.value)}
                disabled={cargando}
                placeholder="Mercedes-Benz, Volvo…"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('marca')}`}
              />
              {tocados.has('marca') && errors.marca && (
                <p className="text-xs text-red-600 mt-1">{errors.marca}</p>
              )}
            </div>
          </div>

          {/* Configuración vehicular */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Configuración vehicular *</label>
            <input
              type="text"
              value={form.configuracionVehicular}
              onChange={(e) => set('configuracionVehicular', e.target.value.toUpperCase())}
              disabled={cargando}
              placeholder="C2, C3, T2S2, T3S3…"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 font-mono uppercase ${estiloInput('configuracionVehicular')}`}
            />
            {tocados.has('configuracionVehicular') && errors.configuracionVehicular && (
              <p className="text-xs text-red-600 mt-1">{errors.configuracionVehicular}</p>
            )}
          </div>

          {/* Certificado / TUCE */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              N.° de certificado de inscripción, habilitación o TUCE *
            </label>
            <input
              type="text"
              value={form.numeroCertificado}
              onChange={(e) => set('numeroCertificado', e.target.value)}
              disabled={cargando}
              placeholder="N.° de certificado"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('numeroCertificado')}`}
            />
            {tocados.has('numeroCertificado') && errors.numeroCertificado && (
              <p className="text-xs text-red-600 mt-1">{errors.numeroCertificado}</p>
            )}
          </div>

          {/* Entidad autorizadora (opcional) */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Entidad emisora de autorización especial
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <select
              value={form.codigoEntidadAutorizadora}
              onChange={(e) => set('codigoEntidadAutorizadora', e.target.value)}
              disabled={cargando}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
            >
              <option value="">— Sin autorización especial —</option>
              {ENTIDADES_AUTORIZADORAS_D37.filter((e) => e.estado === 'Vigente').map((e) => (
                <option key={e.codigo} value={e.codigo}>
                  {e.abreviatura} — {e.entidad}
                </option>
              ))}
            </select>
          </div>

          {/* Número de autorización (requerido si hay entidad) */}
          {form.codigoEntidadAutorizadora && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Número de autorización especial *
              </label>
              <input
                type="text"
                value={form.numeroAutorizacion}
                onChange={(e) => set('numeroAutorizacion', e.target.value)}
                disabled={cargando}
                placeholder="N.° de autorización"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('numeroAutorizacion')}`}
              />
              {tocados.has('numeroAutorizacion') && errors.numeroAutorizacion && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroAutorizacion}</p>
              )}
            </div>
          )}

          {/* Estado */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => set('estado', e.target.value)}
              disabled={cargando}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} disabled={cargando} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={cargando}>
              {cargando ? 'Guardando…' : modo === 'crear' ? 'Registrar vehículo' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
