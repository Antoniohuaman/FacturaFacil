import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Draft } from '../mockData/drafts.mock';
import { ListHeader } from '../components/ListHeader';
import { DraftsStatsCards } from '../components/drafts/DraftsStatsCards';
import { DraftsTable } from '../components/drafts/DraftsTable';
import { DraftsBulkActionsBar } from '../components/drafts/DraftsBulkActionsBar';
import { useDraftsList } from '../hooks/useDraftsList';
import { useUserSession } from '../../../../../../contexts/UserSessionContext';
import { filterByDateRange, DATE_PRESETS } from '../../utils/dateUtils';
import { validateDraftsForBulkEmit } from '../../utils/draftValidation';
import { PAGINATION_CONFIG } from '../../models/constants';
import { formatBusinessDateShort, getBusinessTodayISODate } from '@/shared/time/businessTime';
import type { ColumnConfig } from '../types/columnConfig';
import { loadColumnsConfig, persistColumnsConfig, resolveTenantColumnsKey } from '../utils/columnPersistence';

type DraftInvoicesModuleProps = {
  hideSidebar?: boolean;
};

const DRAFT_COLUMNS_STORAGE_KEY = 'drafts_columns_config';

const DraftInvoicesModule: React.FC<DraftInvoicesModuleProps> = ({ hideSidebar }) => {
  const { session } = useUserSession();
  const currentUserName = session?.userName || 'Usuario';

  const { drafts, duplicateDraft, deleteDraft } = useDraftsList({ fallbackVendor: currentUserName });

  const [dateFrom, setDateFrom] = useState(() => getBusinessTodayISODate());
  const [dateTo, setDateTo] = useState(() => getBusinessTodayISODate());
  const [tempDateFrom, setTempDateFrom] = useState(() => getBusinessTodayISODate());
  const [tempDateTo, setTempDateTo] = useState(() => getBusinessTodayISODate());
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [showEmitPopup, setShowEmitPopup] = useState(false);
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [validDrafts, setValidDrafts] = useState<Draft[]>([]);
  const [invalidDrafts, setInvalidDrafts] = useState<Draft[]>([]);
  const [showTotals, setShowTotals] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [density, setDensity] = useState<'comfortable' | 'intermediate' | 'compact'>('comfortable');
  const [showColumnManager, setShowColumnManager] = useState(false);

  const DRAFT_MASTER_COLUMNS = useMemo<ColumnConfig[]>(() => ([
    { id: 'draftNumber', key: 'id', label: 'N° Borrador', visible: true, fixed: 'left', align: 'left', minWidth: '140px', width: 'w-[140px]' },
    { id: 'type', key: 'type', label: 'Tipo', visible: true, fixed: null, align: 'left', minWidth: '120px' },
    { id: 'clientDoc', key: 'clientDoc', label: 'N° Doc Cliente', visible: true, fixed: null, align: 'left', minWidth: '150px' },
    { id: 'client', key: 'client', label: 'Cliente', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '200px', flex: '1 1 0' },
    { id: 'createdDate', key: 'createdDate', label: 'Creado', visible: true, fixed: null, align: 'left', minWidth: '120px' },
    { id: 'expiryDate', key: 'expiryDate', label: 'Vence', visible: true, fixed: null, align: 'left', minWidth: '120px' },
    { id: 'vendor', key: 'vendor', label: 'Vendedor', visible: true, fixed: null, align: 'left', minWidth: '150px' },
    { id: 'total', key: 'total', label: 'Total', visible: true, fixed: null, align: 'right', minWidth: '110px' },
    { id: 'status', key: 'status', label: 'Estado', visible: true, fixed: null, align: 'center', minWidth: '150px' },
    { id: 'actions', key: 'actions', label: 'Acciones', visible: true, fixed: 'right', align: 'center', minWidth: '150px' }
  ]), []);

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>(() => {
    const tenantKey = resolveTenantColumnsKey(DRAFT_COLUMNS_STORAGE_KEY);
    return loadColumnsConfig({ tenantKey, fallback: DRAFT_MASTER_COLUMNS });
  });

  useEffect(() => {
    const tenantKey = resolveTenantColumnsKey(DRAFT_COLUMNS_STORAGE_KEY);
    persistColumnsConfig({ tenantKey, columns: columnsConfig });
  }, [columnsConfig]);

  const visibleColumns = useMemo(() => columnsConfig.filter(column => column.visible), [columnsConfig]);

  const toggleColumn = (id: string) => {
    setColumnsConfig(prev => prev.map(column => column.id === id ? { ...column, visible: !column.visible } : column));
  };

  const reorderColumns = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return;
    }

    setColumnsConfig(prev => {
      const sourceIndex = prev.findIndex(column => column.id === sourceId);
      const targetIndex = prev.findIndex(column => column.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return prev;
      }

      const updated = [...prev];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const resetColumns = () => {
    setColumnsConfig(DRAFT_MASTER_COLUMNS.map(column => ({ ...column })));
  };

  const filteredDrafts = useMemo(() => {
    return filterByDateRange(drafts, draft => draft.createdDate, dateFrom, dateTo);
  }, [drafts, dateFrom, dateTo]);

  useEffect(() => {
    setSelectedDrafts(prev => prev.filter(id => filteredDrafts.some(draft => draft.id === id)));
    setCurrentPage(1);
  }, [filteredDrafts]);

  const stats = useMemo(() => {
    const vigentes = filteredDrafts.filter(draft => draft.status === 'Vigente').length;
    const porVencer = filteredDrafts.filter(draft => draft.status === 'Por vencer').length;
    const vencidos = filteredDrafts.filter(draft => draft.status === 'Vencido').length;
    const totalValue = filteredDrafts.reduce((sum, draft) => sum + draft.total, 0);

    return {
      vigentes,
      porVencer,
      vencidos,
      totalValue
    };
  }, [filteredDrafts]);

  const recordsPerPage = PAGINATION_CONFIG.DRAFTS_PER_PAGE;
  const totalRecords = filteredDrafts.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * recordsPerPage;
  const paginatedDrafts = filteredDrafts.slice(startIndex, startIndex + recordsPerPage);
  const startRecord = totalRecords === 0 ? 0 : startIndex + 1;
  const endRecord = startIndex + paginatedDrafts.length;

  const toggleDraftSelection = (draftId: string) => {
    setSelectedDrafts(prev => prev.includes(draftId) ? prev.filter(id => id !== draftId) : [...prev, draftId]);
  };

  const toggleAllDrafts = () => {
    if (selectedDrafts.length === filteredDrafts.length && filteredDrafts.length > 0) {
      setSelectedDrafts([]);
      return;
    }

    setSelectedDrafts(filteredDrafts.map(draft => draft.id));
  };

  const handleEmitValidation = (ids: string[]) => {
    const { valid, invalid } = validateDraftsForBulkEmit(filteredDrafts, ids);
    setValidDrafts(valid);
    setInvalidDrafts(invalid);
    setShowEmitPopup(true);
  };

  const handleEditDraft = (draftId: string) => {
    const targetUrl = `/punto-venta?draft=${draftId}`;
    window.location.assign(targetUrl);
  };

  const handleDuplicateDraft = (draftId: string) => {
    duplicateDraft(draftId);
  };

  const handleDuplicateSelected = () => {
    selectedDrafts.forEach(duplicateDraft);
    setSelectedDrafts([]);
  };

  const handleDeleteDraft = (draftId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este borrador?')) {
      deleteDraft(draftId);
      setSelectedDrafts(prev => prev.filter(id => id !== draftId));
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedDrafts.length) {
      return;
    }

    if (window.confirm('¿Eliminar los borradores seleccionados?')) {
      selectedDrafts.forEach(deleteDraft);
      setSelectedDrafts([]);
    }
  };

  const handleShareDraft = async (draftId: string) => {
    try {
      await navigator.clipboard?.writeText(draftId);
    } catch {
      /* no-op clipboard fallback */
    }
  };

  const applyDatePreset = (preset: string) => {
    const presetKey = preset as keyof typeof DATE_PRESETS;
    if (DATE_PRESETS[presetKey]) {
      const { from, to } = DATE_PRESETS[presetKey]();
      setTempDateFrom(from);
      setTempDateTo(to);
    }
  };

  const applyDateRange = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setShowDateRangePicker(false);
  };

  const handleExport = async () => {
    const payload = filteredDrafts.map(draft => ({
      id: draft.id,
      tipo: draft.type,
      cliente: draft.client,
      documento: draft.clientDoc,
      total: draft.total,
      estado: draft.status,
      creado: draft.createdDate,
      vence: draft.expiryDate
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `borradores-${dateFrom}-al-${dateTo}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalsPanel = (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Borradores</h3>
      <div className="grid grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.vigentes}</div>
          <div className="text-sm text-gray-600">Borradores Vigentes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.porVencer}</div>
          <div className="text-sm text-gray-600">Por Vencer (24h)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
          <div className="text-sm text-gray-600">Vencidos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">S/ {stats.totalValue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Valor Total</div>
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Comprobantes</h2>
        <nav className="space-y-2">
          <button type="button" className="flex w-full items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
            Comprobantes
          </button>
          <button type="button" className="flex w-full items-center px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md font-medium">
            Borradores
            <span className="ml-auto bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {filteredDrafts.length}
            </span>
          </button>
          <button type="button" className="flex w-full items-center px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
            Productos
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 min-h-full ${hideSidebar ? '' : 'flex'}`}>
      {!hideSidebar && renderSidebar()}

      <div className="flex-1 flex flex-col">
        <ListHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          tempDateFrom={tempDateFrom}
          tempDateTo={tempDateTo}
          showDateRangePicker={showDateRangePicker}
          formatDateShort={formatBusinessDateShort}
          onTempDateFromChange={setTempDateFrom}
          onTempDateToChange={setTempDateTo}
          onToggleDatePicker={() => setShowDateRangePicker(!showDateRangePicker)}
          onApplyDatePreset={applyDatePreset}
          onApplyDateRange={applyDateRange}
          onCancelDatePicker={() => {
            setTempDateFrom(dateFrom);
            setTempDateTo(dateTo);
            setShowDateRangePicker(false);
          }}
          activeFiltersCount={0}
          onOpenFilters={() => {}}
          showColumnManager={showColumnManager}
          columnsConfig={columnsConfig}
          density={density}
          onToggleColumnManager={() => setShowColumnManager(!showColumnManager)}
          onToggleColumn={toggleColumn}
          onDensityChange={setDensity}
          onResetColumns={resetColumns}
          onReorderColumns={reorderColumns}
          lockedColumnIds={['draftNumber', 'actions']}
          onExport={handleExport}
          hideActionButtons
        />

        <DraftsBulkActionsBar
          selectedCount={selectedDrafts.length}
          onEmitSelected={() => handleEmitValidation(selectedDrafts)}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          onClearSelection={() => setSelectedDrafts([])}
          onOpenPrint={() => setShowPrintPopup(true)}
        />

        <DraftsStatsCards stats={stats} />

        <div className="flex-1 px-6 py-6">
          <DraftsTable
            drafts={paginatedDrafts}
            visibleColumns={visibleColumns}
            density={density}
            selectedDraftIds={selectedDrafts}
            onToggleDraft={toggleDraftSelection}
            onToggleAll={toggleAllDrafts}
            onEditDraft={handleEditDraft}
            onEmitDraft={draftId => handleEmitValidation([draftId])}
            onDuplicateDraft={handleDuplicateDraft}
            onDeleteDraft={handleDeleteDraft}
            onShareDraft={handleShareDraft}
          />

          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowTotals(!showTotals)}
                  className="h-10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {showTotals ? 'Ocultar totales' : 'Mostrar totales'}
                </button>
              </div>

              <div className="flex items-center gap-6">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {startRecord} – {endRecord} de {totalRecords}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {showTotals && totalsPanel}
        </div>
      </div>

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
                  setSelectedDrafts(validDrafts.map(draft => draft.id));
                  setShowEmitPopup(false);
                }}
              >
                Emitir
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => setShowPrintPopup(false)}
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftInvoicesModule;

