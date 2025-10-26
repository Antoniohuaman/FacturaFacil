import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign, ShoppingCart } from 'lucide-react';
import DetalleCompraModal from '../components/DetalleCompraModal';
import { useCompras } from '../hooks';
import type { CompraDetalle } from '../models';

const HistorialCompras: React.FC = () => {
  const navigate = useNavigate();
  const { clienteId, clienteName } = useParams();

  const { compras, loading } = useCompras(clienteId);
  const [modalOpen, setModalOpen] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<CompraDetalle | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pagado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Cancelado':
      case 'Anulado':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTipoComprobanteColor = (tipo: string) => {
    return tipo === 'Factura' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  };

  const totalCompras = compras.reduce((sum, compra) => sum + compra.monto, 0);
  const comprasPagadas = compras.filter(c => c.estado === 'Pagado').length;
  const ultimaCompra = compras.length > 0 ? compras[0].fecha : null;

  const verDetalles = async () => {
    // En este caso, como no hay backend, se mostraría un modal indicando que no hay datos
    // o se podría implementar lógica para mostrar información básica
    setCompraSeleccionada(null);
    setModalOpen(true);
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/clientes')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Volver a Clientes"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Compras</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {clienteName ? decodeURIComponent(clienteName) : 'Cliente desconocido'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Compras</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{compras.length}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compras Pagadas</p>
              <p className="text-2xl font-bold text-green-600">{comprasPagadas}</p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monto Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">S/ {totalCompras.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Última Compra</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {ultimaCompra ? formatDate(ultimaCompra) : 'N/A'}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Compras</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando historial...</span>
          </div>
        ) : compras.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Sin compras</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Este cliente aún no ha realizado compras.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Comprobante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {compras.map((compra) => (
                  <tr key={compra.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {formatDate(compra.fecha)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {compra.comprobante}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoComprobanteColor(compra.tipoComprobante)}`}>
                        {compra.tipoComprobante}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {compra.productos}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      S/ {compra.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(compra.estado)}`}>
                        {compra.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                        onClick={() => verDetalles()}
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      <DetalleCompraModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        compra={compraSeleccionada}
      />
    </div>
  );
};

export default HistorialCompras;
