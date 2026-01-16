/**
 * StatsCards - Tarjetas de estadísticas de comprobantes
 * Muestra totales, ventas y contadores por estado
 * Diseño: Coincide EXACTAMENTE con el diseño actual de ListaComprobantes.tsx
 */

import { FileText, CheckCircle2, Send, AlertTriangle, XOctagon, Ban, ChevronDown } from 'lucide-react';

interface StatsCardsProps {
  totalComprobantes: number;
  totalVentas: number;
  enviados: number;
  aceptados: number;
  porCorregir: number;
  rechazados: number;
  anulados: number;
  showTotals: boolean;
  onToggleTotals: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalComprobantes,
  totalVentas,
  enviados,
  aceptados,
  porCorregir,
  rechazados,
  anulados,
  showTotals,
  onToggleTotals
}) => {
  if (!showTotals) return null;

  return (
    <div
      className="mt-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md"
      role="region"
      aria-labelledby="totals-heading"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 id="totals-heading" className="text-base font-semibold text-gray-900 dark:text-white">
            Resumen de totales
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Actualizado en tiempo real
          </p>
        </div>
        <button
          onClick={onToggleTotals}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
          aria-expanded={showTotals}
          aria-controls="totals-content"
          aria-label="Ocultar resumen de totales"
        >
          <span className="font-medium">Ocultar</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div id="totals-content" className="p-5">
        {/* Main Cards - Siempre visibles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Total Comprobantes */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {totalComprobantes}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total comprobantes
            </div>
          </div>

          {/* Total Ventas - Destacado */}
          <div className="bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              S/ {totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total ventas
            </div>
          </div>

          {/* Enviados */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {enviados}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Enviados
            </div>
          </div>

          {/* Aceptados */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {aceptados}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Aceptados
            </div>
          </div>

          {/* Por Corregir */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {porCorregir}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Por corregir
            </div>
          </div>

          {/* Rechazados */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
            <div className="flex items-start justify-between mb-3">
              <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {rechazados}
            </div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Rechazados
            </div>
          </div>
        </div>

        {/* Secondary Card - Anulados (segunda fila si es necesario) */}
        {anulados > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-start justify-between mb-3">
                <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Ban className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                {anulados}
              </div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Anulados
              </div>
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {totalComprobantes === 0 && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            Sin datos para este rango
          </div>
        )}
      </div>
    </div>
  );
};
