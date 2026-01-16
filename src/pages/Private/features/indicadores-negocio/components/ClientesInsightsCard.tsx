import { UserPlus, RefreshCcw } from 'lucide-react';
import type { ClientesInsights } from '../models/indicadores';

interface ClientesInsightsCardProps {
  data: ClientesInsights;
}

const ClientesInsightsCard: React.FC<ClientesInsightsCardProps> = ({ data }) => {
  const hasData = data.totalClientes > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Insights de Clientes</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">Total: {data.totalClientes}</span>
      </div>

      {hasData ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <UserPlus className="h-5 w-5 text-blue-700 dark:text-blue-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Clientes nuevos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.nuevos}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{data.porcentajeNuevos.toFixed(1)}% del periodo</p>
            </div>

            <div className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-md bg-emerald-100 dark:bg-emerald-900/30">
                  <RefreshCcw className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Clientes recurrentes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.recurrentes}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{data.porcentajeRecurrentes.toFixed(1)}% del periodo</p>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Frecuencia media</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.frecuenciaMediaCompras.toFixed(1)} compras/cliente
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Promedio dentro del periodo seleccionado.</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No se registraron clientes para el periodo seleccionado.</p>
      )}
    </div>
  );
};

export default ClientesInsightsCard;
