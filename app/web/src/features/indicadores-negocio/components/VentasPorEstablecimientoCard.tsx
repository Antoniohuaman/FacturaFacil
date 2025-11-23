import type { VentasPorEstablecimientoItem } from '../models/indicadores';
import type { DateRange } from '../models/dateRange';
import { formatCurrency, formatRangeLabel } from '../utils/formatters';

interface VentasPorEstablecimientoCardProps {
  data: VentasPorEstablecimientoItem[];
  dateRange: DateRange;
}

const VentasPorEstablecimientoCard: React.FC<VentasPorEstablecimientoCardProps> = ({ data, dateRange }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ventas por Establecimiento</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">Periodo: {formatRangeLabel(dateRange)}</span>
      </div>
      <div className="space-y-6">
        {data.map((tienda) => (
          <div key={tienda.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full inline-block ${tienda.colorClass}`}></span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{tienda.nombre}</span>
              </div>
              <span className="text-green-600 text-xs font-semibold">{tienda.variacion}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">{tienda.porcentaje}% del total</div>
              <div className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(tienda.monto)}</div>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
              <div className={`h-2 rounded-full ${tienda.barColorClass}`} style={{ width: `${tienda.porcentaje}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VentasPorEstablecimientoCard;
