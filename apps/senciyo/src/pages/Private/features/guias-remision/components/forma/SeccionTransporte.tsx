import { useState, useEffect } from 'react';
import { Truck, Plus } from 'lucide-react';
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
import { useTenant } from '@/shared/tenant/TenantContext';
import type { TransportePrivado, TransportePublico } from '../../modelos/GuiaRemision';

// ─── Transporte Privado ─────────────────────────────────────

interface SeccionTransportePrivadoProps {
  transporte: TransportePrivado;
  onChange: (t: TransportePrivado) => void;
}

function SeccionTransportePrivado({ transporte, onChange }: SeccionTransportePrivadoProps) {
  const { tenantId } = useTenant();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [modalVehiculo, setModalVehiculo] = useState(false);
  const [modalConductor, setModalConductor] = useState(false);
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false);
  const [guardandoConductor, setGuardandoConductor] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    void conductoresDataSource
      .list(tenantId)
      .then((c) => setConductores(c.filter((x) => x.estado === 'ACTIVO')));
    void vehiculosDataSource
      .list(tenantId)
      .then((v) => setVehiculos(v.filter((x) => x.estado === 'ACTIVO')));
  }, [tenantId]);

  const toggleVehiculo = (id: string) => {
    const ids = transporte.vehiculosIds.includes(id)
      ? transporte.vehiculosIds.filter((x) => x !== id)
      : [...transporte.vehiculosIds, id];
    onChange({ ...transporte, vehiculosIds: ids });
  };

  const toggleConductor = (id: string) => {
    const ids = transporte.conductoresIds.includes(id)
      ? transporte.conductoresIds.filter((x) => x !== id)
      : [...transporte.conductoresIds, id];
    onChange({ ...transporte, conductoresIds: ids });
  };

  const crearVehiculo = async (datos: CreateVehiculoInput) => {
    if (!tenantId) return;
    setGuardandoVehiculo(true);
    try {
      const nuevo = await vehiculosDataSource.create(tenantId, datos);
      setVehiculos((prev) => [...prev, nuevo]);
      onChange({ ...transporte, vehiculosIds: [...transporte.vehiculosIds, nuevo.id] });
      setModalVehiculo(false);
    } finally {
      setGuardandoVehiculo(false);
    }
  };

  const crearConductor = async (datos: CreateConductorInput) => {
    if (!tenantId) return;
    setGuardandoConductor(true);
    try {
      const nuevo = await conductoresDataSource.create(tenantId, datos);
      setConductores((prev) => [...prev, nuevo]);
      onChange({ ...transporte, conductoresIds: [...transporte.conductoresIds, nuevo.id] });
      setModalConductor(false);
    } finally {
      setGuardandoConductor(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Fecha de inicio de traslado */}
      <div className="flex flex-wrap gap-3">
        <div className="w-48 shrink-0">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Fecha inicio de traslado
          </label>
          <input
            type="date"
            value={transporte.fechaInicioTraslado}
            onChange={(e) => onChange({ ...transporte, fechaInicioTraslado: e.target.value })}
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
      </div>

      {/* Opciones adicionales */}
      <div className="flex flex-wrap gap-4">
        {[
          { campo: 'transbordo', label: 'Transbordo programado' },
          { campo: 'retornoVehiculoVacio', label: 'Retorno de vehículo vacío' },
          { campo: 'retornoEnvases', label: 'Retorno con envases vacíos' },
          { campo: 'esM1oL', label: 'Vehículo M1 o L' },
        ].map(({ campo, label }) => (
          <label key={campo} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!transporte[campo as keyof TransportePrivado]}
              onChange={(e) => onChange({ ...transporte, [campo]: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-gray-300 text-violet-600"
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
          </label>
        ))}
      </div>

      {/* Vehículos */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Vehículos
          </label>
          <button
            type="button"
            onClick={() => setModalVehiculo(true)}
            className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium"
          >
            <Plus className="h-3 w-3" />
            Nuevo vehículo
          </button>
        </div>
        {vehiculos.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Sin vehículos configurados.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vehiculos.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => toggleVehiculo(v.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  transporte.vehiculosIds.includes(v.id)
                    ? 'bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/30 dark:border-violet-500 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {v.placa}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conductores */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Conductores
          </label>
          <button
            type="button"
            onClick={() => setModalConductor(true)}
            className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 font-medium"
          >
            <Plus className="h-3 w-3" />
            Nuevo conductor
          </button>
        </div>
        {conductores.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Sin conductores configurados.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {conductores.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleConductor(c.id)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  transporte.conductoresIds.includes(c.id)
                    ? 'bg-violet-100 border-violet-400 text-violet-700 dark:bg-violet-900/30 dark:border-violet-500 dark:text-violet-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {c.nombres} {c.apellidoPaterno}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modales reutilizados de Configuración de Transporte */}
      <ModalFormularioVehiculo
        isOpen={modalVehiculo}
        modo="crear"
        vehiculosExistentes={vehiculos}
        conductores={conductores}
        onClose={() => setModalVehiculo(false)}
        onSubmit={crearVehiculo}
        cargando={guardandoVehiculo}
      />
      <ModalFormularioConductor
        isOpen={modalConductor}
        modo="crear"
        conductoresExistentes={conductores}
        onClose={() => setModalConductor(false)}
        onSubmit={crearConductor}
        cargando={guardandoConductor}
      />
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            RUC transportista
          </label>
          <input
            type="text"
            value={transporte.transportistaNumeroDocumento}
            onChange={(e) => set('transportistaNumeroDocumento', e.target.value)}
            placeholder="20XXXXXXXXX"
            maxLength={11}
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Razón social
          </label>
          <input
            type="text"
            value={transporte.transportistaNombre}
            onChange={(e) => set('transportistaNombre', e.target.value)}
            placeholder="Nombre del transportista"
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Registro MTC
          </label>
          <input
            type="text"
            value={transporte.registroMTC ?? ''}
            onChange={(e) => set('registroMTC', e.target.value)}
            placeholder="N° registro MTC"
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Fecha de entrega de bienes
          </label>
          <input
            type="date"
            value={transporte.fechaEntregaBienes ?? ''}
            onChange={(e) => set('fechaEntregaBienes', e.target.value)}
            className="w-full h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
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
  transportePrivado?: TransportePrivado;
  onTransportePrivadoChange: (t: TransportePrivado) => void;
  transportePublico?: TransportePublico;
  onTransportePublicoChange: (t: TransportePublico) => void;
}

export default function SeccionTransporte({
  modalidadTransporte,
  transportePrivado,
  onTransportePrivadoChange,
  transportePublico,
  onTransportePublicoChange,
}: SeccionTransporteProps) {
  const esPrivado = modalidadTransporte === '02';

  return (
    <ConfigurationCard title="Datos de transporte" icon={Truck}>
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
