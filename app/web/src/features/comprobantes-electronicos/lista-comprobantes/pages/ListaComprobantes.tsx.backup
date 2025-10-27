import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, Printer, ChevronLeft, ChevronRight, FileText, MoreHorizontal,
  Share2, Copy, Eye, Edit2, XCircle, Filter, RefreshCw, Download,
  Plus, CheckCircle2, Send, XOctagon, AlertTriangle, Ban, Calendar, ChevronDown, X
} from 'lucide-react';
import { useComprobanteContext } from '../contexts/ComprobantesListContext';
import {
  SelectionProvider,
  useSelection,
  BulkBar,
  BulkPrintModal,
  ProgressModal,
  exportToExcel,
  createZipFile
} from '../components/comprobantes-bulk';
import { FilterPanel, type FilterValues } from '../components/FilterPanel';
import { PreviewModal } from '../../shared/modales/PreviewModal';
import { SuccessModal } from '../../shared/modales/SuccessModal';
import { parseDateSpanish, filterByDateRange, getTodayISO, formatDateShortSpanish, DATE_PRESETS } from '../../utils/dateUtils';
import { TABLE_CONFIG } from '../../models/constants';

// Wrapper para compatibilidad con código existente
function parseInvoiceDate(dateStr?: string): Date {
  return parseDateSpanish(dateStr) || new Date(0);
}

const InvoiceListDashboard = () => {
  // ✅ Obtener comprobantes del contexto global
  const { state } = useComprobanteContext();
  const invoices = state.comprobantes;

  // Hook de selección masiva
  const selection = useSelection();

  // Estado para navegación y modales
  const navigate = useNavigate();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [dateFrom, setDateFrom] = useState(getTodayISO());
  const [dateTo, setDateTo] = useState(getTodayISO());
  const [currentPage, setCurrentPage] = useState(1);
  const [showTotals, setShowTotals] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(TABLE_CONFIG.DEFAULT_RECORDS_PER_PAGE);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  
  // Estados para nuevas funcionalidades
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

  // Estados para panel de filtros avanzados
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues>({
    estados: [],
    vendedores: [],
    formasPago: [],
    tipos: [],
    totalMin: '',
    totalMax: ''
  });

  // Estados para modales
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedInvoiceForShare, setSelectedInvoiceForShare] = useState<any>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedInvoiceForVoid, setSelectedInvoiceForVoid] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');

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
    whiteSpace?: string;
    flex?: string;
  }
  // Lista maestra en orden (no cambia la keys del modelo de datos)
  const MASTER_COLUMNS = useMemo(() => ([
    { id: 'documentNumber', key: 'id', label: 'N° Comprobante', visible: true, fixed: 'left', align: 'left', minWidth: '168px', width: 'w-[168px]', shrink: 0 },
    { id: 'client', key: 'client', label: 'Cliente', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '220px', width: 'w-[220px]', flex: '1 1 0' },
    { id: 'clientDoc', key: 'clientDoc', label: 'N° Doc Cliente', visible: true, fixed: null, align: 'left', minWidth: '130px', width: 'w-[130px]' },
    { id: 'vendor', key: 'vendor', label: 'Vendedor', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '150px', width: 'w-[150px]', flex: '1 1 0' },
    { id: 'paymentMethod', key: 'paymentMethod', label: 'Forma de pago', visible: true, fixed: null, align: 'left', truncate: true, minWidth: '130px', width: 'w-[130px]', flex: '1 1 0' },
    { id: 'total', key: 'total', label: 'Total', visible: true, fixed: null, align: 'right', minWidth: '110px', width: 'w-[110px]', shrink: 0 },
    { id: 'status', key: 'status', label: 'Estado', visible: true, fixed: null, align: 'center', minWidth: '170px', width: 'w-[170px]', whiteSpace: 'nowrap', shrink: 0 },
    { id: 'actions', key: 'actions', label: 'ACCIONES', visible: true, fixed: 'right', align: 'center', minWidth: '110px', width: 'w-[110px]', shrink: 0 },
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

  // Load persisted visibility or defaults from localStorage (not sessionStorage)
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>(() => {
    try {
      const raw = localStorage.getItem(TABLE_CONFIG.COLUMN_CONFIG_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // fallback to MASTER_COLUMNS
    return MASTER_COLUMNS;
  });

  // Persist config to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(TABLE_CONFIG.COLUMN_CONFIG_STORAGE_KEY, JSON.stringify(columnsConfig));
    } catch (e) {}
  }, [columnsConfig]);

  // Helper: visible columns in order
  const visibleColumns = useMemo(() => columnsConfig.filter((c: ColumnConfig) => c.visible), [columnsConfig]);

  // Column manager toggle
  const toggleColumn = (id: string) => {
    setColumnsConfig(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  // Aplicar preset de fecha usando las utilidades
  const applyDatePreset = (preset: string) => {
    const presetKey = preset as keyof typeof DATE_PRESETS;
    if (DATE_PRESETS[presetKey]) {
      const { from, to } = DATE_PRESETS[presetKey]();
      setTempDateFrom(from);
      setTempDateTo(to);
    }
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
    setColumnFilters({});
    setDateFrom(getTodayISO());
    setDateTo(getTodayISO());
    setAdvancedFilters({
      estados: [],
      vendedores: [],
      formasPago: [],
      tipos: [],
      totalMin: '',
      totalMax: ''
    });
  };

  // Obtener opciones únicas para filtros avanzados
  const availableFilterOptions = useMemo(() => {
    const estados = new Set<string>();
    const vendedores = new Set<string>();
    const formasPago = new Set<string>();
    const tipos = new Set<string>();

    invoices.forEach(inv => {
      if (inv.status) estados.add(inv.status);
      if (inv.vendor) vendedores.add(inv.vendor);
      if ((inv as any).paymentMethod) formasPago.add((inv as any).paymentMethod);
      if (inv.type) tipos.add(inv.type);
    });

    return {
      estados: Array.from(estados).sort(),
      vendedores: Array.from(vendedores).sort(),
      formasPago: Array.from(formasPago).sort(),
      tipos: Array.from(tipos).sort()
    };
  }, [invoices]);

  // Handler para aplicar filtros avanzados
  const handleApplyAdvancedFilters = (filters: FilterValues) => {
    setAdvancedFilters(filters);
  };

  // Handlers para Ver detalle
  const handleViewDetails = (invoice: any) => {
    setSelectedInvoiceForPreview(invoice);
    setShowPreviewModal(true);
  };

  // Handler para Imprimir
  const handlePrint = (invoice: any) => {
    // Seleccionar el comprobante e imprimir
    console.log('Imprimiendo:', invoice.id);
    // TODO: Implementar lógica de impresión real
    window.print();
  };

  // Handler para Compartir
  const handleShare = (invoice: any) => {
    setSelectedInvoiceForShare(invoice);
    setShowShareModal(true);
  };

  // Handler para Duplicar
  const handleDuplicate = (invoice: any) => {
    // Navegar al formulario de emisión con TODA la información del comprobante
    // Solo se excluye el id (para que genere uno nuevo al crear)
    // El correlativo se asignará automáticamente al crear el nuevo comprobante
    const { id, numeroComprobante, ...invoiceData } = invoice;
    
    navigate('/comprobantes/emision', { 
      state: { 
        duplicate: {
          ...invoiceData,
          // Mantener TODA la información: cliente, productos, totales, etc.
          // El formulario usará esta data para pre-llenar los campos
          status: 'Borrador' // Estado inicial del duplicado
        } 
      } 
    });
  };

  // Handler para Anular
  const handleVoid = (invoice: any) => {
    setSelectedInvoiceForVoid(invoice);
    setVoidReason('');
    setShowVoidModal(true);
  };

  const confirmVoid = () => {
    if (!voidReason.trim()) {
      alert('Debe ingresar un motivo de anulación');
      return;
    }
    
    console.log('Anulando:', selectedInvoiceForVoid?.id, 'Motivo:', voidReason);
    // TODO: Implementar lógica de anulación
    alert(`Comprobante ${selectedInvoiceForVoid?.id} anulado. Motivo: ${voidReason}`);
    
    setShowVoidModal(false);
    setSelectedInvoiceForVoid(null);
    setVoidReason('');
  };

  // Contar filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.estados.length > 0) count += advancedFilters.estados.length;
    if (advancedFilters.vendedores.length > 0) count += advancedFilters.vendedores.length;
    if (advancedFilters.formasPago.length > 0) count += advancedFilters.formasPago.length;
    if (advancedFilters.tipos.length > 0) count += advancedFilters.tipos.length;
    if (advancedFilters.totalMin) count++;
    if (advancedFilters.totalMax) count++;
    return count;
  }, [advancedFilters]);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  // Datos filtrados por rango de fechas usando la utilidad
  const filteredInvoices = filterByDateRange(
    invoices,
    (inv) => inv.date,
    dateFrom,
    dateTo
  );
  
  // Filtrado por filtros de columna y avanzados
  const searchedInvoices = useMemo(() => {
    let result = filteredInvoices;
    
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

    // Filtros avanzados
    // Estados
    if (advancedFilters.estados.length > 0) {
      result = result.filter(invoice => {
        const status = String(invoice.status || '').toLowerCase();
        return advancedFilters.estados.some(estado => 
          status.includes(estado.toLowerCase())
        );
      });
    }

    // Vendedores
    if (advancedFilters.vendedores.length > 0) {
      result = result.filter(invoice => 
        advancedFilters.vendedores.includes(invoice.vendor)
      );
    }

    // Formas de pago
    if (advancedFilters.formasPago.length > 0) {
      result = result.filter(invoice => 
        advancedFilters.formasPago.includes((invoice as any).paymentMethod || '')
      );
    }

    // Tipos
    if (advancedFilters.tipos.length > 0) {
      result = result.filter(invoice => 
        advancedFilters.tipos.includes(invoice.type)
      );
    }

    // Rango de totales
    if (advancedFilters.totalMin) {
      const min = parseFloat(advancedFilters.totalMin);
      if (!isNaN(min)) {
        result = result.filter(invoice => invoice.total >= min);
      }
    }
    if (advancedFilters.totalMax) {
      const max = parseFloat(advancedFilters.totalMax);
      if (!isNaN(max)) {
        result = result.filter(invoice => invoice.total <= max);
      }
    }
    
    return result;
  }, [filteredInvoices, columnFilters, advancedFilters]);

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

  // =========================
  // CÁLCULOS DINÁMICOS PARA PANEL DE TOTALES
  // =========================
  // Totales basados en la lista filtrada/buscada (searchedInvoices)
  const totalComprobantes = searchedInvoices.length;

  // Total de ventas en PEN (convirtiendo USD si aplica)
  const totalVentas = searchedInvoices.reduce((sum, inv) => {
    const amount = Number(inv.total) || 0;
    const currency = (inv.currency || 'PEN').toString().toUpperCase();
    if (currency === 'USD') {
      const rate = Number(inv.exchangeRate) || 3.75; // tasa de cambio
      return sum + amount * rate;
    }
    return sum + amount;
  }, 0);

  // Contadores por estado
  const enviados = searchedInvoices.filter(inv => {
    const s = String(inv.status || '').toLowerCase();
    return s.includes('sent') || s.includes('enviado');
  }).length;

  const aceptados = searchedInvoices.filter(inv => {
    const s = String(inv.status || '').toLowerCase();
    return s.includes('accepted') || s.includes('aceptado');
  }).length;

  const porCorregir = searchedInvoices.filter(inv => {
    const s = String(inv.status || '').toLowerCase();
    return s.includes('fix') || s.includes('correg');
  }).length;

  const rechazados = searchedInvoices.filter(inv => {
    const s = String(inv.status || '').toLowerCase();
    return s.includes('reject') || s.includes('rechaz');
  }).length;

  const anulados = searchedInvoices.filter(inv => {
    const s = String(inv.status || '').toLowerCase();
    return s.includes('void') || s.includes('anulado');
  }).length;

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
        className={`inline-flex items-center border ${config.bgColor} ${config.color} focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
        style={{
          gap: '6px',
          height: '28px',
          padding: '0 12px',
          borderRadius: '9999px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          fontSize: '0.75rem'
        }}
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

  // ========== Handlers de acciones masivas ==========
  
  const handlePrintConfirm = async (format: 'ticket' | 'a4', output: 'combined' | 'separate') => {
    setProgressMessage(`Preparando ${output === 'combined' ? 'PDF combinado' : 'archivos'} en formato ${format.toUpperCase()}...`);
    setProgress(0);
    setShowProgress(true);

    try {
      // Obtener comprobantes seleccionados
      const selectedIds = Array.from(selection.selectedIds);
      const selectedDocs = searchedInvoices.filter(inv => selectedIds.includes(inv.id));

      if (output === 'combined') {
        // Simular generación de PDF combinado
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setProgress(i);
        }
        console.log(`Generando PDF combinado con ${selectedDocs.length} comprobantes en formato ${format}`);
      } else {
        // Simular generación de ZIP con PDFs individuales
        await createZipFile(
          selectedDocs.map(doc => ({
            name: `${doc.id}.pdf`,
            content: new Blob(['PDF content'], { type: 'application/pdf' })
          })),
          'comprobantes',
          setProgress
        );
      }
    } finally {
      setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleBulkExport = async () => {
    setProgressMessage('Exportando seleccionados a Excel...');
    setProgress(0);
    setShowProgress(true);

    try {
      const selectedIds = Array.from(selection.selectedIds);
      const selectedDocs = searchedInvoices.filter(inv => selectedIds.includes(inv.id));
      
      const exportData = selectedDocs.map(inv => ({
        'N° Comprobante': inv.id,
        'Tipo': inv.type,
        'Cliente': inv.client,
        'N° Doc Cliente': inv.clientDoc,
        'Vendedor': inv.vendor,
        'Forma de pago': inv.paymentMethod,
        'Total': inv.total,
        'Estado': inv.status,
        'F. Emisión': inv.date
      }));

      await exportToExcel(exportData, 'comprobantes_seleccionados', setProgress);
    } finally {
      setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleDownloadXml = async () => {
    setProgressMessage('Preparando archivos XML...');
    setProgress(0);
    setShowProgress(true);

    try {
      const selectedIds = Array.from(selection.selectedIds);
      const selectedDocs = searchedInvoices.filter(inv => selectedIds.includes(inv.id));

      await createZipFile(
        selectedDocs.map(doc => ({
          name: `${doc.id}.xml`,
          content: new Blob(['<xml>content</xml>'], { type: 'application/xml' })
        })),
        'comprobantes_xml',
        setProgress
      );
    } finally {
      setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <>
      <style>{`
        @media (min-width: 1440px) {
          .comprobantes-table-container {
            --col-gap: 16px;
            --cell-x: 14px;
          }
        }
        @media (min-width: 1280px) and (max-width: 1439px) {
          .comprobantes-table-container {
            --col-gap: 14px;
            --cell-x: 12px;
          }
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          .comprobantes-table-container {
            --col-gap: 12px;
            --cell-x: 10px;
          }
        }
        @media (max-width: 1023px) {
          .comprobantes-table-container {
            --col-gap: 10px;
            --cell-x: 8px;
          }
        }
        .comprobantes-table-container th,
        .comprobantes-table-container td {
          padding-left: var(--cell-x, 14px);
          padding-right: var(--cell-x, 14px);
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: selection.selectedCount > 0 ? '80px' : '0' }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          {/* Fila principal: Date Range → Acciones → Botones */}
          <div className="flex items-center gap-3">
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
                  {formatDateShortSpanish(dateFrom)} — {formatDateShortSpanish(dateTo)}
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
                        Preajuste
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
              className={`relative p-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeFiltersCount > 0
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setShowFilterPanel(true)}
            >
              <Filter className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
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
              onClick={async () => {
                if (searchedInvoices.length === 0) {
                  alert('No hay datos para exportar');
                  return;
                }

                setProgressMessage('Exportando comprobantes...');
                setProgress(0);
                setShowProgress(true);

                try {
                  // Obtener solo las columnas visibles
                  const exportData = searchedInvoices.map(inv => {
                    const row: Record<string, any> = {};
                    visibleColumns.forEach(col => {
                      if (col.key === 'actions') return;
                      const label = col.label;
                      const value = (inv as any)[col.key];
                      row[label] = value ?? '';
                    });
                    return row;
                  });

                  // Nombre con rango de fechas
                  const filename = `comprobantes_${dateFrom}_${dateTo}`;
                  await exportToExcel(exportData, filename, setProgress);
                  
                  // Toast de éxito (temporal - reemplazar con sistema de toasts real)
                  setTimeout(() => {
                    alert(`Exportación completada: ${searchedInvoices.length} registros`);
                  }, 600);
                } catch (error) {
                  alert('Error al exportar');
                } finally {
                  setTimeout(() => {
                    setShowProgress(false);
                    setProgress(0);
                  }, 500);
                }
              }}
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
          {(Object.keys(columnFilters).length > 0 || (dateFrom !== getTodayISO() || dateTo !== getTodayISO())) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {(dateFrom !== getTodayISO() || dateTo !== getTodayISO()) && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium border border-purple-200 dark:border-purple-800">
                  <span>Fecha: {formatDateShortSpanish(dateFrom)} — {formatDateShortSpanish(dateTo)}</span>
                  <button
                    onClick={() => {
                      setDateFrom(getTodayISO());
                      setDateTo(getTodayISO());
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
              {(Object.keys(columnFilters).length > 0 || dateFrom !== getTodayISO() || dateTo !== getTodayISO()) && (
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
          <div className="overflow-x-auto overflow-y-visible comprobantes-table-container" style={{ paddingBottom: '12px' }}>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {/* Checkbox maestro con popover */}
                  <th className="px-2 py-3 sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 w-[50px]">
                    <input 
                      type="checkbox" 
                      checked={paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selection.isSelected(inv.id))}
                      ref={(el) => {
                        if (el) {
                          const someSelected = paginatedInvoices.some(inv => selection.isSelected(inv.id));
                          const allSelected = paginatedInvoices.length > 0 && paginatedInvoices.every(inv => selection.isSelected(inv.id));
                          el.indeterminate = someSelected && !allSelected;
                        }
                      }}
                      onChange={() => {
                        const ids = paginatedInvoices.map(inv => inv.id);
                        const totals = paginatedInvoices.map(inv => Number(inv.total) || 0);
                        selection.toggleAll(ids, totals);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label="Seleccionar todos"
                    />
                  </th>
                  {visibleColumns.map((col) => {
                    const isPinnedLeft = col.fixed === 'left';
                    const isPinnedRight = col.fixed === 'right';
                    const widthClass = (col as any).width || '';
                    
                    return (
                      <th 
                        key={col.id} 
                        className={`py-3 text-xs font-medium uppercase tracking-wider ${widthClass} ${
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
                    <td colSpan={Math.max(1, visibleColumns.length + 1)} className="px-6 py-12">
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
                      <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selection.isSelected(invoice.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        {/* Checkbox por fila */}
                        <td className={`px-2 ${rowPadding} sticky left-0 z-10 bg-white dark:bg-gray-800 w-[50px]`}>
                          <input 
                            type="checkbox" 
                            checked={selection.isSelected(invoice.id)}
                            onChange={() => selection.toggleSelection(invoice.id, Number(invoice.total) || 0)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            aria-label={`Seleccionar ${invoice.id}`}
                          />
                        </td>

                        {visibleColumns.map(col => {
                          const value = (invoice as any)[col.key];
                          const isPinnedLeft = col.fixed === 'left';
                          const isPinnedRight = col.fixed === 'right';
                          const widthClass = (col as any).width || '';

                          // Renderizado especial para columna de acciones
                          if (col.key === 'actions') {
                            return (
                              <td 
                                key={col.id} 
                                className={`px-4 ${rowPadding} whitespace-nowrap ${widthClass} ${
                                  isPinnedRight 
                                    ? 'sticky right-0 z-10 bg-white dark:bg-gray-800 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]' 
                                    : ''
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {/* Botón Imprimir visible (opcional) */}
                                  <button
                                    onClick={() => handlePrint(invoice)}
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
                                              handleViewDetails(invoice);
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
                                              handlePrint(invoice);
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
                                              handleShare(invoice);
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
                                              handleDuplicate(invoice);
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
                                              navigate('/comprobantes/emision', { state: { edit: invoice } });
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
                                              handleVoid(invoice);
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
                              return (
                                <div style={{ marginRight: '10px' }}>
                                  {getStatusBadge(invoice.status || 'sent')}
                                </div>
                              );
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
                              className={`${rowPadding} text-sm ${widthClass} ${
                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                              } ${
                                col.key === 'total' || col.key === 'id' ? '' : 'text-gray-700 dark:text-gray-300'
                              } ${
                                col.key === 'status' ? 'whitespace-nowrap' : ''
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

        {/* Totals Panel - Diseño Minimalista y Profesional */}
        {showTotals && (
          <div 
            className="mt-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-md"
            role="region"
            aria-labelledby="totals-heading"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 id="totals-heading" className="text-base font-semibold text-gray-900 dark:text-white">
                  Resumen de totales
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Actualizado en tiempo real
                </p>
              </div>
              <button
                onClick={() => setShowTotals(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-150"
                aria-expanded={showTotals}
                aria-controls="totals-content"
                aria-label="Ocultar resumen de totales"
              >
                <span className="font-medium">Ocultar</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div id="totals-content" className="p-5">
              {/* Main Cards - Siempre visibles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Total Comprobantes */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {totalComprobantes}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Total comprobantes
                  </div>
                </div>

                {/* Total Ventas - Destacado */}
                <div className="bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    S/ {totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Total ventas
                  </div>
                </div>

                {/* Enviados */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {enviados}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Enviados
                  </div>
                </div>

                {/* Aceptados */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {aceptados}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Aceptados
                  </div>
                </div>

                {/* Por Corregir */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {porCorregir}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Por corregir
                  </div>
                </div>

                {/* Rechazados */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <XOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {rechazados}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Rechazados
                  </div>
                </div>
              </div>

              {/* Secondary Card - Anulados (segunda fila si es necesario) */}
              {anulados > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Ban className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                      {anulados}
                    </div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Anulados
                    </div>
                  </div>
                </div>
              )}

              {/* Estado vacío */}
              {totalComprobantes === 0 && (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  Sin datos para este rango
                </div>
              )}
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

        {/* Barra de acciones masivas */}
        <BulkBar
          onPrint={() => setShowPrintModal(true)}
          onExport={handleBulkExport}
          onDownloadXml={handleDownloadXml}
          formatCurrency={(amount) => `S/ ${amount.toFixed(2)}`}
        />

        {/* Modal de impresión */}
        <BulkPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          onConfirm={handlePrintConfirm}
          selectedCount={selection.selectedCount}
        />

        {/* Modal de progreso */}
        <ProgressModal
          isOpen={showProgress}
          progress={progress}
          message={progressMessage}
        />

        {/* Panel de filtros avanzados */}
        <FilterPanel
          isOpen={showFilterPanel}
          onClose={() => setShowFilterPanel(false)}
          onApply={handleApplyAdvancedFilters}
          currentFilters={advancedFilters}
          availableOptions={availableFilterOptions}
        />

        {/* Modal de Vista Previa */}
        {selectedInvoiceForPreview && (
          <PreviewModal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedInvoiceForPreview(null);
            }}
            cartItems={[]} // TODO: Convertir invoice a cartItems si es necesario
            documentType={(selectedInvoiceForPreview.type?.toLowerCase() === 'factura' ? 'factura' : 'boleta') as any}
            series={selectedInvoiceForPreview.id?.split('-')[0] || ''}
            totals={{
              subtotal: selectedInvoiceForPreview.total || 0,
              igv: 0,
              total: selectedInvoiceForPreview.total || 0
            }}
            paymentMethod={(selectedInvoiceForPreview as any).paymentMethod || 'CONTADO'}
            currency={(selectedInvoiceForPreview as any).currency || 'PEN'}
            observations={(selectedInvoiceForPreview as any).observations}
            internalNotes={(selectedInvoiceForPreview as any).internalNote}
          />
        )}

        {/* Modal de Compartir */}
        {selectedInvoiceForShare && (
          <SuccessModal
            isOpen={showShareModal}
            onClose={() => {
              setShowShareModal(false);
              setSelectedInvoiceForShare(null);
            }}
            comprobante={{
              tipo: selectedInvoiceForShare.type || '',
              serie: selectedInvoiceForShare.id?.split('-')[0] || '',
              numero: selectedInvoiceForShare.id?.split('-')[1] || '',
              total: selectedInvoiceForShare.total || 0,
              cliente: selectedInvoiceForShare.client
            }}
            onPrint={() => handlePrint(selectedInvoiceForShare)}
            onNewSale={() => {}}
          />
        )}

        {/* Modal de Anulación */}
        {showVoidModal && selectedInvoiceForVoid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Anular Comprobante
                </h3>
                <button
                  onClick={() => {
                    setShowVoidModal(false);
                    setSelectedInvoiceForVoid(null);
                    setVoidReason('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ¿Está seguro que desea anular el comprobante <strong>{selectedInvoiceForVoid.id}</strong>?
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo de anulación *
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                  placeholder="Ingrese el motivo de la anulación..."
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowVoidModal(false);
                    setSelectedInvoiceForVoid(null);
                    setVoidReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmVoid}
                  disabled={!voidReason.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Anular comprobante
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

// Wrapper con SelectionProvider
const InvoiceListWithSelection = () => {
  return (
    <SelectionProvider>
      <InvoiceListDashboard />
    </SelectionProvider>
  );
};

export default InvoiceListWithSelection;