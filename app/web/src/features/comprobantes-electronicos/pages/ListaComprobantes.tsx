import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom'; // Eliminado porque no se usa
import { Search, Filter, Printer, Share2, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useComprobanteContext } from '../context/ComprobanteContext';

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Función para convertir fecha del formato "20 ago. 2025 19:17" a Date
function parseInvoiceDate(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };
  
  const parts = dateStr.split(' ');
  const day = parseInt(parts[0]);
  const month = monthMap[parts[1].replace('.', '')];
  const year = parseInt(parts[2]);
  
  // Extraer hora si existe
  const timePart = parts[3] || '00:00';
  const [hours, minutes] = timePart.split(':').map(n => parseInt(n));
  
  return new Date(year, month, day, hours || 0, minutes || 0);
}

// Función para filtrar facturas por rango de fechas
function filterInvoicesByDateRange(invoices: any[], dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return invoices;
  
  const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
  const toDate = dateTo ? new Date(dateTo + 'T23:59:59.999') : null;
  
  return invoices.filter(invoice => {
    const invoiceDate = parseInvoiceDate(invoice.date);
    
    if (fromDate && invoiceDate < fromDate) return false;
    if (toDate && invoiceDate > toDate) return false;
    
    return true;
  });
}

const InvoiceListDashboard = () => {
  // ✅ Obtener comprobantes del contexto global
  const { state } = useComprobanteContext();
  const invoices = state.comprobantes;

  // Estado para selección masiva y popup de impresión
  const navigate = useNavigate();
  const [massPrintMode, setMassPrintMode] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [printFormat, setPrintFormat] = useState<'A4' | 'ticket'>('A4');
  // const navigate = useNavigate(); // Eliminado porque no se usa
  const [dateFrom, setDateFrom] = useState(getToday());
  const [dateTo, setDateTo] = useState(getToday());
  const [currentPage, setCurrentPage] = useState(1);
  const [showTotals, setShowTotals] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState(10); // Por defecto 10 registros

  // Resetear página cuando cambien los filtros de fecha o el número de registros por página
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, recordsPerPage]);

  // ✅ Los comprobantes ahora vienen del contexto (línea 51)
  // Ya no necesitamos el array hardcodeado aquí

  // Datos filtrados por rango de fechas
  const filteredInvoices = filterInvoicesByDateRange(invoices, dateFrom, dateTo);

  // Cálculos de paginación
  const totalRecords = filteredInvoices.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
  
  // Datos paginados - solo los registros de la página actual
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Popup de confirmación de impresión masiva */}
      {showPrintPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirmar impresión masiva</h3>
            <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">Se van a imprimir <span className="font-bold">{selectedInvoices.length}</span> comprobante(s).</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato de impresión</label>
              <div className="flex space-x-4">
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input type="radio" name="printFormat" value="A4" checked={printFormat === 'A4'} onChange={() => setPrintFormat('A4')} className="mr-2" />
                  A4
                </label>
                <label className="flex items-center text-gray-700 dark:text-gray-300">
                  <input type="radio" name="printFormat" value="ticket" checked={printFormat === 'ticket'} onChange={() => setPrintFormat('ticket')} className="mr-2" />
                  Ticket
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm" onClick={() => setShowPrintPopup(false)}>Cancelar</button>
              <button className="px-4 py-2 text-white rounded-md transition-colors text-sm" style={{ backgroundColor: '#1478D4' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1068C4'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1478D4'} onClick={() => { setShowPrintPopup(false); /* Aquí va la lógica de impresión */ }}>Confirmar impresión</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
                    className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Desde (dd/mm/aaaa)"
                  />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Hasta (dd/mm/aaaa)"
                  />
                </div>
              </div>
            </div>
            {/* Botones NUEVA BOLETA y NUEVA FACTURA + Impresión masiva */}
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 border border-blue-500 text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400 rounded-md font-semibold text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
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
                  className={`flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300`}
                  onClick={() => {
                    setMassPrintMode(true);
                    setSelectedInvoices([]);
                  }}
                >
                  <Printer className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">Impresión Masiva</span>
                </button>
              ) : (
                <>
                  <span className="font-semibold text-base text-gray-900 dark:text-white">{selectedInvoices.length} seleccionados</span>
                  <button
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                    onClick={() => {
                      setMassPrintMode(false);
                      setSelectedInvoices([]);
                    }}
                  >Cancelar</button>
                  <button
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
                    onClick={() => setSelectedInvoices(paginatedInvoices.map(inv => inv.id))}
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {massPrintMode && (
                    <th className="px-2 py-3">
                      <input type="checkbox" checked={paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoices.includes(inv.id))} onChange={e => {
                        if (e.target.checked) setSelectedInvoices([...selectedInvoices, ...paginatedInvoices.filter(inv => !selectedInvoices.includes(inv.id)).map(inv => inv.id)]);
                        else setSelectedInvoices(selectedInvoices.filter(id => !paginatedInvoices.some(inv => inv.id === id)));
                      }} />
                    </th>
                  )}
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>N° Comprobante</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Tipo</span>
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Fecha</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Vendedor</span>
                      <Search className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span>Estado</span>
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    + Opciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedInvoices.map((invoice, index) => (
                  <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${massPrintMode && selectedInvoices.includes(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    {massPrintMode && (
                      <td className="px-2 py-4">
                        <input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={e => {
                          if (e.target.checked) setSelectedInvoices(prev => [...prev, invoice.id]);
                          else setSelectedInvoices(prev => prev.filter(id => id !== invoice.id));
                        }} />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {invoice.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {invoice.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {invoice.clientDoc}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {invoice.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {invoice.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {invoice.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      S/ {invoice.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invoice.status, invoice.statusColor as 'blue' | 'green' | 'red' | 'orange')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
                      <div className="flex items-center space-x-3">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Mostrar totales
                </button>
                
                {/* Selector de registros por página */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar:</span>
                  <select 
                    value={recordsPerPage}
                    onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-700 dark:text-gray-300">por página</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {startRecord} – {endRecord} de {totalRecords}
                </span>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resumen de Totales</h3>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">50</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Comprobantes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">S/ 15,847.25</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Ventas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">8</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Por Corregir</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">12</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Rechazados</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceListDashboard;