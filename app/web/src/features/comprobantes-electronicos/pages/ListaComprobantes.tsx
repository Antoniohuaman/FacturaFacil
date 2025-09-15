import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Printer, Share2, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const InvoiceListDashboard = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTotals, setShowTotals] = useState(false);

  // Mock data para los comprobantes
  const invoices = [
    {
      id: 'B001-00000052',
      type: 'Boleta de venta',
      clientDoc: '08661829',
      client: 'Apolo Guerra Lu',
      date: '20 ago. 2025 19:17',
      vendor: 'Carlos Rueda',
      total: 120.00,
      status: 'Enviado',
      statusColor: 'blue'
    },
    {
      id: 'B001-00000051',
      type: 'Boleta de venta',
      clientDoc: '08664589',
      client: 'María Martínez Sánchez',
      date: '18 ago. 2025 09:03',
      vendor: 'Bertha Flores',
      total: 79.99,
      status: 'Aceptado',
      statusColor: 'green'
    },
    {
      id: 'B001-00000050',
      type: 'Boleta de venta',
      clientDoc: '45878965',
      client: 'Gonzalo Romero Castillo',
      date: '17 ago. 2025 08:41',
      vendor: 'Carlos Rueda',
      total: 58.00,
      status: 'Rechazado',
      statusColor: 'red'
    },
    {
      id: 'B001-00000049',
      type: 'Boleta de venta',
      clientDoc: '00000000',
      client: 'Clientes varios',
      date: '15 ago. 2025 20:56',
      vendor: 'Carlos Rueda',
      total: 99.90,
      status: 'Enviado',
      statusColor: 'blue'
    },
    {
      id: 'B001-00000048',
      type: 'Boleta de venta',
      clientDoc: '89658965',
      client: 'Alex Guerrero Londres',
      date: '11 ago. 2025 16:23',
      vendor: 'Carlos Rueda',
      total: 100.20,
      status: 'Corregir',
      statusColor: 'orange'
    },
    {
      id: 'B001-00000047',
      type: 'Boleta de venta',
      clientDoc: '36598789',
      client: 'Anahí Montes Torres',
      date: '10 ago. 2025 15:38',
      vendor: 'Carlos Rueda',
      total: 30.50,
      status: 'Rechazado',
      statusColor: 'red'
    },
    {
      id: 'F001-00000011',
      type: 'Factura',
      clientDoc: '20236523658',
      client: 'Tienda S.A.C.',
      date: '05 ago. 2025 20:44',
      vendor: 'Carlos Rueda',
      total: 280.00,
      status: 'Enviado',
      statusColor: 'blue'
    },
    {
      id: 'B001-00000044',
      type: 'Boleta de venta',
      clientDoc: '00058965',
      client: 'Renzo Alba Vázques',
      date: '04 ago. 2025 13:12',
      vendor: 'Carlos Rueda',
      total: 23.00,
      status: 'Rechazado',
      statusColor: 'red'
    },
    {
      id: 'F001-00000009',
      type: 'Boleta de venta',
      clientDoc: '10236526589',
      client: 'Market S.A.C.',
      date: '03 ago. 2025 18:22',
      vendor: 'Carlos Rueda',
      total: 320.20,
      status: 'Aceptado',
      statusColor: 'green'
    },
    {
      id: 'B001-00000040',
      type: 'Boleta de venta',
      clientDoc: '00000000',
      client: 'Clientes varios',
      date: '02 ago. 2025 10:55',
      vendor: 'Carlos Rueda',
      total: 102.00,
      status: 'Aceptado',
      statusColor: 'green'
    },
    {
      id: 'F001-00000009',
      type: 'Factura',
      clientDoc: '20323658963',
      client: 'Market S.A.C.',
      date: '02 ago. 2025 09:40',
      vendor: 'Carlos Rueda',
      total: 320.20,
      status: 'Corregir',
      statusColor: 'orange'
    },
    {
      id: 'B001-00000038',
      type: 'Boleta de venta',
      clientDoc: '47854796',
      client: 'Luis Alberto Quispe Lau',
      date: '01 ago. 2025 10:11',
      vendor: 'Carlos Rueda',
      total: 42.80,
      status: 'Aceptado',
      statusColor: 'green'
    }
  ];

  const getStatusBadge = (status: string, color: 'blue' | 'green' | 'red' | 'orange') => {
    const colorClasses: Record<'blue' | 'green' | 'red' | 'orange', string> = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color]}`}>
        {status}
      </span>
    );
  };

  const totalRecords = 271;
  const recordsPerPage = 25;
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Date filters */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action icons */}
              <div className="flex items-center space-x-2 ml-6">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                  <Download className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-3">
              <button
                className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium"
                onClick={() => navigate('/comprobantes/nuevo?tipo=factura')}
              >
                Nueva factura
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                onClick={() => navigate('/comprobantes/nuevo?tipo=boleta')}
              >
                Nueva boleta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>N° Comprobante</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Tipo</span>
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>N° Doc Cliente</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Cliente</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Fecha</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Vendedor</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Estado</span>
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    + Opciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.clientDoc}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {invoice.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      S/ {invoice.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status, invoice.statusColor as 'blue' | 'green' | 'red' | 'orange')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex items-center space-x-3">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowTotals(!showTotals)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Mostrar totales
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {startRecord} – {endRecord} de {totalRecords}
                </span>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(Math.min(Math.ceil(totalRecords / recordsPerPage), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(totalRecords / recordsPerPage)}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Totals Panel (conditionally shown) */}
        {showTotals && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Totales</h3>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-sm text-gray-600">Total Comprobantes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">S/ 1,576.59</div>
                <div className="text-sm text-gray-600">Total Ventas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">2</div>
                <div className="text-sm text-gray-600">Por Corregir</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">3</div>
                <div className="text-sm text-gray-600">Rechazados</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceListDashboard;