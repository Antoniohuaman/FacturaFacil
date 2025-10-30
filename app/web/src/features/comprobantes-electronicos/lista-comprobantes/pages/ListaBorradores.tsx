/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Printer, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Edit, Copy, Trash2, Send, Clock, AlertTriangle, FileText } from 'lucide-react';
import { MOCK_DRAFTS, type Draft } from '../mockData/drafts.mock';
import { filterByDateRange } from '../../utils/dateUtils';
import { validateDraftsForBulkEmit, calculateDraftStatus } from '../../utils/draftValidation';
import { PAGINATION_CONFIG } from '../../models/constants';

type DraftStatus = 'Vigente' | 'Por vencer' | 'Vencido';
type StatusColor = 'green' | 'orange' | 'red';

interface DraftInvoicesModuleProps {
  hideSidebar?: boolean;
}

const DraftInvoicesModule: React.FC<DraftInvoicesModuleProps> = ({ hideSidebar }) => {
  const [showEmitPopup, setShowEmitPopup] = useState<boolean>(false);
  const [invalidDrafts, setInvalidDrafts] = useState<Draft[]>([]);
  const [validDrafts, setValidDrafts] = useState<Draft[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showTotals, setShowTotals] = useState<boolean>(false);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [showPrintPopup, setShowPrintPopup] = useState<boolean>(false);

  // Leer borradores guardados en localStorage y mapearlos a Draft
  const localDraftsRaw = localStorage.getItem('borradores');
  let localDrafts: Draft[] = [];

  if (localDraftsRaw) {
    try {
      const parsed = JSON.parse(localDraftsRaw);
      localDrafts = parsed.map((d: any) => {
        // Calcular estado usando la utilidad
        const { status, statusColor, daysLeft } = calculateDraftStatus(
          d.fechaEmision || new Date().toISOString(),
          d.fechaVencimiento || '',
          d.tipo === 'factura' ? 'Factura' : 'Boleta de venta'
        );

        const today = new Date();
        const createdDateFormatted = `${today.getDate()} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'][today.getMonth()]}. ${today.getFullYear()} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

        return {
          id: d.id,
          type: d.tipo === 'factura' ? 'Factura' : 'Boleta de venta',
          clientDoc: d.clienteDoc || '',
          client: d.cliente || '',
          createdDate: createdDateFormatted,
          expiryDate: d.fechaVencimiento ? new Date(d.fechaVencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          vendor: d.vendedor || 'Sin asignar',
          total: d.productos?.reduce?.((sum: number, p: any) => sum + (p.price * (p.quantity || 1)), 0) || 0,
          status,
          daysLeft,
          statusColor
        };
      });
    } catch (e) {
      console.error('Error parsing drafts from localStorage:', e);
      localDrafts = [];
    }
  }

  // Unir mockDrafts y localDrafts
  const drafts: Draft[] = useMemo(() => [...MOCK_DRAFTS, ...localDrafts], [localDraftsRaw]);

  // Aplicar filtros de fecha usando la utilidad
  const filteredDrafts = useMemo(() => {
    return filterByDateRange(
      drafts,
      (draft) => draft.createdDate,
      dateFrom,
      dateTo
    );
  }, [drafts, dateFrom, dateTo]);

  // Validación de fecha de creación para emisión masiva usando la utilidad
  const validateDraftsForEmit = (selectedIds: string[]) => {
    const { valid, invalid } = validateDraftsForBulkEmit(drafts, selectedIds);
    setValidDrafts(valid);
    setInvalidDrafts(invalid);
    setShowEmitPopup(true);
  };

  const getStatusBadge = (status: DraftStatus, color: StatusColor, daysLeft: number) => {
    const colorClasses: Record<StatusColor, string> = {
      green: 'bg-green-100 text-green-800 border-green-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200'
    };

    const getStatusText = (): string => {
      if (status === 'Vencido') return 'Vencido';
      if (status === 'Por vencer') return `Vence en ${daysLeft}d`;
      return `${daysLeft} días`;
    };

    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color]}`}>
          {getStatusText()}
        </span>
        {status === 'Vencido' && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
        {status === 'Por vencer' && (
          <Clock className="w-4 h-4 text-orange-500" />
        )}
      </div>
    );
  };

  const handleSelectDraft = (draftId: string) => {
    if (selectedDrafts.includes(draftId)) {
      setSelectedDrafts(selectedDrafts.filter(id => id !== draftId));
    } else {
      setSelectedDrafts([...selectedDrafts, draftId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedDrafts.length === filteredDrafts.length) {
      setSelectedDrafts([]);
    } else {
      setSelectedDrafts(filteredDrafts.map((draft) => draft.id));
    }
  };

  const totalRecords = filteredDrafts.length;
  const recordsPerPage = PAGINATION_CONFIG.DRAFTS_PER_PAGE;
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Calculate summary stats using filtered drafts
  const vigenteDrafts = filteredDrafts.filter(d => d.status === 'Vigente').length;
  const porVencerDrafts = filteredDrafts.filter(d => d.status === 'Por vencer').length;
  const vencidoDrafts = filteredDrafts.filter(d => d.status === 'Vencido').length;
  const totalValue = filteredDrafts.reduce((sum, draft) => sum + draft.total, 0);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${hideSidebar ? '' : 'flex'}`}>
      {/* Sidebar */}
      {!hideSidebar && (
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Comprobantes</h2>
            <nav className="space-y-2">
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Comprobantes
              </a>
              <a href="#" className="flex items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md font-medium">
                <Edit className="w-4 h-4 mr-3" />
                Borradores
                <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                  {filteredDrafts.length}
                </span>
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Productos
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Precios
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Clientes
              </a>
              <a href="#" className="flex items-center px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                <FileText className="w-4 h-4 mr-3" />
                Indicadores
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Borradores</h1>
                </div>

                {/* Date filters */}
                <div className="flex items-center space-x-3 ml-8">
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-40 px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Action icons */}
                <div className="flex items-center space-x-2 ml-6">
                  <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedDrafts.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {selectedDrafts.length} borrador{selectedDrafts.length > 1 ? 'es' : ''} seleccionado{selectedDrafts.length > 1 ? 's' : ''}
                </span>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <button className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                      Emitir seleccionados
                    </button>
                    <button
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center space-x-2 border border-blue-300 dark:border-blue-500 rounded-md bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => validateDraftsForEmit(selectedDrafts)}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      <span>Emitir seleccionados</span>
                    </button>
                    <button className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Duplicar seleccionados
                    </button>
                    <button className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium">
                      Eliminar seleccionados
                    </button>
                    <button
                      onClick={() => setSelectedDrafts([])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center ml-auto">
                    <button
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2 border border-blue-300 rounded-md bg-white hover:bg-blue-50 ml-4"
                      onClick={() => setShowPrintPopup(true)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      <span>Imprimir seleccionados</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Borradores Vigentes</p>
                  <p className="text-2xl font-bold text-green-600">{vigenteDrafts}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Edit className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Por Vencer (24h)</p>
                  <p className="text-2xl font-bold text-orange-600">{porVencerDrafts}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{vencidoDrafts}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
                  <p className="text-2xl font-bold text-blue-600">S/ {totalValue.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 px-6 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedDrafts.length === filteredDrafts.length && filteredDrafts.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>N° Borrador</span>
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
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Cliente</span>
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Creado</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Vence</span>
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
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDrafts.map((draft, index) => (
                    <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedDrafts.includes(draft.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDrafts.includes(draft.id)}
                          onChange={() => handleSelectDraft(draft.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {draft.id.startsWith('DRAFT-')
                          ? draft.id.replace(/^DRAFT-([A-Z0-9]+)-.*/, '$1')
                          : draft.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.clientDoc}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.client}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.createdDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.expiryDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.vendor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        S/ {draft.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(draft.status, draft.statusColor, draft.daysLeft)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            className="p-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                            title="Emitir"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors"
                            title="Duplicar"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Más opciones"
                          >
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

          {/* Popup de validación de emisión masiva */}
          {showEmitPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 min-w-[340px] max-w-[90vw]">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Emisión masiva de borradores</h2>
                {invalidDrafts.length > 0 ? (
                  <>
                    <p className="mb-4 text-red-700 dark:text-red-400 font-medium">Algunos borradores no pueden emitirse por exceder el plazo permitido por SUNAT:</p>
                    <ul className="mb-4 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                      {invalidDrafts.map(draft => (
                        <li key={draft.id}>
                          <span className="font-semibold">{draft.id}</span> - {draft.type} - Fecha creación: {draft.createdDate}
                        </li>
                      ))}
                    </ul>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">Solo se emitirán los borradores válidos. Los inválidos serán deseleccionados.</p>
                  </>
                ) : (
                  <p className="mb-6 text-gray-700 dark:text-gray-300">¿Desea emitir {validDrafts.length} borrador{validDrafts.length > 1 ? 'es' : ''} seleccionado{validDrafts.length > 1 ? 's' : ''}?</p>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                    onClick={() => setShowEmitPopup(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className={`px-4 py-2 text-sm text-white rounded-md ${validDrafts.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    disabled={validDrafts.length === 0}
                    onClick={() => {
                      setSelectedDrafts(validDrafts.map(d => d.id));
                      setShowEmitPopup(false);
                    }}
                  >
                    Emitir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Popup de confirmación de impresión masiva */}
          {showPrintPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 min-w-[320px]">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">¿Imprimir borradores seleccionados?</h2>
                <p className="mb-6 text-gray-700 dark:text-gray-300">Se imprimirán {selectedDrafts.length} borrador{selectedDrafts.length > 1 ? 'es' : ''}.</p>
                <div className="flex justify-end space-x-3">
                  <button
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                    onClick={() => setShowPrintPopup(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    onClick={() => {
                      setShowPrintPopup(false);
                    }}
                  >
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Totals Panel */}
          {showTotals && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Borradores</h3>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{vigenteDrafts}</div>
                  <div className="text-sm text-gray-600">Borradores Vigentes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{porVencerDrafts}</div>
                  <div className="text-sm text-gray-600">Por Vencer (24h)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{vencidoDrafts}</div>
                  <div className="text-sm text-gray-600">Vencidos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">S/ {totalValue.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Valor Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftInvoicesModule;
