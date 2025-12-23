/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-expressions -- expresiones con efectos; refactor diferido */
/* eslint-disable no-empty -- bloques de captura intencionales; logging diferido */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables de error no utilizadas; logging diferido */
// ===================================================================
// LISTA DE COTIZACIONES - Diseño idéntico a ListaComprobantes
// Funcionalidad específica para cotizaciones
// ===================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Printer, MoreHorizontal, Share2, Copy, Eye, Edit2, XCircle,
  Filter, Download, Plus, ChevronDown, Calendar, Check, Columns, X, FileCheck, Link
} from 'lucide-react';
import { useDocumentoContext } from '../../contexts/DocumentosContext';
import { useFeedback } from '../../../../shared/feedback';
import { lsKey } from '../../../../shared/tenant';
import { DATE_PRESETS as BUSINESS_DATE_PRESETS, getTodayISO, formatDateShortSpanish, filterByDateRange, parseDateSpanish } from '../../utils/dateUtils';
import { TABLE_CONFIG } from '../../models/constants';
import { DrawerDetalleDocumento } from '../../components/DrawerDetalleDocumento';
import { exportDatasetToExcel } from '../../../../shared/export/exportToExcel';

// ===================================================================
// TIPOS Y CONFIGURACIÓN
// ===================================================================

interface ColumnConfig {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  fixed: 'left' | 'right' | null;
  align: 'left' | 'right' | 'center';
  minWidth?: string;
  width?: string;
}

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

const ListaCotizaciones = () => {
  const { state, reloadFromStorage, updateDocumento, deleteDocumento } = useDocumentoContext();
  const navigate = useNavigate();
  const feedback = useFeedback();

  const cotizaciones = state.documentos.filter(doc => doc.type === 'Cotización');

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
  // const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
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
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Estados del Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<any | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Configuración de columnas
  const MASTER_COLUMNS: ColumnConfig[] = useMemo(() => ([
    { id: 'documentNumber', key: 'id', label: 'N° Cotización', visible: true, fixed: 'left', align: 'left', minWidth: '168px', width: 'w-[168px]' },
    { id: 'client', key: 'client', label: 'Cliente', visible: true, fixed: null, align: 'left', minWidth: '220px', width: 'w-[220px]' },
    { id: 'clientDoc', key: 'clientDoc', label: 'N° Doc Cliente', visible: true, fixed: null, align: 'left', minWidth: '130px', width: 'w-[130px]' },
    { id: 'vendor', key: 'vendor', label: 'Vendedor', visible: true, fixed: null, align: 'left', minWidth: '150px', width: 'w-[150px]' },
    { id: 'paymentMethod', key: 'paymentMethod', label: 'Forma de pago', visible: true, fixed: null, align: 'left', minWidth: '130px', width: 'w-[130px]' },
    { id: 'total', key: 'total', label: 'Total', visible: true, fixed: null, align: 'right', minWidth: '110px', width: 'w-[110px]' },
    { id: 'status', key: 'status', label: 'Estado', visible: true, fixed: null, align: 'center', minWidth: '170px', width: 'w-[170px]' },
    { id: 'actions', key: 'actions', label: 'ACCIONES', visible: true, fixed: 'right', align: 'center', minWidth: '110px', width: 'w-[110px]' },
    { id: 'date', key: 'date', label: 'F. Emisión', visible: false, fixed: null, align: 'center', minWidth: '120px' },
    { id: 'validUntil', key: 'validUntil', label: 'F. Vencimiento', visible: false, fixed: null, align: 'center', minWidth: '130px' },
    { id: 'currency', key: 'currency', label: 'Moneda', visible: false, fixed: null, align: 'left', minWidth: '100px' },
    { id: 'address', key: 'address', label: 'Dirección', visible: false, fixed: null, align: 'left', minWidth: '200px' },
    { id: 'email', key: 'email', label: 'Correo', visible: false, fixed: null, align: 'left', minWidth: '200px' },
    { id: 'observations', key: 'observations', label: 'Observaciones', visible: false, fixed: null, align: 'left', minWidth: '200px' }
  ]), []);

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>(() => {
    try {
      const tenantKey = lsKey('cotizaciones_columns_config');
      const storedTenant = localStorage.getItem(tenantKey);
      if (storedTenant) return JSON.parse(storedTenant);

      const legacy = localStorage.getItem('cotizaciones_columns_config');
      if (legacy) {
        localStorage.setItem(tenantKey, legacy);
        localStorage.removeItem('cotizaciones_columns_config');
        return JSON.parse(legacy);
      }
    } catch (e) {}
    return MASTER_COLUMNS;
  });

  useEffect(() => {
    try {
      const tenantKey = lsKey('cotizaciones_columns_config');
      localStorage.setItem(tenantKey, JSON.stringify(columnsConfig));
    } catch (e) {
      console.error('Error saving cotizaciones columns config:', e);
    }
  }, [columnsConfig]);

  const visibleColumns = useMemo(() => columnsConfig.filter(c => c.visible), [columnsConfig]);

  // Handlers
  const toggleColumn = (id: string) => {
    setColumnsConfig(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

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
  
  const handleConvertirAComprobante = (cotizacion: any) => {
    // Detectar tipo de comprobante según documento del cliente
    const tipoComprobante = cotizacion.clientDoc?.length === 11 ? 'factura' : 'boleta';
    
    // Preparar datos para enviar al formulario de comprobantes
    const datosParaComprobante = {
      // Identificación del documento origen (para crear la relación bidireccional)
      sourceDocumentId: cotizacion.id,
      sourceDocumentType: 'Cotización',
      
      // Tipo de comprobante a generar
      tipoComprobante,
      
      // Cliente - usar exactamente los datos guardados
      cliente: {
        nombre: cotizacion.client || '',
        dni: cotizacion.clientDoc || '',
        direccion: cotizacion.address || '',
        email: cotizacion.email || ''
      },
      
      // Productos/Items - migrar todo el array
      items: cotizacion.items || [],
      
      // Información comercial
      moneda: cotizacion.currency || 'PEN',
      formaPago: cotizacion.paymentMethod || 'Efectivo',
      
      // Observaciones
      observaciones: cotizacion.observations || '',
      notaInterna: cotizacion.internalNote || '',
      
      // Campos opcionales - usar los campos guardados en optionalFields
      fechaVencimiento: cotizacion.validUntil || '',
      ordenCompra: cotizacion.ordenCompra || cotizacion.purchaseOrder || '',
      guiaRemision: cotizacion.guiaRemision || cotizacion.waybill || '',
      centroCosto: cotizacion.centroCosto || cotizacion.costCenter || '',
      direccionEnvio: cotizacion.direccionEnvio || cotizacion.shippingAddress || ''
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
    navigate('/documentos/nueva-cotizacion', { state: { documento } });
  };

  const handleGenerateComprobanteFromDrawer = (documento: any) => {
    handleCloseDrawer();
    handleConvertirAComprobante(documento);
  };

  // ===================================================================
  // HANDLERS PARA ANULAR Y ELIMINAR CON CONFIRMACIÓN
  // ===================================================================

  const handleAnularCotizacion = async (cotizacion: any) => {
    const confirmed = await feedback.openConfirm({
      title: 'Anular Cotización',
      message: `¿Está seguro que desea anular la cotización ${cotizacion.id}?`,
      description: 'Esta acción cambiará el estado del documento a "Anulado" pero se mantendrá en el sistema para consultas.',
      confirmText: 'Sí, anular',
      cancelText: 'Cancelar',
      tone: 'warning',
      icon: 'warning'
    });

    if (confirmed) {
      try {
        const updatedCotizacion = {
          ...cotizacion,
          status: 'Anulado' as const,
          statusColor: 'red' as const,
          annulledDate: new Date().toISOString(),
          annulledBy: 'Usuario'
        };

        updateDocumento(updatedCotizacion);
        feedback.success(
          `La cotización ${cotizacion.id} ha sido anulada exitosamente`,
          'Documento anulado',
          {
            description: `Cliente: ${cotizacion.client} - Total: ${cotizacion.currency} ${cotizacion.total.toFixed(2)}`,
            durationMs: 5000
          }
        );
        setOpenMenuId(null);
        setMenuPosition(null);
      } catch (error) {
        console.error('Error al anular cotización:', error);
        feedback.error(
          'No se pudo anular la cotización. Por favor, intente nuevamente.',
          'Error al anular',
          {
            description: 'Si el problema persiste, contacte al administrador del sistema',
            durationMs: 6000
          }
        );
      }
    }
  };

  const handleEliminarCotizacion = async (cotizacion: any) => {
    const confirmed = await feedback.openConfirm({
      title: 'Eliminar Cotización',
      message: `¿Está seguro que desea eliminar permanentemente la cotización ${cotizacion.id}?`,
      description: 'Esta acción es irreversible. El documento será eliminado completamente del sistema.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      tone: 'error',
      icon: 'danger'
    });

    if (confirmed) {
      try {
        deleteDocumento(cotizacion.id);
        feedback.success(
          `La cotización ${cotizacion.id} ha sido eliminada exitosamente`,
          'Documento eliminado',
          {
            description: `Cliente: ${cotizacion.client}`,
            durationMs: 4500
          }
        );
        setOpenMenuId(null);
        setMenuPosition(null);
      } catch (error) {
        console.error('Error al eliminar cotización:', error);
        feedback.error(
          'No se pudo eliminar la cotización. Por favor, intente nuevamente.',
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
  const filteredCotizaciones = filterByDateRange(cotizaciones, (doc) => doc.date, dateFrom, dateTo);

  const searchedCotizaciones = useMemo(() => {
    let result = filteredCotizaciones;

    // Filtros de columnas (comentado por ahora, para implementar en futuras iteraciones)
    // Object.entries(columnFilters).forEach(([key, value]) => {
    //   if (value.trim()) {
    //     result = result.filter(doc => String((doc as any)[key] || '').toLowerCase().includes(value.toLowerCase()));
    //   }
    // });

    if (advancedFilters.estados.length > 0) result = result.filter(d => advancedFilters.estados.includes(d.status));
    if (advancedFilters.vendedores.length > 0) result = result.filter(d => advancedFilters.vendedores.includes(d.vendor));
    if (advancedFilters.formasPago.length > 0) result = result.filter(d => advancedFilters.formasPago.includes(d.paymentMethod || ''));
    if (advancedFilters.totalMin) { const min = parseFloat(advancedFilters.totalMin); if (!isNaN(min)) result = result.filter(d => d.total >= min); }
    if (advancedFilters.totalMax) { const max = parseFloat(advancedFilters.totalMax); if (!isNaN(max)) result = result.filter(d => d.total <= max); }

    return result;
  }, [filteredCotizaciones, advancedFilters]);

  const totalRecords = searchedCotizaciones.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
  const paginatedDocs = searchedCotizaciones.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  // Estadísticas
  const stats = useMemo(() => ({
    total: searchedCotizaciones.length,
    pendientes: searchedCotizaciones.filter(d => d.status === 'Pendiente').length,
    aprobadas: searchedCotizaciones.filter(d => d.status === 'Aprobado').length,
    totalVentas: searchedCotizaciones.reduce((sum, d) => sum + d.total, 0)
  }), [searchedCotizaciones]);

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

  // Densidad
  const rowHeight = { comfortable: 'h-[56px]', intermediate: 'h-[48px]', compact: 'h-[40px]' }[density];
  const textSize = { comfortable: 'text-sm', intermediate: 'text-sm', compact: 'text-xs' }[density];

  // Click fuera para cerrar popovers
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]') && !target.closest('[data-column-manager]')) {
        setOpenMenuId(null);
        setShowColumnManager(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        filename: `cotizaciones_${getFilenameSuffix()}`,
        worksheetName: 'Cotizaciones'
      });
      feedback.success('Exportación completada');
    } catch (error) {
      console.error('Error al exportar cotizaciones:', error);
      feedback.error('No se pudo exportar las cotizaciones');
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
                      <button onClick={applyDateRange} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Aplicar</button>
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
              {activeFiltersCount > 0 && <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">{activeFiltersCount}</span>}
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

            <div className="relative" data-column-manager>
              <button onClick={() => setShowColumnManager(!showColumnManager)} className="h-[44px] px-4 flex items-center gap-2 text-sm rounded-[12px] text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors" title="Personalizar columnas">
                <Columns className="w-4 h-4" />
                Columnas
              </button>

              {showColumnManager && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-[320px]">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Personalizar columnas</h3>
                      <button onClick={() => setShowColumnManager(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {columnsConfig.filter(c => c.id !== 'actions').map(col => (
                        <label key={col.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                          <div className={`w-5 h-5 rounded border ${col.visible ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center`}>
                            {col.visible && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.id)} className="sr-only" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Densidad</div>
                      <div className="flex gap-2">
                        {(['comfortable', 'intermediate', 'compact'] as const).map(d => (
                          <button key={d} onClick={() => setDensity(d)} className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${density === d ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                            {d === 'comfortable' && 'Cómoda'}{d === 'intermediate' && 'Intermedia'}{d === 'compact' && 'Compacta'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/documentos/nueva-cotizacion')} className="h-[44px] px-6 flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-[12px] transition-colors font-semibold">
              <Plus className="w-4 h-4" />
              Nueva Cotización
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas - DISEÑO IDÉNTICO */}
      {totalRecords > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cotizaciones</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pendientes</div>
              <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Aprobadas</div>
              <div className="text-2xl font-bold text-green-600">{stats.aprobadas}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Ventas</div>
              <div className="text-2xl font-bold text-blue-600">S/ {stats.totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                        No se encontraron cotizaciones
                      </td>
                    </tr>
                  ) : (
                    paginatedDocs.map(doc => (
                      <tr 
                        key={doc.id} 
                        data-focus={`documentos:cotizacion:${doc.id}`}
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
                                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  title="Más acciones"
                                  aria-label={`Más acciones para cotización ${doc.id}`}
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
                                          className="w-full px-4 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2 font-medium focus:outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20"
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
                                        onClick={() => handleAnularCotizacion(doc)}
                                        className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 focus:outline-none focus:bg-orange-50 dark:focus:bg-orange-900/20"
                                        role="menuitem"
                                      >
                                        <XCircle className="w-4 h-4" /> Anular
                                      </button>
                                      <button
                                        onClick={() => handleEliminarCotizacion(doc)}
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
                      {TABLE_CONFIG.RECORDS_PER_PAGE_OPTIONS.map(option => (<option key={option} value={option}>{option}</option>))}
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
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-4 z-50">
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

export default ListaCotizaciones;
