import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/contasis';
import type { Conductor, CreateConductorInput, EstadoConductor, TipoDocumentoConductor } from '../../modelos/Transporte';
import { TIPOS_DOCUMENTO_CONDUCTOR_GRE } from '../../datos/catalogosGRE';

interface FormState {
  numeroLicencia: string;
  tipoDocumento: TipoDocumentoConductor;
  numeroDocumento: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  estado: EstadoConductor;
  // Campos opcionales
  categoriaLicencia: string;
  fechaExpedicion: string;
  fechaVencimiento: string;
  estadoLicencia: string;
  restricciones: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const CAMPOS_REQUERIDOS: ReadonlyArray<keyof FormState> = [
  'numeroLicencia', 'tipoDocumento', 'numeroDocumento', 'apellidoPaterno', 'nombres',
];

const FORM_VACIO: FormState = {
  numeroLicencia: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  nombres: '',
  estado: 'ACTIVO',
  categoriaLicencia: '',
  fechaExpedicion: '',
  fechaVencimiento: '',
  estadoLicencia: '',
  restricciones: '',
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

  if (!form.numeroLicencia.trim()) {
    e.numeroLicencia = 'El número de licencia es obligatorio';
  } else {
    const dup = conductoresExistentes.some(
      (c) =>
        c.id !== conductorId &&
        c.numeroLicencia.toUpperCase() === form.numeroLicencia.trim().toUpperCase(),
    );
    if (dup) e.numeroLicencia = 'Ya existe un conductor registrado con esta licencia';
  }

  if (!form.tipoDocumento) e.tipoDocumento = 'Selecciona el tipo de documento';

  if (!form.numeroDocumento.trim()) {
    e.numeroDocumento = 'El número de documento es obligatorio';
  } else if (form.tipoDocumento === 'DNI' && !/^\d{8}$/.test(form.numeroDocumento)) {
    e.numeroDocumento = 'El DNI debe tener 8 dígitos';
  } else {
    const dup = conductoresExistentes.some(
      (c) =>
        c.id !== conductorId &&
        c.tipoDocumento === form.tipoDocumento &&
        c.numeroDocumento === form.numeroDocumento.trim(),
    );
    if (dup) e.numeroDocumento = 'Ya existe un conductor con este documento';
  }

  if (!form.apellidoPaterno.trim()) e.apellidoPaterno = 'El apellido paterno es obligatorio';
  if (!form.nombres.trim()) e.nombres = 'Los nombres son obligatorios';

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
  const [opcionalAbierto, setOpcionalAbierto] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (conductor) {
      setForm({
        numeroLicencia: conductor.numeroLicencia,
        tipoDocumento: conductor.tipoDocumento,
        numeroDocumento: conductor.numeroDocumento,
        apellidoPaterno: conductor.apellidoPaterno,
        apellidoMaterno: conductor.apellidoMaterno,
        nombres: conductor.nombres,
        estado: conductor.estado,
        categoriaLicencia: conductor.categoriaLicencia ?? '',
        fechaExpedicion: conductor.fechaExpedicion ?? '',
        fechaVencimiento: conductor.fechaVencimiento ?? '',
        estadoLicencia: conductor.estadoLicencia ?? '',
        restricciones: conductor.restricciones ?? '',
      });
    } else {
      setForm(FORM_VACIO);
    }
    setErrors({});
    setTocados(new Set());
    setOpcionalAbierto(false);
  }, [isOpen, conductor]);

  const set = (campo: keyof FormState, valor: string) => {
    const next = { ...form, [campo]: valor };
    setForm(next);
    setTocados((prev) => new Set(prev).add(campo));
    if (CAMPOS_REQUERIDOS.includes(campo)) {
      const err = validar(next, conductoresExistentes, conductor?.id);
      setErrors((prev) => ({ ...prev, [campo]: err[campo] }));
    }
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
      numeroLicencia: form.numeroLicencia.trim().toUpperCase(),
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento.trim(),
      nombres: form.nombres.trim(),
      apellidoPaterno: form.apellidoPaterno.trim(),
      apellidoMaterno: form.apellidoMaterno.trim(),
      estado: form.estado,
      categoriaLicencia: form.categoriaLicencia.trim() || undefined,
      fechaExpedicion: form.fechaExpedicion || undefined,
      fechaVencimiento: form.fechaVencimiento || undefined,
      estadoLicencia: form.estadoLicencia.trim() || undefined,
      restricciones: form.restricciones.trim() || undefined,
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
          {/* 1. Número de licencia */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              N.° de licencia de conducir *
            </label>
            <input
              type="text"
              value={form.numeroLicencia}
              onChange={(e) => set('numeroLicencia', e.target.value.toUpperCase().replace(/\s/g, ''))}
              disabled={cargando}
              placeholder="Q12345678"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 font-mono ${estiloInput('numeroLicencia')}`}
            />
            {tocados.has('numeroLicencia') && errors.numeroLicencia && (
              <p className="text-xs text-red-600 mt-1">{errors.numeroLicencia}</p>
            )}
          </div>

          {/* 2. Tipo y número de documento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de documento *</label>
              <select
                value={form.tipoDocumento}
                onChange={(e) => set('tipoDocumento', e.target.value)}
                disabled={cargando}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 bg-white disabled:opacity-50 ${estiloInput('tipoDocumento')}`}
              >
                {TIPOS_DOCUMENTO_CONDUCTOR_GRE.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {tocados.has('tipoDocumento') && errors.tipoDocumento && (
                <p className="text-xs text-red-600 mt-1">{errors.tipoDocumento}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">N.° de documento *</label>
              <input
                type="text"
                value={form.numeroDocumento}
                onChange={(e) => set('numeroDocumento', e.target.value.replace(/\s/g, ''))}
                disabled={cargando}
                placeholder={form.tipoDocumento === 'DNI' ? '12345678' : ''}
                maxLength={form.tipoDocumento === 'DNI' ? 8 : 20}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('numeroDocumento')}`}
              />
              {tocados.has('numeroDocumento') && errors.numeroDocumento && (
                <p className="text-xs text-red-600 mt-1">{errors.numeroDocumento}</p>
              )}
            </div>
          </div>

          {/* 3–4. Apellidos y nombres */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Apellido paterno *</label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={(e) => set('apellidoPaterno', e.target.value)}
                disabled={cargando}
                placeholder="Apellido paterno"
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('apellidoPaterno')}`}
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
                placeholder="Apellido materno"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombres *</label>
            <input
              type="text"
              value={form.nombres}
              onChange={(e) => set('nombres', e.target.value)}
              disabled={cargando}
              placeholder="Nombres del conductor"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('nombres')}`}
            />
            {tocados.has('nombres') && errors.nombres && (
              <p className="text-xs text-red-600 mt-1">{errors.nombres}</p>
            )}
          </div>

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

          {/* Sección opcional colapsada */}
          <div className="border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setOpcionalAbierto((p) => !p)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 w-full"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${opcionalAbierto ? 'rotate-180' : ''}`}
              />
              {opcionalAbierto ? 'Ocultar campos opcionales' : '+ Más campos opcionales'}
            </button>

            {opcionalAbierto && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Categoría de licencia</label>
                    <input
                      type="text"
                      value={form.categoriaLicencia}
                      onChange={(e) => set('categoriaLicencia', e.target.value.toUpperCase())}
                      disabled={cargando}
                      placeholder="A-IIb, A-IIIb…"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estado oficial</label>
                    <input
                      type="text"
                      value={form.estadoLicencia}
                      onChange={(e) => set('estadoLicencia', e.target.value)}
                      disabled={cargando}
                      placeholder="Vigente, Suspendida…"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de expedición</label>
                    <input
                      type="date"
                      value={form.fechaExpedicion}
                      onChange={(e) => set('fechaExpedicion', e.target.value)}
                      disabled={cargando}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={form.fechaVencimiento}
                      onChange={(e) => set('fechaVencimiento', e.target.value)}
                      disabled={cargando}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Restricciones</label>
                  <input
                    type="text"
                    value={form.restricciones}
                    onChange={(e) => set('restricciones', e.target.value)}
                    disabled={cargando}
                    placeholder="Restricciones de la licencia"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            )}
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
