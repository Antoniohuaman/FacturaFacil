import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, RefreshCw, Download, Plus } from 'lucide-react';
import { useDocumentoContext } from '../../contexts/DocumentosContext';
import { getTodayISO, formatDateShortSpanish } from '../../utils/dateUtils';
import { TABLE_CONFIG } from '../../models/constants';

const ListaCotizaciones = () => {
  const { state } = useDocumentoContext();
  const navigate = useNavigate();
  
  // Filtrar solo cotizaciones
  const cotizaciones = state.documentos.filter(doc => doc.type === 'Cotización');

  // Estados
  const [dateFrom] = useState(getTodayISO());
  const [dateTo] = useState(getTodayISO());
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(TABLE_CONFIG.DEFAULT_RECORDS_PER_PAGE);
  const [showTotals, setShowTotals] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Filtros básicos
  const [searchTerm] = useState('');

  // Datos filtrados y paginados
  const filteredDocs = useMemo(() => {
    let result = cotizaciones;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(doc => 
        doc.id.toLowerCase().includes(search) ||
        doc.client.toLowerCase().includes(search) ||
        doc.clientDoc.toLowerCase().includes(search)
      );
    }

    return result;
  }, [cotizaciones, searchTerm]);

  const totalRecords = filteredDocs.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Cálculos de totales
  const totalVentas = filteredDocs.reduce((sum, doc) => sum + doc.total, 0);
  const pendientes = filteredDocs.filter(doc => doc.status === 'Pendiente').length;
  const aprobadas = filteredDocs.filter(doc => doc.status === 'Aprobado').length;
  const convertidas = filteredDocs.filter(doc => doc.status === 'Convertido').length;

  // Selección
  const handleSelectAll = () => {
    if (selectedDocs.size === paginatedDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(paginatedDocs.map(doc => doc.id)));
    }
  };

  const handleSelectDoc = (id: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocs(newSelected);
  };

  // Badge de estado
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; bg: string }> = {
      'Pendiente': { color: 'text-orange-800 dark:text-orange-200', bg: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300' },
      'Aprobado': { color: 'text-green-800 dark:text-green-200', bg: 'bg-green-100 dark:bg-green-900/40 border-green-300' },
      'Rechazado': { color: 'text-red-800 dark:text-red-200', bg: 'bg-red-100 dark:bg-red-900/40 border-red-300' },
      'Convertido': { color: 'text-blue-800 dark:text-blue-200', bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300' },
      'Vencido': { color: 'text-gray-800 dark:text-gray-200', bg: 'bg-gray-100 dark:bg-gray-900/40 border-gray-300' }
    };

    const config = configs[status] || configs['Pendiente'];

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.color}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header con controles */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Selector de rango de fechas */}
            <div className="relative">
              <button className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDateShortSpanish(dateFrom)} — {formatDateShortSpanish(dateTo)}</span>
              </button>
            </div>

            {/* Filtros */}
            <button className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Filter className="w-4 h-4" />
              Filtros
            </button>

            {/* Refresh */}
            <button className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Exportar */}
            <button className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Exportar
            </button>

            <div className="flex-1" />

            {/* Botón Nueva Cotización */}
            <button 
              className="h-[44px] px-6 flex items-center gap-2 text-sm font-semibold rounded-[12px] bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              onClick={() => navigate('/documentos/cotizacion/nueva')}
            >
              <Plus className="w-4 h-4" />
              Nueva Cotización
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocs.size === paginatedDocs.length && paginatedDocs.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    N° Cotización
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    N° Doc Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Forma de Pago
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedDocs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          No se encontraron cotizaciones
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                          No hay cotizaciones en el rango de fechas seleccionado. Intenta ajustar los filtros de fecha.
                        </p>
                        <button 
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          onClick={() => navigate('/documentos/cotizacion/nueva')}
                        >
                          Crear cotización
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDocs.has(doc.id)}
                          onChange={() => handleSelectDoc(doc.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {doc.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {doc.client}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {doc.clientDoc}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {doc.vendor}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {doc.paymentMethod || 'Efectivo'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                        {doc.currency === 'USD' ? '$' : 'S/'} {doc.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer - Paginación */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTotals(!showTotals)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {showTotals ? 'Ocultar totales' : 'Mostrar totales'}
              </button>
              
              {showTotals && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total: <span className="font-semibold text-gray-900 dark:text-white">S/ {totalVentas.toFixed(2)}</span>
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Pendientes: <span className="font-semibold">{pendientes}</span>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Aprobadas: <span className="font-semibold">{aprobadas}</span>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Convertidas: <span className="font-semibold">{convertidas}</span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Mostrar:</span>
                <select 
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  value={recordsPerPage}
                  disabled
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>por página</span>
              </div>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                {startRecord} – {endRecord} de {totalRecords}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaCotizaciones;
