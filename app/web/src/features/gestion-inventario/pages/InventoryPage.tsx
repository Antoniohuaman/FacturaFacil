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
    stockSummary,
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

      {/* Resumen de estadísticas - SOLO en otras vistas, NO en "Situación Actual" */}
      {selectedView !== 'situacion' && (
        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <SummaryCards
            products={allProducts}
            warehouseFiltro={warehouseFiltro}
          />
        </div>
      )}

      {/* Tabs de navegación */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setSelectedView('situacion')}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              selectedView === 'situacion'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Situación Actual
          </button>
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

      {/* Barra de acciones - SOLO en otras vistas, NO en "Situación Actual" */}
      {selectedView !== 'situacion' && (
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

            {/* Filtro de almacén */}
            <select
              value={warehouseFiltro}
              onChange={(e) => setWarehouseFiltro(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
