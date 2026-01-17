// src/features/inventario/pages/InventoryPage.tsx

import React, { useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { useInventory } from '../hooks';
import MovementsTable from '../components/tables/MovementsTable';
import AdjustmentModal from '../components/modals/AdjustmentModal';
import MassUpdateModal from '../components/modals/MassUpdateModal';
import TransferModal from '../components/modals/TransferModal';
import SummaryCards from '../components/panels/SummaryCards';
import AlertsPanel from '../components/panels/AlertsPanel';
import InventarioSituacionPage from '../components/disponibilidad/InventarioSituacionPage';
import { PageHeader } from '../../../../../components/PageHeader';
import * as XLSX from 'xlsx';
import { formatBusinessDateTimeLocal, getBusinessTodayISODate } from '@/shared/time/businessTime';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';

const formatMovementTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatBusinessDateTimeLocal(date).replace('T', ' ');
};

/**
 * Página principal del módulo de inventario
 * Gestiona todo el control de stock, movimientos, alertas y transferencias
 */
export const InventoryPage: React.FC = () => {
  useFocusFromQuery();
  const {
    // Estados
    selectedView,
    filterPeriodo,
    warehouseFiltro,
    showAdjustmentModal,
    showMassUpdateModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    warehouses,
    stockAlerts,
    filteredMovements,
    allProducts,

    // Setters
    setSelectedView,
    setFilterPeriodo,
    setWarehouseFiltro,
    setShowAdjustmentModal,
    setShowMassUpdateModal,
    setShowTransferModal,

    // Handlers
    handleStockAdjustment,
    handleStockTransfer,
    openAdjustmentModal,
    openTransferModal,
    openMassUpdateModal
  } = useInventory();
  const { request: stockAutoExportRequest, finish: finishStockAutoExport } = useAutoExportRequest('inventario-stock');
  const { request: movementsAutoExportRequest, finish: finishMovementsAutoExport } = useAutoExportRequest('inventario-movimientos');
  const movementsAutoExportHandledRef = useRef(false);
  const exportHandlerRef = useRef<() => void>(() => {});

  /**
   * Exporta movimientos a Excel
   */
  const handleExportToExcel = () => {
    const data = filteredMovements.map(mov => ({
      'Fecha': formatMovementTimestamp(mov.fecha),
      'Producto': mov.productoNombre,
      'Código': mov.productoCodigo,
      'Tipo': mov.tipo,
      'Motivo': mov.motivo,
      'Cantidad': mov.cantidad,
      'Stock Anterior': mov.cantidadAnterior,
      'Stock Nuevo': mov.cantidadNueva,
      'Almacén': mov.warehouseNombre || 'N/A',
      'Establecimiento': mov.establishmentNombre || 'N/A',
      'Usuario': mov.usuario,
      'Observaciones': mov.observaciones || '',
      'Documento': mov.documentoReferencia || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const colWidths = [
      { wch: 20 }, // Fecha
      { wch: 30 }, // Producto
      { wch: 15 }, // Código
      { wch: 18 }, // Tipo
      { wch: 25 }, // Motivo
      { wch: 10 }, // Cantidad
      { wch: 15 }, // Stock Anterior
      { wch: 15 }, // Stock Nuevo
      { wch: 25 }, // Establecimiento
      { wch: 20 }, // Usuario
      { wch: 40 }, // Observaciones
      { wch: 20 }  // Documento
    ];
    ws['!cols'] = colWidths;

    const fileName = `movimientos_stock_${getBusinessTodayISODate()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  exportHandlerRef.current = handleExportToExcel;

  useEffect(() => {
    if (!stockAutoExportRequest) {
      return;
    }

    if (selectedView !== 'situacion') {
      setSelectedView('situacion');
    }
  }, [selectedView, setSelectedView, stockAutoExportRequest]);

  useEffect(() => {
    if (!movementsAutoExportRequest || movementsAutoExportHandledRef.current) {
      return;
    }

    if (selectedView !== 'movimientos') {
      setSelectedView('movimientos');
      return;
    }

    movementsAutoExportHandledRef.current = true;
    const runAutoExport = async () => {
      try {
        await Promise.resolve(exportHandlerRef.current());
      } finally {
        finishMovementsAutoExport(REPORTS_HUB_PATH);
      }
    };

    void runAutoExport();
  }, [finishMovementsAutoExport, movementsAutoExportRequest, selectedView, setSelectedView]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header con PageHeader para mantener consistencia */}
      <PageHeader 
        title="Control de Stock"
        icon={
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      />

      {/* Resumen de estadísticas - SOLO en vista Resumen */}
      {selectedView === 'resumen' && (
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <SummaryCards
            products={allProducts}
            warehouseFiltro={warehouseFiltro}
          />
        </div>
      )}

      {/* Tabs de navegación - REDISEÑADOS CON PRIMARIO #6F36FF */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex space-x-1">
          {/* Situación Actual */}
          <button
            onClick={() => setSelectedView('situacion')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'situacion'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Stock Actual</span>
          </button>

          {/* Movimientos */}
          <button
            onClick={() => setSelectedView('movimientos')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'movimientos'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Movimientos</span>
          </button>

          {/* Alertas */}
          <button
            onClick={() => setSelectedView('alertas')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'alertas'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Alertas</span>
            {stockAlerts.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#EF4444] text-white shadow-sm">
                {stockAlerts.length}
              </span>
            )}
          </button>

          {/* Resumen */}
          <button
            onClick={() => setSelectedView('resumen')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'resumen'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Resumen</span>
          </button>
        </div>
      </div>

      {/* Barra de acciones - SOLO en otras vistas, NO en "Situación Actual" */}
      {selectedView !== 'situacion' && (
        <div className="bg-white dark:bg-gray-800 border-b border-[#E5E7EB] dark:border-gray-700 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de período */}
            <select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value as 'hoy' | 'semana' | 'mes' | 'todo')}
              className="h-9 px-3 py-2 border border-[#E5E7EB] dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 dark:focus:ring-[#8B5CF6]/35 transition-all duration-150"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
              <option value="todo">Todos</option>
            </select>

            {/* Filtro de almacén */}
            <select
              value={warehouseFiltro}
              onChange={(e) => setWarehouseFiltro(e.target.value)}
              className="h-9 px-3 py-2 border border-[#E5E7EB] dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 dark:focus:ring-[#8B5CF6]/35 transition-all duration-150"
            >
              <option value="todos">Todos los almacenes</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.establishmentName})
                </option>
              ))}
            </select>

            <div className="flex-1" />

            {/* Botones de acción */}
            <button
              onClick={handleExportToExcel}
              className="inline-flex items-center h-9 px-4 py-2 bg-[#6F36FF] text-white text-sm font-medium rounded-lg hover:bg-[#6F36FF]/90 dark:bg-[#8B5CF6] dark:hover:bg-[#8B5CF6]/90 transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </button>

            <button
              onClick={openMassUpdateModal}
              className="inline-flex items-center h-9 px-4 py-2 text-[#6F36FF] dark:text-[#8B5CF6] bg-white dark:bg-gray-800 border border-[#6F36FF]/30 dark:border-[#8B5CF6]/30 hover:bg-[#6F36FF]/5 dark:hover:bg-[#8B5CF6]/10 text-sm font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            >
              Actualización Masiva
            </button>

            <button
              onClick={openTransferModal}
              className="inline-flex items-center h-9 px-4 py-2 text-[#6F36FF] dark:text-[#8B5CF6] bg-white dark:bg-gray-800 border border-[#6F36FF]/30 dark:border-[#8B5CF6]/30 hover:bg-[#6F36FF]/5 dark:hover:bg-[#8B5CF6]/10 text-sm font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            >
              Transferir Stock
            </button>

            <button
              onClick={() => openAdjustmentModal('', 0)}
              className="inline-flex items-center h-9 px-4 py-2 text-[#6F36FF] dark:text-[#8B5CF6] bg-white dark:bg-gray-800 border border-[#6F36FF]/30 dark:border-[#8B5CF6]/30 hover:bg-[#6F36FF]/5 dark:hover:bg-[#8B5CF6]/10 text-sm font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            >
              + Ajustar Stock
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className={`flex-1 overflow-auto ${selectedView === 'situacion' ? '' : 'p-6'}`}>
        {selectedView === 'situacion' && (
          <InventarioSituacionPage
            autoExportRequest={stockAutoExportRequest}
            onAutoExportFinished={finishStockAutoExport}
            onActualizacionMasiva={openMassUpdateModal}
            onTransferir={openTransferModal}
            onAjustar={() => openAdjustmentModal('', 0)}
            onAjustarProducto={openAdjustmentModal}
          />
        )}

        {selectedView === 'movimientos' && (
          <MovementsTable
            movimientos={filteredMovements}
            warehouseFiltro={warehouseFiltro}
          />
        )}

        {selectedView === 'alertas' && (
          <AlertsPanel
            alertas={stockAlerts}
            onReabastecerProducto={openAdjustmentModal}
            onProgramarCompra={openAdjustmentModal}
          />
        )}

        {selectedView === 'resumen' && (
          <div className="flex items-center justify-center h-64 text-[#4B5563] dark:text-gray-400">
            {/* Las SummaryCards ya se muestran arriba para todas las vistas */}
            <p className="text-sm">Vista de resumen con estadísticas detalladas</p>
          </div>
        )}
      </div>

      {/* Modales */}
      <AdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        onAdjust={handleStockAdjustment}
        preSelectedProductId={selectedProductId}
        preSelectedQuantity={suggestedQuantity}
      />

      <MassUpdateModal
        isOpen={showMassUpdateModal}
        onClose={() => setShowMassUpdateModal(false)}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleStockTransfer}
      />
    </div>
  );
};

export default InventoryPage;

