import React from 'react';
import { AlertTriangle, Clock, Edit, FileText } from 'lucide-react';

export interface DraftStats {
  vigentes: number;
  porVencer: number;
  vencidos: number;
  totalValue: number;
}

interface DraftsStatsCardsProps {
  stats: DraftStats;
}

export const DraftsStatsCards: React.FC<DraftsStatsCardsProps> = ({ stats }) => {
  const { vigentes, porVencer, vencidos, totalValue } = stats;

  return (
    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {vigentes}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Vigentes
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Edit className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {porVencer}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Por Vencer (24h)
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {vencidos}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Vencidos
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                S/ {totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Valor Total
              </div>
            </div>
            <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
