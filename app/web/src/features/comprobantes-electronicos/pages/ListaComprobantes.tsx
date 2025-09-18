import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom'; // Eliminado porque no se usa
import { Search, Filter, Printer, Share2, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const InvoiceListDashboard = () => {
  // Estado para selección masiva y popup de impresión
  const navigate = useNavigate();
  const [massPrintMode, setMassPrintMode] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [printFormat, setPrintFormat] = useState<'A4' | 'ticket'>('A4');
  // const navigate = useNavigate(); // Eliminado porque no se usa
  const [dateFrom, setDateFrom] = useState(getToday());
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
      {/* Popup de confirmación de impresión masiva */}
      {showPrintPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar impresión masiva</h3>
            <p className="mb-4 text-sm text-gray-700">Se van a imprimir <span className="font-bold">{selectedInvoices.length}</span> comprobante(s).</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Formato de impresión</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input type="radio" name="printFormat" value="A4" checked={printFormat === 'A4'} onChange={() => setPrintFormat('A4')} className="mr-2" />
                  A4
                </label>
                <label className="flex items-center">
                  <input type="radio" name="printFormat" value="ticket" checked={printFormat === 'ticket'} onChange={() => setPrintFormat('ticket')} className="mr-2" />
                  Ticket
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm" onClick={() => setShowPrintPopup(false)}>Cancelar</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm" onClick={() => { setShowPrintPopup(false); /* Aquí va la lógica de impresión */ }}>Confirmar impresión</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Date filters */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Desde (dd/mm/aaaa)"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Hasta (dd/mm/aaaa)"
                  />
                </div>
              </div>
            </div>
            {/* Botones NUEVA BOLETA y NUEVA FACTURA + Impresión masiva */}
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 border border-blue-500 text-blue-600 bg-white rounded-md font-semibold text-sm hover:bg-blue-50 transition-colors"
                onClick={() => navigate('/comprobantes/nuevo?tipo=factura')}
              >
                Nueva factura
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 transition-colors"
                onClick={() => navigate('/comprobantes/nuevo?tipo=boleta')}
              >
                Nueva boleta
              </button>
              {!massPrintMode ? (
                <button
                  className={`flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium`}
                  onClick={() => {
                    setMassPrintMode(true);
                    setSelectedInvoices([]);
                  }}
                >
                  <Printer className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Impresión masiva</span>
                </button>
              ) : (
                <>
                  <span className="font-semibold text-base text-gray-900">{selectedInvoices.length} seleccionados</span>
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                    onClick={() => {
                      setMassPrintMode(false);
                      setSelectedInvoices([]);
                    }}
                  >Cancelar</button>
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                    onClick={() => setSelectedInvoices(invoices.map(inv => inv.id))}
                  >Seleccionar página</button>
                  <button
                    className="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
                    disabled={selectedInvoices.length === 0}
                    onClick={() => setShowPrintPopup(true)}
                  >Imprimir seleccionados</button>
                </>
              )}
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
                  {massPrintMode && (
                    <th className="px-2 py-3">
                      <input type="checkbox" checked={selectedInvoices.length === invoices.length} onChange={e => {
                        if (e.target.checked) setSelectedInvoices(invoices.map(inv => inv.id));
                        else setSelectedInvoices([]);
                      }} />
                    </th>
                  )}
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
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${massPrintMode && selectedInvoices.includes(invoice.id) ? 'bg-blue-50' : ''}`}>
                    {massPrintMode && (
                      <td className="px-2 py-4">
                        <input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={e => {
                          if (e.target.checked) setSelectedInvoices(prev => [...prev, invoice.id]);
                          else setSelectedInvoices(prev => prev.filter(id => id !== invoice.id));
                        }} />
                      </td>
                    )}
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
      {/* Barra de acciones masivas para impresión */}
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