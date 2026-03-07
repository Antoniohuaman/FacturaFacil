import React from 'react';
import type { ActividadEconomica, CPEHabilitado } from '../models';
import ActividadesEconomicasInput from './ActividadesEconomicasInput';
import CPEHabilitadoInput from './CPEHabilitadoInput';

type DatosSunatClienteProps = {
  tipoContribuyente: string;
  estadoContribuyente: string;
  condicionDomicilio: string;
  fechaInscripcion: string;
  actividadesEconomicas: ActividadEconomica[];
  sistemaEmision: string;
  esEmisorElectronico: boolean;
  cpeHabilitado: CPEHabilitado[];
  esAgenteRetencion: boolean;
  esAgentePercepcion: boolean;
  esBuenContribuyente: boolean;
  exceptuadaPercepcion: boolean;
  onCambioCpeHabilitado: (cpeHabilitado: CPEHabilitado[]) => void;
  errorCpeHabilitado?: string;
};

const DatosSunatCliente: React.FC<DatosSunatClienteProps> = ({
  tipoContribuyente,
  estadoContribuyente,
  condicionDomicilio,
  fechaInscripcion,
  actividadesEconomicas,
  sistemaEmision,
  esEmisorElectronico,
  cpeHabilitado,
  esAgenteRetencion,
  esAgentePercepcion,
  esBuenContribuyente,
  exceptuadaPercepcion,
  onCambioCpeHabilitado,
  errorCpeHabilitado,
}) => {
  const manejarCambioActividades = () => undefined;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 pb-1.5 border-b">
        🏛️ Información SUNAT
      </h3>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Tipo:</span>
            <div className="text-gray-800 dark:text-gray-200 font-semibold">{tipoContribuyente || '-'}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Estado:</span>
            <div className="text-gray-800 dark:text-gray-200 font-semibold">{estadoContribuyente || '-'}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Condición domicilio:</span>
            <div className="text-gray-800 dark:text-gray-200 font-semibold">{condicionDomicilio || '-'}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400 font-medium">Fecha inscripción:</span>
            <div className="text-gray-800 dark:text-gray-200 font-semibold">{fechaInscripcion || '-'}</div>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Actividades económicas</label>
        <ActividadesEconomicasInput actividades={actividadesEconomicas || []} onChange={manejarCambioActividades} readonly={true} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sistema de emisión</label>
          <div className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 h-9 text-sm bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center">
            {sistemaEmision || '-'}
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 h-9 cursor-not-allowed">
            <input
              type="checkbox"
              checked={esEmisorElectronico}
              disabled
              className="rounded border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60"
            />
            Emisor electrónico
          </label>
        </div>
      </div>

      {esEmisorElectronico && (
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CPE Habilitados</label>
          <CPEHabilitadoInput cpeHabilitados={cpeHabilitado || []} onChange={onCambioCpeHabilitado} />
          {errorCpeHabilitado ? <p className="mt-1 text-xs text-red-500">{errorCpeHabilitado}</p> : null}
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-not-allowed">
          <input
            type="checkbox"
            checked={esAgenteRetencion}
            disabled
            className="rounded border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60"
          />
          Agente de retención
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-not-allowed">
          <input
            type="checkbox"
            checked={esAgentePercepcion}
            disabled
            className="rounded border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60"
          />
          Agente de percepción
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-not-allowed">
          <input
            type="checkbox"
            checked={esBuenContribuyente}
            disabled
            className="rounded border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60"
          />
          Buen contribuyente
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-not-allowed">
          <input
            type="checkbox"
            checked={exceptuadaPercepcion}
            disabled
            className="rounded border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60"
          />
          Exceptuada de percepción (SUNAT)
        </label>
      </div>
    </div>
  );
};

export default DatosSunatCliente;