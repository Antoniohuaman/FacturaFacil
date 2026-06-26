import { X } from 'lucide-react';
import { Button } from '@/contasis';
import type { Vehiculo, Conductor } from '../../modelos/Transporte';
import { ENTIDADES_AUTORIZADORAS_D37, CONFIGURACIONES_VEHICULARES } from '../../datos/catalogosGRE';
import { nombreCompletoConductor, formatearPlaca } from './helpersTransporte';

interface ModalDetalleVehiculoProps {
  isOpen: boolean;
  vehiculo: Vehiculo | undefined;
  conductores: Conductor[];
  onClose: () => void;
}

function nombreEntidad(codigo?: string): string | undefined {
  if (!codigo) return undefined;
  const ent = ENTIDADES_AUTORIZADORAS_D37.find((e) => e.codigo === codigo);
  return ent ? `${ent.abreviatura} — ${ent.entidad}` : codigo;
}

function descripcionConfigVehicular(codigo?: string): string | undefined {
  if (!codigo) return undefined;
  const cfg = CONFIGURACIONES_VEHICULARES.find((c) => c.codigo === codigo);
  return cfg ? `${cfg.codigo} — ${cfg.descripcion}` : codigo;
}

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 mt-0.5 break-words">{valor}</dd>
    </div>
  );
}

export function ModalDetalleVehiculo({
  isOpen,
  vehiculo,
  conductores,
  onClose,
}: ModalDetalleVehiculoProps) {
  if (!isOpen || !vehiculo) return null;

  const conductoresAsignados = (vehiculo.conductoresIds ?? [])
    .map((id) => conductores.find((c) => c.id === id))
    .filter((c): c is Conductor => c !== undefined);

  const tieneInfoTecnica =
    vehiculo.marca ||
    vehiculo.modelo ||
    vehiculo.color ||
    vehiculo.configuracionVehicular ||
    vehiculo.vin ||
    vehiculo.numeroMotor ||
    vehiculo.numeroSerie ||
    vehiculo.numeroCertificado ||
    vehiculo.numeroTUCE;

  const tieneAutorizacion = vehiculo.codigoEntidadAutorizadora;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Detalle del vehículo</h3>
            <p className="text-sm font-mono font-medium text-gray-600 mt-0.5">
              {formatearPlaca(vehiculo.placa)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Identificación */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Identificación
            </h4>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-gray-500">Placa</dt>
                <dd className="text-sm font-mono font-semibold text-gray-800 mt-0.5">
                  {formatearPlaca(vehiculo.placa)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Estado</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      vehiculo.estado === 'ACTIVO'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {vehiculo.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Conductores asignados */}
          {conductoresAsignados.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Conductores asignados
              </h4>
              <ul className="space-y-1">
                {conductoresAsignados.map((c) => (
                  <li key={c.id} className="text-sm text-gray-800">
                    {nombreCompletoConductor(c)}
                    <span className="text-xs text-gray-500 ml-2">
                      — Lic. {c.numeroLicencia}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Datos técnicos */}
          {tieneInfoTecnica && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Datos técnicos
              </h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Campo label="Marca" valor={vehiculo.marca} />
                <Campo label="Modelo" valor={vehiculo.modelo} />
                <Campo label="Color" valor={vehiculo.color} />
                <Campo
                  label="Configuración vehicular"
                  valor={descripcionConfigVehicular(vehiculo.configuracionVehicular)}
                />
                <Campo label="N.° de serie" valor={vehiculo.numeroSerie} />
                <Campo label="VIN" valor={vehiculo.vin} />
                <Campo label="N.° de motor" valor={vehiculo.numeroMotor} />
                <Campo label="N.° de certificado" valor={vehiculo.numeroCertificado} />
                <Campo label="N.° TUCE" valor={vehiculo.numeroTUCE} />
              </dl>
            </div>
          )}

          {/* Autorización especial */}
          {tieneAutorizacion && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Autorización especial
              </h4>
              <dl className="grid grid-cols-1 gap-y-3">
                <Campo
                  label="Entidad autorizadora"
                  valor={nombreEntidad(vehiculo.codigoEntidadAutorizadora)}
                />
                <Campo label="N.° de autorización" valor={vehiculo.numeroAutorizacion} />
              </dl>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <Button variant="secondary" onClick={onClose} type="button">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
