// src/features/gestion-inventario/components/disponibilidad/DisponibilidadKPIs.tsx

import React from 'react';

interface KPIData {
  totalProductos: number;
  totalDisponible: number;
  sinStock: number;
  stockBajo: number;
  stockCritico: number;
  totalReal: number;
  valorTotal: number;
}

interface DisponibilidadKPIsProps {
  data: KPIData;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFilterSinStock: () => void;
  onFilterBajo: () => void;
  onFilterCritico: () => void;
}

const DisponibilidadKPIs: React.FC<DisponibilidadKPIsProps> = ({
  data,
  isCollapsed,
  onToggleCollapse,
  onFilterSinStock,
  onFilterBajo,
  onFilterCritico
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header con toggle - MÁS COMPACTO */}
      <button
        onClick={onToggleCollapse}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? 'Expandir resumen rápido' : 'Colapsar resumen rápido'}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-90'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Resumen rápido
          </span>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          {isCollapsed ? 'Expandir' : 'Colapsar'}
        </span>
      </button>

      {/* KPIs en pills compactas - ALTURA MÁXIMA 56px */}
      {!isCollapsed && (
        <div className="px-4 pb-2.5 pt-1 flex flex-wrap items-center gap-2 max-h-[44px]">
          {/* Total Productos */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full">
            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7v10l8 4" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400">Productos:</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{data.totalProductos}</span>
          </div>

          {/* Stock Total */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full">
            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400">Stock real:</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{data.totalReal.toLocaleString()}</span>
          </div>

          {/* Disponible */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
            <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-green-700 dark:text-green-400">Disponible:</span>
            <span className="text-xs font-semibold text-green-900 dark:text-green-300">{data.totalDisponible.toLocaleString()}</span>
          </div>

          {/* Valor Total */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full">
            <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400">Valor:</span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              S/ {data.valorTotal.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Sin Stock - ACCIONABLE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFilterSinStock();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
            title="Clic para filtrar productos sin stock"
          >
            <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs text-red-700 dark:text-red-400">Sin stock:</span>
            <span className="text-xs font-semibold text-red-900 dark:text-red-300">{data.sinStock}</span>
          </button>

          {/* Stock Crítico - ACCIONABLE */}
          {data.stockCritico > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFilterCritico();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors cursor-pointer"
              title="Clic para filtrar productos con stock crítico"
            >
              <svg className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-orange-700 dark:text-orange-400">Crítico:</span>
              <span className="text-xs font-semibold text-orange-900 dark:text-orange-300">{data.stockCritico}</span>
            </button>
          )}

          {/* Stock Bajo - ACCIONABLE */}
          {data.stockBajo > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFilterBajo();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer"
              title="Clic para filtrar productos con stock bajo"
            >
              <svg className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              <span className="text-xs text-yellow-700 dark:text-yellow-400">Bajo:</span>
              <span className="text-xs font-semibold text-yellow-900 dark:text-yellow-300">{data.stockBajo}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DisponibilidadKPIs;
