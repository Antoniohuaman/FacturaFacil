import type { ReactNode } from 'react';
import type { RankingItem } from '../models/indicadores';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface RankingCardProps {
  title: string;
  icon: ReactNode;
  items: RankingItem[];
  valueFormatter?: (value: number, item: RankingItem) => string;
}

const RankingCard: React.FC<RankingCardProps> = ({ title, icon, items, valueFormatter }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-0">
    <div className="flex items-center justify-between px-6 pt-6 pb-2">
      <div className="flex items-center gap-2">
        <span className="text-lg text-gray-700 dark:text-gray-300">{icon}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{title}</span>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">Montos</span>
    </div>
    <div className="px-6 pb-4">
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-3">Sin datos disponibles para este ranking.</p>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-blue-700' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              >
                {index + 1}
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{item.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.info}
                  <span
                    className={`font-semibold ml-1 ${item.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}
                    aria-label={item.trend === 'up' ? 'Tendencia al alza' : 'Tendencia a la baja'}
                  >
                    {formatPercentage(item.changePercentage)}
                  </span>
                </div>
              </div>
            </div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">
              {valueFormatter ? valueFormatter(item.amount, item) : formatCurrency(item.amount)}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export default RankingCard;
