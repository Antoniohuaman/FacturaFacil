// src/features/catalogo-articulos/pages/ControlStockPage.tsx

import React, { useState, useMemo } from 'react';
import type { StockAlert } from '../models/types';
import StockMovementsTable from '../components/StockMovementsTable.tsx';
import StockAdjustmentModal from '../components/StockAdjustmentModal.tsx';
import StockSummaryCards from '../components/StockSummaryCards.tsx';
import StockAlertsPanel from '../components/StockAlertsPanel.tsx';
import MassStockUpdateModal from '../components/MassStockUpdateModal.tsx';
import TransferStockModal from '../components/TransferStockModal.tsx';
import { useProductStore } from '../hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

const ControlStockPage: React.FC = () => {
  const { allProducts, movimientos, addMovimiento, transferirStock } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'movimientos' | 'alertas' | 'resumen'>('movimientos');
  const [filterPeriodo, setFilterPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('semana');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [suggestedQuantity, setSuggestedQuantity] = useState<number>(0);

  // ✅ Filtro por establecimiento
  const [establecimientoFiltro, setEstablecimientoFiltro] = useState<string>('todos');

  // Obtener establecimientos activos
  const establishments = useMemo(
    () => configState.establishments.filter(e => e.isActive),
    [configState.establishments]
  );

  // ✅ Generar alertas por producto-establecimiento
  const alertas: StockAlert[] = useMemo(() => {
    const alerts: StockAlert[] = [];

    allProducts.forEach(producto => {
      // Si tiene stockPorEstablecimiento, generar alertas por cada establecimiento
      if (producto.stockPorEstablecimiento) {
        Object.entries(producto.stockPorEstablecimiento).forEach(([estId, stock]) => {
          const establecimiento = establishments.find(e => e.id === estId);
          if (!establecimiento) return;

          // Obtener configuración de stock para este establecimiento (o usar defaults)
          const config = producto.stockConfigPorEstablecimiento?.[estId];
          const stockMinimo = config?.stockMinimo ?? 10;
          const stockMaximo = config?.stockMaximo ?? 100;

          // Determinar estado
          let estado: StockAlert['estado'];
          if (stock === 0) {
            estado = 'CRITICO';
          } else if (stock <= stockMinimo) {
            estado = 'BAJO';
          } else if (stock >= stockMaximo) {
            estado = 'EXCESO';
          } else {
            return; // No generar alerta si está en rango normal
          }

          // Filtrar por establecimiento si hay uno seleccionado
          if (establecimientoFiltro !== 'todos' && estId !== establecimientoFiltro) {
            return;
          }

          alerts.push({
            productoId: producto.id,
            productoCodigo: producto.codigo,
            productoNombre: producto.nombre,
            cantidadActual: stock,
            stockMinimo,
            stockMaximo,
            estado,
            establecimientoId: estId,
            establecimientoCodigo: establecimiento.code,
            establecimientoNombre: establecimiento.name,
            faltante: estado === 'CRITICO' || estado === 'BAJO' ? Math.max(0, stockMinimo - stock) : undefined,
            excedente: estado === 'EXCESO' ? Math.max(0, stock - stockMaximo) : undefined
          });
        });
      } else {
        // Fallback: alertas basadas en stock global (retrocompatibilidad)
        if (producto.cantidad <= 10) {
          const stockMinimo = 10;
          alerts.push({
            productoId: producto.id,
            productoCodigo: producto.codigo,
            productoNombre: producto.nombre,
            cantidadActual: producto.cantidad,
            stockMinimo,
            estado: producto.cantidad === 0 ? 'CRITICO' : 'BAJO',
            establecimientoId: 'global',
            establecimientoCodigo: 'GLOBAL',
            establecimientoNombre: 'Stock Global',
            faltante: Math.max(0, stockMinimo - producto.cantidad)
          });
        }
      }
    });

    return alerts;
  }, [allProducts, establishments, establecimientoFiltro]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StockSummaryCards
        products={allProducts}
        establecimientoFiltro={establecimientoFiltro}
        establishments={establishments}
      />

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedView('movimientos')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-all
                  ${selectedView === 'movimientos'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                Movimientos
              </button>
              <button
                onClick={() => setSelectedView('alertas')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-all
                  ${selectedView === 'alertas'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                Alertas
                {alertas.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    {alertas.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSelectedView('resumen')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-md transition-all
                  ${selectedView === 'resumen'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                Resumen
              </button>
            </div>

            {/* Period Filter */}
            <select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
              <option value="todo">Todo el historial</option>
            </select>

            {/* ✅ Filtro por Establecimiento */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <select
                value={establecimientoFiltro}
                onChange={(e) => setEstablecimientoFiltro(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="todos">Todos los establecimientos</option>
                {establishments.map(est => (
                  <option key={est.id} value={est.id}>
                    {est.code} - {est.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Export Button */}
            <button 
              onClick={() => {
                const fecha = new Intl.DateTimeFormat('es-PE', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(new Date());
                
                let reporte = `REPORTE DE MOVIMIENTOS DE STOCK\nFecha: ${fecha}\n\n`;
                reporte += `Total de movimientos: ${movimientos.length}\n\n`;
                
                if (selectedView === 'movimientos') {
                  reporte += `MOVIMIENTOS:\n`;
                  movimientos.forEach((m, i) => {
                    reporte += `\n${i + 1}. ${m.productoNombre} (${m.productoCodigo})\n`;
                    reporte += `   Tipo: ${m.tipo}\n`;
                    reporte += `   Cantidad: ${m.cantidad}\n`;
                    reporte += `   Stock: ${m.cantidadAnterior} → ${m.cantidadNueva}\n`;
                    reporte += `   Usuario: ${m.usuario}\n`;
                    reporte += `   Fecha: ${new Intl.DateTimeFormat('es-PE').format(m.fecha)}\n`;
                  });
                } else if (selectedView === 'alertas') {
                  reporte = `REPORTE DE ALERTAS DE STOCK\nFecha: ${fecha}\n\n`;
                  reporte += `Total de alertas: ${alertas.length}\n\n`;
                  alertas.forEach((a, i) => {
                    reporte += `\n${i + 1}. ${a.productoNombre}\n`;
                    reporte += `   Código: ${a.productoCodigo}\n`;
                    reporte += `   Stock Actual: ${a.cantidadActual}\n`;
                    reporte += `   Stock Mínimo: ${a.stockMinimo}\n`;
                  });
                }
                
                const blob = new Blob([reporte], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte-stock-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar</span>
              </div>
            </button>

            {/* Mass Update Button */}
            <button
              onClick={() => setShowMassUpdateModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span>Actualización Masiva</span>
              </div>
            </button>

            {/* Transfer Stock Button */}
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Transferir Stock</span>
              </div>
            </button>

            {/* Adjust Stock Button */}
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Ajustar Stock</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div>
        {selectedView === 'movimientos' && (
          <StockMovementsTable
            movimientos={movimientos}
            establecimientoFiltro={establecimientoFiltro}
          />
        )}
        
        {selectedView === 'alertas' && (
          <StockAlertsPanel
            alertas={alertas}
            onReabastecerProducto={(productoId, cantidadSugerida) => {
              setSelectedProductId(productoId);
              setSuggestedQuantity(cantidadSugerida);
              setShowAdjustmentModal(true);
            }}
            onProgramarCompra={(productoId, cantidadSugerida) => {
              const producto = allProducts.find(p => p.id === productoId);
              if (producto) {
                const mensaje = `Se programará una compra para:\n\n` +
                  `Producto: ${producto.nombre}\n` +
                  `Código: ${producto.codigo}\n` +
                  `Cantidad sugerida: ${cantidadSugerida} unidades\n\n` +
                  `Esta funcionalidad se integrará con el módulo de compras.`;
                alert(mensaje);
              }
            }}
          />
        )}
        
        {selectedView === 'resumen' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Stock</h3>
            <p className="text-gray-600">Gráficos y estadísticas detalladas aquí...</p>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <StockAdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => {
            setShowAdjustmentModal(false);
            setSelectedProductId(null);
            setSuggestedQuantity(0);
          }}
          onAdjust={(data: any) => {
            // Registrar el movimiento en el store
            addMovimiento(
              data.productoId,
              data.tipo,
              data.motivo,
              data.cantidad,
              data.observaciones,
              data.documentoReferencia,
              undefined, // ubicacion - ya no se usa
              data.establecimientoId,
              data.establecimientoCodigo,
              data.establecimientoNombre
            );
            setShowAdjustmentModal(false);
            setSelectedProductId(null);
            setSuggestedQuantity(0);
          }}
          preSelectedProductId={selectedProductId}
          preSelectedQuantity={suggestedQuantity}
        />
      )}

      {/* Mass Stock Update Modal */}
      <MassStockUpdateModal
        isOpen={showMassUpdateModal}
        onClose={() => setShowMassUpdateModal(false)}
      />

      {/* Transfer Stock Modal */}
      <TransferStockModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={(data) => {
          const resultado = transferirStock(
            data.productoId,
            data.establecimientoOrigenId,
            data.establecimientoDestinoId,
            data.cantidad,
            data.documentoReferencia,
            data.observaciones
          );
          
          if (resultado) {
            alert(`Transferencia realizada exitosamente.\nID: ${resultado.transferenciaId}`);
          } else {
            alert('Error al realizar la transferencia. Verifica el stock disponible.');
          }
          
          setShowTransferModal(false);
        }}
      />
    </div>
  );
};

export default ControlStockPage;
