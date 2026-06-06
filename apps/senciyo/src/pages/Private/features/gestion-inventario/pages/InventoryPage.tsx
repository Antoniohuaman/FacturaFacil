// src/features/inventario/pages/InventoryPage.tsx

import React, { useCallback, useEffect, useRef } from 'react';
import type { MovimientoStock } from '../models';
import { Download } from 'lucide-react';
import { useInventory } from '../hooks';
import MovementsTable from '../components/tables/MovementsTable';
import AdjustmentModal from '../components/modals/AdjustmentModal';
import PanelImportacionStock from '../components/PanelImportacionStock';
import TransferModal from '../components/modals/TransferModal';
import TransferenciasPanel from '../components/transferencias/TransferenciasPanel';
import AlertsPanel from '../components/panels/AlertsPanel';
import InventarioSituacionPage from '../components/disponibilidad/InventarioSituacionPage';
import NotasIngresoPanel from '../components/notas-ingreso/NotasIngresoPanel';
import { PageHeader } from '@/contasis';
import * as XLSX from 'xlsx';
import { formatBusinessDateTimeLocal, getBusinessTodayISODate } from '@/shared/time/businessTime';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import { inferirFuente } from '../utils/inventory.helpers';

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
    selectedView,
    filterPeriodo,
    almacenFiltro,
    showAdjustmentModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    prefilledAlmacenId,
    adjustmentMode,
    almacenes,
    stockAlerts,
    filteredMovements,
    transferencias,
    establecimientoActualId,
    puedeTransferir,

    setSelectedView,
    setFilterPeriodo,
    setalmacenFiltro,
    setShowAdjustmentModal,
    setShowTransferModal,

    handleStockAdjustment,
    handleCreateTransfer,
    handleDespacharTransfer,
    handleRecibirTransfer,
    handleCancelarTransfer,
    handleAnularTransfer,
    openAdjustmentModal,
    openTransferModal,
    reloadMovements,
  } = useInventory();
  const { request: stockAutoExportRequest, finish: finishStockAutoExport } = useAutoExportRequest('inventario-stock');
  const { request: movementsAutoExportRequest, finish: finishMovementsAutoExport } = useAutoExportRequest('inventario-movimientos');
  const movementsAutoExportHandledRef = useRef(false);
  const exportHandlerRef = useRef<() => void>(() => {});

  // Almacena los movimientos visibles en la tabla (respetando filtros de tipo y búsqueda)
  const movimientosFiltradosVisiblesRef = useRef<MovimientoStock[]>([]);
  const handleMovimientosFiltradosChange = useCallback((movs: MovimientoStock[]) => {
    movimientosFiltradosVisiblesRef.current = movs;
  }, []);

  /**
   * Exporta movimientos a Excel.
   * Usa los movimientos visibles en la tabla (respeta filtros de tipo y búsqueda)
   * si la tabla ya fue montada; de lo contrario usa el período/almacén del hook.
   */
  const handleExportToExcel = () => {
    const baseMovements = movimientosFiltradosVisiblesRef.current.length > 0
      ? movimientosFiltradosVisiblesRef.current
      : filteredMovements;

    const data = baseMovements.map(mov => ({
      'Fecha':              formatMovementTimestamp(mov.fecha),
      'Producto':           mov.productoNombre,
      'Código Producto':    mov.productoCodigo,
      'Tipo':               mov.tipo,
      'Motivo':             mov.motivo,
      'Fuente':             inferirFuente(mov),
      'Movimiento':         mov.cantidad,
      'Saldo Anterior':     mov.cantidadAnterior,
      'Saldo Final':        mov.cantidadNueva,
      'Almacén':            mov.almacenNombre || '',
      'Código Almacén':     mov.almacenCodigo || '',
      'Establecimiento':    mov.EstablecimientoNombre || '',
      'Usuario':            mov.usuario,
      'Documento / Ref.':   mov.documentoReferencia || '',
      'Observaciones':      mov.observaciones || '',
      'Es Transferencia':   mov.esTransferencia ? 'Sí' : 'No',
      'Transferencia ID':   mov.transferenciaId || '',
      'Tipo Transferencia': mov.tipoTransferencia || '',
      'Almacén Origen':     mov.almacenOrigenNombre || '',
      'Almacén Destino':    mov.almacenDestinoNombre || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');

    const colWidths = [
      { wch: 20 }, // Fecha
      { wch: 30 }, // Producto
      { wch: 15 }, // Código Producto
      { wch: 16 }, // Tipo
      { wch: 22 }, // Motivo
      { wch: 22 }, // Fuente
      { wch: 12 }, // Movimiento
      { wch: 14 }, // Saldo Anterior
      { wch: 12 }, // Saldo Final
      { wch: 25 }, // Almacén
      { wch: 14 }, // Código Almacén
      { wch: 28 }, // Establecimiento
      { wch: 20 }, // Usuario
      { wch: 24 }, // Documento / Ref.
      { wch: 45 }, // Observaciones
      { wch: 15 }, // Es Transferencia
      { wch: 24 }, // Transferencia ID
      { wch: 22 }, // Tipo Transferencia
      { wch: 25 }, // Almacén Origen
      { wch: 25 }, // Almacén Destino
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
      {/* Header */}
      <PageHeader 
        title="Control de Stock"
      />

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

          {/* Transferencias */}
          <button
            onClick={() => setSelectedView('transferencias')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'transferencias'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Transferencias</span>
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

          {/* Importar stock */}
          <button
            onClick={() => setSelectedView('importar')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'importar'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Importar stock</span>
          </button>

          {/* Notas de Ingreso */}
          <button
            onClick={() => setSelectedView('notas-ingreso')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'notas-ingreso'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Notas de Ingreso</span>
          </button>
        </div>
      </div>

      {/* Barra de acciones — no aplica en Stock Actual, Transferencias, Importar stock ni Notas de Ingreso */}
      {selectedView !== 'situacion' && selectedView !== 'transferencias' && selectedView !== 'importar' && selectedView !== 'notas-ingreso' && (
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
              value={almacenFiltro}
              onChange={(e) => setalmacenFiltro(e.target.value)}
              className="h-9 px-3 py-2 border border-[#E5E7EB] dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 dark:focus:ring-[#8B5CF6]/35 transition-all duration-150"
            >
              <option value="todos">Todos los almacenes</option>
              {almacenes.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.nombreAlmacen}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            {/* Botones de acción — exportar movimientos solo aplica cuando no es el tab Alertas */}
            {selectedView !== 'alertas' && (
              <button
                onClick={handleExportToExcel}
                className="inline-flex items-center h-9 px-4 py-2 bg-[#6F36FF] text-white text-sm font-medium rounded-lg hover:bg-[#6F36FF]/90 dark:bg-[#8B5CF6] dark:hover:bg-[#8B5CF6]/90 transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </button>
            )}

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
      <div className={`flex-1 overflow-auto ${selectedView === 'situacion' || selectedView === 'transferencias' || selectedView === 'importar' || selectedView === 'notas-ingreso' ? '' : 'p-6'}`}>
        {selectedView === 'situacion' && (
          <InventarioSituacionPage
            autoExportRequest={stockAutoExportRequest}
            onAutoExportFinished={finishStockAutoExport}
            onActualizacionMasiva={() => setSelectedView('importar')}
            onTransferir={openTransferModal}
            onAjustar={() => openAdjustmentModal('', 0)}
            onAjustarProducto={openAdjustmentModal}
          />
        )}

        {selectedView === 'movimientos' && (
          <MovementsTable
            movimientos={filteredMovements}
            almacenFiltro={almacenFiltro}
            onFilteredDataChange={handleMovimientosFiltradosChange}
          />
        )}

        {selectedView === 'transferencias' && (
          <TransferenciasPanel
            transferencias={transferencias}
            onNuevaTransferencia={openTransferModal}
            onDespachar={handleDespacharTransfer}
            onRecibir={handleRecibirTransfer}
            onCancelar={handleCancelarTransfer}
            onAnular={handleAnularTransfer}
            currentEstablecimientoId={establecimientoActualId}
            puedeTransferir={puedeTransferir}
          />
        )}

        {selectedView === 'alertas' && (
          <AlertsPanel
            alertas={stockAlerts}
            onReabastecerProducto={openAdjustmentModal}
          />
        )}

        {selectedView === 'importar' && (
          <PanelImportacionStock onRecargarMovimientos={reloadMovements} />
        )}

        {selectedView === 'notas-ingreso' && (
          <NotasIngresoPanel />
        )}
      </div>

      {/* Modales */}
      <AdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        onAdjust={handleStockAdjustment}
        preSelectedProductId={selectedProductId}
        preSelectedQuantity={suggestedQuantity}
        prefilledAlmacenId={prefilledAlmacenId}
        mode={adjustmentMode}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleCreateTransfer}
      />
    </div>
  );
};

export default InventoryPage;

