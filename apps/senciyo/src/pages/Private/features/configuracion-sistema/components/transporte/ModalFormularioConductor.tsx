import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/contasis';
import type { Conductor, CreateConductorInput, EstadoConductor, TipoDocumentoConductor } from '../../modelos/Transporte';
import { TIPOS_DOCUMENTO_CONDUCTOR } from '../../modelos/Transporte';

interface FormState {
  tipoDocumento: TipoDocumentoConductor;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  numeroLicencia: string;
  estado: EstadoConductor;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const FORM_VACIO: FormState = {
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  numeroLicencia: '',
  estado: 'ACTIVO',
};

interface ModalFormularioConductorProps {
  isOpen: boolean;
  modo: 'crear' | 'editar';
  conductor?: Conductor;
  conductoresExistentes: Conductor[];
  onClose: () => void;
  onSubmit: (datos: CreateConductorInput) => Promise<void>;
  cargando?: boolean;
}

function validar(form: FormState, conductoresExistentes: Conductor[], conductorId?: string): FormErrors {
  const e: FormErrors = {};

  if (!form.tipoDocumento) e.tipoDocumento = 'Selecciona el tipo de documento';

  if (!form.numeroDocumento.trim()) {
    e.numeroDocumento = 'El número de documento es obligatorio';
  } else if (form.tipoDocumento === 'DNI' && !/^\d{8}$/.test(form.numeroDocumento)) {
    e.numeroDocumento = 'El DNI debe tener 8 dígitos';
  } else if (form.tipoDocumento === 'RUC' && !/^\d{11}$/.test(form.numeroDocumento)) {
    e.numeroDocumento = 'El RUC debe tener 11 dígitos';
  } else {
    const duplicado = conductoresExistentes.some(
      (c) =>
        c.id !== conductorId &&
        c.tipoDocumento === form.tipoDocumento &&
        c.numeroDocumento === form.numeroDocumento.trim(),
    );
    if (duplicado) e.numeroDocumento = 'Ya existe un conductor con este documento';
  }

  if (!form.nombres.trim()) e.nombres = 'Los nombres son obligatorios';
  if (!form.apellidoPaterno.trim()) e.apellidoPaterno = 'El apellido paterno es obligatorio';
  if (!form.numeroLicencia.trim()) e.numeroLicencia = 'El número de licencia es obligatorio';

  return e;
}

export function ModalFormularioConductor({
  isOpen,
  modo,
  conductor,
  conductoresExistentes,
  onClose,
  onSubmit,
  cargando = false,
}: ModalFormularioConductorProps) {
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tocados, setTocados] = useState<Set<keyof FormState>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    if (conductor) {
      setForm({
        tipoDocumento: conductor.tipoDocumento,
        numeroDocumento: conductor.numeroDocumento,
        nombres: conductor.nombres,
        apellidoPaterno: conductor.apellidoPaterno,
        apellidoMaterno: conductor.apellidoMaterno,
        numeroLicencia: conductor.numeroLicencia,
        estado: conductor.estado,
      });
    } else {
      setForm(FORM_VACIO);
    }
    setErrors({});
    setTocados(new Set());
  }, [isOpen, conductor]);

  const set = (campo: keyof FormState, valor: string) => {
    const next = { ...form, [campo]: valor };
    setForm(next);
    setTocados((prev) => new Set(prev).add(campo));
    const err = validar(next, conductoresExistentes, conductor?.id);
    setErrors((prev) => ({ ...prev, [campo]: err[campo] }));
  };

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar(form, conductoresExistentes, conductor?.id);
    if (Object.keys(err).length > 0) {
      setErrors(err);
      setTocados(new Set(Object.keys(form) as Array<keyof FormState>));
      return;
    }
    await onSubmit({
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento.trim(),
      nombres: form.nombres.trim(),
      apellidoPaterno: form.apellidoPaterno.trim(),
      apellidoMaterno: form.apellidoMaterno.trim(),
      numeroLicencia: form.numeroLicencia.trim(),
      estado: form.estado,
    });
  };

  const campo = (id: keyof FormState) =>
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
              {modo === 'crear' ? 'Nuevo conductor' : 'Editar conductor'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {modo === 'crear' ? 'Registra un conductor para traslados' : 'Modifica los datos del conductor'}
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
          {/* Tipo y número de documento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de documento *</label>
              <select
                value={form.tipoDocumento}
                onChange={(e) => set('tipoDocumento', e.target.value)}
                disabled={cargando}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 bg-white disabled:opacity-50 ${campo('tipoDocumento')}`}
              >
                {TIPOS_DOCUMENTO_CONDUCTOR.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {tocados.has('tipoDocumento') && errors.tipoDocumento && (
                <p className="text-xs text-red-600 mt-1">{errors.tipoDocumento}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Número de documento *</label>
              <input
                type="text"
                value={form.numeroDocumento}
                onChange={(e) => set('numeroDocumento', e.target.value.replace(/\s/g, ''))}
                disabled={cargando}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${campo('numeroDocumento')}`}
                placeholder={form.tipoDocumento === 'DNI' ? '12345678' : ''}
                maxLength={form.tipoDocumento === 'DNI' ? 8 : form.tipoDocumento === 'RUC' ? 11 : 20}
              />
              {tocados.has('numeroDocumento') && errors.numeroDocumento && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroDocumento}</p>
              )}
            </div>
          </div>

          {/* Nombres */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombres *</label>
            <input
              type="text"
              value={form.nombres}
              onChange={(e) => set('nombres', e.target.value)}
              disabled={cargando}
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${campo('nombres')}`}
              placeholder="Nombres del conductor"
            />
            {tocados.has('nombres') && errors.nombres && (
              <p className="text-xs text-red-600 mt-1">{errors.nombres}</p>
            )}
          </div>

          {/* Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Apellido paterno *</label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={(e) => set('apellidoPaterno', e.target.value)}
                disabled={cargando}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${campo('apellidoPaterno')}`}
                placeholder="Apellido paterno"
              />
              {tocados.has('apellidoPaterno') && errors.apellidoPaterno && (
                <p className="text-xs text-red-600 mt-1">{errors.apellidoPaterno}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Apellido materno</label>
              <input
                type="text"
                value={form.apellidoMaterno}
                onChange={(e) => set('apellidoMaterno', e.target.value)}
                disabled={cargando}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Apellido materno"
              />
            </div>
          </div>

          {/* Licencia y estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N.° de licencia de conducir *</label>
              <input
                type="text"
                value={form.numeroLicencia}
                onChange={(e) => set('numeroLicencia', e.target.value.toUpperCase().replace(/\s/g, ''))}
                disabled={cargando}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 font-mono ${campo('numeroLicencia')}`}
                placeholder="Q12345678"
              />
              {tocados.has('numeroLicencia') && errors.numeroLicencia && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroLicencia}</p>
              )}
            </div>
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
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} disabled={cargando} type="button">
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={cargando}>
              {cargando ? 'Guardando…' : modo === 'crear' ? 'Registrar conductor' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
