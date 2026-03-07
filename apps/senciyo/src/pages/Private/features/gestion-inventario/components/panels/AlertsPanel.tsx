// src/features/inventario/components/panels/AlertsPanel.tsx

import React, { useMemo, useState } from 'react';
import type { StockAlert } from '../../models';
import { evaluateStockAlert } from '../../utils/stockAlerts';
import type { StockAlertEvaluation } from '../../utils/stockAlerts';

interface AlertsPanelProps {
  alertas: StockAlert[];
  onReabastecerProducto?: (productoId: string, cantidadSugerida: number) => void;
  onProgramarCompra?: (productoId: string, cantidadSugerida: number) => void;
}

interface DecoratedAlert {
  alerta: StockAlert;
  evaluation: StockAlertEvaluation;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alertas, onReabastecerProducto, onProgramarCompra }) => {
  const [showOrdenCompraModal, setShowOrdenCompraModal] = useState(false);
  const [ordenCompraGenerada, setOrdenCompraGenerada] = useState(false);

  const getAlertIcon = (estado: StockAlert['estado']) => {
    switch (estado) {
      case 'CRITICO':
        return (
          <svg className="w-6 h-6 text-[#EF4444] dark:text-[#F87171]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'BAJO':
        return (
          <svg className="w-6 h-6 text-[#D97706] dark:text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAlertBadge = (estado: StockAlert['estado']) => {
    const styles = {
      CRITICO: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 dark:bg-[#EF4444]/15 dark:text-[#F87171] dark:border-[#EF4444]/40',
      BAJO: 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30 dark:bg-[#D97706]/15 dark:text-[#F59E0B] dark:border-[#D97706]/40',
      NORMAL: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 dark:bg-[#10B981]/15 dark:text-[#34D399] dark:border-[#10B981]/40',
      EXCESO: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30 dark:bg-[#3B82F6]/15 dark:text-[#60A5FA] dark:border-[#3B82F6]/40'
    };

    const labels = {
      CRITICO: 'Stock Crítico',
      BAJO: 'Stock Bajo',
      NORMAL: 'Stock Normal',
      EXCESO: 'Exceso de Stock'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  const alertasDecoradas = useMemo<DecoratedAlert[]>(() => alertas.map(alerta => ({
    alerta,
    evaluation: evaluateStockAlert({
      disponible: alerta.cantidadActual,
      stockMinimo: alerta.stockMinimo,
      stockMaximo: alerta.stockMaximo
    })
  })), [alertas]);

  const alertasCriticas = alertasDecoradas.filter(({ evaluation }) => evaluation.type === 'LOW' && evaluation.isCritical);
  const alertasBajas = alertasDecoradas.filter(({ evaluation }) => evaluation.type === 'LOW' && !evaluation.isCritical);
  const alertasExceso = alertasDecoradas.filter(({ evaluation }) => evaluation.type === 'OVER');
  const alertasReposicion = [...alertasCriticas, ...alertasBajas];

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-[#EF4444]/10 to-[#D97706]/10 dark:from-[#EF4444]/15 dark:to-[#D97706]/15 border border-[#EF4444]/30 dark:border-[#EF4444]/40 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <svg className="w-10 h-10 text-[#EF4444] dark:text-[#F87171]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#111827] dark:text-gray-100">
                Alertas de Stock Activas
              </h3>
              <p className="text-sm text-[#4B5563] dark:text-gray-400 mt-0.5">
                {alertasCriticas.length} productos en estado crítico, {alertasBajas.length} con stock bajo, {alertasExceso.length} excedidos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowOrdenCompraModal(true);
              }}
              className="h-9 px-4 py-2 text-sm font-medium text-[#EF4444] dark:text-[#F87171] bg-[#EF4444]/10 dark:bg-[#EF4444]/15 hover:bg-[#EF4444]/15 dark:hover:bg-[#EF4444]/20 border border-[#EF4444]/30 dark:border-[#EF4444]/40 rounded-lg transition-all duration-150"
            >
              Generar Orden de Compra
            </button>
            <button
              onClick={() => {
                const fecha = new Intl.DateTimeFormat('es-PE', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(new Date());

                let reporte = `REPORTE DE ALERTAS DE STOCK\nFecha: ${fecha}\n\n`;
                reporte += `Total de alertas: ${alertasDecoradas.length}\n`;
                reporte += `Críticas: ${alertasCriticas.length}\n`;
                reporte += `Stock Bajo: ${alertasBajas.length}\n`;
                reporte += `Excede Máximo: ${alertasExceso.length}\n\n`;
                reporte += `DETALLE:\n`;
                alertasDecoradas.forEach(({ alerta, evaluation }, i) => {
                  reporte += `\n${i + 1}. ${alerta.productoNombre}\n`;
                  reporte += `   Código: ${alerta.productoCodigo}\n`;
                  reporte += `   Disponible: ${alerta.cantidadActual}\n`;
                  if (alerta.stockMinimo > 0) {
                    reporte += `   Stock Mínimo: ${alerta.stockMinimo}\n`;
                  }
                  if (typeof alerta.stockMaximo === 'number') {
                    reporte += `   Stock Máximo: ${alerta.stockMaximo}\n`;
                  }
                  if (evaluation.type === 'LOW' && typeof evaluation.missing === 'number') {
                    reporte += `   Faltante: ${evaluation.missing}\n`;
                  }
                  if (evaluation.type === 'OVER' && typeof evaluation.excess === 'number') {
                    reporte += `   Excedente: ${evaluation.excess}\n`;
                  }
                });

                const blob = new Blob([reporte], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `alertas-stock-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="h-9 px-4 py-2 text-sm font-medium text-[#4B5563] dark:text-gray-300 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-150"
            >
              Exportar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {alertasCriticas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-[#EF4444]/30 dark:border-[#EF4444]/40">
          <div className="px-4 py-2.5 bg-[#EF4444]/10 dark:bg-[#EF4444]/15 border-b border-[#EF4444]/30 dark:border-[#EF4444]/40">
            <h3 className="text-sm font-semibold text-[#EF4444] dark:text-[#F87171] flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Alertas Críticas ({alertasCriticas.length})
            </h3>
          </div>
          <div className="divide-y divide-[#E5E7EB] dark:divide-gray-700">
            {alertasCriticas.map(({ alerta, evaluation }) => (
              <div key={alerta.productoId} className="p-4 hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alerta.estado)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-[#111827] dark:text-gray-100">
                          {alerta.productoNombre}
                        </h4>
                        {getAlertBadge(alerta.estado)}
                      </div>
                      <p className="text-xs text-[#4B5563] dark:text-gray-400 font-mono mb-2">
                        Código: {alerta.productoCodigo}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Stock Disponible:</span>
                          <span className="ml-1.5 font-semibold text-[#EF4444] dark:text-[#F87171] tabular-nums">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Stock Mínimo:</span>
                          <span className="ml-1.5 font-semibold text-[#111827] dark:text-gray-100 tabular-nums">{alerta.stockMinimo}</span>
                        </div>
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Faltante:</span>
                          <span className="ml-1.5 font-semibold text-[#EF4444] dark:text-[#F87171] tabular-nums">
                            {evaluation.missing ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => {
                        const cantidadSugerida = evaluation.missing ?? 0;
                        if (onReabastecerProducto) {
                          onReabastecerProducto(alerta.productoId, cantidadSugerida);
                        }
                      }}
                      className="h-9 px-4 py-2 text-sm font-medium text-white bg-[#EF4444] hover:bg-[#dc2626] rounded-lg transition-all duration-150"
                      title={`Reabastecer ${alerta.productoNombre} (${evaluation.missing ?? 0} unidades)`}
                    >
                      Reabastecer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {alertasBajas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-[#D97706]/30 dark:border-[#D97706]/40">
          <div className="px-4 py-2.5 bg-[#D97706]/10 dark:bg-[#D97706]/15 border-b border-[#D97706]/30 dark:border-[#D97706]/40">
            <h3 className="text-sm font-semibold text-[#D97706] dark:text-[#F59E0B] flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Stock Bajo ({alertasBajas.length})
            </h3>
          </div>
          <div className="divide-y divide-[#E5E7EB] dark:divide-gray-700">
            {alertasBajas.map(({ alerta, evaluation }) => (
              <div key={alerta.productoId} className="p-4 hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alerta.estado)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-[#111827] dark:text-gray-100">
                          {alerta.productoNombre}
                        </h4>
                        {getAlertBadge(alerta.estado)}
                      </div>
                      <p className="text-xs text-[#4B5563] dark:text-gray-400 font-mono mb-2">
                        Código: {alerta.productoCodigo}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Stock Disponible:</span>
                          <span className="ml-1.5 font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Stock Mínimo:</span>
                          <span className="ml-1.5 font-semibold text-[#111827] dark:text-gray-100 tabular-nums">{alerta.stockMinimo}</span>
                        </div>
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Faltante:</span>
                          <span className="ml-1.5 font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">
                            {evaluation.missing ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <button
                      onClick={() => {
                        const cantidadSugerida = evaluation.missing ?? 0;
                        if (onProgramarCompra) {
                          onProgramarCompra(alerta.productoId, cantidadSugerida);
                        }
                      }}
                      className="h-9 px-4 py-2 text-sm font-medium text-[#D97706] dark:text-[#F59E0B] bg-[#D97706]/10 dark:bg-[#D97706]/15 hover:bg-[#D97706]/15 dark:hover:bg-[#D97706]/20 border border-[#D97706]/30 dark:border-[#D97706]/40 rounded-lg transition-all duration-150"
                      title={`Programar compra de ${alerta.productoNombre} (${evaluation.missing ?? 0} unidades)`}
                    >
                      Programar Compra
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overstock Alerts */}
      {alertasExceso.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-[#3B82F6]/30 dark:border-[#3B82F6]/40">
          <div className="px-4 py-2.5 bg-[#3B82F6]/10 dark:bg-[#3B82F6]/15 border-b border-[#3B82F6]/30 dark:border-[#3B82F6]/40">
            <h3 className="text-sm font-semibold text-[#3B82F6] dark:text-[#60A5FA] flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8M5 12a7 7 0 1114 0 7 7 0 01-14 0z" />
              </svg>
              Excede Stock Máximo ({alertasExceso.length})
            </h3>
          </div>
          <div className="divide-y divide-[#E5E7EB] dark:divide-gray-700">
            {alertasExceso.map(({ alerta, evaluation }) => (
              <div key={alerta.productoId} className="p-4 hover:bg-[#3B82F6]/5 dark:hover:bg-[#3B82F6]/8 transition-colors duration-150">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getAlertIcon('EXCESO')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-[#111827] dark:text-gray-100">
                        {alerta.productoNombre}
                      </h4>
                      {getAlertBadge('EXCESO')}
                    </div>
                    <p className="text-xs text-[#4B5563] dark:text-gray-400 font-mono mb-2">
                      Código: {alerta.productoCodigo}
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-[#4B5563] dark:text-gray-400">Stock Disponible:</span>
                        <span className="ml-1.5 font-semibold text-[#3B82F6] dark:text-[#60A5FA] tabular-nums">{alerta.cantidadActual}</span>
                      </div>
                      {typeof alerta.stockMaximo === 'number' && (
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Stock Máximo:</span>
                          <span className="ml-1.5 font-semibold text-[#111827] dark:text-gray-100 tabular-nums">{alerta.stockMaximo}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[#4B5563] dark:text-gray-400">Excedente:</span>
                        <span className="ml-1.5 font-semibold text-[#3B82F6] dark:text-[#60A5FA] tabular-nums">
                          {evaluation.excess ?? 0}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-[#4B5563] dark:text-gray-400">
                      Reduce inventario mediante ajustes o transferencias para liberar espacio en almacén.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alertasDecoradas.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-gray-700 p-12">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-[#10B981] dark:text-[#34D399]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-base font-semibold text-[#111827] dark:text-gray-100 mt-4 mb-2">
              ¡Excelente! No hay alertas de stock
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-gray-400">
              Todos tus productos tienen niveles de stock adecuados
            </p>
          </div>
        </div>
      )}

      {/* Modal de Orden de Compra */}
      {showOrdenCompraModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
              onClick={() => {
                if (ordenCompraGenerada) {
                  setShowOrdenCompraModal(false);
                  setOrdenCompraGenerada(false);
                }
              }}
            />

            <div className="relative inline-block w-full max-w-3xl my-8 overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all transform">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-200 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    {ordenCompraGenerada ? 'Orden de Compra Generada' : 'Generar Orden de Compra'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowOrdenCompraModal(false);
                      setOrdenCompraGenerada(false);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 max-h-96 overflow-y-auto">
                {!ordenCompraGenerada ? (
                  <>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Se generará una orden de compra para los siguientes productos con alertas de stock:
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                      {alertasReposicion.length > 0 ? (
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Producto</th>
                              <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Código</th>
                              <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Disponible</th>
                              <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Stock Mínimo</th>
                              <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Cantidad a Pedir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {alertasReposicion.map(({ alerta, evaluation }) => (
                              <tr key={alerta.productoId}>
                                <td className="py-2 text-sm text-gray-900 dark:text-gray-200">{alerta.productoNombre}</td>
                                <td className="py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{alerta.productoCodigo}</td>
                                <td className="py-2 text-sm text-right text-red-600 dark:text-red-400 font-semibold">{alerta.cantidadActual}</td>
                                <td className="py-2 text-sm text-right text-gray-900 dark:text-gray-200">{alerta.stockMinimo}</td>
                                <td className="py-2 text-sm text-right text-green-600 dark:text-green-400 font-semibold">
                                  {evaluation.missing ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">No hay productos con stock bajo para reabastecer.</p>
                      )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Información</p>
                          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Esta funcionalidad se integrará con el módulo de compras cuando esté disponible.
                            Por ahora, se generará un archivo de texto con los detalles de la orden.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-16 w-16 text-green-500 dark:text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-2">
                      ¡Orden de Compra Generada!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Se ha descargado el archivo con los detalles de la orden de compra
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                {!ordenCompraGenerada ? (
                  <>
                    <button
                      onClick={() => {
                        setShowOrdenCompraModal(false);
                        setOrdenCompraGenerada(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const fecha = new Intl.DateTimeFormat('es-PE', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).format(new Date());

                        let ordenCompra = `ORDEN DE COMPRA - REABASTECIMIENTO\n`;
                        ordenCompra += `Fecha: ${fecha}\n`;
                        ordenCompra += `===========================================\n\n`;
                        ordenCompra += `Total de productos: ${alertasReposicion.length}\n\n`;
                        ordenCompra += `DETALLE DE PRODUCTOS:\n`;
                        ordenCompra += `===========================================\n\n`;

                        alertasReposicion.forEach(({ alerta, evaluation }, i) => {
                          const cantidadPedir = evaluation.missing ?? 0;
                          ordenCompra += `${i + 1}. ${alerta.productoNombre}\n`;
                          ordenCompra += `   Código: ${alerta.productoCodigo}\n`;
                          ordenCompra += `   Stock Disponible: ${alerta.cantidadActual}\n`;
                          ordenCompra += `   Stock Mínimo: ${alerta.stockMinimo}\n`;
                          ordenCompra += `   CANTIDAD A PEDIR: ${cantidadPedir}\n`;
                          if (alerta.EstablecimientoCodigo) {
                            ordenCompra += `   Establecimiento: ${alerta.EstablecimientoCodigo} - ${alerta.EstablecimientoNombre || ''}\n`;
                          }
                          ordenCompra += `\n`;
                        });

                        ordenCompra += `===========================================\n`;
                        ordenCompra += `RESUMEN:\n`;
                        ordenCompra += `Total de artículos diferentes: ${alertasReposicion.length}\n`;
                        ordenCompra += `Cantidad total a ordenar: ${alertasReposicion.reduce((sum, { evaluation }) => sum + (evaluation.missing ?? 0), 0)}\n`;
                        ordenCompra += `===========================================\n\n`;
                        ordenCompra += `Generado automáticamente por FacturaFácil\n`;
                        ordenCompra += `Sistema de Gestión de Inventario\n`;

                        const blob = new Blob([ordenCompra], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `orden-compra-${Date.now()}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);

                        setOrdenCompraGenerada(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      Generar Orden
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowOrdenCompraModal(false);
                      setOrdenCompraGenerada(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
