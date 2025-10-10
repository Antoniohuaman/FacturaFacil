// src/features/catalogo-articulos/components/StockDetailModal.tsx

import React from 'react';
import { X, Building2, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Product } from '../models/types';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ isOpen, onClose, product }) => {
  const { state: configState } = useConfigurationContext();
  const establishments = configState.establishments.filter(e => e.isActive);

  if (!isOpen || !product) return null;

  const stockPorEstablecimiento = product.stockPorEstablecimiento || {};
  const tieneDistribucion = Object.keys(stockPorEstablecimiento).length > 0;
  const stockTotal = product.cantidad;

  // Calcular estadísticas
  const establecimientosConStock = Object.entries(stockPorEstablecimiento).filter(([_, qty]) => qty > 0).length;
  const stockDistribuido = Object.values(stockPorEstablecimiento).reduce((sum, qty) => sum + qty, 0);
  const stockMaximo = Math.max(...Object.values(stockPorEstablecimiento), 0);
  const stockPromedio = establecimientosConStock > 0 ? stockDistribuido / establecimientosConStock : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-3xl overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all transform">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Stock por Establecimiento
                  </h3>
                  <p className="text-purple-100 text-sm mt-0.5">
                    {product.codigo} - {product.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">{stockTotal}</p>
                <p className="text-xs text-blue-700 font-medium">Stock Total</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-900">{establecimientosConStock}</p>
                <p className="text-xs text-green-700 font-medium">Con Stock</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">{stockMaximo}</p>
                <p className="text-xs text-purple-700 font-medium">Stock Máximo</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-900">{stockPromedio.toFixed(1)}</p>
                <p className="text-xs text-orange-700 font-medium">Promedio</p>
              </div>
            </div>

            {/* Modo de distribución */}
            {product.disponibleEnTodos ? (
              <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900">Disponible en todos los establecimientos</p>
                    <p className="text-sm text-purple-700">
                      Este producto está visible en los {establishments.length} establecimiento(s) activo(s)
                    </p>
                  </div>
                </div>
              </div>
            ) : tieneDistribucion ? (
              <>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-gray-600" />
                  Distribución Detallada
                </h4>

                {/* Lista de establecimientos */}
                <div className="space-y-3">
                  {product.establecimientoIds.map(estId => {
                    const establecimiento = establishments.find(e => e.id === estId);
                    const stockEnEst = stockPorEstablecimiento[estId] || 0;
                    const porcentaje = stockTotal > 0 ? (stockEnEst / stockTotal) * 100 : 0;

                    if (!establecimiento) return null;

                    return (
                      <div 
                        key={estId}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Building2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <h5 className="font-semibold text-gray-900 truncate">
                                {establecimiento.name}
                              </h5>
                              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                {establecimiento.code}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate">
                              {establecimiento.address}, {establecimiento.district}
                            </p>
                          </div>
                          
                          <div className="text-right ml-4">
                            <p className={`
                              text-2xl font-bold
                              ${stockEnEst > 10 ? 'text-green-600' : stockEnEst > 0 ? 'text-yellow-600' : 'text-gray-400'}
                            `}>
                              {stockEnEst}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">unidades</p>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="font-medium">
                              {porcentaje.toFixed(1)}% del total
                            </span>
                            {stockEnEst === 0 && (
                              <span className="text-red-600 font-semibold flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Sin stock
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                stockEnEst > 10 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : stockEnEst > 0 
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
                                    : 'bg-gray-300'
                              }`}
                              style={{ width: `${porcentaje}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">Sin distribución específica</p>
                <p className="text-sm text-gray-500 mt-1">
                  El stock no está distribuido por establecimiento
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
