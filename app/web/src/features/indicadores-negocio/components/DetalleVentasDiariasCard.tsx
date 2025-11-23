import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import type { VentaDiaria } from '../models/indicadores';
import { formatCurrency, formatShortLabelFromString } from '../utils/formatters';

interface DetalleVentasDiariasCardProps {
  data: VentaDiaria[];
  onViewMore: () => void;
}

const IconCircle = ({ label, color }: { label: string; color: string }) => (
  <span className="ml-1" style={{ display: 'inline-flex' }}>
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill={color} />
      <text x="24" y="28" textAnchor="middle" alignmentBaseline="middle" fontSize="24" fontWeight="bold" fill="#fff">
        {label}
      </text>
    </svg>
  </span>
);

const DetalleVentasDiariasCard: React.FC<DetalleVentasDiariasCardProps> = ({ data, onViewMore }) => {
  const topValores = [...data].sort((a, b) => b.ventas - a.ventas).slice(0, 3);
  const maxValues = topValores.map((item) => item.ventas);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Detalle de Ventas Diarias</span>
        </div>
        <button className="text-blue-700 text-sm font-medium hover:underline" onClick={onViewMore}>
          Ver más detalles
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="p-0 m-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 text-xs border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 px-3 text-left">FECHA</th>
                <th className="py-2 px-3 text-left">TOTAL VENTAS</th>
                <th className="py-2 px-3 text-left">IGV</th>
                <th className="py-2 px-3 text-left">N° COMPROBANTES</th>
                <th className="py-2 px-3 text-left">TICKET PROMEDIO</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr className="border-b border-gray-200 dark:border-gray-700" key={item.fecha}>
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{formatShortLabelFromString(item.fecha)}</td>
                  <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    {formatCurrency(item.ventas)}
                    {maxValues.includes(item.ventas) && (
                      <IconCircle
                        label={(maxValues.indexOf(item.ventas) + 1).toString()}
                        color={['#E8A354', '#8C98B8', '#B1CBED'][maxValues.indexOf(item.ventas)]}
                      />
                    )}
                  </td>
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{item.igv ? formatCurrency(item.igv) : '--'}</td>
                  <td className="py-2 px-3">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-1 text-xs font-semibold">{item.comprobantes}</span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full h-[250px] flex items-center justify-center bg-white dark:bg-gray-800 p-0 m-0 mt-16">
          <ResponsiveContainer width="85%" height={288}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(156 163 175)" />
              <XAxis dataKey="fecha" tick={{ fill: 'currentColor' }} tickFormatter={formatShortLabelFromString} />
              <YAxis
                ticks={[0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]}
                domain={[0, 5000]}
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value: number) => value.toLocaleString('es-PE').replace(/,/g, ' ')}
              />
              <RechartsTooltip
                content={(props: { active?: boolean; payload?: Array<{ payload: VentaDiaria }> }) => {
                  const { active, payload } = props;
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-600 text-sm min-w-[180px]">
                        <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1">Fecha: {item.fecha}</div>
                        <div className="mb-1 text-gray-900 dark:text-gray-100">Total de ventas: <span className="font-bold">{formatCurrency(item.ventas)}</span></div>
                        <div className="text-gray-900 dark:text-gray-100">Nº de comprobantes: <span className="font-bold text-blue-700 dark:text-blue-400">{item.comprobantes}</span></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="ventas" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DetalleVentasDiariasCard;
