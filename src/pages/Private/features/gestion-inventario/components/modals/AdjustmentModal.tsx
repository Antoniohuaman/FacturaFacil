// src/features/inventario/components/modals/AdjustmentModal.tsx

import React, { useState } from 'react';
import type { MovimientoTipo, MovimientoMotivo } from '../../models';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface AdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (data: AdjustmentData) => void;
  preSelectedProductId?: string | null;
  preSelectedQuantity?: number;
  prefilledAlmacenId?: string | null;
  mode?: 'manual' | 'prefilled';
}

interface AdjustmentData {
  productoId: string;
  almacenId: string;
  tipo: MovimientoTipo;
  motivo: MovimientoMotivo;
  cantidad: number;
  observaciones: string;
  documentoReferencia: string;
}

const AdjustmentModal: React.FC<AdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjust,
  preSelectedProductId,
  preSelectedQuantity,
  prefilledAlmacenId,
  mode = 'manual'
}) => {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const almacenes = configState.almacenes.filter(w => w.estaActivoAlmacen);

  // PASO 1: Primero seleccionar almacén
  const [selectedalmacenId, setSelectedalmacenId] = useState(prefilledAlmacenId ?? '');

  // PASO 2: Luego seleccionar producto
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(preSelectedProductId || '');

  // PASO 3: Detalles del movimiento
  const [tipo, setTipo] = useState<MovimientoTipo>('ENTRADA');
  const [motivo, setMotivo] = useState<MovimientoMotivo>('COMPRA');
  const [cantidad, setCantidad] = useState(
    typeof preSelectedQuantity === 'number' ? String(preSelectedQuantity) : ''
  );
  const [observaciones, setObservaciones] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [showObservaciones, setShowObservaciones] = useState(false);

  const isPrefilledProduct = mode === 'prefilled' && Boolean(preSelectedProductId);
  const isAlmacenLocked = Boolean(prefilledAlmacenId);

  // Actualizar cuando cambian los props
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (prefilledAlmacenId) {
      setSelectedalmacenId(prefilledAlmacenId);
    } else {
      setSelectedalmacenId('');
    }
    setSearchTerm('');
  }, [isOpen, prefilledAlmacenId]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (preSelectedProductId) {
      setSelectedProductId(preSelectedProductId);
    } else if (!isPrefilledProduct) {
      setSelectedProductId('');
    }
  }, [isOpen, preSelectedProductId, isPrefilledProduct]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (typeof preSelectedQuantity === 'number' && preSelectedQuantity > 0) {
      setCantidad(String(preSelectedQuantity));
    } else if (typeof preSelectedQuantity === 'number' && preSelectedQuantity <= 0) {
      setCantidad('');
    }
  }, [isOpen, preSelectedQuantity]);

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

    if (!selectedalmacenId) {
      alert('Por favor selecciona un almacén');
      return;
    }

    onAdjust({
      productoId: selectedProductId,
      almacenId: selectedalmacenId,
      tipo,
      motivo,
      cantidad: Number(cantidad),
      observaciones,
      documentoReferencia
    });

    // Reset form
    setSelectedProductId('');
    setTipo('ENTRADA');
    setMotivo('COMPRA');
    setCantidad('');
    setObservaciones('');
    setDocumentoReferencia('');
    setSelectedalmacenId('');
    setSearchTerm('');
  };

  if (!isOpen) return null;

  const selectedalmacen = almacenes.find(w => w.id === selectedalmacenId);

  // Obtener stock actual del almacén seleccionado
  const stockActualAlmacen = selectedProduct?.stockPorAlmacen?.[selectedalmacenId] ?? 0;

  const newStock = selectedProduct && selectedalmacenId
    ? tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION'
      ? stockActualAlmacen + Number(cantidad || 0)
      : stockActualAlmacen - Number(cantidad || 0)
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
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-9 h-9 bg-white/90 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Ajustar Stock
                  </h3>
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
          <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Almacén
                  </label>
                  <select
                    value={selectedalmacenId}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setSelectedalmacenId(nextValue);
                      if (!isPrefilledProduct) {
                        setSelectedProductId('');
                        setSearchTerm('');
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:text-white"
                    disabled={isAlmacenLocked}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {almacenes.map(wh => (
                      <option key={wh.id} value={wh.id}>
                        [{wh.codigoAlmacen}] {wh.nombreAlmacen}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedalmacenId && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {isPrefilledProduct ? 'Producto' : 'Buscar producto'}
                      </label>
                      {!isPrefilledProduct && (
                        <span className="text-[10px] text-gray-400">Obligatorio</span>
                      )}
                    </div>

                    {!isPrefilledProduct && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Nombre o código"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:text-white"
                        />
                        {searchTerm && filteredProducts.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                            {filteredProducts.map((product) => {
                              const stockEnAlmacen = selectedalmacenId ? (product.stockPorAlmacen?.[selectedalmacenId] ?? 0) : 0;
                              return (
                                <button
                                  key={product.id}
                                  onClick={() => {
                                    setSelectedProductId(product.id);
                                    setSearchTerm(product.nombre);
                                  }}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{product.nombre}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Stock {stockEnAlmacen}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProduct && (
                      <div className="mt-3 rounded-md border border-dashed border-gray-300 px-3 py-2 dark:border-gray-600">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedProduct.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedProduct.codigo}</p>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 mt-1">
                          Stock en {selectedalmacen?.codigoAlmacen}: <span className="tabular-nums">{stockActualAlmacen}</span>
                        </p>
                      </div>
                    )}

                    {isPrefilledProduct && !selectedProduct && (
                      <p className="mt-2 text-xs text-red-500">Producto no disponible.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Tipo de movimiento
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] as MovimientoTipo[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleTipoChange(t)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors
                          ${tipo === t
                            ? t === 'ENTRADA' || t === 'AJUSTE_POSITIVO'
                              ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-500/70 dark:bg-green-900/30 dark:text-green-300'
                              : 'border-red-500 bg-red-50 text-red-600 dark:border-red-500/70 dark:bg-red-900/30 dark:text-red-300'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'}
                        `}
                      >
                        {t === 'ENTRADA' && 'Entrada'}
                        {t === 'SALIDA' && 'Salida'}
                        {t === 'AJUSTE_POSITIVO' && 'Ajuste +'}
                        {t === 'AJUSTE_NEGATIVO' && 'Ajuste -'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Motivo
                  </label>
                  <select
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value as MovimientoMotivo)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:text-white"
                  >
                    {motivosPorTipo[tipo].map((m) => (
                      <option key={m} value={m}>
                        {motivoLabels[m]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:text-white"
                    />
                  </div>
                  {selectedProduct && selectedalmacenId && cantidad && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                        Nuevo stock
                      </label>
                      <div className={`rounded-md border px-3 py-2 text-sm font-semibold tabular-nums
                        ${newStock < 0
                          ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : newStock > stockActualAlmacen
                          ? 'border-green-300 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }
                      `}>
                        {stockActualAlmacen} → {newStock}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Documento
                  </label>
                  <input
                    type="text"
                    value={documentoReferencia}
                    onChange={(e) => setDocumentoReferencia(e.target.value)}
                    placeholder="Ej: FC-001-2024"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowObservaciones(prev => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                <span>Observaciones</span>
                <svg
                  className={`h-4 w-4 transition-transform ${showObservaciones ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showObservaciones && (
                <div className="px-3 pb-3">
                  <textarea
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Detalles adicionales"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:text-white"
                  />
                </div>
              )}
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
              disabled={!selectedProductId || !cantidad || Number(cantidad) <= 0 || !selectedalmacenId}
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
