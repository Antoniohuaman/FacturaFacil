// app/web/src/features/documentos-comerciales/components/shared/ConversionPreviewModal.tsx

import { useState } from 'react';
import {
  X,
  ArrowRight,
  FileText,
  Receipt,
  CheckCircle,
  Calendar,
  User,
  Building,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { Cotizacion, NotaVenta } from '../../models/types';

interface ConversionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  documentoOrigen: Cotizacion | NotaVenta;
  tipoDestino: 'NOTA_VENTA' | 'COMPROBANTE';
  loading?: boolean;
}

/**
 * Modal de confirmación de conversión con preview de datos
 * Muestra qué se va a convertir y a qué tipo de documento
 */
export function ConversionPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  documentoOrigen,
  tipoDestino
}: ConversionPreviewModalProps) {
  const [confirmando, setConfirmando] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setConfirmando(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error al convertir:', error);
    } finally {
      setConfirmando(false);
    }
  };

  const getConfigDestino = () => {
    if (tipoDestino === 'NOTA_VENTA') {
      return {
        nombre: 'Nota de Venta',
        icon: Receipt,
        color: 'purple',
        descripcion: 'Se generará una nueva nota de venta con los mismos datos del documento origen'
      };
    } else {
      return {
        nombre: 'Comprobante Electrónico',
        icon: CheckCircle,
        color: 'emerald',
        descripcion: 'Se generará una factura o boleta electrónica con validez fiscal'
      };
    }
  };

  const getConfigOrigen = () => {
    if (documentoOrigen.tipo === 'COTIZACION') {
      return {
        nombre: 'Cotización',
        icon: FileText,
        color: 'blue'
      };
    } else {
      return {
        nombre: 'Nota de Venta',
        icon: Receipt,
        color: 'purple'
      };
    }
  };

  const configOrigen = getConfigOrigen();
  const configDestino = getConfigDestino();
  const IconOrigen = configOrigen.icon;
  const IconDestino = configDestino.icon;

  const formatMoney = (amount: number, currency: 'PEN' | 'USD' | 'EUR' = 'PEN') => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r from-${configDestino.color}-500 to-${configDestino.color}-600 px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Confirmar Conversión
                </h3>
                <p className="text-sm text-white/80">
                  {configOrigen.nombre} → {configDestino.nombre}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Flujo de conversión visual */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4">
              {/* Documento Origen */}
              <div className="flex-1 bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg bg-${configOrigen.color}-100 text-${configOrigen.color}-600`}>
                    <IconOrigen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{configOrigen.nombre}</div>
                    <div className="font-semibold text-gray-900">{documentoOrigen.serieNumero}</div>
                  </div>
                </div>
              </div>

              {/* Flecha */}
              <div className="flex-shrink-0">
                <ArrowRight className={`h-8 w-8 text-${configDestino.color}-500`} />
              </div>

              {/* Documento Destino */}
              <div className={`flex-1 bg-gradient-to-br from-${configDestino.color}-50 to-${configDestino.color}-100 rounded-lg p-4 border-2 border-${configDestino.color}-300`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg bg-${configDestino.color}-200 text-${configDestino.color}-700`}>
                    <IconDestino className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">{configDestino.nombre}</div>
                    <div className="font-semibold text-gray-900">Nueva serie automática</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información importante */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">¿Qué sucederá?</h4>
                <p className="text-sm text-blue-800 mb-2">{configDestino.descripcion}</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Se mantendrá toda la información del documento origen</li>
                  <li>Se asignará una nueva serie correspondiente al tipo de documento</li>
                  <li>El documento origen quedará marcado como "Convertido"</li>
                  <li>Se creará una referencia entre ambos documentos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Resumen de datos que se migrarán */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h4 className="font-semibold text-gray-900 mb-3">Datos que se migrarán:</h4>

            {/* Cliente */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Building className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Cliente</div>
                <div className="font-medium text-gray-900">{documentoOrigen.cliente.razonSocial}</div>
                <div className="text-sm text-gray-600">
                  {documentoOrigen.cliente.tipoDocumento}: {documentoOrigen.cliente.numeroDocumento}
                </div>
              </div>
            </div>

            {/* Vendedor */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg">
                <User className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Vendedor</div>
                <div className="font-medium text-gray-900">
                  {documentoOrigen.vendedorNombre || 'Sin asignar'}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg">
                <ShoppingCart className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Items</div>
                <div className="font-medium text-gray-900">
                  {documentoOrigen.items.length} producto{documentoOrigen.items.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg">
                <DollarSign className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Total</div>
                <div className="font-semibold text-lg text-gray-900">
                  {formatMoney(documentoOrigen.totales.total, documentoOrigen.moneda)}
                </div>
              </div>
            </div>

            {/* Fecha */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">Fecha de emisión original</div>
                <div className="font-medium text-gray-900">
                  {formatDate(documentoOrigen.fechaEmision)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Nueva fecha: {formatDate(new Date().toISOString())}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={confirmando}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirmando}
              className={`
                px-6 py-2
                bg-gradient-to-r from-${configDestino.color}-500 to-${configDestino.color}-600
                hover:from-${configDestino.color}-600 hover:to-${configDestino.color}-700
                text-white font-medium rounded-lg
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
                shadow-sm hover:shadow-md
              `}
            >
              {confirmando ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Convirtiendo...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirmar Conversión</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
