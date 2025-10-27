/**
 * StatsCards - Tarjetas de estadísticas de comprobantes
 * Muestra totales, ventas y contadores por estado
 */

import { FileText, DollarSign, CheckCircle2, Send, AlertTriangle, XOctagon, Ban } from 'lucide-react';

interface StatsCardsProps {
  totalComprobantes: number;
  totalVentas: number;
  enviados: number;
  aceptados: number;
  porCorregir: number;
  rechazados: number;
  anulados: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalComprobantes,
  totalVentas,
  enviados,
  aceptados,
  porCorregir,
  rechazados,
  anulados
}) => {
  return (
    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Total Comprobantes */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Comprobantes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalComprobantes}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Total Ventas */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Ventas</p>
              <p className="text-2xl font-bold text-green-600">S/ {totalVentas.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Enviados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Enviados</p>
              <p className="text-2xl font-bold text-blue-600">{enviados}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Aceptados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Aceptados</p>
              <p className="text-2xl font-bold text-green-600">{aceptados}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        {/* Por Corregir */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Por Corregir</p>
              <p className="text-2xl font-bold text-orange-600">{porCorregir}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Rechazados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Rechazados</p>
              <p className="text-2xl font-bold text-red-600">{rechazados}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <XOctagon className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        {/* Anulados */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Anulados</p>
              <p className="text-2xl font-bold text-gray-600">{anulados}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/40 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
