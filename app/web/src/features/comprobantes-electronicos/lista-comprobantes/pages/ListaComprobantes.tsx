import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Printer, ChevronLeft, ChevronRight, FileText, MoreHorizontal, 
  Share2, Copy, Eye, Edit2, XCircle, Filter, RefreshCw, Download, 
  Plus, CheckCircle2, Send, XOctagon, AlertTriangle, Ban, Calendar, ChevronDown, X
} from 'lucide-react';
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
  const [massPrintMode] = useState(false); // TODO: Implementar modo de impresión masiva
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [printFormat, setPrintFormat] = useState<'A4' | 'ticket'>('A4');
  const [dateFrom, setDateFrom] = useState(getToday());
  const [dateTo, setDateTo] = useState(getToday());
  const [currentPage, setCurrentPage] = useState(1);
  const [showTotals, setShowTotals] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Estados para nuevas funcionalidades
  const [globalSearch, setGlobalSearch] = useState('');
  const [density, setDensity] = useState<'comfortable' | 'intermediate' | 'compact'>('comfortable');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [isLoading] = useState(false);
  
  // Estados para Date Range
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState(dateFrom);
  const [tempDateTo, setTempDateTo] = useState(dateTo);
  
  // Estados para filtros por columna
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [tempColumnFilters, setTempColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [filterPopoverPosition, setFilterPopoverPosition] = useState<{ top: number; left: number } | null>(null);

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
    minWidth?: string;
    maxWidth?: string;
    shrink?: number;
  }
  // Lista maestra en orden (no cambia la keys del modelo de datos)
  const MASTER_COLUMNS = useMemo(() => ([
    { id: 'documentNumber', key: 'id', label: 'N° Comprobante', visible: true, fixed: 'left', align: 'left', minWidth: '176px' },
    { id: 'client', key: 'client', label: 'Cliente', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '240px' },
    { id: 'clientDoc', key: 'clientDoc', label: 'N° Doc Cliente', visible: true, fixed: null, align: 'left', minWidth: '140px' },
    { id: 'vendor', key: 'vendor', label: 'Vendedor', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '160px' },
    { id: 'paymentMethod', key: 'paymentMethod', label: 'Forma de pago', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '140px' },
    { id: 'total', key: 'total', label: 'Total', visible: true, fixed: null, align: 'right', minWidth: '120px' },
    { id: 'status', key: 'status', label: 'Estado', visible: true, fixed: null, align: 'center', minWidth: '136px', maxWidth: 'max-content', shrink: 0 },
    { id: 'actions', key: 'actions', label: 'ACCIONES', visible: true, fixed: 'right', align: 'center', minWidth: '100px' },
    // Columnas activables (ocultas por defecto)
    { id: 'type', key: 'type', label: 'Tipo', visible: false, fixed: null, align: 'left', minWidth: '100px' },
    { id: 'date', key: 'date', label: 'F. Emisión', visible: false, fixed: null, align: 'center', minWidth: '120px' },
    { id: 'dueDate', key: 'dueDate', label: 'F. Vencimiento', visible: false, fixed: null, align: 'center', minWidth: '130px' },
    { id: 'currency', key: 'currency', label: 'Moneda', visible: false, fixed: null, align: 'left', minWidth: '100px' },
    { id: 'address', key: 'address', label: 'Dirección', visible: false, fixed: null, align: 'left', truncate: true, minWidth: '200px' },
    { id: 'shippingAddress', key: 'shippingAddress', label: 'Dirección de Envío', visible: false, fixed: null, align: 'left', truncate: true, minWidth: '200px' },
    { id: 'purchaseOrder', key: 'purchaseOrder', label: 'Orden de compra', visible: false, fixed: null, align: 'left', minWidth: '140px' },
    { id: 'costCenter', key: 'costCenter', label: 'Centro de Costo', visible: false, fixed: null, align: 'left', minWidth: '140px' },
    { id: 'waybill', key: 'waybill', label: 'N° Guía de Remisión', visible: false, fixed: null, align: 'left', minWidth: '150px' },
    { id: 'observations', key: 'observations', label: 'Observaciones', visible: false, fixed: null, align: 'left', truncate: true, minWidth: '200px' },
    { id: 'internalNote', key: 'internalNote', label: 'Nota Interna', visible: false, fixed: null, align: 'left', truncate: true, minWidth: '200px' },
    { id: 'email', key: 'email', label: 'Correo Electrónico', visible: false, fixed: null, align: 'left', minWidth: '200px' }
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

  // Función para formatear fecha a formato corto
  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Presets de fecha
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let from = '';
    let to = '';

    switch (preset) {
      case 'today':
        from = to = today.toISOString().slice(0, 10);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = yesterday.toISOString().slice(0, 10);
        break;
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        from = last7.toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = lastMonth.toISOString().slice(0, 10);
        to = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);
        break;
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        from = last30.toISOString().slice(0, 10);
        to = today.toISOString().slice(0, 10);
        break;
    }

    setTempDateFrom(from);
    setTempDateTo(to);
  };

  // Aplicar rango de fechas
  const applyDateRange = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setShowDateRangePicker(false);
  };

  // Limpiar filtro de columna
  const clearColumnFilter = (columnId: string) => {
    const newFilters = { ...columnFilters };
    delete newFilters[columnId];
    setColumnFilters(newFilters);
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setGlobalSearch('');
    setColumnFilters({});
    setDateFrom(getToday());
    setDateTo(getToday());
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // / para buscar
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"]')?.focus();
      }
      // f para filtros
      if (e.key === 'f' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        // TODO: Abrir panel de filtros
      }
      // e para exportar
      if (e.key === 'e' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        console.log('Atajo de exportar activado');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Resetear página cuando cambien los filtros de fecha o el número de registros por página
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, recordsPerPage]);

  // Sincronizar tempColumnFilters cuando se abre un popover de filtro
  useEffect(() => {
    if (activeFilterColumn) {
      setTempColumnFilters(columnFilters);
    }
  }, [activeFilterColumn, columnFilters]);

  // ✅ Los comprobantes ahora vienen del contexto
  // Datos filtrados por rango de fechas
  const filteredInvoices = filterInvoicesByDateRange(invoices, dateFrom, dateTo);
  
  // Filtrado por búsqueda global
  const searchedInvoices = useMemo(() => {
    let result = filteredInvoices;
    
    // Filtro global
    if (globalSearch.trim()) {
      const search = globalSearch.toLowerCase();
      result = result.filter(invoice => {
        return (
          invoice.id?.toLowerCase().includes(search) ||
          invoice.client?.toLowerCase().includes(search) ||
          invoice.clientDoc?.toLowerCase().includes(search) ||
          invoice.vendor?.toLowerCase().includes(search) ||
          invoice.type?.toLowerCase().includes(search)
        );
      });
    }
    
    // Filtros por columna (AND)
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue.trim()) {
        const filterLower = filterValue.toLowerCase();
        result = result.filter(invoice => {
          const value = (invoice as any)[columnKey];
          return value && String(value).toLowerCase().includes(filterLower);
        });
      }
    });
    
    return result;
  }, [filteredInvoices, globalSearch, columnFilters]);

  // Cálculos de paginación
  const totalRecords = searchedInvoices.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
  
  // Orden local por F. Emisión DESC y paginación (no mutamos el contexto)
  const sortedInvoices = [...searchedInvoices].sort((a: any, b: any) => {
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

  // Función para obtener el pill de estado con nombre e icono exacto y contraste AA
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
      'sent': { 
        label: 'Enviado', 
        color: 'text-blue-800 dark:text-blue-200', 
        bgColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700',
        icon: <Send className="w-3.5 h-3.5" />
      },
      'accepted': { 
        label: 'Aceptado', 
        color: 'text-green-800 dark:text-green-200', 
        bgColor: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
      },
      'rejected': { 
        label: 'Rechazado', 
        color: 'text-red-800 dark:text-red-200', 
        bgColor: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
        icon: <XOctagon className="w-3.5 h-3.5" />
      },
      'fix': { 
        label: 'Corregir', 
        color: 'text-orange-800 dark:text-orange-200', 
        bgColor: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700',
        icon: <AlertTriangle className="w-3.5 h-3.5" />
      },
      'voided': { 
        label: 'Anulado', 
        color: 'text-gray-800 dark:text-gray-200', 
        bgColor: 'bg-gray-100 dark:bg-gray-900/40 border-gray-300 dark:border-gray-700',
        icon: <Ban className="w-3.5 h-3.5" />
      }
    };

    const config = statusConfig[status.toLowerCase()] || statusConfig['sent'];

    return (
      <span 
        className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-medium border whitespace-nowrap ${config.bgColor} ${config.color} focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
        role="status"
        aria-label={`Estado: ${config.label}`}
        tabIndex={0}
      >
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Componente Skeleton Row
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {visibleColumns.map((col) => (
        <td key={col.id} className="px-6 py-4">
          <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded ${
            col.key === 'id' ? 'w-32' : 
            col.key === 'client' ? 'w-48' : 
            col.key === 'total' ? 'w-24 ml-auto' : 
            col.key === 'status' ? 'w-28 mx-auto' : 
            'w-32'
          }`}></div>
        </td>
      ))}
    </tr>
  );

  // Ref para debounce
  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Filtro por columna con debounce (300ms)
  const handleColumnFilterChange = (columnKey: string, value: string) => {
    // Limpiar timer anterior para esta columna
    if (debounceTimerRef.current[columnKey]) {
      clearTimeout(debounceTimerRef.current[columnKey]);
    }

    // Aplicar debounce solo para inputs de texto
    if (['id', 'client', 'vendor', 'clientDoc'].includes(columnKey)) {
      debounceTimerRef.current[columnKey] = setTimeout(() => {
        setColumnFilters(prev => {
          if (!value.trim()) {
            const newFilters = { ...prev };
            delete newFilters[columnKey];
            return newFilters;
          }
          return { ...prev, [columnKey]: value };
        });
      }, 300);
    } else {
      // Para checkboxes (type) aplicar inmediatamente
      setColumnFilters(prev => {
        if (!value.trim()) {
          const newFilters = { ...prev };
          delete newFilters[columnKey];
          return newFilters;
        }
        return { ...prev, [columnKey]: value };
      });
    }
  };

  // Verificar si una columna tiene filtro activo
  const hasActiveFilter = (columnKey: string) => {
    return !!columnFilters[columnKey];
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
          {/* Fila principal: Búsqueda → Date Range → Acciones → Botones */}
          <div className="flex items-center gap-3">
            {/* Búsqueda global */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, cliente, vendedor..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Date Range Picker (Single Input) */}
            <div className="relative">
              <button
                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                className="h-[44px] px-4 flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-[12px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Seleccionar rango de fechas"
                aria-haspopup="dialog"
                aria-expanded={showDateRangePicker}
              >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  {formatDateShort(dateFrom)} — {formatDateShort(dateTo)}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Date Range Popover */}
              {showDateRangePicker && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDateRangePicker(false)}
                  />
                  
                  <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[420px]">
                    {/* Presets */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Presets
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Hoy', value: 'today' },
                          { label: 'Ayer', value: 'yesterday' },
                          { label: 'Últimos 7 días', value: 'last7days' },
                          { label: 'Este mes', value: 'thisMonth' },
                          { label: 'Mes pasado', value: 'lastMonth' },
                          { label: 'Últimos 30 días', value: 'last30days' }
                        ].map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => applyDatePreset(preset.value)}
                            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors text-left"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inputs personalizados */}
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Personalizado
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Desde</label>
                          <input
                            type="date"
                            value={tempDateFrom}
                            onChange={(e) => setTempDateFrom(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Hasta</label>
                          <input
                            type="date"
                            value={tempDateTo}
                            onChange={(e) => setTempDateTo(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setTempDateFrom(dateFrom);
                          setTempDateTo(dateTo);
                          setShowDateRangePicker(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={applyDateRange}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

            {/* Botones de acción */}
            <button
              title="Filtros (Atajo: F)"
              aria-label="Abrir filtros"
              className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => {/* TODO: Implementar panel de filtros */}}
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              title="Refrescar lista"
              aria-label="Refrescar comprobantes"
              className="p-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            <button
              title="Exportar (Atajo: E)"
              aria-label="Exportar comprobantes"
              className="px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => {/* TODO: Implementar exportación */}}
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            
            {/* Gestor de Columnas con Presentación */}
            <div className="relative">
              <button
                title="Columnas y Vista"
                aria-label="Gestionar columnas y presentación"
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                onClick={() => setShowColumnManager(!showColumnManager)}
              >
                <MoreHorizontal className="w-4 h-4" />
                Columnas
              </button>
              
              {showColumnManager && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowColumnManager(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                    {/* Sección Presentación */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Presentación</h3>
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                          onClick={() => setDensity('comfortable')}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            density === 'comfortable'
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Cómodo
                        </button>
                        <button
                          onClick={() => setDensity('intermediate')}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            density === 'intermediate'
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Intermedio
                        </button>
                        <button
                          onClick={() => setDensity('compact')}
                          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            density === 'compact'
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Compacto
                        </button>
                      </div>
                    </div>

                    {/* Sección Columnas */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Columnas visibles</h3>
                        <button
                          onClick={() => setShowColumnManager(false)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label="Cerrar panel"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-1">
                        {columnsConfig.map(c => (
                          c.id !== 'actions' && c.id !== 'documentNumber' && (
                            <label 
                              key={c.id} 
                              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                            >
                              <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
                              <input 
                                type="checkbox" 
                                checked={c.visible} 
                                onChange={() => toggleColumn(c.id)}
                                className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Separador */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 ml-auto"></div>

            {/* Botones de Acción Perfectos */}
            <button
              onClick={() => navigate('/comprobantes/emision?tipo=factura')}
              className="h-[44px] px-5 border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 rounded-[12px] font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Crear nueva factura"
            >
              Nueva factura
            </button>
            
            <button
              onClick={() => navigate('/comprobantes/emision?tipo=boleta')}
              className="h-[44px] px-5 bg-blue-600 dark:bg-blue-600 text-white rounded-[12px] font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
              aria-label="Crear nueva boleta"
            >
              Nueva boleta
            </button>

            <button
              title="Más tipos de comprobantes"
              aria-label="Más opciones de comprobantes"
              className="h-[44px] w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => {/* TODO: Implementar menú de más tipos */}}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Chips de filtros activos */}
          {(globalSearch || Object.keys(columnFilters).length > 0 || (dateFrom !== getToday() || dateTo !== getToday())) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {globalSearch && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
                  <span>Búsqueda: {globalSearch}</span>
                  <button
                    onClick={() => setGlobalSearch('')}
                    className="hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full p-0.5 transition-colors"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {(dateFrom !== getToday() || dateTo !== getToday()) && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800">
                  <span>Fecha: {formatDateShort(dateFrom)} — {formatDateShort(dateTo)}</span>
                  <button
                    onClick={() => {
                      setDateFrom(getToday());
                      setDateTo(getToday());
                    }}
                    className="hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-full p-0.5 transition-colors"
                    aria-label="Limpiar filtro de fecha"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {Object.entries(columnFilters).map(([columnKey, filterValue]) => {
                const column = columnsConfig.find(c => c.key === columnKey);
                return (
                  <div 
                    key={columnKey}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium border border-green-200 dark:border-green-800"
                  >
                    <span>{column?.label || columnKey}: {filterValue}</span>
                    <button
                      onClick={() => clearColumnFilter(columnKey)}
                      className="hover:bg-green-100 dark:hover:bg-green-900/40 rounded-full p-0.5 transition-colors"
                      aria-label={`Limpiar filtro de ${column?.label || columnKey}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              
              {/* Botón Limpiar todo */}
              {(globalSearch || Object.keys(columnFilters).length > 0 || dateFrom !== getToday() || dateTo !== getToday()) && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
                  aria-label="Limpiar todos los filtros"
                >
                  <X className="w-3 h-3" />
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {massPrintMode && (
                    <th className="px-2 py-3 sticky left-0 z-20 bg-gray-50 dark:bg-gray-700">
                      <input type="checkbox" checked={paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selectedInvoices.includes(inv.id))} onChange={e => {
                        if (e.target.checked) setSelectedInvoices([...selectedInvoices, ...paginatedInvoices.filter(inv => !selectedInvoices.includes(inv.id)).map(inv => inv.id)]);
                        else setSelectedInvoices(selectedInvoices.filter(id => !paginatedInvoices.some(inv => inv.id === id)));
                      }} />
                    </th>
                  )}
                  {visibleColumns.map((col) => {
                    const isPinnedLeft = col.fixed === 'left';
                    const isPinnedRight = col.fixed === 'right';
                    const minWidth = (col as any).minWidth || 'auto';
                    const maxWidth = (col as any).maxWidth;
                    const shrink = (col as any).shrink;
                    
                    return (
                      <th 
                        key={col.id} 
                        style={{ 
                          minWidth,
                          maxWidth: maxWidth || undefined,
                          width: maxWidth === 'max-content' ? 'max-content' : undefined,
                          flex: shrink === 0 ? '0 0 auto' : col.truncate ? '1 1 0' : undefined
                        }}
                        className={`px-6 py-3 text-xs font-medium uppercase tracking-wider ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } text-gray-700 dark:text-gray-300 ${
                          isPinnedLeft 
                            ? 'sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.06)]' 
                            : isPinnedRight 
                            ? 'sticky right-0 z-20 bg-gray-50 dark:bg-gray-700 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]' 
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between space-x-2">
                          <span>{col.label}</span>
                          {['N° Comprobante', 'Tipo', 'N° Doc Cliente', 'Cliente', 'Vendedor'].includes(col.label) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                const columnKey = col.label === 'N° Comprobante' ? 'id' :
                                                  col.label === 'Tipo' ? 'type' :
                                                  col.label === 'N° Doc Cliente' ? 'clientDoc' :
                                                  col.label === 'Cliente' ? 'client' :
                                                  'vendor';
                                setActiveFilterColumn(activeFilterColumn === columnKey ? null : columnKey);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setFilterPopoverPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
                              }}
                              className={`transition-colors ${hasActiveFilter(col.label === 'N° Comprobante' ? 'id' : col.label === 'Tipo' ? 'type' : col.label === 'N° Doc Cliente' ? 'clientDoc' : col.label === 'Cliente' ? 'client' : 'vendor') ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                              aria-label={`Filtrar por ${col.label}`}
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  // Skeleton rows durante carga
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                ) : paginatedInvoices.length === 0 ? (
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
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          Crear comprobante
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((invoice, index) => {
                    const rowPadding = density === 'comfortable' ? 'py-4' : density === 'intermediate' ? 'py-3' : 'py-2';
                    const isFechaEmisionVisible = visibleColumns.some(c => c.id === 'date');
                    const isMonedaVisible = visibleColumns.some(c => c.id === 'currency');
                    
                    return (
                      <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${massPrintMode && selectedInvoices.includes(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        {massPrintMode && (
                          <td className={`px-2 ${rowPadding} sticky left-0 z-10 bg-white dark:bg-gray-800`}>
                            <input type="checkbox" checked={selectedInvoices.includes(invoice.id)} onChange={e => {
                              if (e.target.checked) setSelectedInvoices(prev => [...prev, invoice.id]);
                              else setSelectedInvoices(prev => prev.filter(id => id !== invoice.id));
                            }} />
                          </td>
                        )}

                        {visibleColumns.map(col => {
                          const value = (invoice as any)[col.key];
                          const isPinnedLeft = col.fixed === 'left';
                          const isPinnedRight = col.fixed === 'right';
                          const minWidth = (col as any).minWidth || 'auto';
                          const maxWidth = (col as any).maxWidth;
                          const shrink = (col as any).shrink;

                          // Renderizado especial para columna de acciones
                          if (col.key === 'actions') {
                            return (
                              <td 
                                key={col.id} 
                                style={{ minWidth }}
                                className={`px-4 ${rowPadding} whitespace-nowrap ${
                                  isPinnedRight 
                                    ? 'sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]' 
                                    : ''
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {/* Botón Imprimir visible (opcional) */}
                                  <button
                                    onClick={() => {
                                      console.log('Imprimir:', invoice.id);
                                      // TODO: Implementar lógica de impresión
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Imprimir"
                                    aria-label={`Imprimir comprobante ${invoice.id}`}
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>

                                  {/* Menú kebab consolidado */}
                                  <div className="relative">
                                    <button
                                      ref={(el) => { buttonRefs.current[invoice.id] = el; }}
                                      onClick={(e) => {
                                        if (openMenuId === invoice.id) {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setMenuPosition({
                                            top: rect.bottom + window.scrollY + 4,
                                            left: rect.right + window.scrollX - 176
                                          });
                                          setOpenMenuId(invoice.id);
                                        }
                                      }}
                                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      title="Más acciones"
                                      aria-label={`Más acciones para comprobante ${invoice.id}`}
                                      aria-expanded={openMenuId === invoice.id}
                                      aria-haspopup="true"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>

                                    {openMenuId === invoice.id && menuPosition && createPortal(
                                      <>
                                        <div 
                                          className="fixed inset-0 z-40" 
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            setMenuPosition(null);
                                          }}
                                        />
                                        
                                        <div 
                                          className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                                          style={{
                                            top: `${menuPosition.top}px`,
                                            left: `${menuPosition.left}px`
                                          }}
                                          role="menu"
                                          aria-orientation="vertical"
                                        >
                                          <button
                                            onClick={() => {
                                              console.log('Ver detalles:', invoice.id);
                                              setOpenMenuId(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-blue-50 dark:focus:bg-gray-700"
                                            role="menuitem"
                                            aria-label={`Ver detalles de ${invoice.id}`}
                                          >
                                            <Eye className="w-4 h-4 flex-shrink-0" />
                                            <span>Ver detalles</span>
                                          </button>
                                          
                                          <button
                                            onClick={() => {
                                              console.log('Imprimir:', invoice.id);
                                              setOpenMenuId(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-blue-50 dark:focus:bg-gray-700"
                                            role="menuitem"
                                            aria-label={`Imprimir ${invoice.id}`}
                                          >
                                            <Printer className="w-4 h-4 flex-shrink-0" />
                                            <span>Imprimir</span>
                                          </button>

                                          <button
                                            onClick={() => {
                                              console.log('Compartir:', invoice.id);
                                              setOpenMenuId(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-blue-50 dark:focus:bg-gray-700"
                                            role="menuitem"
                                            aria-label={`Compartir ${invoice.id}`}
                                          >
                                            <Share2 className="w-4 h-4 flex-shrink-0" />
                                            <span>Compartir</span>
                                          </button>
                                          
                                          <button
                                            onClick={() => {
                                              console.log('Duplicar:', invoice.id);
                                              setOpenMenuId(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-blue-50 dark:focus:bg-gray-700"
                                            role="menuitem"
                                            aria-label={`Duplicar ${invoice.id}`}
                                          >
                                            <Copy className="w-4 h-4 flex-shrink-0" />
                                            <span>Duplicar</span>
                                          </button>
                                          
                                          <button
                                            onClick={() => {
                                              console.log('Editar:', invoice.id);
                                              setOpenMenuId(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700 hover:text-amber-600 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-amber-50 dark:focus:bg-gray-700"
                                            role="menuitem"
                                            aria-label={`Editar ${invoice.id}`}
                                          >
                                            <Edit2 className="w-4 h-4 flex-shrink-0" />
                                            <span>Editar</span>
                                          </button>
                                          
                                          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                          
                                          <button
                                            onClick={() => {
                                              console.log('Anular:', invoice.id);
                                              setOpenMenuId(null);
                                              setMenuPosition(null);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2.5 focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20"
                                            role="menuitem"
                                            aria-label={`Anular ${invoice.id}`}
                                          >
                                            <XCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>Anular</span>
                                          </button>
                                        </div>
                                      </>,
                                      document.body
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          // Renderizado de otras columnas
                          const display = (() => {
                            // N° Comprobante con lógica condicional
                            if (col.key === 'id') {
                              return (
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {value || '—'}
                                  </div>
                                  {!isFechaEmisionVisible && invoice.date && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                      📅 {invoice.date}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Cliente con doble línea
                            if (col.key === 'client') {
                              return (
                                <div className="max-w-[240px]">
                                  <div 
                                    className="font-medium text-gray-900 dark:text-white truncate" 
                                    title={value || '—'}
                                  >
                                    {value || '—'}
                                  </div>
                                  {invoice.clientDoc && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                      {invoice.clientDoc}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Total con símbolo de moneda
                            if (col.key === 'total') {
                              const currency = invoice.currency || 'PEN';
                              const symbol = currency === 'USD' ? '$' : 'S/';
                              const exchangeRate = invoice.exchangeRate;
                              
                              return (
                                <div className="text-right">
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    {symbol} {Number(value || 0).toFixed(2)}
                                  </div>
                                  {!isMonedaVisible && currency !== 'PEN' && exchangeRate && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      TC: {Number(exchangeRate).toFixed(3)}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Estado con pill
                            if (col.key === 'status') {
                              return getStatusBadge(invoice.status || 'sent');
                            }

                            // F. Vencimiento solo fecha (sin texto relativo)
                            if (col.key === 'dueDate') {
                              return value || '—';
                            }

                            // Columnas con truncate
                            if (col.truncate && value) {
                              return (
                                <div 
                                  className="truncate overflow-hidden text-ellipsis" 
                                  title={String(value)}
                                  style={{ maxWidth: '100%' }}
                                >
                                  {String(value)}
                                </div>
                              );
                            }

                            // Valor por defecto
                            return value !== undefined && value !== null && value !== '' ? String(value) : '—';
                          })();

                          return (
                            <td 
                              key={col.id} 
                              style={{ 
                                minWidth,
                                maxWidth: maxWidth || undefined,
                                width: maxWidth === 'max-content' ? 'max-content' : undefined,
                                flex: shrink === 0 ? '0 0 auto' : col.truncate ? '1 1 0' : undefined
                              }}
                              className={`px-6 ${rowPadding} text-sm ${
                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                              } ${
                                col.key === 'total' || col.key === 'id' ? '' : 'text-gray-700 dark:text-gray-300'
                              } ${
                                isPinnedLeft 
                                  ? 'sticky left-0 z-10 bg-white dark:bg-gray-800 shadow-[2px_0_4px_rgba(0,0,0,0.06)]' 
                                  : isPinnedRight 
                                  ? 'sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]' 
                                  : ''
                              }`}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
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

        {/* Popover de filtros por columna */}
        {activeFilterColumn && filterPopoverPosition && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveFilterColumn(null)}
            />
            {/* Popover */}
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-80"
              style={{
                top: `${filterPopoverPosition.top + 8}px`,
                left: `${filterPopoverPosition.left - 320}px`,
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Filtrar por {activeFilterColumn === 'id' ? 'N° Comprobante' : activeFilterColumn === 'type' ? 'Tipo' : activeFilterColumn === 'clientDoc' ? 'N° Doc Cliente' : activeFilterColumn === 'client' ? 'Cliente' : 'Vendedor'}
                  </h4>
                  <button
                    onClick={() => setActiveFilterColumn(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Input según tipo de columna */}
                {['id', 'client', 'vendor'].includes(activeFilterColumn) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Buscar
                    </label>
                    <input
                      type="text"
                      placeholder="Escribir para filtrar..."
                      value={tempColumnFilters[activeFilterColumn] || ''}
                      onChange={(e) => {
                        setTempColumnFilters(prev => ({ ...prev, [activeFilterColumn]: e.target.value }));
                        handleColumnFilterChange(activeFilterColumn, e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                  </div>
                )}

                {activeFilterColumn === 'type' && (
                  <div className="space-y-2">
                    {['Factura', 'Boleta', 'Nota de Crédito', 'Nota de Débito'].map((tipo) => (
                      <label key={tipo} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(tempColumnFilters[activeFilterColumn] || '').split(',').includes(tipo)}
                          onChange={(e) => {
                            const current = (tempColumnFilters[activeFilterColumn] || '').split(',').filter(Boolean);
                            const newValue = e.target.checked
                              ? [...current, tipo].join(',')
                              : current.filter(t => t !== tipo).join(',');
                            setTempColumnFilters(prev => ({ ...prev, [activeFilterColumn]: newValue }));
                            handleColumnFilterChange(activeFilterColumn, newValue);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{tipo}</span>
                      </label>
                    ))}
                  </div>
                )}

                {activeFilterColumn === 'clientDoc' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de documento
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 12345678"
                      value={tempColumnFilters[activeFilterColumn] || ''}
                      onChange={(e) => {
                        setTempColumnFilters(prev => ({ ...prev, [activeFilterColumn]: e.target.value }));
                        handleColumnFilterChange(activeFilterColumn, e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => {
                      clearColumnFilter(activeFilterColumn);
                      setActiveFilterColumn(null);
                    }}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={() => setActiveFilterColumn(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
};

export default InvoiceListDashboard;