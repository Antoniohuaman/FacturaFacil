import { useState, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/contasis';
import type { Vehiculo, CreateVehiculoInput, EstadoVehiculo, Conductor } from '../../modelos/Transporte';
import {
  ENTIDADES_AUTORIZADORAS_D37,
  CONFIGURACIONES_VEHICULARES,
} from '../../datos/catalogosGRE';
import { nombreCompletoConductor } from './helpersTransporte';

interface FormState {
  placa: string;
  estado: EstadoVehiculo;
  conductoresIds: string[];
  // Campos opcionales
  marca: string;
  modelo: string;
  configuracionVehicular: string;
  numeroCertificado: string;
  numeroTUCE: string;
  numeroSerie: string;
  vin: string;
  numeroMotor: string;
  color: string;
  codigoEntidadAutorizadora: string;
  numeroAutorizacion: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const FORM_VACIO: FormState = {
  placa: '',
  estado: 'ACTIVO',
  conductoresIds: [],
  marca: '',
  modelo: '',
  configuracionVehicular: '',
  numeroCertificado: '',
  numeroTUCE: '',
  numeroSerie: '',
  vin: '',
  numeroMotor: '',
  color: '',
  codigoEntidadAutorizadora: '',
  numeroAutorizacion: '',
};

interface ModalFormularioVehiculoProps {
  isOpen: boolean;
  modo: 'crear' | 'editar';
  vehiculo?: Vehiculo;
  vehiculosExistentes: Vehiculo[];
  conductores: Conductor[];
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
    const dup = vehiculosExistentes.some(
      (v) => v.id !== vehiculoId && v.placa.toUpperCase().replace(/-/g, '') === normalizada,
    );
    if (dup) e.placa = 'Ya existe un vehículo con esta placa';
  }

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
  conductores,
  onClose,
  onSubmit,
  cargando = false,
}: ModalFormularioVehiculoProps) {
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [errors, setErrors] = useState<FormErrors>({});
  const [tocados, setTocados] = useState<Set<keyof FormState>>(new Set());
  const [opcionalAbierto, setOpcionalAbierto] = useState(false);
  const [buscadorConductor, setBuscadorConductor] = useState('');
  const [dropdownConductorAbierto, setDropdownConductorAbierto] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (vehiculo) {
      setForm({
        placa: vehiculo.placa,
        estado: vehiculo.estado,
        conductoresIds: vehiculo.conductoresIds ?? [],
        marca: vehiculo.marca ?? '',
        modelo: vehiculo.modelo ?? '',
        configuracionVehicular: vehiculo.configuracionVehicular ?? '',
        numeroCertificado: vehiculo.numeroCertificado ?? '',
        numeroTUCE: vehiculo.numeroTUCE ?? '',
        numeroSerie: vehiculo.numeroSerie ?? '',
        vin: vehiculo.vin ?? '',
        numeroMotor: vehiculo.numeroMotor ?? '',
        color: vehiculo.color ?? '',
        codigoEntidadAutorizadora: vehiculo.codigoEntidadAutorizadora ?? '',
        numeroAutorizacion: vehiculo.numeroAutorizacion ?? '',
      });
    } else {
      setForm(FORM_VACIO);
    }
    setErrors({});
    setTocados(new Set());
    setOpcionalAbierto(false);
    setBuscadorConductor('');
    setDropdownConductorAbierto(false);
  }, [isOpen, vehiculo]);

  const set = (campo: keyof FormState, valor: string) => {
    const next = { ...form, [campo]: valor } as FormState;
    if (campo === 'codigoEntidadAutorizadora' && !valor) {
      next.numeroAutorizacion = '';
    }
    setForm(next);
    setTocados((prev) => new Set(prev).add(campo));
    const err = validar(next, vehiculosExistentes, vehiculo?.id);
    setErrors((prev) => ({
      ...prev,
      [campo]: err[campo as keyof FormErrors],
      numeroAutorizacion: err.numeroAutorizacion,
    }));
  };

  const agregarConductor = (id: string) => {
    if (form.conductoresIds.includes(id)) return;
    setForm((prev) => ({ ...prev, conductoresIds: [...prev.conductoresIds, id] }));
    setBuscadorConductor('');
    setDropdownConductorAbierto(false);
  };

  const quitarConductor = (id: string) => {
    setForm((prev) => ({
      ...prev,
      conductoresIds: prev.conductoresIds.filter((cid) => cid !== id),
    }));
  };

  const conductoresActivos = conductores.filter((c) => c.estado === 'ACTIVO');

  const conductoresDisponibles = conductoresActivos.filter(
    (c) => !form.conductoresIds.includes(c.id),
  );

  const conductoresFiltradosBusqueda = conductoresDisponibles.filter((c) => {
    const q = buscadorConductor.trim().toLowerCase();
    if (!q) return true;
    return (
      c.apellidoPaterno.toLowerCase().includes(q) ||
      c.apellidoMaterno.toLowerCase().includes(q) ||
      c.nombres.toLowerCase().includes(q) ||
      c.numeroLicencia.toLowerCase().includes(q) ||
      c.numeroDocumento.includes(q)
    );
  });

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
      estado: form.estado,
      conductoresIds: form.conductoresIds.length > 0 ? form.conductoresIds : undefined,
      marca: form.marca.trim() || undefined,
      modelo: form.modelo.trim() || undefined,
      configuracionVehicular: form.configuracionVehicular.trim() || undefined,
      numeroCertificado: form.numeroCertificado.trim() || undefined,
      numeroTUCE: form.numeroTUCE.trim() || undefined,
      numeroSerie: form.numeroSerie.trim() || undefined,
      vin: form.vin.trim() || undefined,
      numeroMotor: form.numeroMotor.trim() || undefined,
      color: form.color.trim() || undefined,
      codigoEntidadAutorizadora: form.codigoEntidadAutorizadora || undefined,
      numeroAutorizacion: form.codigoEntidadAutorizadora
        ? form.numeroAutorizacion.trim() || undefined
        : undefined,
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
          {/* Placa y estado */}
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

          {/* Conductores asignados */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Conductores asignados
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </p>

            {/* Chips de conductores seleccionados */}
            {form.conductoresIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.conductoresIds.map((cid) => {
                  const c = conductores.find((x) => x.id === cid);
                  if (!c) return null;
                  return (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100"
                    >
                      {nombreCompletoConductor(c)}
                      <button
                        type="button"
                        onClick={() => quitarConductor(cid)}
                        disabled={cargando}
                        className="hover:text-blue-900 disabled:opacity-50 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Buscador con dropdown */}
            <div className="relative">
              <div className="flex items-center w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1.5" />
                <input
                  type="text"
                  value={buscadorConductor}
                  onChange={(e) => {
                    setBuscadorConductor(e.target.value);
                    setDropdownConductorAbierto(true);
                  }}
                  onFocus={() => setDropdownConductorAbierto(true)}
                  onBlur={() => setTimeout(() => setDropdownConductorAbierto(false), 200)}
                  placeholder={
                    conductoresActivos.length === 0
                      ? 'No hay conductores activos registrados'
                      : conductoresDisponibles.length === 0
                        ? 'Todos los conductores activos ya están asignados'
                        : 'Buscar y agregar conductor…'
                  }
                  disabled={cargando || conductoresDisponibles.length === 0}
                  className="flex-1 outline-none text-sm placeholder:text-gray-400 disabled:opacity-50 bg-transparent"
                />
              </div>

              {dropdownConductorAbierto && conductoresFiltradosBusqueda.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {conductoresFiltradosBusqueda.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        agregarConductor(c.id);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2"
                    >
                      <span className="font-medium text-gray-800">
                        {nombreCompletoConductor(c)}
                      </span>
                      <span className="text-gray-400 font-mono ml-auto shrink-0">
                        {c.numeroLicencia}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                {/* Marca y modelo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marca</label>
                    <input
                      type="text"
                      value={form.marca}
                      onChange={(e) => set('marca', e.target.value)}
                      disabled={cargando}
                      placeholder="Mercedes-Benz, Volvo…"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Modelo</label>
                    <input
                      type="text"
                      value={form.modelo}
                      onChange={(e) => set('modelo', e.target.value)}
                      disabled={cargando}
                      placeholder="Actros, FH…"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => set('color', e.target.value)}
                    disabled={cargando}
                    placeholder="Blanco, Rojo…"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Configuración vehicular */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Configuración vehicular
                  </label>
                  <select
                    value={form.configuracionVehicular}
                    onChange={(e) => set('configuracionVehicular', e.target.value)}
                    disabled={cargando}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                  >
                    <option value="">— Seleccionar —</option>
                    {CONFIGURACIONES_VEHICULARES.map((cv) => (
                      <option key={cv.codigo} value={cv.codigo}>
                        {cv.codigo} — {cv.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Número de serie y VIN */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">N.° de serie</label>
                    <input
                      type="text"
                      value={form.numeroSerie}
                      onChange={(e) => set('numeroSerie', e.target.value.toUpperCase())}
                      disabled={cargando}
                      placeholder="Número de serie"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">VIN</label>
                    <input
                      type="text"
                      value={form.vin}
                      onChange={(e) => set('vin', e.target.value.toUpperCase())}
                      disabled={cargando}
                      placeholder="Número VIN"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-mono"
                    />
                  </div>
                </div>

                {/* Número de motor */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">N.° de motor</label>
                  <input
                    type="text"
                    value={form.numeroMotor}
                    onChange={(e) => set('numeroMotor', e.target.value.toUpperCase())}
                    disabled={cargando}
                    placeholder="Número de motor"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-mono"
                  />
                </div>

                {/* Certificado de inscripción/habilitación y TUCE */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      N.° de certificado
                    </label>
                    <input
                      type="text"
                      value={form.numeroCertificado}
                      onChange={(e) => set('numeroCertificado', e.target.value)}
                      disabled={cargando}
                      placeholder="Inscripción o habilitación"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">N.° TUCE</label>
                    <input
                      type="text"
                      value={form.numeroTUCE}
                      onChange={(e) => set('numeroTUCE', e.target.value)}
                      disabled={cargando}
                      placeholder="Número TUCE"
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Autorización especial */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Entidad emisora de autorización especial
                  </label>
                  <select
                    value={form.codigoEntidadAutorizadora}
                    onChange={(e) => set('codigoEntidadAutorizadora', e.target.value)}
                    disabled={cargando}
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

                {form.codigoEntidadAutorizadora && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      N.° de autorización especial *
                    </label>
                    <input
                      type="text"
                      value={form.numeroAutorizacion}
                      onChange={(e) => set('numeroAutorizacion', e.target.value)}
                      disabled={cargando}
                      placeholder="Número de autorización"
                      className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 disabled:opacity-50 ${estiloInput('numeroAutorizacion')}`}
                    />
                    {tocados.has('numeroAutorizacion') && errors.numeroAutorizacion && (
                      <p className="text-xs text-red-600 mt-1">{errors.numeroAutorizacion}</p>
                    )}
                  </div>
                )}
              </div>
            )}
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
