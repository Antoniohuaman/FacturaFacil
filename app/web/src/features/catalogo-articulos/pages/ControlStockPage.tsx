// src/features/catalogo-articulos/pages/ControlStockPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import type { StockAlert } from '../models/types';
import StockMovementsTable from '../components/StockMovementsTable.tsx';
import StockAdjustmentModal from '../components/StockAdjustmentModal.tsx';
import StockSummaryCards from '../components/StockSummaryCards.tsx';
import StockAlertsPanel from '../components/StockAlertsPanel.tsx';
import MassStockUpdateModal from '../components/MassStockUpdateModal.tsx';
import TransferStockModal from '../components/TransferStockModal.tsx';
import { useProductStore } from '../hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import * as XLSX from 'xlsx';

const ControlStockPage: React.FC = () => {
  const { allProducts, movimientos, addMovimiento, transferirStock } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const establishments = configState.establishments.filter(e => e.isActive);
  
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'movimientos' | 'alertas' | 'resumen'>('movimientos');
  const [filterPeriodo, setFilterPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('semana');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [suggestedQuantity, setSuggestedQuantity] = useState<number>(0);
  
  // ✅ NUEVO: Filtro de establecimiento (opcional)
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>(() => {
    return localStorage.getItem('controlStock_selectedEstablishment') || 'TODOS';
  });

  // Guardar selección de establecimiento en localStorage
  useEffect(() => {
    localStorage.setItem('controlStock_selectedEstablishment', selectedEstablishmentId);
  }, [selectedEstablishmentId]);

  // ✅ NUEVO: Filtrar productos según establecimiento seleccionado
  const filteredProducts = useMemo(() => {
    if (selectedEstablishmentId === 'TODOS') {
      return allProducts;
    }
    
    // Solo mostrar productos que pertenecen al establecimiento seleccionado
    return allProducts.filter(product => {
      // Si está disponible en todos, siempre se muestra
      if (product.disponibleEnTodos) return true;
      
      // Si tiene establecimientos específicos, verificar que incluya el seleccionado
      return product.establecimientoIds?.includes(selectedEstablishmentId);
    });
  }, [allProducts, selectedEstablishmentId]);

  // ✅ NUEVO: Filtrar movimientos según establecimiento seleccionado
  const filteredMovimientos = useMemo(() => {
    if (selectedEstablishmentId === 'TODOS') {
      return movimientos;
    }
    
    // Solo mostrar movimientos del establecimiento seleccionado
    return movimientos.filter(mov => mov.establecimientoId === selectedEstablishmentId);
  }, [movimientos, selectedEstablishmentId]);

  // ✅ MEJORADO: Generar alertas de stock considerando distribución por establecimiento
  const alertas: StockAlert[] = useMemo(() => {
    const alerts: StockAlert[] = [];

    filteredProducts.forEach(producto => {
      const stockMinimo = producto.stockMinimo ?? 10; // Usar stockMinimo del producto o default 10

      // Si tiene distribución por establecimiento, generar alerta por cada uno
      if (producto.stockPorEstablecimiento && Object.keys(producto.stockPorEstablecimiento).length > 0) {
        Object.entries(producto.stockPorEstablecimiento).forEach(([establecimientoId, stockEstablecimiento]) => {
          // Solo generar alerta si el stock está por debajo del mínimo
          if (stockEstablecimiento <= stockMinimo) {
            const establecimiento = establishments.find(e => e.id === establecimientoId);

            let estado: StockAlert['estado'] = 'NORMAL';
            if (stockEstablecimiento === 0) estado = 'CRITICO';
            else if (stockEstablecimiento <= stockMinimo * 0.5) estado = 'CRITICO';
            else if (stockEstablecimiento <= stockMinimo) estado = 'BAJO';

            // Solo agregar si el establecimiento seleccionado coincide o si es TODOS
            if (selectedEstablishmentId === 'TODOS' || establecimientoId === selectedEstablishmentId) {
              alerts.push({
                productoId: producto.id,
                productoCodigo: producto.codigo,
                productoNombre: producto.nombre,
                cantidadActual: stockEstablecimiento,
                stockMinimo,
                estado,
                establecimientoId,
                establecimientoCodigo: establecimiento?.code,
                establecimientoNombre: establecimiento?.name
              });
            }
          }
        });
      } else {
        // Si no tiene distribución, evaluar stock total
        if (producto.cantidad <= stockMinimo) {
          let estado: StockAlert['estado'] = 'NORMAL';
          if (producto.cantidad === 0) estado = 'CRITICO';
          else if (producto.cantidad <= stockMinimo * 0.5) estado = 'CRITICO';
          else if (producto.cantidad <= stockMinimo) estado = 'BAJO';

          alerts.push({
            productoId: producto.id,
            productoCodigo: producto.codigo,
            productoNombre: producto.nombre,
            cantidadActual: producto.cantidad,
            stockMinimo,
            estado
          });
        }
      }
    });

    return alerts;
  }, [filteredProducts, establishments, selectedEstablishmentId]);

  // ✅ NUEVA FUNCIÓN: Exportar a Excel con formato mejorado
  const handleExportToExcel = () => {
    const dataToExport = selectedView === 'movimientos' ? filteredMovimientos : alertas;
    
    if (dataToExport.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    if (selectedView === 'movimientos') {
      // Preparar datos de movimientos con columnas separadas
      const worksheetData = [
        ['REPORTE DE MOVIMIENTOS DE STOCK'],
        [`Fecha de generación: ${new Date().toLocaleString('es-PE')}`],
        [`Establecimiento: ${selectedEstablishmentId === 'TODOS' ? 'Todos los establecimientos' : establishments.find(e => e.id === selectedEstablishmentId)?.name || 'N/A'}`],
        [], // Fila vacía
        ['Fecha y Hora', 'Producto', 'Código', 'Tipo', 'Motivo', 'Establecimiento', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Usuario', 'Observaciones']
      ];
      
      filteredMovimientos.forEach(mov => {
        worksheetData.push([
          new Date(mov.fecha).toLocaleString('es-PE'),
          mov.productoNombre,
          mov.productoCodigo,
          mov.tipo,
          mov.motivo,
          mov.establecimientoNombre || mov.establecimientoCodigo || 'N/A',
          mov.cantidad.toString(),
          mov.cantidadAnterior.toString(),
          mov.cantidadNueva.toString(), // Stock disponible (nuevo)
          mov.usuario,
          mov.observaciones || ''
        ]);
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Ajustar anchos de columna
      worksheet['!cols'] = [
        { wch: 20 }, // Fecha
        { wch: 30 }, // Producto
        { wch: 15 }, // Código
        { wch: 18 }, // Tipo
        { wch: 25 }, // Motivo
        { wch: 20 }, // Establecimiento
        { wch: 10 }, // Cantidad
        { wch: 15 }, // Stock Anterior
        { wch: 15 }, // Stock Nuevo
        { wch: 20 }, // Usuario
        { wch: 40 }  // Observaciones
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
      
    } else if (selectedView === 'alertas') {
      // Preparar datos de alertas
      const worksheetData = [
        ['REPORTE DE ALERTAS DE STOCK'],
        [`Fecha de generación: ${new Date().toLocaleString('es-PE')}`],
        [`Establecimiento: ${selectedEstablishmentId === 'TODOS' ? 'Todos los establecimientos' : establishments.find(e => e.id === selectedEstablishmentId)?.name || 'N/A'}`],
        [],
        ['Producto', 'Código', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Diferencia']
      ];
      
      alertas.forEach(alerta => {
        worksheetData.push([
          alerta.productoNombre,
          alerta.productoCodigo,
          alerta.cantidadActual.toString(),
          alerta.stockMinimo.toString(),
          alerta.estado,
          (alerta.stockMinimo - alerta.cantidadActual).toString()
        ]);
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Alertas');
    }
    
    // Descargar archivo
    const fileName = `control-stock-${selectedView}-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StockSummaryCards products={filteredProducts} />

      {/* ✅ NUEVO: Filtro de Establecimiento */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg shadow-sm border border-red-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por Establecimiento
              </label>
              <select
                value={selectedEstablishmentId}
                onChange={(e) => setSelectedEstablishmentId(e.target.value)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="TODOS">📊 Todos los Establecimientos</option>
                {establishments.map(est => (
                  <option key={est.id} value={est.id}>
                    🏢 {est.name} ({est.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">
              {selectedEstablishmentId === 'TODOS' 
                ? `Mostrando ${filteredProducts.length} productos de todos los establecimientos`
                : `Mostrando ${filteredProducts.length} productos en ${establishments.find(e => e.id === selectedEstablishmentId)?.name || ''}`
              }
            </span>
            {selectedEstablishmentId !== 'TODOS' && (
              <button
                onClick={() => setSelectedEstablishmentId('TODOS')}
                className="px-3 py-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>
      </div>

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
          </div>

          <div className="flex items-center space-x-3">
            {/* ✅ MEJORADO: Export Button - Ahora exporta a Excel */}
            <button 
              onClick={handleExportToExcel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar a Excel</span>
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
          <StockMovementsTable movimientos={filteredMovimientos} />
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
            // ✅ MEJORADO: Registrar el movimiento y manejar errores
            const resultado = addMovimiento(
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

            if (resultado) {
              // ✅ Movimiento exitoso
              const producto = allProducts.find(p => p.id === data.productoId);
              alert(
                `✅ MOVIMIENTO REGISTRADO\n\n` +
                `Producto: ${producto?.nombre}\n` +
                `Tipo: ${data.tipo}\n` +
                `Cantidad: ${data.cantidad}\n` +
                `Establecimiento: ${data.establecimientoNombre}\n\n` +
                `Stock actualizado correctamente`
              );
              setShowAdjustmentModal(false);
              setSelectedProductId(null);
              setSuggestedQuantity(0);
            } else {
              // ❌ Error en el movimiento (validaciones fallaron)
              alert(
                `❌ ERROR AL REGISTRAR MOVIMIENTO\n\n` +
                `No se pudo completar la operación.\n` +
                `Verifica:\n` +
                `• Stock disponible suficiente\n` +
                `• Establecimiento seleccionado correcto\n` +
                `• Cantidad válida\n\n` +
                `Revisa la consola para más detalles.`
              );
            }
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
