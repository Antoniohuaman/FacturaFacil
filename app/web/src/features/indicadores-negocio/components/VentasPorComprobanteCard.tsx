import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import type { VentasPorComprobanteItem } from '../models/indicadores';
import { formatCurrency, formatRangeLabel } from '../utils/formatters';
import type { DateRange } from '../models/dateRange';

interface VentasPorComprobanteCardProps {
  data: VentasPorComprobanteItem[];
  dateRange: DateRange;
  totalVentasPeriodo: number;
}

const VentasPorComprobanteCard: React.FC<VentasPorComprobanteCardProps> = ({ data, dateRange, totalVentasPeriodo }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0) || 1;
  const dataset = data.map((item) => ({
    ...item,
    percent: ((item.value / total) * 100).toFixed(1)
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ventas por Tipo de Comprobante</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">Periodo: {formatRangeLabel(dateRange)}</span>
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
        <div className="flex-1 order-2 lg:order-1">
          <div className="flex flex-col gap-4">
            {dataset.map((item) => (
              <div key={item.name} className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                <span className="inline-block p-1.5 rounded-md" style={{ backgroundColor: item.color }}>
                  <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12h6" />
                    <path d="M9 16h6" />
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <path d="M9 8h6" />
                  </svg>
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{item.name}</span>
                      <span className="block text-xs text-gray-500">{item.percent}% del total</span>
                    </div>
                    <div className="text-right ml-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(item.value)}</span>
                      <div className="flex items-center justify-end">
                        <svg className="h-3 w-3 text-green-600 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="17 11 12 6 7 11" />
                          <polyline points="7 18 17 18" />
                        </svg>
                        <span className="text-xs font-medium text-green-600">{item.trend}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[14.78rem] h-[14.78rem] mx-auto lg:mx-0 flex items-center justify-center order-1 lg:order-2 mt-3 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataset}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={68.6}
                outerRadius={108.8}
                paddingAngle={1}
                stroke="none"
              >
                {dataset.map((entry, index) => (
                  <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number, name: string, props: { payload?: { percent?: string } }) => {
                  const percent = props?.payload?.percent;
                  return [`${formatCurrency(Number(value))} (${percent}%)`, name];
                }}
                contentStyle={{
                  backgroundColor: 'var(--tw-colors-gray-800)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute left-0 top-0 w-full h-full flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total de ventas:</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalVentasPeriodo)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VentasPorComprobanteCard;
