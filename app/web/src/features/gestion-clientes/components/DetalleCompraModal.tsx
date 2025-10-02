import React from 'react';
import { X, FileText, User, Calendar, CreditCard, Package } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface CompraDetalle {
  id: number;
  fecha: string;
  comprobante: string;
  tipoComprobante: 'Factura' | 'Boleta';
  monto: number;
  estado: 'Pagado' | 'Pendiente' | 'Cancelado';
  productos: Producto[];
  cliente: {
    nombre: string;
    documento: string;
  };
  vendedor: string;
  metodoPago: string;
  observaciones?: string;
  subtotal: number;
  igv: number;
  total: number;
}

interface DetalleCompraModalProps {
  open: boolean;
  onClose: () => void;
  compra: CompraDetalle | null;
}

const DetalleCompraModal: React.FC<DetalleCompraModalProps> = ({ open, onClose, compra }) => {
  if (!open || !compra) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pagado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoComprobanteColor = (tipo: string) => {
    return tipo === 'Factura' 
      ? 'bg-blue-100 text-blue-800 border-blue-200' 
      : 'bg-purple-100 text-purple-800 border-purple-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Detalle de Compra</h2>
              <p className="text-sm text-gray-600">Comprobante: {compra.comprobante}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Información del Cliente
              </h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Nombre:</span> {compra.cliente.nombre}</div>
                <div><span className="font-medium">Documento:</span> {compra.cliente.documento}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Información del Comprobante
              </h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Fecha:</span> {formatDate(compra.fecha)}</div>
                <div><span className="font-medium">Vendedor:</span> {compra.vendedor}</div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Tipo:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getTipoComprobanteColor(compra.tipoComprobante)}`}>
                    {compra.tipoComprobante}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Estado:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getEstadoColor(compra.estado)}`}>
                    {compra.estado}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Método de Pago
            </h3>
            <p className="text-sm text-gray-700">{compra.metodoPago}</p>
          </div>

          {/* Productos */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos Comprados
            </h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {compra.productos.map((producto) => (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {producto.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">
                        {producto.cantidad}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        S/ {producto.precioUnitario.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        S/ {producto.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Resumen de Totales</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>S/ {compra.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IGV (18%):</span>
                <span>S/ {compra.igv.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-blue-600">S/ {compra.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {compra.observaciones && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Observaciones</h3>
              <p className="text-sm text-gray-700">{compra.observaciones}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            <button
              onClick={() => alert('Descargar PDF - Función por implementar')}
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-colors font-medium"
              style={{ backgroundColor: '#1478D4' }}
            >
              📄 Descargar PDF
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleCompraModal;