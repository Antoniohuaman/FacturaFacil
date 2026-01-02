/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-expressions -- expresiones con efectos; refactor diferido */
// ===================================================================
// LISTA DE NOTAS DE VENTA - Diseño idéntico a ListaComprobantes
// Funcionalidad específica para notas de venta
// ===================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Printer, MoreHorizontal, Share2, Copy, Eye, Edit2, XCircle,
  Filter, Download, Plus, ChevronDown, Calendar, FileCheck, Link, X
} from 'lucide-react';
import { useDocumentoContext } from '../../contexts/DocumentosContext';
import { useFeedback } from '../../../../shared/feedback';
import { DATE_PRESETS as BUSINESS_DATE_PRESETS, getTodayISO, formatDateShortSpanish, filterByDateRange, parseDateSpanish } from '../../utils/dateUtils';
import { TABLE_CONFIG } from '../../models/constants';
import { DrawerDetalleDocumento } from '../../components/DrawerDetalleDocumento';
import { exportDatasetToExcel } from '../../../../shared/export/exportToExcel';
import { ColumnsManager } from '@/shared/columns/ColumnsManager';
import { useNotasVentaColumns } from '../../hooks/useNotasVentaColumns';
import type { ColumnConfig } from '../../../comprobantes-electronicos/lista-comprobantes/types/columnConfig';

// ===================================================================
// TIPOS Y CONFIGURACIÓN
// ===================================================================

type DatePresetKey = keyof typeof BUSINESS_DATE_PRESETS;

const DATE_PRESET_LABELS: Record<DatePresetKey, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7days: 'Últimos 7 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  last30days: 'Últimos 30 días'
};

// ===================================================================
// UTILIDADES
// ===================================================================

// ===================================================================
// COMPONENTE PRINCIPAL
// ===================================================================

const ListaNotasVenta = () => {
  const { state, reloadFromStorage, updateDocumento, deleteDocumento } = useDocumentoContext();
  const navigate = useNavigate();
  const feedback = useFeedback();

  const notasVenta = state.documentos.filter(doc => doc.type === 'Nota de Venta');

  // Recargar documentos cuando se enfoca la ventana (útil después de convertir a comprobante)
  useEffect(() => {
    const handleFocus = () => {
      reloadFromStorage();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [reloadFromStorage]);

  // Estados de fecha
  const [dateFrom, setDateFrom] = useState(getTodayISO());
  const [dateTo, setDateTo] = useState(getTodayISO());
  const [tempDateFrom, setTempDateFrom] = useState(dateFrom);
  const [tempDateTo, setTempDateTo] = useState(dateTo);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(TABLE_CONFIG.DEFAULT_RECORDS_PER_PAGE);

  // Estados de filtros
  const [columnFilters] = useState<Record<string, string>>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [advancedFilters] = useState({
    estados: [] as string[],
    vendedores: [] as string[],
    formasPago: [] as string[],
    totalMin: '',
    totalMax: ''
  });

  // Estados de selección
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  // Estados de UI
  const [density, setDensity] = useState<'comfortable' | 'intermediate' | 'compact'>('comfortable');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Estados del Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    columnsConfig,
    visibleColumns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectAllColumns
  } = useNotasVentaColumns();

  const applyDatePreset = (preset: DatePresetKey) => {
    const factory = BUSINESS_DATE_PRESETS[preset] ?? BUSINESS_DATE_PRESETS.today;
    const { from, to } = factory();
    setTempDateFrom(from);
    setTempDateTo(to);
  };

  const applyDateRange = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setShowDateRangePicker(false);
  };

  // ===================================================================
  // CONVERTIR A COMPROBANTE
  // ===================================================================
  
  const handleConvertirAComprobante = (notaVenta: any) => {
    // Detectar tipo de comprobante según documento del cliente
    const tipoComprobante = notaVenta.clientDoc?.length === 11 ? 'factura' : 'boleta';
    
    // Preparar datos para enviar al formulario de comprobantes
    const datosParaComprobante = {
      // Identificación del documento origen (para crear la relación bidireccional)
      sourceDocumentId: notaVenta.id,
      sourceDocumentType: 'Nota de Venta',
      
      // Tipo de comprobante a generar
      tipoComprobante,
      
      // Cliente - usar exactamente los datos guardados
      cliente: {
        nombre: notaVenta.client || '',
        dni: notaVenta.clientDoc || '',
        direccion: notaVenta.address || '',
        email: notaVenta.email || ''
      },
      
      // Productos/Items - migrar todo el array
      items: notaVenta.items || [],
      
      // Información comercial
      moneda: notaVenta.currency || 'PEN',
      formaPago: notaVenta.paymentMethod || 'Efectivo',
      
      // Observaciones
      observaciones: notaVenta.observations || '',
      notaInterna: notaVenta.internalNote || '',
      
      // Campos opcionales - usar los campos guardados en optionalFields
      fechaVencimiento: notaVenta.validUntil || '',
      ordenCompra: notaVenta.ordenCompra || notaVenta.purchaseOrder || '',
      guiaRemision: notaVenta.guiaRemision || notaVenta.waybill || '',
      centroCosto: notaVenta.centroCosto || notaVenta.costCenter || '',
      direccionEnvio: notaVenta.direccionEnvio || notaVenta.shippingAddress || ''
    };
    
    console.log('📤 Datos enviados al formulario de comprobantes:', datosParaComprobante);
    
    // Navegar al formulario de comprobantes con los datos
    navigate('/comprobantes/emision', { 
      state: { 
        fromConversion: true,
        conversionData: datosParaComprobante 
      } 
    });
    
    // Cerrar menú
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  // ===================================================================
  // HANDLERS DEL DRAWER
  // ===================================================================
  
  const handleRowClick = (documento: any) => {
    setSelectedDocumento(documento);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedDocumento(null), 300); // Delay para animación
  };

  const handleEditFromDrawer = (documento: any) => {
    handleCloseDrawer();
    navigate('/documentos/nueva-nota-venta', { state: { documento } });
  };

  const handleGenerateComprobanteFromDrawer = (documento: any) => {
    handleCloseDrawer();
    handleConvertirAComprobante(documento);
  };

  // ===================================================================
  // HANDLERS PARA ANULAR Y ELIMINAR CON CONFIRMACIÓN
  // ===================================================================

  const handleAnularNotaVenta = async (notaVenta: any) => {
    const confirmed = await feedback.openConfirm({
      title: 'Anular Nota de Venta',
      message: `¿Está seguro que desea anular la nota de venta ${notaVenta.id}?`,
      description: 'Esta acción cambiará el estado del documento a "Anulado" pero se mantendrá en el sistema para consultas.',
      confirmText: 'Sí, anular',
      cancelText: 'Cancelar',
      tone: 'warning',
      icon: 'warning'
    });

    if (confirmed) {
      try {
        const updatedNotaVenta = {
          ...notaVenta,
          status: 'Anulado' as const,
          statusColor: 'red' as const,
          annulledDate: new Date().toISOString(),
          annulledBy: 'Usuario'
        };

        updateDocumento(updatedNotaVenta);
        feedback.success(
          `La nota de venta ${notaVenta.id} ha sido anulada exitosamente`,
          'Documento anulado',
          {
            description: `Cliente: ${notaVenta.client} - Total: ${notaVenta.currency} ${notaVenta.total.toFixed(2)}`,
            durationMs: 5000
          }
        );
        setOpenMenuId(null);
        setMenuPosition(null);
      } catch (error) {
        console.error('Error al anular nota de venta:', error);
        feedback.error(
          'No se pudo anular la nota de venta. Por favor, intente nuevamente.',
          'Error al anular',
          {
            description: 'Si el problema persiste, contacte al administrador del sistema',
            durationMs: 6000
          }
        );
      }
    }
  };

  const handleEliminarNotaVenta = async (notaVenta: any) => {
    const confirmed = await feedback.openConfirm({
      title: 'Eliminar Nota de Venta',
      message: `¿Está seguro que desea eliminar permanentemente la nota de venta ${notaVenta.id}?`,
      description: 'Esta acción es irreversible. El documento será eliminado completamente del sistema.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      tone: 'error',
      icon: 'danger'
    });

    if (confirmed) {
      try {
        deleteDocumento(notaVenta.id);
        feedback.success(
          `La nota de venta ${notaVenta.id} ha sido eliminada exitosamente`,
          'Documento eliminado',
          {
            description: `Cliente: ${notaVenta.client}`,
            durationMs: 4500
          }
        );
        setOpenMenuId(null);
        setMenuPosition(null);
      } catch (error) {
        console.error('Error al eliminar nota de venta:', error);
        feedback.error(
          'No se pudo eliminar la nota de venta. Por favor, intente nuevamente.',
          'Error al eliminar',
          {
            description: 'Si el problema persiste, contacte al administrador del sistema',
            durationMs: 6000
          }
        );
      }
    }
  };

  // Filtrado de datos
  const filteredNotasVenta = filterByDateRange(notasVenta, (doc) => doc.date, dateFrom, dateTo);

  const searchedNotasVenta = useMemo(() => {
    let result = filteredNotasVenta;

    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value.trim()) {
        result = result.filter(doc => String((doc as any)[key] || '').toLowerCase().includes(value.toLowerCase()));
      }
    });

    if (advancedFilters.estados.length > 0) result = result.filter(d => advancedFilters.estados.includes(d.status));
    if (advancedFilters.vendedores.length > 0) result = result.filter(d => advancedFilters.vendedores.includes(d.vendor));
    if (advancedFilters.formasPago.length > 0) result = result.filter(d => advancedFilters.formasPago.includes(d.paymentMethod || ''));
    if (advancedFilters.totalMin) { const min = parseFloat(advancedFilters.totalMin); if (!isNaN(min)) result = result.filter(d => d.total >= min); }
    if (advancedFilters.totalMax) { const max = parseFloat(advancedFilters.totalMax); if (!isNaN(max)) result = result.filter(d => d.total <= max); }

    return result;
  }, [filteredNotasVenta, columnFilters, advancedFilters]);

  const totalRecords = searchedNotasVenta.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
  const paginatedDocs = searchedNotasVenta.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  // Estadísticas
  const stats = useMemo(() => ({
    total: searchedNotasVenta.length,
    pendientes: searchedNotasVenta.filter(d => d.status === 'Pendiente').length,
    facturadas: searchedNotasVenta.filter(d => d.status === 'Facturado').length,
    totalVentas: searchedNotasVenta.reduce((sum, d) => sum + d.total, 0)
  }), [searchedNotasVenta]);

  const activeFiltersCount = useMemo(() => {
    return advancedFilters.estados.length + advancedFilters.vendedores.length + advancedFilters.formasPago.length + 
           (advancedFilters.totalMin ? 1 : 0) + (advancedFilters.totalMax ? 1 : 0);
  }, [advancedFilters]);

  // Selección
  const handleSelectAll = () => {
    setSelectedDocs(selectedDocs.size === paginatedDocs.length ? new Set() : new Set(paginatedDocs.map(d => d.id)));
  };

  const handleSelectDoc = (id: string) => {
    const newSelected = new Set(selectedDocs);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedDocs(newSelected);
  };

  // Badge de estado
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; bg: string }> = {
      'Pendiente': { color: 'text-orange-800 dark:text-orange-200', bg: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300' },
      'Aprobado': { color: 'text-green-800 dark:text-green-200', bg: 'bg-green-100 dark:bg-green-900/40 border-green-300' },
      'Facturado': { color: 'text-blue-800 dark:text-blue-200', bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300' },
      'Anulado': { color: 'text-red-800 dark:text-red-200', bg: 'bg-red-100 dark:bg-red-900/40 border-red-300' }
    };
    const config = configs[status] || configs['Pendiente'];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.color}`}>
        {status}
      </span>
    );
  };

  // Densidad
  const rowHeight = { comfortable: 'h-[56px]', intermediate: 'h-[48px]', compact: 'h-[40px]' }[density];
  const textSize = { comfortable: 'text-sm', intermediate: 'text-sm', compact: 'text-xs' }[density];

  const getFilenameSuffix = () => {
    if (dateFrom && dateTo) {
      return dateFrom === dateTo ? dateFrom : `${dateFrom}_${dateTo}`;
    }
    return getTodayISO();
  };

  const formatDateForExport = (value?: string) => {
    if (!value) return '';
    const parsed = parseDateSpanish(value) ?? (() => {
      const asDate = new Date(value);
      return Number.isNaN(asDate.getTime()) ? null : asDate;
    })();
    if (!parsed) return value;
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const year = parsed.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const getColumnValueForExport = (doc: any, column: ColumnConfig) => {
    switch (column.id) {
      case 'documentNumber':
        return doc.id;
      case 'status':
        return doc.status;
      case 'total':
        return typeof doc.total === 'number' ? doc.total : Number(doc.total ?? 0);
      case 'date':
      case 'validUntil':
        return formatDateForExport((doc as any)[column.key]);
      default:
        return (doc as any)[column.key] ?? '';
    }
  };

  const handleExport = async () => {
    const exportableColumns = visibleColumns.filter(col => col.id !== 'actions');
    if (!paginatedDocs.length) {
      feedback.warning('No hay registros para exportar');
      return;
    }
    if (!exportableColumns.length) {
      feedback.warning('No hay columnas visibles para exportar');
      return;
    }

    const rows = paginatedDocs.map(doc => {
      const row: Record<string, unknown> = {};
      exportableColumns.forEach(col => {
        row[col.id] = getColumnValueForExport(doc, col);
      });
      return row;
    });

    const columns = exportableColumns.map(col => ({
      header: col.label,
      key: col.id,
      numFmt: col.id === 'total' ? '#,##0.00' : undefined
    }));

    setIsExporting(true);
    try {
      await exportDatasetToExcel({
        rows,
        columns,
        filename: `notas_venta_${getFilenameSuffix()}`,
        worksheetName: 'Notas de Venta'
      });
      feedback.success('Exportación completada');
    } catch (error) {
      console.error('Error al exportar notas de venta:', error);
      feedback.error('No se pudo exportar las notas de venta');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header con controles - DISEÑO IDÉNTICO A COMPROBANTES */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Date Range Picker */}
            <div className="relative">
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap"
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{formatDateShortSpanish(dateFrom)} — {formatDateShortSpanish(dateTo)}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showDateRangePicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDateRangePicker(false)} />
                  <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[420px]">
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Preajuste</div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(DATE_PRESET_LABELS).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => applyDatePreset(key as DatePresetKey)}
                            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors text-left"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Personalizado</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Desde</label>
                          <input type="date" value={tempDateFrom} onChange={(e) => setTempDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
                          <input type="date" value={tempDateTo} onChange={(e) => setTempDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setShowDateRangePicker(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                      <button onClick={applyDateRange} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">Aplicar</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Botones de acción */}
            <button onClick={() => setShowFilterPanel(!showFilterPanel)} className="h-[44px] px-4 flex items-center gap-2 text-sm rounded-[12px] text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors" title="Filtros avanzados">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && <span className="ml-1 px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full">{activeFiltersCount}</span>}
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`h-[44px] px-4 flex items-center gap-2 text-sm rounded-[12px] text-gray-700 dark:text-gray-300 transition-colors ${
                isExporting ? 'bg-gray-100 dark:bg-gray-700/60 cursor-not-allowed' : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/60'
              }`}
              title="Exportar"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-pulse' : ''}`} />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </button>

            <ColumnsManager
              columns={columnsConfig}
              onToggleColumn={toggleColumn}
              onSelectAllColumns={selectAllColumns}
              onResetColumns={resetColumns}
              onReorderColumns={reorderColumns}
              densityControls={{ value: density, onChange: setDensity }}
            />

            <button onClick={() => navigate('/documentos/nueva-nota-venta')} className="h-[44px] px-6 flex items-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-[12px] transition-colors font-semibold">
              <Plus className="w-4 h-4" />
              Nueva Nota de Venta
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas - DISEÑO IDÉNTICO */}
      {totalRecords > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Notas de Venta</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pendientes</div>
              <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Facturadas</div>
              <div className="text-2xl font-bold text-blue-600">{stats.facturadas}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Ventas</div>
              <div className="text-2xl font-bold text-purple-600">S/ {stats.totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla - DISEÑO IDÉNTICO */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input type="checkbox" checked={selectedDocs.size === paginatedDocs.length && paginatedDocs.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300" />
                    </th>
                    {visibleColumns.map(col => (
                      <th key={col.id} className={`px-4 py-3 text-${col.align} text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedDocs.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        No se encontraron notas de venta
                      </td>
                    </tr>
                  ) : (
                    paginatedDocs.map(doc => (
                      <tr 
                        key={doc.id} 
                        data-focus={`documentos:notaventa:${doc.id}`}
                        className={`${rowHeight} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer`}
                        onClick={(e) => {
                          // No abrir drawer si se hace click en checkbox o botones de acción
                          const target = e.target as HTMLElement;
                          if (
                            target.closest('input[type="checkbox"]') ||
                            target.closest('button') ||
                            target.closest('[data-menu]')
                          ) {
                            return;
                          }
                          handleRowClick(doc);
                        }}
                      >
                        <td className="px-4" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedDocs.has(doc.id)} onChange={() => handleSelectDoc(doc.id)} className="w-4 h-4 rounded border-gray-300" />
                        </td>
                        {visibleColumns.map(col => (
                          <td key={col.id} className={`px-4 ${textSize} text-${col.align} text-gray-900 dark:text-white`}>
                            {col.id === 'status' ? (
                              <div className="flex flex-col gap-1">
                                {getStatusBadge(doc.status)}
                                {doc.relatedDocumentId && (
                                  <button
                                    onClick={() => navigate('/comprobantes')}
                                    className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline cursor-pointer transition-colors"
                                    title={`Ver ${doc.relatedDocumentType}: ${doc.relatedDocumentId}`}
                                  >
                                    <Link className="w-3 h-3" />
                                    <span className="font-medium">{doc.relatedDocumentType}: {doc.relatedDocumentId}</span>
                                  </button>
                                )}
                              </div>
                            ) : col.id === 'documentNumber' ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{doc.id}</span>
                                {doc.relatedDocumentId && (
                                  <button
                                    onClick={() => navigate('/comprobantes')}
                                    className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-full w-fit hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
                                    title={`Ver ${doc.relatedDocumentType}: ${doc.relatedDocumentId}`}
                                  >
                                    <Link className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                                      → {doc.relatedDocumentId}
                                    </span>
                                  </button>
                                )}
                              </div>
                            ) : col.id === 'total' ? `S/ ${doc.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : col.id === 'actions' ? (
                              <div className="relative">
                                <button 
                                  ref={(el) => { buttonRefs.current[doc.id] = el; }}
                                  onClick={(e) => {
                                    if (openMenuId === doc.id) {
                                      setOpenMenuId(null);
                                      setMenuPosition(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setMenuPosition({
                                        top: rect.bottom + window.scrollY + 4,
                                        left: rect.right + window.scrollX - 224
                                      });
                                      setOpenMenuId(doc.id);
                                    }
                                  }}
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  title="Más acciones"
                                  aria-label={`Más acciones para nota de venta ${doc.id}`}
                                  aria-expanded={openMenuId === doc.id}
                                  aria-haspopup="true"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {openMenuId === doc.id && menuPosition && createPortal(
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        setMenuPosition(null);
                                      }}
                                    />
                                    
                                    <div 
                                      className="fixed w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                                      style={{
                                        top: `${menuPosition.top}px`,
                                        left: `${menuPosition.left}px`
                                      }}
                                      role="menu"
                                      aria-orientation="vertical"
                                    >
                                      <button 
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                                        role="menuitem"
                                      >
                                        <Eye className="w-4 h-4" /> Ver detalle
                                      </button>
                                      
                                      {!doc.relatedDocumentId ? (
                                        <button 
                                          onClick={() => {
                                            handleConvertirAComprobante(doc);
                                            setOpenMenuId(null);
                                            setMenuPosition(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 font-medium focus:outline-none focus:bg-purple-50 dark:focus:bg-purple-900/20"
                                          role="menuitem"
                                        >
                                          <FileCheck className="w-4 h-4" /> Convertir a Comprobante
                                        </button>
                                      ) : (
                                        <div className="w-full px-4 py-2 text-left text-sm text-gray-400 dark:text-gray-600 flex items-center gap-2 cursor-not-allowed">
                                          <FileCheck className="w-4 h-4" /> Ya convertido a {doc.relatedDocumentType}
                                        </div>
                                      )}
                                      
                                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                      
                                      <button 
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                                        role="menuitem"
                                      >
                                        <Printer className="w-4 h-4" /> Imprimir
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                                        role="menuitem"
                                      >
                                        <Share2 className="w-4 h-4" /> Compartir
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                                        role="menuitem"
                                      >
                                        <Copy className="w-4 h-4" /> Duplicar
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                                        role="menuitem"
                                      >
                                        <Edit2 className="w-4 h-4" /> Editar
                                      </button>
                                      
                                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                      
                                      <button
                                        onClick={() => handleAnularNotaVenta(doc)}
                                        className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 focus:outline-none focus:bg-orange-50 dark:focus:bg-orange-900/20"
                                        role="menuitem"
                                      >
                                        <XCircle className="w-4 h-4" /> Anular
                                      </button>
                                      <button
                                        onClick={() => handleEliminarNotaVenta(doc)}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20"
                                        role="menuitem"
                                      >
                                        <X className="w-4 h-4" /> Eliminar
                                      </button>
                                    </div>
                                  </>,
                                  document.body
                                )}
                              </div>
                            ) : (doc as any)[col.key] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer de paginación - DISEÑO IDÉNTICO */}
            {totalRecords > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>Filas por página:</span>
                    <select value={recordsPerPage} onChange={(e) => setRecordsPerPage(Number(e.target.value))} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                      {TABLE_CONFIG.RECORDS_PER_PAGE_OPTIONS.map((option: number) => (<option key={option} value={option}>{option}</option>))}
                    </select>
                  </div>
                  <div>{startRecord}-{endRecord} de {totalRecords}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700">
                    Anterior
                  </button>
                  <span className="px-4 py-1 text-sm text-gray-600 dark:text-gray-400">Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700">
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de selección masiva */}
      {selectedDocs.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-4 z-50">
          <span className="font-semibold">{selectedDocs.size} seleccionado{selectedDocs.size > 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors text-sm">Imprimir</button>
            <button className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors text-sm">Exportar</button>
            <button className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors text-sm">Enviar email</button>
          </div>
          <button onClick={() => setSelectedDocs(new Set())} className="ml-2 p-1 hover:bg-white/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drawer de Detalle */}
      <DrawerDetalleDocumento
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        documento={selectedDocumento}
        onEdit={handleEditFromDrawer}
        onGenerateComprobante={handleGenerateComprobanteFromDrawer}
      />
    </div>
  );
};

export default ListaNotasVenta;
