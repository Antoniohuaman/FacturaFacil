import { CreditCard } from 'lucide-react';
import type { FormaPagoDistribucionItem } from '../models/indicadores';
import { formatCurrency } from '../utils/formatters';

interface FormasPagoCardProps {
  data: FormaPagoDistribucionItem[];
}

const barColors = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

const FormasPagoCard: React.FC<FormasPagoCardProps> = ({ data }) => {
  const hasData = data.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Distribución por Forma de Pago</h3>
        <CreditCard className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </div>

      {hasData ? (
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.comprobantes} comprobantes</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(item.monto)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.porcentaje.toFixed(1)}%</p>
                </div>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full mt-2">
                <div className={`h-2 rounded-full ${barColors[index % barColors.length]}`} style={{ width: `${item.porcentaje}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay formas de pago registradas para el periodo seleccionado.</p>
      )}
    </div>
  );
};

export default FormasPagoCard;
