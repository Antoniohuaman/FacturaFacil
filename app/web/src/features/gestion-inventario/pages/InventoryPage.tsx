// src/features/inventario/pages/InventoryPage.tsx

import React from 'react';
import { Download } from 'lucide-react';
import { useInventory } from '../hooks';
import MovementsTable from '../components/tables/MovementsTable';
import AdjustmentModal from '../components/modals/AdjustmentModal';
import MassUpdateModal from '../components/modals/MassUpdateModal';
import TransferModal from '../components/modals/TransferModal';
import SummaryCards from '../components/panels/SummaryCards';
import AlertsPanel from '../components/panels/AlertsPanel';
import InventarioSituacionPage from '../components/disponibilidad/InventarioSituacionPage';
import { PageHeader } from '../../../components/PageHeader';
import * as XLSX from 'xlsx';

/**
 * Página principal del módulo de inventario
 * Gestiona todo el control de stock, movimientos, alertas y transferencias
 */
export const InventoryPage: React.FC = () => {
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

  /**
   * Exporta movimientos a Excel
   */
  const handleExportToExcel = () => {
    const data = filteredMovements.map(mov => ({
      'Fecha': new Date(mov.fecha).toLocaleString('es-PE'),
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

    const fileName = `movimientos_stock_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Validar que exista al menos un almacén
  if (warehouses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-orange-200 dark:border-orange-700 p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icono de advertencia */}
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Título */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                No hay almacenes configurados
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Necesitas crear al menos un almacén para gestionar el inventario
              </p>
            </div>

            {/* Explicación */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 text-left w-full">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                ¿Cómo funciona?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">1.</span>
                  <span>Tu empresa tiene <strong>establecimientos</strong> (ubicaciones físicas/legales)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">2.</span>
                  <span>Cada establecimiento puede tener uno o más <strong>almacenes</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 dark:text-blue-400 mr-2">3.</span>
                  <span>El stock se gestiona <strong>por almacén</strong>, no por establecimiento</span>
                </li>
              </ul>
            </div>

            {/* Acción */}
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <a
                href="/configuracion-sistema"
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Crear Almacén en Configuración</span>
              </a>
              <a
                href="/"
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Volver al Inicio</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <span>Situación</span>
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
              // Tipado explícito para evitar any; mantiene el conjunto de valores permitido
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

            {/* Botones de acción - todos usando color primario */}
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
            onExportar={handleExportToExcel}
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
