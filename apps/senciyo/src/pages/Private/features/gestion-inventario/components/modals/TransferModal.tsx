// src/features/inventario/components/modals/TransferModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRight, Package, AlertCircle, AlertTriangle } from 'lucide-react';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useCurrentEstablecimientoId } from '@/contexts/UserSessionContext';
import { getUnitDisplayForUI } from '@/shared/units/unitDisplay';
import { isProductEnabledForEstablecimiento } from '../../../catalogo-articulos/models/types';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (data: TransferData) => void;
}

export interface TransferData {
  productoId: string;
  almacenOrigenId: string;
  almacenDestinoId: string;
  cantidad: number;
  documentoReferencia: string;
  observaciones: string;
  habilitarProductoEnDestino?: boolean;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onTransfer }) => {
  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();
  const currentEstablecimientoId = useCurrentEstablecimientoId();
  const almacenesActivos = configState.almacenes.filter(w => w.estaActivoAlmacen);

  // Origen: solo almacenes del establecimiento activo
  const almacenesOrigen = currentEstablecimientoId
    ? almacenesActivos.filter(w => w.establecimientoId === currentEstablecimientoId)
    : almacenesActivos;

  // ¿Hay almacenes de más de un establecimiento? → controla visibilidad del selector
  const hayMultiplesEstablecimientos = useMemo(() => {
    const ids = new Set(almacenesActivos.map(a => a.establecimientoId ?? '').filter(id => id !== ''));
    return ids.size > 1;
  }, [almacenesActivos]);

  // Selector compacto de tipo de transferencia
  const [tipoSelector, setTipoSelector] = useState<'INTRA' | 'INTER'>('INTRA');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [almacenOrigenId, setalmacenOrigenId] = useState('');
  const [almacenDestinoId, setalmacenDestinoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [documentoReferencia, setDocumentoReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  // BRECHA-01: confirmación explícita del usuario para habilitar producto en destino
  const [habilitacionConfirmada, setHabilitacionConfirmada] = useState(false);

  // Almacenes destino filtrados por el tipo seleccionado
  const almacenesDestino = useMemo(() => {
    if (tipoSelector === 'INTRA') {
      const base = currentEstablecimientoId
        ? almacenesActivos.filter(w => w.establecimientoId === currentEstablecimientoId)
        : almacenesActivos;
      return base.filter(w => w.id !== almacenOrigenId);
    }
    // INTER: solo almacenes de otros establecimientos
    return almacenesActivos.filter(w =>
      currentEstablecimientoId ? w.establecimientoId !== currentEstablecimientoId : true
    );
  }, [tipoSelector, almacenesActivos, currentEstablecimientoId, almacenOrigenId]);

  // Reset completo al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedProductId('');
      setalmacenOrigenId('');
      setalmacenDestinoId('');
      setCantidad('');
      setDocumentoReferencia('');
      setObservaciones('');
      setShowProductList(false);
      setHabilitacionConfirmada(false);
      setTipoSelector('INTRA');
    }
  }, [isOpen]);

  // Resetear confirmación cuando cambia producto o destino
  useEffect(() => {
    setHabilitacionConfirmada(false);
  }, [selectedProductId, almacenDestinoId]);

  // Cambiar tipo y limpiar destino (la selección anterior puede ser inválida para el nuevo tipo)
  const handleChangeTipo = (tipo: 'INTRA' | 'INTER') => {
    if (tipo === tipoSelector) return;
    setTipoSelector(tipo);
    setalmacenDestinoId('');
    setHabilitacionConfirmada(false);
  };

  // Cambiar origen y limpiar destino si en modo INTRA el destino coincide con el nuevo origen
  const handleChangeOrigen = (value: string) => {
    setalmacenOrigenId(value);
    if (tipoSelector === 'INTRA' && almacenDestinoId === value) {
      setalmacenDestinoId('');
    }
  };

  const selectedProduct = allProducts.find(p => p.id === selectedProductId);
  const almacenOrigen = almacenesActivos.find(w => w.id === almacenOrigenId);
  const almacenDestino = almacenesActivos.find(w => w.id === almacenDestinoId);

  const unitLabel = selectedProduct
    ? getUnitDisplayForUI({
        units: configState.units,
        code: selectedProduct.unidad,
        fallbackSymbol: selectedProduct.unitSymbol,
        fallbackName: selectedProduct.unitName,
      }) || selectedProduct.unidad
    : '';

  // BRECHA-02: stock disponible = real − reservado (no solo real)
  const stockRealOrigen = selectedProduct?.stockPorAlmacen?.[almacenOrigenId] ?? 0;
  const stockReservadoOrigen = selectedProduct?.stockReservadoPorAlmacen?.[almacenOrigenId] ?? 0;
  const stockDisponibleOrigen = Math.max(0, stockRealOrigen - stockReservadoOrigen);

  const stockActualDestino = selectedProduct?.stockPorAlmacen?.[almacenDestinoId] ?? 0;

  const cantidadNum = Number(cantidad);
  const stockExcedido = Boolean(cantidad) && cantidadNum > 0 && cantidadNum > stockDisponibleOrigen;

  // El tipo efectivo lo determina el selector compacto (el filtro de almacenes lo garantiza)
  const esInterEstablecimiento = tipoSelector === 'INTER';

  // BRECHA-01: detectar si el producto no está habilitado en el establecimiento destino
  const productoNoDisponibleEnDestino =
    esInterEstablecimiento &&
    !!selectedProduct &&
    !!almacenDestino?.establecimientoId &&
    !isProductEnabledForEstablecimiento(selectedProduct, almacenDestino.establecimientoId);

  const mostrarResumen =
    Boolean(selectedProductId && almacenOrigenId && almacenDestinoId && almacenOrigenId !== almacenDestinoId) &&
    cantidadNum > 0 &&
    !stockExcedido;

  const filteredProducts = allProducts.filter(
    p =>
      (p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) &&
      esProductoInventariable(p)
  );

  const handleSubmit = () => {
    if (
      !selectedProductId ||
      !almacenOrigenId ||
      !almacenDestinoId ||
      almacenOrigenId === almacenDestinoId ||
      !cantidad ||
      cantidadNum <= 0 ||
      cantidadNum > stockDisponibleOrigen ||
      (productoNoDisponibleEnDestino && !habilitacionConfirmada)
    ) {
      return;
    }

    onTransfer({
      productoId: selectedProductId,
      almacenOrigenId,
      almacenDestinoId,
      cantidad: cantidadNum,
      documentoReferencia,
      observaciones,
      habilitarProductoEnDestino: productoNoDisponibleEnDestino && habilitacionConfirmada,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl flex flex-col">

        {/* Header con selector compacto de tipo */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 rounded-t-xl flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ArrowRight className="w-4 h-4 text-white flex-shrink-0" />
            <h2 className="text-sm font-semibold text-white truncate">Transferencia entre Almacenes</h2>
          </div>

          {/* Selector compacto: solo visible cuando hay más de un establecimiento */}
          {hayMultiplesEstablecimientos && (
            <div className="flex items-center bg-white/15 rounded-lg p-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleChangeTipo('INTRA')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  tipoSelector === 'INTRA'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Mismo estab.
              </button>
              <button
                type="button"
                onClick={() => handleChangeTipo('INTER')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  tipoSelector === 'INTER'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Entre estab.
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Contenido compacto */}
        <div className="p-4 space-y-3">

          {/* Producto */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Producto <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedProduct ? `${selectedProduct.codigo} - ${selectedProduct.nombre}` : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductList(true);
                  if (!e.target.value) setSelectedProductId('');
                }}
                onFocus={() => setShowProductList(true)}
                placeholder="Buscar por código o nombre..."
                className="w-full pl-3 pr-9 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
              <Package className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />

              {showProductList && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setSearchTerm('');
                        setShowProductList(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{product.nombre}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{product.codigo}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Origen + Destino en 2 columnas */}
          <div className="grid grid-cols-2 gap-3">
            {/* Origen */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Origen <span className="text-red-500">*</span>
              </label>
              <select
                value={almacenOrigenId}
                onChange={(e) => handleChangeOrigen(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar...</option>
                {almacenesOrigen.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.codigoAlmacen} - {wh.nombreAlmacen}
                  </option>
                ))}
              </select>
              {almacenOrigenId && selectedProduct && (
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  Disponible:{' '}
                  <span className={`font-semibold ${stockDisponibleOrigen > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stockDisponibleOrigen} {unitLabel}
                  </span>
                  {stockReservadoOrigen > 0 && (
                    <span className="text-gray-400 dark:text-gray-500"> ({stockRealOrigen} − {stockReservadoOrigen} reservado)</span>
                  )}
                </p>
              )}
            </div>

            {/* Destino */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Destino <span className="text-red-500">*</span>
              </label>
              <select
                value={almacenDestinoId}
                onChange={(e) => setalmacenDestinoId(e.target.value)}
                disabled={!almacenOrigenId}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar...</option>
                {almacenesDestino.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.codigoAlmacen} - {wh.nombreAlmacen}
                    {esInterEstablecimiento && wh.nombreEstablecimientoDesnormalizado
                      ? ` (${wh.nombreEstablecimientoDesnormalizado})`
                      : ''}
                  </option>
                ))}
              </select>
              {almacenDestinoId && selectedProduct && (
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                  Actual:{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {stockActualDestino} {unitLabel}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Cantidad + Referencia en 2 columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                min="1"
                placeholder={almacenOrigenId && selectedProduct ? `Máx. ${stockDisponibleOrigen}` : '0'}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
              {stockExcedido && (
                <p className="text-xs mt-1 text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  Supera el stock disponible ({stockDisponibleOrigen} {unitLabel})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Referencia
              </label>
              <input
                type="text"
                value={documentoReferencia}
                onChange={(e) => setDocumentoReferencia(e.target.value)}
                placeholder="Guía, orden u otro"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Observaciones compacto */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* BRECHA-01: advertencia cuando el producto no está habilitado en el establecimiento destino */}
          {productoNoDisponibleEnDestino && almacenDestino ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>
                    Este producto no está disponible en{' '}
                    <strong>{almacenDestino.nombreEstablecimientoDesnormalizado || 'el establecimiento destino'}</strong>.
                    {' '}Al confirmar, se habilitará automáticamente en ese establecimiento y quedará{' '}
                    <strong>Pendiente</strong> hasta despacho y recepción.
                  </p>
                  <label className="flex items-center gap-1.5 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={habilitacionConfirmada}
                      onChange={e => setHabilitacionConfirmada(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-600"
                    />
                    <span className="font-medium">Confirmar habilitación del producto en el establecimiento destino</span>
                  </label>
                </div>
              </div>
            </div>
          ) : esInterEstablecimiento ? (
            /* Banner informativo para inter-establecimiento sin problema de disponibilidad */
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Entre establecimientos · Quedará <strong>Pendiente</strong> hasta despacho y recepción. Puede requerir guía.</span>
            </div>
          ) : null}

          {/* Resumen compacto en una línea */}
          {mostrarResumen && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-medium">{almacenOrigen?.nombreAlmacen}</span>
              {': '}
              {stockDisponibleOrigen} → <strong>{stockDisponibleOrigen - cantidadNum}</strong>
              {'  ·  '}
              <span className="font-medium">{almacenDestino?.nombreAlmacen}</span>
              {': '}
              {stockActualDestino} → <strong>{stockActualDestino + cantidadNum}</strong>
              {unitLabel && <span className="text-amber-600 dark:text-amber-400"> {unitLabel}</span>}
            </div>
          )}
        </div>

        {/* Footer compacto */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedProductId ||
              !almacenOrigenId ||
              !almacenDestinoId ||
              !cantidad ||
              cantidadNum <= 0 ||
              cantidadNum > stockDisponibleOrigen ||
              (productoNoDisponibleEnDestino && !habilitacionConfirmada)
            }
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            {esInterEstablecimiento ? 'Crear transferencia' : 'Transferir stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
