import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom'; // Eliminado porque no se usa
import { Search, Printer, ChevronLeft, ChevronRight, FileText, MoreHorizontal } from 'lucide-react';
import { useComprobanteContext } from '../contexts/ComprobantesListContext';

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// Función para convertir fecha del formato "20 ago. 2025 19:17" a Date
function parseInvoiceDate(dateStr?: string): Date {
  // dateStr puede ser undefined/null o no tener el formato esperado.
  // Devolvemos una fecha segura (Epoch) cuando no se pueda parsear para
  // evitar que la UI rompa. Los items con fecha inválida quedarán al final
  // del orden DESC si usamos epoch (1970) — consideralo como "más viejo".
  if (!dateStr || typeof dateStr !== 'string') return new Date(0);

  const monthMap: Record<string, number> = {
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'set': 8, 'oct': 9, 'nov': 10, 'dic': 11
  };

  try {
    const parts = dateStr.split(' ').filter(Boolean);
    if (parts.length < 3) return new Date(0);

    const day = parseInt(parts[0], 10);
    const monthKey = parts[1].replace('.', '').toLowerCase();
    const month = monthMap[monthKey];
    const year = parseInt(parts[2], 10);

    if (Number.isNaN(day) || Number.isNaN(year) || month === undefined) return new Date(0);

    // Hora opcional
    const timePart = parts[3] || '00:00';
    const [hoursRaw, minutesRaw] = timePart.split(':');
    const hours = parseInt(hoursRaw || '0', 10) || 0;
    const minutes = parseInt(minutesRaw || '0', 10) || 0;

    return new Date(year, month, day, hours, minutes);
  } catch (e) {
    return new Date(0);
  }
}

// Función para filtrar facturas por rango de fechas
function filterInvoicesByDateRange(invoices: any[], dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return invoices;

  const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
  const toDate = dateTo ? new Date(dateTo + 'T23:59:59.999') : null;

  return invoices.filter(invoice => {
    // Si invoice.date no existe, lo dejamos pasar (o podríamos filtrarlo fuera
    // del rango). Optamos por incluirlo para no ocultar registros inesperados.
    const invoiceDate = parseInvoiceDate((invoice && invoice.date) || undefined);

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

  // --------------------
  // Column manager (config local)
  // --------------------
  interface ColumnConfig {
    id: string;
    key: string;
    label: string;
    visible: boolean;
    fixed: 'left' | 'right' | null;
    align: 'left' | 'right' | 'center';
    truncate?: boolean;
  }
  // Lista maestra en orden (no cambia la keys del modelo de datos)
  const MASTER_COLUMNS = useMemo(() => ([
    { id: 'documentNumber', key: 'id', label: 'N° Comprobante', visible: true, fixed: 'left', align: 'left' },
    { id: 'type', key: 'type', label: 'Tipo', visible: true, fixed: null, align: 'left' },
    { id: 'date', key: 'date', label: 'F. Emisión', visible: true, fixed: null, align: 'center' },
    { id: 'dueDate', key: 'dueDate', label: 'F. Vencimiento', visible: false, fixed: null, align: 'center' },
    { id: 'client', key: 'client', label: 'Cliente', visible: true, fixed: null, align: 'left', truncate: true },
    { id: 'clientDoc', key: 'clientDoc', label: 'N° Doc Cliente', visible: true, fixed: null, align: 'left' },
    { id: 'email', key: 'email', label: 'Correo Electrónico', visible: false, fixed: null, align: 'left' },
    { id: 'vendor', key: 'vendor', label: 'Vendedor', visible: true, fixed: null, align: 'left' },
    { id: 'paymentMethod', key: 'paymentMethod', label: 'Forma de pago', visible: true, fixed: null, align: 'left' },
    { id: 'currency', key: 'currency', label: 'Moneda', visible: false, fixed: null, align: 'left' },
    { id: 'total', key: 'total', label: 'Total', visible: true, fixed: null, align: 'right' },
    { id: 'status', key: 'status', label: 'Estado', visible: true, fixed: null, align: 'left' },
    { id: 'address', key: 'address', label: 'Dirección (fiscal)', visible: false, fixed: null, align: 'left', truncate: true },
    { id: 'shippingAddress', key: 'shippingAddress', label: 'Dirección de Envío', visible: false, fixed: null, align: 'left', truncate: true },
    { id: 'purchaseOrder', key: 'purchaseOrder', label: 'Orden de compra', visible: false, fixed: null, align: 'left' },
    { id: 'costCenter', key: 'costCenter', label: 'Centro de Costo', visible: false, fixed: null, align: 'left' },
    { id: 'waybill', key: 'waybill', label: 'N° de Guía de Remisión', visible: false, fixed: null, align: 'left' },
    { id: 'observations', key: 'observations', label: 'Observaciones', visible: false, fixed: null, align: 'left', truncate: true },
    { id: 'internalNote', key: 'internalNote', label: 'Nota Interna', visible: false, fixed: null, align: 'left', truncate: true },
    { id: 'actions', key: 'actions', label: '+ Opciones', visible: true, fixed: 'right', align: 'right' }
  ]), []);

  const STORAGE_KEY = 'lista_comprobantes_columns_v1';

  // Load persisted visibility or defaults
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // fallback to MASTER_COLUMNS
    return MASTER_COLUMNS;
  });

  // Persist config to sessionStorage when changed
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(columnsConfig)); } catch (e) {}
  }, [columnsConfig]);

  // Helper: visible columns in order
  const visibleColumns = useMemo(() => columnsConfig.filter((c: ColumnConfig) => c.visible), [columnsConfig]);

  // Column manager toggle
  const toggleColumn = (id: string) => {
    setColumnsConfig(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

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
  
  // Orden local por F. Emisión DESC y paginación (no mutamos el contexto)
  const sortedInvoices = [...filteredInvoices].sort((a: any, b: any) => {
    try {
      return parseInvoiceDate(b.date).getTime() - parseInvoiceDate(a.date).getTime();
    } catch (e) {
      return 0;
    }
  });

  // Datos paginados - solo los registros de la página actual
  const paginatedInvoices = sortedInvoices.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Orden por defecto: F. Emisión DESC
  useEffect(() => {
    // Si los invoices vienen desordenados, aplicar orden local por fecha si existe el campo date
    // Nota: parseInvoiceDate ya disponible.
    // No mutamos el contexto global: trabajamos sobre filteredInvoices localmente en memoria
    // (Lista renderiza paginatedInvoices que se obtiene de filteredInvoices)
    // Aquí no es necesario reordenar el contexto; si quieres persistir orden, lo hacemos más tarde.
  }, [filteredInvoices]);

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

              {/* Column manager compact */}
              <div className="relative">
                <button title="Columnas" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center" onClick={(e) => {
                  const el = (e.currentTarget.nextElementSibling as HTMLElement | null);
                  if (el) el.classList.toggle('hidden');
                }}>
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </button>
                <div className="hidden absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 p-3">
                  <div className="text-sm font-semibold mb-2">Columnas</div>
                  <div className="max-h-48 overflow-y-auto">
                    {columnsConfig.map(c => (
                      <label key={c.id} className="flex items-center justify-between text-sm py-1">
                        <span className="truncate mr-2">{c.label}</span>
                        <input type="checkbox" checked={c.visible} onChange={() => toggleColumn(c.id)} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Botones NUEVA BOLETA y NUEVA FACTURA + Impresión masiva */}
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 border border-blue-500 text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400 dark:border-blue-400 rounded-md font-semibold text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => navigate('/comprobantes/emision?tipo=factura')}
              >
                Nueva factura
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-700 transition-colors"
                onClick={() => navigate('/comprobantes/emision?tipo=boleta')}
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
                  {visibleColumns.map(col => (
                    <th key={col.id} className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} text-gray-700 dark:text-gray-300`}>
                      <div className="flex items-center justify-between space-x-2">
                        <span>{col.label}</span>
                        {/* Small icons for searchable/filterable headers kept where it makes sense */}
                        {['N° Comprobante', 'Tipo', 'N° Doc Cliente', 'Cliente', 'Vendedor'].includes(col.label) ? (
                          <Search className="w-4 h-4 text-gray-400" />
                        ) : null}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, visibleColumns.length + (massPrintMode ? 1 : 0))} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <FileText className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No se encontraron comprobantes
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                          {dateFrom || dateTo
                            ? 'No hay comprobantes en el rango de fechas seleccionado. Intenta ajustar los filtros de fecha.'
                            : 'Aún no se han emitido comprobantes. Comienza creando tu primer comprobante desde Punto de Venta o Emisión Tradicional.'}
                        </p>
                        <button
                          onClick={() => navigate('/comprobantes/emision')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Crear comprobante
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((invoice, index) => (
                  <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${massPrintMode && selectedInvoices.includes(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    {massPrintMode && (
                      <td className="px-2 py-4">
                        <input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={e => {
                          if (e.target.checked) setSelectedInvoices(prev => [...prev, invoice.id]);
                          else setSelectedInvoices(prev => prev.filter(id => id !== invoice.id));
                        }} />
                      </td>
                    )}

                    {visibleColumns.map(col => {
                      const value = (invoice as any)[col.key];

                      // Presentation rules
                      const display = (() => {
                        if (value === undefined || value === null || value === '') return '—';
                        if (col.key === 'total') return `S/ ${Number(value).toFixed(2)}`;
                        if (col.key === 'date') return value; // already formatted in mock/context
                        if (col.key === 'status') return getStatusBadge(invoice.status, invoice.statusColor as 'blue' | 'green' | 'red' | 'orange');
                        if (col.truncate) return <div title={String(value)} className="truncate max-w-[18rem]">{String(value)}</div>;
                        return String(value);
                      })();

                      return (
                        <td key={col.id} className={`px-6 py-4 whitespace-nowrap text-sm ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.key === 'total' ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {col.key === 'status' ? display : display}
                        </td>
                      );
                    })}
                  </tr>
                  ))
                )}
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