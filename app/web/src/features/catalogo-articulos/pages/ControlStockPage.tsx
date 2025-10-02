// src/features/catalogo-articulos/pages/ControlStockPage.tsx

import React, { useState } from 'react';
import type { MovimientoStock, StockAlert } from '../models/types';
import StockMovementsTable from '../components/StockMovementsTable.tsx';
import StockAdjustmentModal from '../components/StockAdjustmentModal.tsx';
import StockSummaryCards from '../components/StockSummaryCards.tsx';
import StockAlertsPanel from '../components/StockAlertsPanel.tsx';
import { useProductStore } from '../hooks/useProductStore';

const ControlStockPage: React.FC = () => {
  const { allProducts } = useProductStore();
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'movimientos' | 'alertas' | 'resumen'>('movimientos');
  const [filterPeriodo, setFilterPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('semana');

  // Mock data - esto se reemplazará con datos reales del store
  const mockMovimientos: MovimientoStock[] = [
    {
      id: '1',
      productoId: '1',
      productoCodigo: 'PROD-001',
      productoNombre: 'Laptop Dell XPS 15',
      tipo: 'ENTRADA',
      motivo: 'COMPRA',
      cantidad: 10,
      cantidadAnterior: 5,
      cantidadNueva: 15,
      usuario: 'Juan Pérez',
      observaciones: 'Compra a proveedor ABC',
      documentoReferencia: 'FC-001-2024',
      fecha: new Date('2024-10-01T10:30:00'),
      ubicacion: 'Almacén Principal'
    },
    {
      id: '2',
      productoId: '2',
      productoCodigo: 'PROD-002',
      productoNombre: 'Mouse Logitech MX',
      tipo: 'SALIDA',
      motivo: 'VENTA',
      cantidad: 3,
      cantidadAnterior: 20,
      cantidadNueva: 17,
      usuario: 'María García',
      observaciones: 'Venta a cliente',
      documentoReferencia: 'VT-045-2024',
      fecha: new Date('2024-10-01T15:45:00'),
      ubicacion: 'Tienda'
    }
  ];

  const mockAlertas: StockAlert[] = [
    {
      productoId: '3',
      productoCodigo: 'PROD-003',
      productoNombre: 'Teclado Mecánico RGB',
      cantidadActual: 2,
      stockMinimo: 10,
      estado: 'CRITICO'
    },
    {
      productoId: '4',
      productoCodigo: 'PROD-004',
      productoNombre: 'Monitor 27" 4K',
      cantidadActual: 8,
      stockMinimo: 15,
      estado: 'BAJO'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StockSummaryCards products={allProducts} />

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
                {mockAlertas.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    {mockAlertas.length}
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
            {/* Export Button */}
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Exportar</span>
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
          <StockMovementsTable movimientos={mockMovimientos} />
        )}
        
        {selectedView === 'alertas' && (
          <StockAlertsPanel alertas={mockAlertas} />
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
          onClose={() => setShowAdjustmentModal(false)}
          onAdjust={(data: any) => {
            console.log('Ajuste de stock:', data);
            setShowAdjustmentModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ControlStockPage;
