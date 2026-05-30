// src/features/inventario/components/panels/AlertsPanel.tsx

import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import type { StockAlert } from '../../models';
import { getBusinessTodayISODate } from '@/shared/time/businessTime';

interface AlertsPanelProps {
  alertas: StockAlert[];
  onReabastecerProducto?: (productoId: string, cantidadSugerida: number) => void;
}

const ESTADO_LABEL: Record<StockAlert['estado'], string> = {
  SIN_STOCK: 'Sin stock',
  CRITICO: 'Stock Crítico',
  BAJO: 'Stock Bajo',
  NORMAL: 'Stock Normal',
  EXCESO: 'Exceso de Stock',
};

const getAlertIcon = (estado: StockAlert['estado']) => {
  if (estado === 'SIN_STOCK' || estado === 'CRITICO') {
    return (
      <svg className="w-6 h-6 text-[#EF4444] dark:text-[#F87171]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  if (estado === 'BAJO') {
    return (
      <svg className="w-6 h-6 text-[#D97706] dark:text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  return null;
};

const getAlertBadge = (estado: StockAlert['estado']) => {
  const styles: Record<StockAlert['estado'], string> = {
    SIN_STOCK: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 dark:bg-[#EF4444]/15 dark:text-[#F87171] dark:border-[#EF4444]/40',
    CRITICO: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 dark:bg-[#EF4444]/15 dark:text-[#F87171] dark:border-[#EF4444]/40',
    BAJO: 'bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30 dark:bg-[#D97706]/15 dark:text-[#F59E0B] dark:border-[#D97706]/40',
    NORMAL: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 dark:bg-[#10B981]/15 dark:text-[#34D399] dark:border-[#10B981]/40',
    EXCESO: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30 dark:bg-[#3B82F6]/15 dark:text-[#60A5FA] dark:border-[#3B82F6]/40',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alertas, onReabastecerProducto }) => {
  // Categorizar usando los campos ya calculados por generateAlerts (sin doble evaluación)
  const alertasCriticasYSinStock = useMemo(
    () => alertas.filter(a => a.estado === 'SIN_STOCK' || a.estado === 'CRITICO'),
    [alertas]
  );
  const alertasBajas = useMemo(
    () => alertas.filter(a => a.estado === 'BAJO'),
    [alertas]
  );
  const alertasExceso = useMemo(
    () => alertas.filter(a => a.estado === 'EXCESO'),
    [alertas]
  );

  const handleExportarAlertas = () => {
    const data = alertas.map(a => ({
      'Producto':           a.productoNombre,
      'Código Producto':    a.productoCodigo,
      'Almacén':            a.almacenNombre,
      'Código Almacén':     a.almacenCodigo,
      'Establecimiento':    a.EstablecimientoNombre,
      'Stock Real':         a.cantidadReal ?? a.cantidadActual,
      'Stock Reservado':    a.cantidadReservada ?? 0,
      'Stock Disponible':   a.cantidadActual,
      'Stock Mínimo':       a.stockMinimo || '',
      'Stock Máximo':       a.stockMaximo ?? '',
      'Faltante':           a.faltante ?? '',
      'Excedente':          a.excedente ?? '',
      'Estado':             ESTADO_LABEL[a.estado] ?? a.estado,
      'Es Crítico':         a.isCritical ? 'Sí' : 'No',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 30 }, // Producto
      { wch: 15 }, // Código Producto
      { wch: 25 }, // Almacén
      { wch: 14 }, // Código Almacén
      { wch: 28 }, // Establecimiento
      { wch: 12 }, // Stock Real
      { wch: 14 }, // Stock Reservado
      { wch: 16 }, // Stock Disponible
      { wch: 14 }, // Stock Mínimo
      { wch: 14 }, // Stock Máximo
      { wch: 10 }, // Faltante
      { wch: 10 }, // Excedente
      { wch: 16 }, // Estado
      { wch: 10 }, // Es Crítico
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alertas');
    XLSX.writeFile(wb, `alertas_stock_${getBusinessTodayISODate()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Banner resumen */}
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
                {alertasCriticasYSinStock.length} sin stock o críticos
                {' · '}
                {alertasBajas.length} con stock bajo
                {' · '}
                {alertasExceso.length} excedidos
              </p>
            </div>
          </div>
          <button
            onClick={handleExportarAlertas}
            disabled={alertas.length === 0}
            className="h-9 px-4 py-2 text-sm font-medium text-[#4B5563] dark:text-gray-300 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-150"
          >
            Exportar alertas
          </button>
        </div>
      </div>

      {/* Sin stock / Críticos */}
      {alertasCriticasYSinStock.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-[#EF4444]/30 dark:border-[#EF4444]/40">
          <div className="px-4 py-2.5 bg-[#EF4444]/10 dark:bg-[#EF4444]/15 border-b border-[#EF4444]/30 dark:border-[#EF4444]/40">
            <h3 className="text-sm font-semibold text-[#EF4444] dark:text-[#F87171] flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Sin stock / Críticos ({alertasCriticasYSinStock.length})
            </h3>
          </div>
          <div className="divide-y divide-[#E5E7EB] dark:divide-gray-700">
            {alertasCriticasYSinStock.map(alerta => (
              <div key={`${alerta.productoId}-${alerta.almacenId}`} className="p-4 hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150">
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
                        {alerta.productoCodigo}
                        {' · '}
                        {alerta.almacenNombre}
                        {alerta.EstablecimientoNombre && ` · ${alerta.EstablecimientoNombre}`}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Disponible:</span>
                          <span className="ml-1.5 font-semibold text-[#EF4444] dark:text-[#F87171] tabular-nums">{alerta.cantidadActual}</span>
                        </div>
                        {alerta.stockMinimo > 0 && (
                          <div>
                            <span className="text-[#4B5563] dark:text-gray-400">Mínimo:</span>
                            <span className="ml-1.5 font-semibold text-[#111827] dark:text-gray-100 tabular-nums">{alerta.stockMinimo}</span>
                          </div>
                        )}
                        {typeof alerta.faltante === 'number' && alerta.faltante > 0 && (
                          <div>
                            <span className="text-[#4B5563] dark:text-gray-400">Faltante:</span>
                            <span className="ml-1.5 font-semibold text-[#EF4444] dark:text-[#F87171] tabular-nums">{alerta.faltante}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {onReabastecerProducto && (
                    <div className="flex items-center gap-2 ml-6">
                      <button
                        onClick={() => onReabastecerProducto(alerta.productoId, alerta.faltante ?? 0)}
                        className="h-9 px-4 py-2 text-sm font-medium text-white bg-[#EF4444] hover:bg-[#dc2626] rounded-lg transition-all duration-150"
                      >
                        Ajustar stock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Bajo */}
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
            {alertasBajas.map(alerta => (
              <div key={`${alerta.productoId}-${alerta.almacenId}`} className="p-4 hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150">
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
                        {alerta.productoCodigo}
                        {' · '}
                        {alerta.almacenNombre}
                        {alerta.EstablecimientoNombre && ` · ${alerta.EstablecimientoNombre}`}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Disponible:</span>
                          <span className="ml-1.5 font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">{alerta.cantidadActual}</span>
                        </div>
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Mínimo:</span>
                          <span className="ml-1.5 font-semibold text-[#111827] dark:text-gray-100 tabular-nums">{alerta.stockMinimo}</span>
                        </div>
                        {typeof alerta.faltante === 'number' && (
                          <div>
                            <span className="text-[#4B5563] dark:text-gray-400">Faltante:</span>
                            <span className="ml-1.5 font-semibold text-[#D97706] dark:text-[#F59E0B] tabular-nums">{alerta.faltante}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {onReabastecerProducto && (
                    <div className="flex items-center gap-2 ml-6">
                      <button
                        onClick={() => onReabastecerProducto(alerta.productoId, alerta.faltante ?? 0)}
                        className="h-9 px-4 py-2 text-sm font-medium text-[#D97706] dark:text-[#F59E0B] bg-[#D97706]/10 dark:bg-[#D97706]/15 hover:bg-[#D97706]/15 dark:hover:bg-[#D97706]/20 border border-[#D97706]/30 dark:border-[#D97706]/40 rounded-lg transition-all duration-150"
                      >
                        Ajustar stock
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Excede Stock Máximo */}
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
            {alertasExceso.map(alerta => (
              <div key={`${alerta.productoId}-${alerta.almacenId}`} className="p-4 hover:bg-[#3B82F6]/5 dark:hover:bg-[#3B82F6]/8 transition-colors duration-150">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getAlertIcon('EXCESO')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-[#111827] dark:text-gray-100">
                        {alerta.productoNombre}
                      </h4>
                      {getAlertBadge(alerta.estado)}
                    </div>
                    <p className="text-xs text-[#4B5563] dark:text-gray-400 font-mono mb-2">
                      {alerta.productoCodigo}
                      {' · '}
                      {alerta.almacenNombre}
                      {alerta.EstablecimientoNombre && ` · ${alerta.EstablecimientoNombre}`}
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-[#4B5563] dark:text-gray-400">Disponible:</span>
                        <span className="ml-1.5 font-semibold text-[#3B82F6] dark:text-[#60A5FA] tabular-nums">{alerta.cantidadActual}</span>
                      </div>
                      {typeof alerta.stockMaximo === 'number' && (
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Máximo:</span>
                          <span className="ml-1.5 font-semibold text-[#111827] dark:text-gray-100 tabular-nums">{alerta.stockMaximo}</span>
                        </div>
                      )}
                      {typeof alerta.excedente === 'number' && (
                        <div>
                          <span className="text-[#4B5563] dark:text-gray-400">Excedente:</span>
                          <span className="ml-1.5 font-semibold text-[#3B82F6] dark:text-[#60A5FA] tabular-nums">{alerta.excedente}</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-[#4B5563] dark:text-gray-400">
                      Reduce inventario mediante ajustes o transferencias para liberar espacio.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {alertas.length === 0 && (
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
    </div>
  );
};

export default AlertsPanel;
