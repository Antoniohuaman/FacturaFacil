// src/features/inventario/components/panels/AlertsPanel.tsx

import React, { useState } from 'react';
import type { StockAlert } from '../../models';

interface AlertsPanelProps {
  alertas: StockAlert[];
  onReabastecerProducto?: (productoId: string, cantidadSugerida: number) => void;
  onProgramarCompra?: (productoId: string, cantidadSugerida: number) => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alertas, onReabastecerProducto, onProgramarCompra }) => {
  const [showOrdenCompraModal, setShowOrdenCompraModal] = useState(false);
  const [ordenCompraGenerada, setOrdenCompraGenerada] = useState(false);

  const getAlertIcon = (estado: StockAlert['estado']) => {
    switch (estado) {
      case 'CRITICO':
        return (
          <svg className="w-6 h-6 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'BAJO':
        return (
          <svg className="w-6 h-6 text-yellow-500 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAlertBadge = (estado: StockAlert['estado']) => {
    const styles = {
      CRITICO: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
      BAJO: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
      NORMAL: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
      EXCESO: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
    };

    const labels = {
      CRITICO: 'Stock Crítico',
      BAJO: 'Stock Bajo',
      NORMAL: 'Stock Normal',
      EXCESO: 'Exceso de Stock'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[estado]}`}>
        {labels[estado]}
      </span>
    );
  };

  const alertasCriticas = alertas.filter(a => a.estado === 'CRITICO');
  const alertasBajas = alertas.filter(a => a.estado === 'BAJO');

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-red-50 to-yellow-50 dark:from-red-900/20 dark:to-yellow-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">
                Alertas de Stock Activas
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {alertasCriticas.length} productos en estado crítico, {alertasBajas.length} con stock bajo
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setShowOrdenCompraModal(true);
              }}
              className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md transition-colors"
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
                reporte += `Total de alertas: ${alertas.length}\n`;
                reporte += `Críticas: ${alertas.filter(a => a.estado === 'CRITICO').length}\n`;
                reporte += `Stock Bajo: ${alertas.filter(a => a.estado === 'BAJO').length}\n\n`;
                reporte += `DETALLE:\n`;
                alertas.forEach((a, i) => {
                  reporte += `\n${i + 1}. ${a.productoNombre}\n`;
                  reporte += `   Código: ${a.productoCodigo}\n`;
                  reporte += `   Stock Actual: ${a.cantidadActual}\n`;
                  reporte += `   Stock Mínimo: ${a.stockMinimo}\n`;
                  reporte += `   Faltante: ${a.stockMinimo - a.cantidadActual}\n`;
                });

                const blob = new Blob([reporte], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `alertas-stock-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Exportar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {alertasCriticas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-700">
          <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-700">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Alertas Críticas ({alertasCriticas.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {alertasCriticas.map((alerta) => (
              <div key={alerta.productoId} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alerta.estado)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-200">
                          {alerta.productoNombre}
                        </h4>
                        {getAlertBadge(alerta.estado)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mb-3">
                        Código: {alerta.productoCodigo}
                      </p>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Stock Actual:</span>
                          <span className="ml-2 font-semibold text-red-600 dark:text-red-400">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Stock Mínimo:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-200">{alerta.stockMinimo}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Faltante:</span>
                          <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                            {alerta.stockMinimo - alerta.cantidadActual}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-6">
                    <button
                      onClick={() => {
                        const cantidadSugerida = alerta.stockMinimo - alerta.cantidadActual;
                        if (onReabastecerProducto) {
                          onReabastecerProducto(alerta.productoId, cantidadSugerida);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                      title={`Reabastecer ${alerta.productoNombre} (${alerta.stockMinimo - alerta.cantidadActual} unidades)`}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-700">
          <div className="px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Stock Bajo ({alertasBajas.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {alertasBajas.map((alerta) => (
              <div key={alerta.productoId} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alerta.estado)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-200">
                          {alerta.productoNombre}
                        </h4>
                        {getAlertBadge(alerta.estado)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mb-3">
                        Código: {alerta.productoCodigo}
                      </p>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Stock Actual:</span>
                          <span className="ml-2 font-semibold text-yellow-600 dark:text-yellow-400">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Stock Mínimo:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-gray-200">{alerta.stockMinimo}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Faltante:</span>
                          <span className="ml-2 font-semibold text-yellow-600 dark:text-yellow-400">
                            {alerta.stockMinimo - alerta.cantidadActual}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-6">
                    <button
                      onClick={() => {
                        const cantidadSugerida = alerta.stockMinimo - alerta.cantidadActual;
                        if (onProgramarCompra) {
                          onProgramarCompra(alerta.productoId, cantidadSugerida);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-md transition-colors"
                      title={`Programar compra de ${alerta.productoNombre} (${alerta.stockMinimo - alerta.cantidadActual} unidades)`}
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

      {/* Empty State */}
      {alertas.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-200 mb-2">
              ¡Excelente! No hay alertas de stock
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
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
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Producto</th>
                            <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Código</th>
                            <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Stock Actual</th>
                            <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Stock Mínimo</th>
                            <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 pb-2">Cantidad a Pedir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {alertas.map((alerta) => (
                            <tr key={alerta.productoId}>
                              <td className="py-2 text-sm text-gray-900 dark:text-gray-200">{alerta.productoNombre}</td>
                              <td className="py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{alerta.productoCodigo}</td>
                              <td className="py-2 text-sm text-right text-red-600 dark:text-red-400 font-semibold">{alerta.cantidadActual}</td>
                              <td className="py-2 text-sm text-right text-gray-900 dark:text-gray-200">{alerta.stockMinimo}</td>
                              <td className="py-2 text-sm text-right text-green-600 dark:text-green-400 font-semibold">
                                {alerta.stockMinimo - alerta.cantidadActual}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                        ordenCompra += `Total de productos: ${alertas.length}\n\n`;
                        ordenCompra += `DETALLE DE PRODUCTOS:\n`;
                        ordenCompra += `===========================================\n\n`;

                        alertas.forEach((a, i) => {
                          const cantidadPedir = a.stockMinimo - a.cantidadActual;
                          ordenCompra += `${i + 1}. ${a.productoNombre}\n`;
                          ordenCompra += `   Código: ${a.productoCodigo}\n`;
                          ordenCompra += `   Stock Actual: ${a.cantidadActual}\n`;
                          ordenCompra += `   Stock Mínimo: ${a.stockMinimo}\n`;
                          ordenCompra += `   CANTIDAD A PEDIR: ${cantidadPedir}\n`;
                          if (a.establishmentCodigo) {
                            ordenCompra += `   Establecimiento: ${a.establishmentCodigo} - ${a.establishmentNombre || ''}\n`;
                          }
                          ordenCompra += `\n`;
                        });

                        ordenCompra += `===========================================\n`;
                        ordenCompra += `RESUMEN:\n`;
                        ordenCompra += `Total de artículos diferentes: ${alertas.length}\n`;
                        ordenCompra += `Cantidad total a ordenar: ${alertas.reduce((sum, a) => sum + (a.stockMinimo - a.cantidadActual), 0)}\n`;
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
