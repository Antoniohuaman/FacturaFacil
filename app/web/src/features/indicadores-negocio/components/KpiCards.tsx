import { ShoppingCart, Users, DollarSign, TrendingUp, Ticket, Ban } from 'lucide-react';
import type { KpiSummary } from '../models/indicadores';
import { formatCurrency } from '../utils/formatters';

interface KpiCardsProps {
  data: KpiSummary;
  onViewGrowthDetails: () => void;
}

const cardBase =
  'flex-1 min-w-[190px] max-w-[260px] min-h-[150px] flex flex-col rounded-2xl p-4 lg:p-5 shadow-sm snap-start border';

const KpiCards: React.FC<KpiCardsProps> = ({ data, onViewGrowthDetails }) => {
  return (
    <div className="relative mb-5">
      <div className="flex flex-nowrap gap-3 md:gap-4 overflow-x-auto lg:overflow-visible pb-2 snap-x snap-mandatory lg:snap-none">
        <div className={`${cardBase} bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30`}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-blue-200 dark:bg-blue-800 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-800 dark:text-blue-200" />
            </div>
            <span className="text-[0.65rem] lg:text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-2 py-0.5 rounded-full">{data.totalVentasTrend}</span>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Total de Ventas</h3>
            <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{formatCurrency(data.totalVentas)}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-auto">Periodo seleccionado</p>
        </div>

        <div className={`${cardBase} bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800/30`}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-green-200 dark:bg-green-800 rounded-lg">
              <Users className="h-5 w-5 text-green-800 dark:text-green-200" />
            </div>
            <span className="text-[0.65rem] lg:text-xs font-semibold text-green-800 dark:text-green-300 bg-green-200/60 dark:bg-green-800/50 px-2 py-0.5 rounded-full">{data.nuevosClientesDelta}</span>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Nuevos Clientes</h3>
            <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{data.nuevosClientes}</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-auto">este mes</p>
        </div>

        <div className={`${cardBase} bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800/30`}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-200 dark:bg-purple-800 rounded-lg">
              <DollarSign className="h-5 w-5 text-purple-800 dark:text-purple-200" />
            </div>
            <span className="text-[0.65rem] lg:text-xs font-semibold text-purple-800 dark:text-purple-300 bg-purple-200/60 dark:bg-purple-800/50 px-2 py-0.5 rounded-full">{data.comprobantesDelta}</span>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Comprobantes Emitidos</h3>
            <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{data.comprobantesEmitidos.toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-auto">En este periodo</p>
        </div>

        <div className={`${cardBase} bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800/30`}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-orange-200 dark:bg-orange-800 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-800 dark:text-orange-200" />
            </div>
            <span className="text-[0.65rem] lg:text-xs font-semibold text-orange-800 dark:text-orange-300 bg-orange-200/60 dark:bg-orange-800/50 px-2 py-0.5 rounded-full">{data.crecimientoVsMesAnterior}</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Crecimiento</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight">vs. mes anterior</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex-1">{data.crecimientoDescripcion}</p>
          </div>
          <div className="flex justify-end pt-2 mt-auto">
            <button
              className="text-orange-700 dark:text-orange-300 text-xs font-medium hover:underline"
              style={{ minWidth: 'auto', padding: 0 }}
              onClick={onViewGrowthDetails}
            >
              Ver detalles
            </button>
          </div>
        </div>

        <div className={`${cardBase} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Ticket className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </div>
            <span className="text-[0.65rem] lg:text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/70 px-2 py-0.5 rounded-full">
              Promedio
            </span>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Ticket Promedio</h3>
            <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{formatCurrency(data.ticketPromedioPeriodo)}</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-auto">Comprobantes emitidos: {data.comprobantesEmitidos.toLocaleString()}</p>
        </div>

        <div className={`${cardBase} bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/40`}>
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-rose-200 dark:bg-rose-800 rounded-lg">
              <Ban className="h-5 w-5 text-rose-800 dark:text-rose-200" />
            </div>
            <span className="text-[0.65rem] lg:text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-200/70 dark:bg-rose-800/70 px-2 py-0.5 rounded-full">
              {`${data.tasaAnulacionesPorcentaje.toFixed(1)}%`}
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Tasa de Anulaciones</h3>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
              Emitidos: <span className="font-semibold">{data.comprobantesEmitidos}</span> · Anulados: <span className="font-semibold">{data.comprobantesAnulados}</span>
            </p>
          </div>
          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400 mt-auto">Base: {data.totalComprobantesConsiderados.toLocaleString()} comprobantes</p>
        </div>
      </div>
    </div>
  );
};
export default KpiCards;
