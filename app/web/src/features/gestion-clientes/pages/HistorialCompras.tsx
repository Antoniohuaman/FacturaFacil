import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, DollarSign, ShoppingCart } from 'lucide-react';
import DetalleCompraModal from '../components/DetalleCompraModal';

interface Compra {
  id: number;
  fecha: string;
  comprobante: string;
  tipoComprobante: 'Factura' | 'Boleta';
  monto: number;
  estado: 'Pagado' | 'Pendiente' | 'Cancelado';
  productos: number;
}

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

const HistorialCompras: React.FC = () => {
  const navigate = useNavigate();
  const { clienteName } = useParams();
  
  // Estados para modal
  const [modalOpen, setModalOpen] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState<CompraDetalle | null>(null);
  
  // Mock data for purchase history
  const [compras] = useState<Compra[]>([
    {
      id: 1,
      fecha: '2025-09-20',
      comprobante: 'F001-00012',
      tipoComprobante: 'Factura',
      monto: 1250.00,
      estado: 'Pagado',
      productos: 3
    },
    {
      id: 2,
      fecha: '2025-09-15',
      comprobante: 'B001-00085',
      tipoComprobante: 'Boleta',
      monto: 750.50,
      estado: 'Pagado',
      productos: 2
    },
    {
      id: 3,
      fecha: '2025-09-10',
      comprobante: 'F001-00008',
      tipoComprobante: 'Factura',
      monto: 2100.75,
      estado: 'Pendiente',
      productos: 5
    },
    {
      id: 4,
      fecha: '2025-09-05',
      comprobante: 'B001-00078',
      tipoComprobante: 'Boleta',
      monto: 450.00,
      estado: 'Pagado',
      productos: 1
    },
    {
      id: 5,
      fecha: '2025-08-30',
      comprobante: 'F001-00005',
      tipoComprobante: 'Factura',
      monto: 3200.25,
      estado: 'Cancelado',
      productos: 8
    }
  ]);

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
        return 'bg-green-100 text-green-800';
      case 'Pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoComprobanteColor = (tipo: string) => {
    return tipo === 'Factura' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  const totalCompras = compras.reduce((sum, compra) => sum + compra.monto, 0);
  const comprasPagadas = compras.filter(c => c.estado === 'Pagado').length;

  // Función para abrir modal con detalles
  const verDetalles = (compra: Compra) => {
    // Mock de datos detallados basados en la compra seleccionada
    const compraDetalle: CompraDetalle = {
      id: compra.id,
      fecha: compra.fecha,
      comprobante: compra.comprobante,
      tipoComprobante: compra.tipoComprobante,
      monto: compra.monto,
      estado: compra.estado,
      cliente: {
        nombre: clienteName ? decodeURIComponent(clienteName) : 'Cliente desconocido',
        documento: 'RUC 20608822658'
      },
      vendedor: 'Ana García',
      metodoPago: 'Efectivo',
      observaciones: 'Entrega programada para el 25/09/2025',
      subtotal: compra.monto / 1.18,
      igv: compra.monto - (compra.monto / 1.18),
      total: compra.monto,
      productos: [
        { id: 1, nombre: 'Laptop HP Pavilion 15', cantidad: 1, precioUnitario: 800, subtotal: 800 },
        { id: 2, nombre: 'Mouse Inalámbrico Logitech', cantidad: 2, precioUnitario: 45, subtotal: 90 },
        { id: 3, nombre: 'Teclado Mecánico RGB', cantidad: 1, precioUnitario: 120, subtotal: 120 }
      ].slice(0, compra.productos)
    };
    
    setCompraSeleccionada(compraDetalle);
    setModalOpen(true);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/clientes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Volver a Clientes"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Compras</h1>
          <p className="text-gray-600">
            {clienteName ? decodeURIComponent(clienteName) : 'Cliente desconocido'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Compras</p>
              <p className="text-2xl font-bold text-gray-900">{compras.length}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compras Pagadas</p>
              <p className="text-2xl font-bold text-green-600">{comprasPagadas}</p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monto Total</p>
              <p className="text-2xl font-bold text-gray-900">S/ {totalCompras.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Última Compra</p>
              <p className="text-lg font-semibold text-gray-900">
                {compras.length > 0 ? formatDate(compras[0].fecha) : 'N/A'}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Purchase History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Compras</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comprobante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {compras.map((compra) => (
                <tr key={compra.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(compra.fecha)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {compra.comprobante}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoComprobanteColor(compra.tipoComprobante)}`}>
                      {compra.tipoComprobante}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {compra.productos}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    S/ {compra.monto.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(compra.estado)}`}>
                      {compra.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      onClick={() => verDetalles(compra)}
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {compras.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin compras</h3>
            <p className="mt-1 text-sm text-gray-500">Este cliente aún no ha realizado compras.</p>
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