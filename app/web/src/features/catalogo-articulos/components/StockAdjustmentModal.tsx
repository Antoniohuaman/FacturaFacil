// src/features/catalogo-articulos/components/StockAdjustmentModal.tsx

import React, { useState } from 'react';
import type { MovimientoStockTipo, MovimientoStockMotivo } from '../models/types';
import { useProductStore } from '../hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjust: (data: AdjustmentData) => void;
  preSelectedProductId?: string | null;
  preSelectedQuantity?: number;
}

interface AdjustmentData {
  productoId: string;
  tipo: MovimientoStockTipo;
  motivo: MovimientoStockMotivo;
  cantidad: number;
  observaciones: string;
  documentoReferencia: string;
  establecimientoId?: string;
  establecimientoCodigo?: string;
  establecimientoNombre?: string;
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjust,
  preSelectedProductId,
  preSelectedQuantity
}) => {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const todosLosEstablecimientos = configState.establishments.filter(e => e.isActive);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(preSelectedProductId || '');

  // ✅ NUEVO: Filtrar establecimientos según el producto seleccionado
  const establecimientosDisponibles = selectedProductId
    ? todosLosEstablecimientos.filter(est => {
        const producto = allProducts.find(p => p.id === selectedProductId);
        if (!producto) return false;

        // Si el producto está disponible en todos, mostrar todos
        if (producto.disponibleEnTodos) return true;

        // Si no, solo mostrar los establecimientos asignados al producto
        return producto.establecimientoIds?.includes(est.id) || false;
      })
    : todosLosEstablecimientos;
  const [tipo, setTipo] = useState<MovimientoStockTipo>('ENTRADA');
  const [motivo, setMotivo] = useState<MovimientoStockMotivo>('COMPRA');
  const [cantidad, setCantidad] = useState(preSelectedQuantity ? String(preSelectedQuantity) : '');
  const [observaciones, setObservaciones] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [selectedEstablecimientoId, setSelectedEstablecimientoId] = useState('');

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

  const motivosPorTipo: Record<MovimientoStockTipo, MovimientoStockMotivo[]> = {
    ENTRADA: ['COMPRA', 'DEVOLUCION_CLIENTE', 'PRODUCCION', 'OTRO'],
    SALIDA: ['VENTA', 'PRODUCTO_DAÑADO', 'PRODUCTO_VENCIDO', 'ROBO_PERDIDA', 'OTRO'],
    AJUSTE_POSITIVO: ['AJUSTE_INVENTARIO', 'OTRO'],
    AJUSTE_NEGATIVO: ['AJUSTE_INVENTARIO', 'MERMA', 'OTRO'],
    DEVOLUCION: ['DEVOLUCION_PROVEEDOR', 'DEVOLUCION_CLIENTE', 'OTRO'],
    MERMA: ['PRODUCTO_DAÑADO', 'PRODUCTO_VENCIDO', 'OTRO'],
    TRANSFERENCIA: ['TRANSFERENCIA_ALMACEN', 'OTRO']
  };

  const motivoLabels: Record<MovimientoStockMotivo, string> = {
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

  const handleTipoChange = (newTipo: MovimientoStockTipo) => {
    setTipo(newTipo);
    const motivosDisponibles = motivosPorTipo[newTipo];
    if (motivosDisponibles.length > 0) {
      setMotivo(motivosDisponibles[0]);
    }
  };

  const handleSubmit = () => {
    if (!selectedProductId || !cantidad || Number(cantidad) <= 0) {
      alert('⚠️ Por favor completa todos los campos requeridos\n\n• Producto\n• Cantidad (mayor a 0)');
      return;
    }

    if (!selectedEstablecimientoId) {
      alert('⚠️ Por favor selecciona un establecimiento');
      return;
    }

    // ✅ VALIDACIÓN ADICIONAL: Prevenir stock negativo en salidas
    if (selectedProduct && (tipo === 'SALIDA' || tipo === 'AJUSTE_NEGATIVO' || tipo === 'MERMA')) {
      const cantidadSolicitada = Number(cantidad);
      const stockDisponible = selectedProduct.stockPorEstablecimiento?.[selectedEstablecimientoId]
        ?? selectedProduct.cantidad;

      if (cantidadSolicitada > stockDisponible) {
        alert(
          `❌ STOCK INSUFICIENTE\n\n` +
          `Producto: ${selectedProduct.nombre}\n` +
          `Establecimiento: ${todosLosEstablecimientos.find(e => e.id === selectedEstablecimientoId)?.name}\n\n` +
          `Stock disponible: ${stockDisponible} ${selectedProduct.unidad}\n` +
          `Cantidad solicitada: ${cantidadSolicitada} ${selectedProduct.unidad}\n` +
          `Faltante: ${cantidadSolicitada - stockDisponible} ${selectedProduct.unidad}\n\n` +
          `💡 Reduce la cantidad o selecciona ENTRADA en lugar de ${tipo}`
        );
        return;
      }
    }

    const establecimientoSeleccionado = todosLosEstablecimientos.find(e => e.id === selectedEstablecimientoId);

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

  const newStock = selectedProduct
    ? tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION'
      ? selectedProduct.cantidad + Number(cantidad || 0)
      : selectedProduct.cantidad - Number(cantidad || 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
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
            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto *
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {searchTerm && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setSearchTerm(product.nombre);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{product.nombre}</p>
                            <p className="text-sm text-gray-500 font-mono">{product.codigo}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Stock: {product.cantidad}</p>
                            <p className="text-xs text-gray-500">{product.unidad}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedProduct.nombre}</p>
                      <p className="text-sm text-gray-600 font-mono">{selectedProduct.codigo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Stock Actual</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedProduct.cantidad}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tipo de Movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Movimiento *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] as MovimientoStockTipo[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTipoChange(t)}
                    className={`
                      px-4 py-3 rounded-md text-sm font-medium transition-all border-2
                      ${tipo === t
                        ? t === 'ENTRADA' || t === 'AJUSTE_POSITIVO'
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo *
              </label>
              <select
                value={motivo}
                onChange={(e) => setMotivo(e.target.value as MovimientoStockMotivo)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              {selectedProduct && cantidad && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nuevo Stock
                  </label>
                  <div className={`
                    w-full px-4 py-2 border-2 rounded-md font-bold text-lg
                    ${newStock < 0
                      ? 'border-red-300 bg-red-50 text-red-600'
                      : newStock > selectedProduct.cantidad
                      ? 'border-green-300 bg-green-50 text-green-600'
                      : 'border-blue-300 bg-blue-50 text-blue-600'
                    }
                  `}>
                    {selectedProduct.cantidad} → {newStock}
                  </div>
                </div>
              )}
            </div>

            {/* Establecimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Establecimiento <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedEstablecimientoId}
                onChange={(e) => setSelectedEstablecimientoId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
                disabled={establecimientosDisponibles.length === 0}
              >
                <option value="">
                  {establecimientosDisponibles.length === 0
                    ? 'No hay establecimientos disponibles para este producto'
                    : 'Seleccionar establecimiento...'}
                </option>
                {establecimientosDisponibles.map(est => (
                  <option key={est.id} value={est.id}>
                    [{est.code}] {est.name} - {est.district}
                  </option>
                ))}
              </select>
              {selectedEstablecimientoId && (
                <p className="mt-1 text-xs text-gray-500">
                  El movimiento se registrará en este establecimiento
                </p>
              )}
              {selectedProductId && establecimientosDisponibles.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  ⚠️ Este producto no está asignado a ningún establecimiento activo
                </p>
              )}
              {selectedProductId && establecimientosDisponibles.length > 0 && !selectedProduct?.disponibleEnTodos && (
                <p className="mt-1 text-xs text-blue-600">
                  ℹ️ Solo se muestran los {establecimientosDisponibles.length} establecimientos donde este producto está registrado
                </p>
              )}
            </div>

            {/* Documento Referencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento de Referencia
              </label>
              <input
                type="text"
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                placeholder="Ej: FC-001-2024, GR-045, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalles adicionales sobre este movimiento..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
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

export default StockAdjustmentModal;
