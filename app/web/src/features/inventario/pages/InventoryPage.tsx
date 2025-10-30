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
    establecimientoFiltro,
    showAdjustmentModal,
    showMassUpdateModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    establishments,
    stockAlerts,
    filteredMovements,
    stockSummary,
    allProducts,

    // Setters
    setSelectedView,
    setFilterPeriodo,
    setEstablecimientoFiltro,
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
      'Establecimiento': mov.establecimientoNombre || 'N/A',
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

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Control de Inventario</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestiona el stock, movimientos y alertas de todos tus productos
            </p>
          </div>
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <SummaryCards
          products={allProducts}
          establecimientoFiltro={establecimientoFiltro}
        />
      </div>

      {/* Tabs de navegación */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setSelectedView('movimientos')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              selectedView === 'movimientos'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Movimientos
          </button>
          <button
            onClick={() => setSelectedView('alertas')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              selectedView === 'alertas'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="flex items-center">
              Alertas
              {stockAlerts.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  {stockAlerts.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setSelectedView('resumen')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              selectedView === 'resumen'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Resumen
          </button>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro de período */}
          <select
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Última semana</option>
            <option value="mes">Último mes</option>
            <option value="todo">Todos</option>
          </select>

          {/* Filtro de establecimiento */}
          <select
            value={establecimientoFiltro}
            onChange={(e) => setEstablecimientoFiltro(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los establecimientos</option>
            {establishments.map(est => (
              <option key={est.id} value={est.id}>
                {est.name}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Botones de acción */}
          <button
            onClick={handleExportToExcel}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>

          <button
            onClick={openMassUpdateModal}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm"
          >
            Actualización Masiva
          </button>

          <button
            onClick={openTransferModal}
            className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-md hover:bg-cyan-700 transition-colors shadow-sm"
          >
            Transferir Stock
          </button>

          <button
            onClick={() => openAdjustmentModal('', 0)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            + Ajustar Stock
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto p-6">
        {selectedView === 'movimientos' && (
          <MovementsTable
            movimientos={filteredMovements}
            establecimientoFiltro={establecimientoFiltro}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumen del Inventario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Productos</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                  {stockSummary.totalProductos}
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                <div className="text-sm font-medium text-green-600 dark:text-green-400">Stock Total</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">
                  {stockSummary.totalStock.toLocaleString()} unidades
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Valor Total</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-300 mt-1">
                  S/ {stockSummary.valorTotalStock.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                <div className="text-sm font-medium text-red-600 dark:text-red-400">Sin Stock</div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-300 mt-1">
                  {stockSummary.productosSinStock}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Stock Bajo</div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-300 mt-1">
                  {stockSummary.productosStockBajo}
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Stock Crítico</div>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-300 mt-1">
                  {stockSummary.productosStockCritico}
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              Última actualización: {stockSummary.ultimaActualizacion.toLocaleString('es-PE')}
            </div>
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
