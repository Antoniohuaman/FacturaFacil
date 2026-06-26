import { X } from 'lucide-react';
import { Button } from '@/contasis';
import type { Conductor } from '../../modelos/Transporte';
import { TIPOS_DOCUMENTO_CONDUCTOR_GRE } from '../../datos/catalogosGRE';
import { nombreCompletoConductor } from './helpersTransporte';

interface ModalDetalleConductorProps {
  isOpen: boolean;
  conductor: Conductor | undefined;
  onClose: () => void;
}

function formatearFecha(fecha?: string): string {
  if (!fecha) return '—';
  const partes = fecha.split('-');
  if (partes.length !== 3) return fecha;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function nombreTipoDocumento(value: string): string {
  return TIPOS_DOCUMENTO_CONDUCTOR_GRE.find((t) => t.value === value)?.label ?? value;
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

export function ModalDetalleConductor({ isOpen, conductor, onClose }: ModalDetalleConductorProps) {
  if (!isOpen || !conductor) return null;

  const nombreCompleto = nombreCompletoConductor(conductor);

  const tieneInfoAdicional =
    conductor.categoriaLicencia ||
    conductor.fechaExpedicion ||
    conductor.fechaVencimiento ||
    conductor.estadoLicencia ||
    conductor.restricciones;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Detalle del conductor</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs" title={nombreCompleto}>
              {nombreCompleto}
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
              <Campo label="N.° de licencia" valor={conductor.numeroLicencia} />
              <Campo label="Tipo de documento" valor={nombreTipoDocumento(conductor.tipoDocumento)} />
              <Campo label="N.° de documento" valor={conductor.numeroDocumento} />
              <div>
                <dt className="text-xs text-gray-500">Estado del registro</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      conductor.estado === 'ACTIVO'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {conductor.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Datos adicionales de la licencia */}
          {tieneInfoAdicional && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Datos de la licencia
              </h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <Campo label="Categoría de licencia" valor={conductor.categoriaLicencia} />
                <Campo label="Estado oficial" valor={conductor.estadoLicencia} />
                <Campo
                  label="Fecha de expedición"
                  valor={formatearFecha(conductor.fechaExpedicion)}
                />
                <Campo
                  label="Fecha de vencimiento"
                  valor={formatearFecha(conductor.fechaVencimiento)}
                />
                {conductor.restricciones && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-gray-500">Restricciones</dt>
                    <dd className="text-sm font-medium text-gray-800 mt-0.5">
                      {conductor.restricciones}
                    </dd>
                  </div>
                )}
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
