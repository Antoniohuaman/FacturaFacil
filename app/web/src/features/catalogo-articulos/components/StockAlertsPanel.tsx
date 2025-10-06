// src/features/catalogo-articulos/components/StockAlertsPanel.tsx

import React from 'react';
import type { StockAlert } from '../models/types';

interface StockAlertsPanelProps {
  alertas: StockAlert[];
}

const StockAlertsPanel: React.FC<StockAlertsPanelProps> = ({ alertas }) => {
  const getAlertIcon = (estado: StockAlert['estado']) => {
    switch (estado) {
      case 'CRITICO':
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'BAJO':
        return (
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getAlertBadge = (estado: StockAlert['estado']) => {
    const styles = {
      CRITICO: 'bg-red-100 text-red-800 border-red-200',
      BAJO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      NORMAL: 'bg-green-100 text-green-800 border-green-200',
      EXCESO: 'bg-blue-100 text-blue-800 border-blue-200'
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
      <div className="bg-gradient-to-r from-red-50 to-yellow-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Alertas de Stock Activas
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {alertasCriticas.length} productos en estado crítico, {alertasBajas.length} con stock bajo
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => {
                const productosAlerta = alertas.map(a => a.productoNombre).join(', ');
                alert(`🛒 ORDEN DE COMPRA\n\nProductos a reabastecer:\n${productosAlerta}\n\n✅ Funcionalidad lista para integración con módulo de compras`);
              }}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
            >
              Exportar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {alertasCriticas.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-red-200">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Alertas Críticas ({alertasCriticas.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alertasCriticas.map((alerta) => (
              <div key={alerta.productoId} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alerta.estado)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-base font-semibold text-gray-900">
                          {alerta.productoNombre}
                        </h4>
                        {getAlertBadge(alerta.estado)}
                      </div>
                      <p className="text-sm text-gray-600 font-mono mb-3">
                        Código: {alerta.productoCodigo}
                      </p>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-500">Stock Actual:</span>
                          <span className="ml-2 font-semibold text-red-600">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stock Mínimo:</span>
                          <span className="ml-2 font-semibold text-gray-900">{alerta.stockMinimo}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Faltante:</span>
                          <span className="ml-2 font-semibold text-red-600">
                            {alerta.stockMinimo - alerta.cantidadActual}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-6">
                    <button 
                      onClick={() => {
                        alert(`🔄 REABASTECER PRODUCTO\n\n${alerta.productoNombre}\nCódigo: ${alerta.productoCodigo}\n\nCantidad sugerida: ${alerta.stockMinimo - alerta.cantidadActual}\n\n✅ Esta acción abrirá el modal de ajuste de stock`);
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      Reabastecer
                    </button>
                    <button 
                      onClick={() => {
                        alert(`📋 OPCIONES\n\n• Ver historial de movimientos\n• Editar stock mínimo\n• Ver detalles del producto\n• Configurar alertas`);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
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
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200">
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Stock Bajo ({alertasBajas.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alertasBajas.map((alerta) => (
              <div key={alerta.productoId} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alerta.estado)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-base font-semibold text-gray-900">
                          {alerta.productoNombre}
                        </h4>
                        {getAlertBadge(alerta.estado)}
                      </div>
                      <p className="text-sm text-gray-600 font-mono mb-3">
                        Código: {alerta.productoCodigo}
                      </p>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <span className="text-gray-500">Stock Actual:</span>
                          <span className="ml-2 font-semibold text-yellow-600">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stock Mínimo:</span>
                          <span className="ml-2 font-semibold text-gray-900">{alerta.stockMinimo}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Faltante:</span>
                          <span className="ml-2 font-semibold text-yellow-600">
                            {alerta.stockMinimo - alerta.cantidadActual}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-6">
                    <button 
                      onClick={() => {
                        alert(`📅 PROGRAMAR COMPRA\n\n${alerta.productoNombre}\nCódigo: ${alerta.productoCodigo}\n\nCantidad sugerida: ${alerta.stockMinimo - alerta.cantidadActual}\n\n✅ Esta acción programará una orden de compra`);
                      }}
                      className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors"
                    >
                      Programar Compra
                    </button>
                    <button 
                      onClick={() => {
                        alert(`📋 OPCIONES\n\n• Ver historial de movimientos\n• Editar stock mínimo\n• Ver detalles del producto\n• Configurar alertas`);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ¡Excelente! No hay alertas de stock
            </h3>
            <p className="text-gray-600">
              Todos tus productos tienen niveles de stock adecuados
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlertsPanel;
