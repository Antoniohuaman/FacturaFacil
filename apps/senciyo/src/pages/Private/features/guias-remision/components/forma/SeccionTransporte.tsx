import { useState, useEffect, useRef } from 'react';
import { Truck, Plus, X, ChevronDown } from 'lucide-react';
import { ConfigurationCard } from '../../../comprobantes-electronicos/shared/form-core/components/ConfigurationCard';
import {
  conductoresDataSource,
  vehiculosDataSource,
} from '../../../configuracion-sistema/api/fuenteDatosTransporte';
import type {
  Conductor,
  Vehiculo,
  CreateVehiculoInput,
  CreateConductorInput,
} from '../../../configuracion-sistema/modelos/Transporte';
import { ModalFormularioVehiculo } from '../../../configuracion-sistema/components/transporte/ModalFormularioVehiculo';
import { ModalFormularioConductor } from '../../../configuracion-sistema/components/transporte/ModalFormularioConductor';
import {
  ENTIDADES_AUTORIZADORAS_D37,
  MODALIDADES_TRANSPORTE,
} from '../../../configuracion-sistema/datos/catalogosGRE';
import { useTenant } from '@/shared/tenant/TenantContext';
import {
  nombreCompletoConductor,
  formatearPlaca,
} from '../../../configuracion-sistema/components/transporte/helpersTransporte';
import type { TransportePrivado, TransportePublico } from '../../modelos/GuiaRemision';

// ─── Helpers ────────────────────────────────────────────────

function abreviaturaEntidad(codigo: string): string {
  return ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === codigo)?.abreviatura ?? codigo;
}

function nombreEntidad(codigo: string): string {
  return ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === codigo)?.entidad ?? codigo;
}

// ─── Selector de modalidad ──────────────────────────────────

// Orden de presentación: privado (02) primero, público (01) segundo
const OPCIONES_MODALIDAD = (['02', '01'] as const).map((codigo) => ({
  codigo,
  descripcion:
    MODALIDADES_TRANSPORTE.find((m) => m.codigo === codigo)?.descripcion ?? codigo,
}));

// ─── Indicadores opcionales (sin esM1oL — tiene comportamiento especial) ─

type CampoIndicador = 'transbordo' | 'retornoVehiculoVacio' | 'retornoEnvases';

const INDICADORES: ReadonlyArray<{ campo: CampoIndicador; label: string }> = [
  { campo: 'transbordo', label: 'Transbordo programado' },
  { campo: 'retornoVehiculoVacio', label: 'Retorno vacío' },
  { campo: 'retornoEnvases', label: 'Retorno envases' },
];

// ─── Panel de Vehículos ─────────────────────────────────────

interface PanelVehiculosProps {
  vehiculosIds: string[];
  todos: Vehiculo[];
  conductores: Conductor[];
  onChange: (ids: string[]) => void;
  onCrear: (datos: CreateVehiculoInput) => Promise<void>;
}

function PanelVehiculos({
  vehiculosIds,
  todos,
  conductores,
  onChange,
  onCrear,
}: PanelVehiculosProps) {
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const seleccionados = vehiculosIds
    .map((id) => todos.find((v) => v.id === id))
    .filter((v): v is Vehiculo => v !== undefined);

  const disponibles = todos.filter((v) => !vehiculosIds.includes(v.id));

  const agregar = (id: string) => {
    onChange([...vehiculosIds, id]);
    setDropdownAbierto(false);
  };

  const quitar = (id: string) => onChange(vehiculosIds.filter((x) => x !== id));

  const hacerPrincipal = (id: string) =>
    onChange([id, ...vehiculosIds.filter((x) => x !== id)]);

  const handleSubmitNuevo = async (datos: CreateVehiculoInput) => {
    setGuardando(true);
    try {
      await onCrear(datos);
      setModalNuevo(false);
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    if (!dropdownAbierto) return;
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownAbierto(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dropdownAbierto]);

  return (
    <div className="min-w-0">
      {/* Cabecera del panel */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-1">
          Vehículos
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownAbierto((p) => !p)}
            disabled={disponibles.length === 0}
            className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Agregar <ChevronDown className="h-3 w-3" />
          </button>
          {dropdownAbierto && disponibles.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg min-w-[180px] max-h-40 overflow-y-auto">
              {disponibles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => agregar(v.id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/20 font-mono"
                >
                  {formatearPlaca(v.placa)}
                  {v.codigoEntidadAutorizadora && (
                    <span className="ml-2 text-gray-400 font-sans font-normal">
                      {abreviaturaEntidad(v.codigoEntidadAutorizadora)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Nuevo
        </button>
      </div>

      {/* Lista de vehículos seleccionados */}
      {seleccionados.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
          Sin vehículos seleccionados.{' '}
          {todos.length === 0
            ? 'Registra uno nuevo con el botón Nuevo.'
            : 'Agrega uno existente o registra uno nuevo.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {seleccionados.map((v, idx) => {
            const esPrincipal = idx === 0;
            const entCodigo = v.codigoEntidadAutorizadora;
            const entAbrev = entCodigo ? abreviaturaEntidad(entCodigo) : null;
            const authTexto =
              entAbrev && v.numeroAutorizacion
                ? `${entAbrev} · ${v.numeroAutorizacion}`
                : entAbrev ?? null;
            const authTooltip =
              entCodigo && v.numeroAutorizacion
                ? `${nombreEntidad(entCodigo)} · ${v.numeroAutorizacion}`
                : entCodigo
                  ? nombreEntidad(entCodigo)
                  : undefined;

            return (
              <li
                key={v.id}
                className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2.5 py-1.5 min-w-0"
              >
                {/* Rol — Principal fijo, Secundario clickeable para promover */}
                {esPrincipal ? (
                  <span className="shrink-0 text-[10px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 rounded">
                    Principal
                  </span>
                ) : (
                  <button
                    type="button"
                    title="Establecer como principal"
                    onClick={() => hacerPrincipal(v.id)}
                    className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                  >
                    Secundario
                  </button>
                )}
                {/* Placa */}
                <span className="font-mono font-semibold text-gray-900 dark:text-white shrink-0">
                  {formatearPlaca(v.placa)}
                </span>
                {/* Autorización si existe */}
                {authTexto && (
                  <span
                    className="text-gray-500 dark:text-gray-400 truncate"
                    title={authTooltip}
                  >
                    {authTexto}
                  </span>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  title="Quitar de esta guía"
                  onClick={() => quitar(v.id)}
                  className="shrink-0 p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ModalFormularioVehiculo
        isOpen={modalNuevo}
        modo="crear"
        vehiculosExistentes={todos}
        conductores={conductores}
        onClose={() => setModalNuevo(false)}
        onSubmit={handleSubmitNuevo}
        cargando={guardando}
      />
    </div>
  );
}

// ─── Panel de Conductores ───────────────────────────────────

interface PanelConductoresProps {
  conductoresIds: string[];
  todos: Conductor[];
  onChange: (ids: string[]) => void;
  onCrear: (datos: CreateConductorInput) => Promise<void>;
}

function PanelConductores({
  conductoresIds,
  todos,
  onChange,
  onCrear,
}: PanelConductoresProps) {
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const seleccionados = conductoresIds
    .map((id) => todos.find((c) => c.id === id))
    .filter((c): c is Conductor => c !== undefined);

  const disponibles = todos.filter((c) => !conductoresIds.includes(c.id));

  const agregar = (id: string) => {
    onChange([...conductoresIds, id]);
    setDropdownAbierto(false);
  };

  const quitar = (id: string) => onChange(conductoresIds.filter((x) => x !== id));

  const handleSubmitNuevo = async (datos: CreateConductorInput) => {
    setGuardando(true);
    try {
      await onCrear(datos);
      setModalNuevo(false);
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    if (!dropdownAbierto) return;
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownAbierto(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dropdownAbierto]);

  return (
    <div className="min-w-0">
      {/* Cabecera del panel */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex-1">
          Conductores
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownAbierto((p) => !p)}
            disabled={disponibles.length === 0}
            className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Agregar <ChevronDown className="h-3 w-3" />
          </button>
          {dropdownAbierto && disponibles.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg min-w-[240px] max-h-40 overflow-y-auto">
              {disponibles.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => agregar(c.id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                  <span className="font-medium">{nombreCompletoConductor(c)}</span>
                  <span className="ml-2 text-gray-400 font-mono">{c.numeroLicencia}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-1 text-xs px-2 py-1 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Nuevo
        </button>
      </div>

      {/* Lista de conductores seleccionados */}
      {seleccionados.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
          Sin conductores seleccionados.{' '}
          {todos.length === 0
            ? 'Registra uno nuevo con el botón Nuevo.'
            : 'Agrega uno existente o registra uno nuevo.'}
        </p>
      ) : (
        <ul className="space-y-1">
          {seleccionados.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800/60 rounded-lg px-2.5 py-1.5 min-w-0"
            >
              <div className="flex-1 min-w-0 truncate">
                <span className="font-medium text-gray-900 dark:text-white">
                  {nombreCompletoConductor(c)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1.5">
                  · {c.tipoDocumento} {c.numeroDocumento} · Lic. {c.numeroLicencia}
                </span>
              </div>
              <button
                type="button"
                title="Quitar de esta guía"
                onClick={() => quitar(c.id)}
                className="shrink-0 p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ModalFormularioConductor
        isOpen={modalNuevo}
        modo="crear"
        conductoresExistentes={todos}
        onClose={() => setModalNuevo(false)}
        onSubmit={handleSubmitNuevo}
        cargando={guardando}
      />
    </div>
  );
}

// ─── Bloque compacto para modo M1/L ────────────────────────

interface BloquePlacaM1LProps {
  placa: string | undefined;
  todos: Vehiculo[];
  conductores: Conductor[];
  onChange: (placa: string | undefined) => void;
  onCrear: (datos: CreateVehiculoInput) => Promise<void>;
}

function BloquePlacaM1L({ placa, todos, conductores, onChange, onCrear }: BloquePlacaM1LProps) {
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSubmitNuevo = async (datos: CreateVehiculoInput) => {
    setGuardando(true);
    try {
      await onCrear(datos);
      setModalNuevo(false);
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    if (!dropdownAbierto) return;
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownAbierto(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [dropdownAbierto]);

  return (
    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-amber-100 dark:border-amber-900/30">
      <span
        className="text-xs font-medium text-amber-700 dark:text-amber-400"
        title="Vehículos de categoría M1 (automóviles) o L (motocicletas). Solo se requiere la placa; no aplica conductor."
      >
        Categoría M1/L — placa del vehículo
      </span>

      {placa ? (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/60 rounded-lg text-xs">
          <span className="font-mono font-semibold text-gray-900 dark:text-white">
            {formatearPlaca(placa)}
          </span>
          <button
            type="button"
            title="Quitar placa"
            onClick={() => onChange(undefined)}
            className="p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownAbierto((p) => !p)}
              className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Seleccionar placa <ChevronDown className="h-3 w-3" />
            </button>
            {dropdownAbierto && (
              <div className="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg min-w-[160px] max-h-40 overflow-y-auto">
                {todos.length > 0 ? (
                  todos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        onChange(v.placa);
                        setDropdownAbierto(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-900 dark:text-white hover:bg-violet-50 dark:hover:bg-violet-900/20 font-mono"
                    >
                      {formatearPlaca(v.placa)}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-gray-400">Sin vehículos registrados.</p>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalNuevo(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
          >
            <Plus className="h-3 w-3" /> Nuevo
          </button>
        </div>
      )}

      <ModalFormularioVehiculo
        isOpen={modalNuevo}
        modo="crear"
        vehiculosExistentes={todos}
        conductores={conductores}
        onClose={() => setModalNuevo(false)}
        onSubmit={handleSubmitNuevo}
        cargando={guardando}
      />
    </div>
  );
}

// ─── Transporte Privado ─────────────────────────────────────

interface SeccionTransportePrivadoProps {
  transporte: TransportePrivado;
  onChange: (t: TransportePrivado) => void;
}

function SeccionTransportePrivado({ transporte, onChange }: SeccionTransportePrivadoProps) {
  const { tenantId } = useTenant();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const hoy = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!tenantId) return;
    void conductoresDataSource
      .list(tenantId)
      .then((c) => setConductores(c.filter((x) => x.estado === 'ACTIVO')));
    void vehiculosDataSource
      .list(tenantId)
      .then((v) => setVehiculos(v.filter((x) => x.estado === 'ACTIVO')));
  }, [tenantId]);

  const set = <K extends keyof TransportePrivado>(campo: K, valor: TransportePrivado[K]) =>
    onChange({ ...transporte, [campo]: valor });

  const esM1oL = !!transporte.esM1oL;

  const toggleM1oL = (checked: boolean) => {
    onChange({
      ...transporte,
      esM1oL: checked,
      // Al desactivar M1/L: limpia la placa M1/L
      ...(!checked ? { placaVehiculoM1L: undefined } : {}),
    });
  };

  const crearVehiculo = async (datos: CreateVehiculoInput) => {
    if (!tenantId) return;
    const nuevo = await vehiculosDataSource.create(tenantId, datos);
    setVehiculos((prev) => [...prev, nuevo]);
    onChange({ ...transporte, vehiculosIds: [...transporte.vehiculosIds, nuevo.id] });
  };

  const crearVehiculoM1L = async (datos: CreateVehiculoInput) => {
    if (!tenantId) return;
    const nuevo = await vehiculosDataSource.create(tenantId, datos);
    setVehiculos((prev) => [...prev, nuevo]);
    // En modo M1/L: guarda la placa, no el ID
    onChange({ ...transporte, placaVehiculoM1L: nuevo.placa });
  };

  const crearConductor = async (datos: CreateConductorInput) => {
    if (!tenantId) return;
    const nuevo = await conductoresDataSource.create(tenantId, datos);
    setConductores((prev) => [...prev, nuevo]);
    onChange({ ...transporte, conductoresIds: [...transporte.conductoresIds, nuevo.id] });
  };

  return (
    <div className="space-y-3">
      {/* Fila superior compacta: fecha + indicadores normales + checkbox M1/L */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
        <div className="shrink-0">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Fecha inicio de traslado
          </label>
          <input
            type="date"
            value={transporte.fechaInicioTraslado}
            min={hoy}
            onChange={(e) => {
              const val = e.target.value;
              if (val && val < hoy) {
                setErrorFecha('La fecha de inicio no puede ser anterior a hoy.');
              } else {
                setErrorFecha(null);
                set('fechaInicioTraslado', val);
              }
            }}
            className={`h-9 px-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none ${
              errorFecha
                ? 'border-red-400 dark:border-red-500'
                : 'border-gray-200 dark:border-gray-600'
            }`}
          />
          {errorFecha && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorFecha}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pb-1">
          {INDICADORES.map(({ campo, label }) => (
            <label key={campo} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={!!transporte[campo]}
                onChange={(e) => set(campo, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {label}
              </span>
            </label>
          ))}
          {/* Checkbox M1/L — comportamiento especial: cambia el bloque de vehículos/conductores */}
          <label
            className="flex items-center gap-1.5 cursor-pointer"
            title="Vehículos de categoría M1 (automóviles y similares) o L (motocicletas y similares). Solo se requiere la placa del vehículo."
          >
            <input
              type="checkbox"
              checked={esM1oL}
              onChange={(e) => toggleM1oL(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Vehículo M1/L
            </span>
          </label>
        </div>
      </div>

      {/* Bloque condicional: modo M1/L o paneles normales */}
      {esM1oL ? (
        <BloquePlacaM1L
          placa={transporte.placaVehiculoM1L}
          todos={vehiculos}
          conductores={conductores}
          onChange={(placa) => set('placaVehiculoM1L', placa)}
          onCrear={crearVehiculoM1L}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <PanelVehiculos
            vehiculosIds={transporte.vehiculosIds}
            todos={vehiculos}
            conductores={conductores}
            onChange={(ids) => set('vehiculosIds', ids)}
            onCrear={crearVehiculo}
          />
          <PanelConductores
            conductoresIds={transporte.conductoresIds}
            todos={conductores}
            onChange={(ids) => set('conductoresIds', ids)}
            onCrear={crearConductor}
          />
        </div>
      )}
    </div>
  );
}

// ─── Transporte Público ─────────────────────────────────────

interface SeccionTransportePublicoProps {
  transporte: TransportePublico;
  onChange: (t: TransportePublico) => void;
}

function SeccionTransportePublico({ transporte, onChange }: SeccionTransportePublicoProps) {
  const set = <K extends keyof TransportePublico>(campo: K, valor: TransportePublico[K]) =>
    onChange({ ...transporte, [campo]: valor });

  const INPUT_CLS =
    'w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none';
  const LABEL_CLS = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className={LABEL_CLS}>RUC transportista</label>
          <input
            type="text"
            value={transporte.transportistaNumeroDocumento}
            onChange={(e) => set('transportistaNumeroDocumento', e.target.value)}
            placeholder="20XXXXXXXXX"
            maxLength={11}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Razón social</label>
          <input
            type="text"
            value={transporte.transportistaNombre}
            onChange={(e) => set('transportistaNombre', e.target.value)}
            placeholder="Nombre del transportista"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Registro MTC</label>
          <input
            type="text"
            value={transporte.registroMTC ?? ''}
            onChange={(e) => set('registroMTC', e.target.value)}
            placeholder="N° registro MTC"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Fecha de entrega de bienes</label>
          <input
            type="date"
            value={transporte.fechaEntregaBienes ?? ''}
            onChange={(e) => set('fechaEntregaBienes', e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </div>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={!!transporte.retornoEnvases}
          onChange={(e) => set('retornoEnvases', e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
        />
        <span className="text-xs text-gray-700 dark:text-gray-300">
          Retorno con envases o embalajes vacíos
        </span>
      </label>
    </div>
  );
}

// ─── Constantes vacías ──────────────────────────────────────

const TRANSPORTE_PRIVADO_VACIO: TransportePrivado = {
  fechaInicioTraslado: new Date().toISOString().split('T')[0],
  vehiculosIds: [],
  conductoresIds: [],
};

const TRANSPORTE_PUBLICO_VACIO: TransportePublico = {
  transportistaNombre: '',
  transportistaNumeroDocumento: '',
  transportistaTipoDocumento: 'RUC',
  vehiculosIds: [],
  conductoresIds: [],
};

// ─── Componente principal ───────────────────────────────────

interface SeccionTransporteProps {
  modalidadTransporte: string;
  onModalidadChange: (codigo: string) => void;
  transportePrivado?: TransportePrivado;
  onTransportePrivadoChange: (t: TransportePrivado) => void;
  transportePublico?: TransportePublico;
  onTransportePublicoChange: (t: TransportePublico) => void;
}

export default function SeccionTransporte({
  modalidadTransporte,
  onModalidadChange,
  transportePrivado,
  onTransportePrivadoChange,
  transportePublico,
  onTransportePublicoChange,
}: SeccionTransporteProps) {
  const esPrivado = modalidadTransporte === '02';

  const selectorModalidad = (
    <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
      {OPCIONES_MODALIDAD.map(({ codigo, descripcion }) => (
        <button
          key={codigo}
          type="button"
          onClick={() => onModalidadChange(codigo)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            modalidadTransporte === codigo
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {descripcion}
        </button>
      ))}
    </div>
  );

  return (
    <ConfigurationCard
      title="Datos de transporte"
      icon={Truck}
      headerPaddingClassName="px-4 py-2"
      contentClassName="px-4 py-3"
      actions={selectorModalidad}
    >
      {esPrivado ? (
        <SeccionTransportePrivado
          transporte={transportePrivado ?? TRANSPORTE_PRIVADO_VACIO}
          onChange={onTransportePrivadoChange}
        />
      ) : (
        <SeccionTransportePublico
          transporte={transportePublico ?? TRANSPORTE_PUBLICO_VACIO}
          onChange={onTransportePublicoChange}
        />
      )}
    </ConfigurationCard>
  );
}
