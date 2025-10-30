// src/features/inventario/components/modals/AdjustmentModal.tsx

import React, { useState } from 'react';
import type { MovimientoTipo, MovimientoMotivo } from '../../models';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/context/ConfigurationContext';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (data: AdjustmentData) => void;
  preSelectedProductId?: string | null;
  preSelectedQuantity?: number;
}

interface AdjustmentData {
  productoId: string;
  tipo: MovimientoTipo;
  motivo: MovimientoMotivo;
  cantidad: number;
  observaciones: string;
  documentoReferencia: string;
  establecimientoId?: string;
  establecimientoCodigo?: string;
  establecimientoNombre?: string;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjust,
  preSelectedProductId,
  preSelectedQuantity
}) => {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const establecimientos = configState.establishments.filter(e => e.isActive);

  // PASO 1: Primero seleccionar establecimiento(s)
  const [selectedEstablecimientoId, setSelectedEstablecimientoId] = useState('');

  // PASO 2: Luego seleccionar producto
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(preSelectedProductId || '');

  // PASO 3: Detalles del movimiento
  const [tipo, setTipo] = useState<MovimientoTipo>('ENTRADA');
  const [motivo, setMotivo] = useState<MovimientoMotivo>('COMPRA');
  const [cantidad, setCantidad] = useState(preSelectedQuantity ? String(preSelectedQuantity) : '');
  const [observaciones, setObservaciones] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');

  // Actualizar cuando cambian los props
  React.useEffect(() => {
    if (preSelectedProductId) {
      setSelectedProductId(preSelectedProductId);
    }
    if (preSelectedQuantity) {
      setCantidad(String(preSelectedQuantity));
    }
  }, [preSelectedProductId, preSelectedQuantity]);

  const selectedProduct = allProducts.find(p => p.id === selectedProductId);

  const filteredProducts = allProducts.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const motivosPorTipo: Record<MovimientoTipo, MovimientoMotivo[]> = {
    ENTRADA: ['COMPRA', 'DEVOLUCION_CLIENTE', 'PRODUCCION', 'OTRO'],
    SALIDA: ['VENTA', 'PRODUCTO_DAÑADO', 'PRODUCTO_VENCIDO', 'ROBO_PERDIDA', 'OTRO'],
    AJUSTE_POSITIVO: ['AJUSTE_INVENTARIO', 'OTRO'],
    AJUSTE_NEGATIVO: ['AJUSTE_INVENTARIO', 'MERMA', 'OTRO'],
    DEVOLUCION: ['DEVOLUCION_PROVEEDOR', 'DEVOLUCION_CLIENTE', 'OTRO'],
    MERMA: ['PRODUCTO_DAÑADO', 'PRODUCTO_VENCIDO', 'OTRO'],
    TRANSFERENCIA: ['TRANSFERENCIA_ALMACEN', 'OTRO']
  };

  const motivoLabels: Record<MovimientoMotivo, string> = {
    COMPRA: 'Compra a proveedor',
    VENTA: 'Venta a cliente',
    AJUSTE_INVENTARIO: 'Ajuste de inventario',
    DEVOLUCION_CLIENTE: 'Devolución de cliente',
    DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
    PRODUCTO_DAÑADO: 'Producto dañado',
    PRODUCTO_VENCIDO: 'Producto vencido',
    ROBO_PERDIDA: 'Robo o pérdida',
    TRANSFERENCIA_ALMACEN: 'Transferencia entre almacenes',
    PRODUCCION: 'Producción interna',
    MERMA: 'Merma de producto',
    OTRO: 'Otro motivo'
  };

  const handleTipoChange = (newTipo: MovimientoTipo) => {
    setTipo(newTipo);
    const motivosDisponibles = motivosPorTipo[newTipo];
    if (motivosDisponibles.length > 0) {
      setMotivo(motivosDisponibles[0]);
    }
  };

  const handleSubmit = () => {
    if (!selectedProductId || !cantidad || Number(cantidad) <= 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (!selectedEstablecimientoId) {
      alert('Por favor selecciona un establecimiento');
      return;
    }

    const establecimientoSeleccionado = establecimientos.find(e => e.id === selectedEstablecimientoId);

    onAdjust({
      productoId: selectedProductId,
      tipo,
      motivo,
      cantidad: Number(cantidad),
      observaciones,
      documentoReferencia,
      establecimientoId: selectedEstablecimientoId,
      establecimientoCodigo: establecimientoSeleccionado?.code,
      establecimientoNombre: establecimientoSeleccionado?.name
    });

    // Reset form
    setSelectedProductId('');
    setTipo('ENTRADA');
    setMotivo('COMPRA');
    setCantidad('');
    setObservaciones('');
    setDocumentoReferencia('');
    setSelectedEstablecimientoId('');
    setSearchTerm('');
  };

  if (!isOpen) return null;

  // Obtener stock actual del establecimiento seleccionado (no global)
  const stockActualEstablecimiento = selectedProduct && selectedEstablecimientoId
    ? (selectedProduct.stockPorEstablecimiento?.[selectedEstablecimientoId] ?? 0)
    : 0;

  const newStock = selectedProduct && selectedEstablecimientoId
    ? tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION'
      ? stockActualEstablecimiento + Number(cantidad || 0)
      : stockActualEstablecimiento - Number(cantidad || 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Ajustar Stock
                  </h3>
                  <p className="text-sm text-red-100">
                    Registra entrada, salida o ajuste de inventario
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-red-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* PASO 1: Establecimiento (PRIMERO) */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                  1. Seleccionar Establecimiento <span className="text-red-500">*</span>
                </label>
              </div>
              <select
                value={selectedEstablecimientoId}
                onChange={(e) => {
                  setSelectedEstablecimientoId(e.target.value);
                  // Reset producto al cambiar establecimiento
                  setSelectedProductId('');
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Seleccionar establecimiento...</option>
                {establecimientos.map(est => (
                  <option key={est.id} value={est.id}>
                    [{est.code}] {est.name} - {est.district}
                  </option>
                ))}
              </select>
              {selectedEstablecimientoId && (
                <p className="mt-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 rounded">
                  ✓ Movimiento se aplicará en este establecimiento
                </p>
              )}
            </div>

            {/* PASO 2: Product Selection (SEGUNDO - solo si hay establecimiento) */}
            {selectedEstablecimientoId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  2. Buscar Producto <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  />
                  {searchTerm && filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredProducts.map((product) => {
                        // Mostrar stock del establecimiento seleccionado
                        const stockEnEst = product.stockPorEstablecimiento?.[selectedEstablecimientoId] ?? 0;
                        return (
                          <button
                            key={product.id}
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setSearchTerm(product.nombre);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-200">{product.nombre}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{product.codigo}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Stock: {stockEnEst}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{product.unidad}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedProduct && (
                  <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-200">{selectedProduct.nombre}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{selectedProduct.codigo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Stock en {establecimientos.find(e => e.id === selectedEstablecimientoId)?.code}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stockActualEstablecimiento}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tipo de Movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Movimiento *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] as MovimientoTipo[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTipoChange(t)}
                    className={`
                      px-4 py-3 rounded-md text-sm font-medium transition-all border-2
                      ${tipo === t
                        ? t === 'ENTRADA' || t === 'AJUSTE_POSITIVO'
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400'
                          : 'bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                      }
                    `}
                  >
                    {t === 'ENTRADA' && '➕ Entrada'}
                    {t === 'SALIDA' && '➖ Salida'}
                    {t === 'AJUSTE_POSITIVO' && '⬆️ Ajuste +'}
                    {t === 'AJUSTE_NEGATIVO' && '⬇️ Ajuste -'}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo *
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MovimientoMotivo)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              >
                {motivosPorTipo[tipo].map((m) => (
                  <option key={m} value={m}>
                    {motivoLabels[m]}
                  </option>
                ))}
              </select>
            </div>

            {/* Cantidad y Stock Resultante */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {selectedProduct && selectedEstablecimientoId && cantidad && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nuevo Stock en {establecimientos.find(e => e.id === selectedEstablecimientoId)?.code}
                  </label>
                  <div className={`
                    w-full px-4 py-2 border-2 rounded-md font-bold text-lg
                    ${newStock < 0
                      ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : newStock > stockActualEstablecimiento
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }
                  `}>
                    {stockActualEstablecimiento} → {newStock}
                  </div>
                </div>
              )}
            </div>

            {/* Documento Referencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Documento de Referencia
              </label>
              <input
                type="text"
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                placeholder="Ej: FC-001-2024, GR-045, etc."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observaciones
              </label>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles adicionales sobre este movimiento..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedProductId || !cantidad || Number(cantidad) <= 0}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Registrar Movimiento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentModal;
