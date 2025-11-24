import { ShoppingCart, Users, DollarSign, TrendingUp, Ticket, Ban } from 'lucide-react';
import type { KpiSummary } from '../models/indicadores';
import { formatCurrency } from '../utils/formatters';

interface KpiCardsProps {
  data: KpiSummary;
  onViewGrowthDetails: () => void;
}

const KpiCards: React.FC<KpiCardsProps> = ({ data, onViewGrowthDetails }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 shadow-sm border border-blue-100 dark:border-blue-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-blue-200 dark:bg-blue-800 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-blue-800 dark:text-blue-200" />
          </div>
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded-full">{data.totalVentasTrend}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Total de Ventas</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{formatCurrency(data.totalVentas)}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Periodo seleccionado</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 shadow-sm border border-green-200 dark:border-green-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-green-200 dark:bg-green-800 rounded-lg">
            <Users className="h-6 w-6 text-green-800 dark:text-green-200" />
          </div>
          <span className="text-xs font-medium text-green-800 dark:text-green-300 bg-green-200/50 dark:bg-green-800/50 px-2 py-1 rounded-full">{data.nuevosClientesDelta}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Nuevos Clientes</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.nuevosClientes}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">este mes</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 shadow-sm border border-purple-200 dark:border-purple-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-purple-200 dark:bg-purple-800 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-800 dark:text-purple-200" />
          </div>
          <span className="text-xs font-medium text-purple-800 dark:text-purple-300 bg-purple-200/50 dark:bg-purple-800/50 px-2 py-1 rounded-full">{data.comprobantesDelta}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Comprobantes Emitidos</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.comprobantesEmitidos.toLocaleString()}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">En este periodo</p>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 shadow-sm border border-orange-200 dark:border-orange-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-orange-200 dark:bg-orange-800 rounded-lg">
            <TrendingUp className="h-6 w-6 text-orange-800 dark:text-orange-200" />
          </div>
          <span className="text-xs font-medium text-orange-800 dark:text-orange-300 bg-orange-200/50 dark:bg-orange-800/50 px-2 py-1 rounded-full">{data.crecimientoVsMesAnterior}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Crecimiento</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">vs. mes anterior</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{data.crecimientoDescripcion}</p>
        <div className="flex justify-end">
          <button
            className="text-orange-700 dark:text-orange-300 text-sm font-medium hover:underline"
            style={{ minWidth: 'auto', padding: 0 }}
            onClick={onViewGrowthDetails}
          >
            Ver detalles
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Ticket className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/70 px-2 py-1 rounded-full">
            Promedio
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Ticket Promedio</h3>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{formatCurrency(data.ticketPromedioPeriodo)}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">Comprobantes emitidos: {data.comprobantesEmitidos.toLocaleString()}</p>
      </div>

      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-6 shadow-sm border border-rose-100 dark:border-rose-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-rose-200 dark:bg-rose-800 rounded-lg">
            <Ban className="h-6 w-6 text-rose-800 dark:text-rose-200" />
          </div>
          <span className="text-xs font-medium text-rose-800 dark:text-rose-200 bg-rose-200/60 dark:bg-rose-800/70 px-2 py-1 rounded-full">
            {`${data.tasaAnulacionesPorcentaje.toFixed(1)}%`}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Tasa de Anulaciones</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Emitidos: <span className="font-semibold">{data.comprobantesEmitidos}</span> · Anulados: <span className="font-semibold">{data.comprobantesAnulados}</span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Base: {data.totalComprobantesConsiderados.toLocaleString()} comprobantes</p>
      </div>
    </div>
  );
};

export default KpiCards;
