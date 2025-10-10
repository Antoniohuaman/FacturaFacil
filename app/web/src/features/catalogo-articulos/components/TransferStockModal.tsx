// src/features/catalogo-articulos/components/TransferStockModal.tsx

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Package, Building2, AlertCircle } from 'lucide-react';
import { useProductStore } from '../hooks/useProductStore';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (data: TransferData) => void;
}

export interface TransferData {
  productoId: string;
  establecimientoOrigenId: string;
  establecimientoDestinoId: string;
  cantidad: number;
  documentoReferencia: string;
  observaciones: string;
}

const TransferStockModal: React.FC<TransferStockModalProps> = ({
  isOpen,
  onClose,
  onTransfer
}) => {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const todosLosEstablecimientos = configState.establishments.filter(e => e.isActive);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [establecimientoOrigenId, setEstablecimientoOrigenId] = useState('');
  const [establecimientoDestinoId, setEstablecimientoDestinoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showProductList, setShowProductList] = useState(false);

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

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedProductId('');
      setEstablecimientoOrigenId('');
      setEstablecimientoDestinoId('');
      setCantidad('');
      setDocumentoReferencia('');
      setObservaciones('');
      setShowProductList(false);
    }
  }, [isOpen]);

  const selectedProduct = allProducts.find(p => p.id === selectedProductId);
  const establecimientoOrigen = todosLosEstablecimientos.find(e => e.id === establecimientoOrigenId);
  const establecimientoDestino = todosLosEstablecimientos.find(e => e.id === establecimientoDestinoId);

  // Calcular stock disponible en origen
  // TEMPORAL: Usar stock total del producto hasta implementar distribución por establecimiento
  const stockDisponibleOrigen = selectedProduct && establecimientoOrigenId
    ? (selectedProduct.stockPorEstablecimiento?.[establecimientoOrigenId] ?? selectedProduct.cantidad)
    : 0;

  // Calcular stock actual en destino
  // TEMPORAL: Usar 0 como stock destino hasta implementar distribución por establecimiento
  const stockActualDestino = selectedProduct && establecimientoDestinoId
    ? (selectedProduct.stockPorEstablecimiento?.[establecimientoDestinoId] ?? 0)
    : 0;

  const filteredProducts = allProducts.filter(p =>
    (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) &&
    p.tipoExistencia !== 'SERVICIOS' // Los servicios no tienen stock
  );

  const handleSubmit = () => {
    // Validaciones
    if (!selectedProductId) {
      alert('Por favor selecciona un producto');
      return;
    }

    if (!establecimientoOrigenId) {
      alert('Por favor selecciona el establecimiento de origen');
      return;
    }

    if (!establecimientoDestinoId) {
      alert('Por favor selecciona el establecimiento de destino');
      return;
    }

    if (establecimientoOrigenId === establecimientoDestinoId) {
      alert('El establecimiento de origen y destino no pueden ser el mismo');
      return;
    }

    const cantidadNum = Number(cantidad);
    if (!cantidad || cantidadNum <= 0) {
      alert('Por favor ingresa una cantidad válida mayor a 0');
      return;
    }

    if (cantidadNum > stockDisponibleOrigen) {
      alert(`No hay suficiente stock en ${establecimientoOrigen?.name}. Disponible: ${stockDisponibleOrigen}`);
      return;
    }

    // Ejecutar transferencia
    onTransfer({
      productoId: selectedProductId,
      establecimientoOrigenId,
      establecimientoDestinoId,
      cantidad: cantidadNum,
      documentoReferencia,
      observaciones
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Transferencia entre Establecimientos
              </h2>
              <p className="text-green-100 text-sm">
                Transfiere stock de un establecimiento a otro
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Producto Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto a transferir <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedProduct ? `${selectedProduct.codigo} - ${selectedProduct.nombre}` : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductList(true);
                  if (!e.target.value) {
                    setSelectedProductId('');
                  }
                }}
                onFocus={() => setShowProductList(true)}
                placeholder="Buscar por código o nombre..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Package className="absolute right-3 top-3 w-5 h-5 text-gray-400" />

              {/* Product Dropdown */}
              {showProductList && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setSearchTerm('');
                        setShowProductList(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{product.nombre}</div>
                      <div className="text-sm text-gray-600">Código: {product.codigo} | Stock total: {product.cantidad}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transfer Flow */}
          {selectedProduct && (
            <div className="space-y-4">
              {/* Origen */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                    Establecimiento Origen
                  </h3>
                </div>
                
                <select
                  value={establecimientoOrigenId}
                  onChange={(e) => setEstablecimientoOrigenId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-3"
                  disabled={establecimientosDisponibles.length === 0}
                >
                  <option value="">
                    {establecimientosDisponibles.length === 0
                      ? 'No hay establecimientos disponibles para este producto'
                      : 'Seleccionar establecimiento de origen...'}
                  </option>
                  {establecimientosDisponibles.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.code} - {est.name}
                    </option>
                  ))}
                </select>

                {selectedProductId && establecimientosDisponibles.length === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-red-600">
                      ⚠️ Este producto no está asignado a ningún establecimiento activo
                    </p>
                  </div>
                )}
                {selectedProductId && establecimientosDisponibles.length > 0 && !selectedProduct?.disponibleEnTodos && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 mb-3">
                    <p className="text-xs text-blue-700">
                      ℹ️ Solo se muestran los {establecimientosDisponibles.length} establecimientos donde este producto está registrado
                    </p>
                  </div>
                )}

                {establecimientoOrigenId && (
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock disponible:</span>
                      <span className={`text-lg font-bold ${stockDisponibleOrigen > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stockDisponibleOrigen} {selectedProduct.unidad}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-green-600" />
                </div>
              </div>

              {/* Destino */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-purple-900 uppercase tracking-wide">
                    Establecimiento Destino
                  </h3>
                </div>
                
                <select
                  value={establecimientoDestinoId}
                  onChange={(e) => setEstablecimientoDestinoId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white mb-3"
                  disabled={!establecimientoOrigenId || establecimientosDisponibles.length === 0}
                >
                  <option value="">Seleccionar establecimiento de destino...</option>
                  {establecimientosDisponibles
                    .filter(est => est.id !== establecimientoOrigenId)
                    .map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.code} - {est.name}
                      </option>
                    ))}
                </select>

                {establecimientoDestinoId && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Stock actual:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {stockActualDestino} {selectedProduct.unidad}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cantidad */}
              {establecimientoOrigenId && establecimientoDestinoId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad a transferir <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      min="1"
                      max={stockDisponibleOrigen}
                      placeholder={`Máximo: ${stockDisponibleOrigen}`}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {Number(cantidad) > stockDisponibleOrigen && (
                      <div className="flex items-center space-x-2 mt-2 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>La cantidad excede el stock disponible</span>
                      </div>
                    )}
                  </div>

                  {/* Documento Referencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Documento de referencia
                    </label>
                    <input
                      type="text"
                      value={documentoReferencia}
                      onChange={(e) => setDocumentoReferencia(e.target.value)}
                      placeholder="Ej: GUIA-001, ORDEN-123..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      placeholder="Notas adicionales sobre esta transferencia..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  {/* Resumen */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm text-amber-800">
                        <p className="font-semibold mb-1">Resumen de la transferencia:</p>
                        <ul className="space-y-1">
                          <li>• Se restará <strong>{cantidad || 0}</strong> unidades de <strong>{establecimientoOrigen?.name}</strong></li>
                          <li>• Se sumará <strong>{cantidad || 0}</strong> unidades a <strong>{establecimientoDestino?.name}</strong></li>
                          <li>• Nuevo stock origen: <strong>{stockDisponibleOrigen - Number(cantidad || 0)}</strong> unidades</li>
                          <li>• Nuevo stock destino: <strong>{stockActualDestino + Number(cantidad || 0)}</strong> unidades</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProductId || !establecimientoOrigenId || !establecimientoDestinoId || !cantidad || Number(cantidad) <= 0 || Number(cantidad) > stockDisponibleOrigen}
            className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Transferir Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferStockModal;
