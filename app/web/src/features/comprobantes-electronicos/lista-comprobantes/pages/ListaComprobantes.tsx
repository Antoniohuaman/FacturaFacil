/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable no-empty -- bloques de captura intencionales; logging diferido */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComprobanteContext } from '../contexts/ComprobantesListContext';
import type { Comprobante } from '../contexts/ComprobantesListContext';
import { devLocalIndicadoresStore } from '../../../indicadores-negocio/integration/devLocalStore';
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
import { CobranzaModal } from '../../shared/modales/CobranzaModal';
import type {
  CartItem,
  ClientData,
  PaymentCollectionPayload,
  PaymentTotals,
  TipoComprobante,
} from '../../models/comprobante.types';
import { useCobranzasContext } from '../../../gestion-cobranzas/context/CobranzasContext';
import type { CuentaPorCobrarSummary } from '../../../gestion-cobranzas/models/cobranzas.types';
import { parseDateSpanish, filterByDateRange, DATE_PRESETS } from '../../utils/dateUtils';
import { TABLE_CONFIG } from '../../models/constants';
import { StatsCards } from '../components/StatsCards';
import { TableFooter } from '../components/TableFooter';
import { ListHeader } from '../components/ListHeader';
import { InvoiceListTable } from '../components/lista-comprobantes/InvoiceListTable';
import { ColumnFilterPopover } from '../components/lista-comprobantes/ColumnFilterPopover';
import { VoidInvoiceModal } from '../components/lista-comprobantes/VoidInvoiceModal';
import type { ColumnConfig } from '../types/columnConfig';
import { formatBusinessDateShort, getBusinessTodayISODate } from '@/shared/time/businessTime';

// Wrapper para compatibilidad con código existente
function parseInvoiceDate(dateStr?: string): Date {
  return parseDateSpanish(dateStr) || new Date(0);
}

const resolveTipoComprobante = (label?: string): TipoComprobante => {
  if (!label) {
    return 'factura';
  }
  return label.toLowerCase().includes('boleta') ? 'boleta' : 'factura';
};

const InvoiceListDashboard = () => {
  // ✅ Obtener comprobantes del contexto global
  const { state, dispatch } = useComprobanteContext();
  const invoices = state.comprobantes;
  const { cuentas, registerCobranza } = useCobranzasContext();

  // Hook de selección masiva
  const selection = useSelection();

  // Estado para navegación y modales
  const navigate = useNavigate();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [dateFrom, setDateFrom] = useState(() => getBusinessTodayISODate());
  const [dateTo, setDateTo] = useState(() => getBusinessTodayISODate());
  const [currentPage, setCurrentPage] = useState(1);
  const [showTotals, setShowTotals] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(TABLE_CONFIG.DEFAULT_RECORDS_PER_PAGE);
  
  // Estados para nuevas funcionalidades
  const [density, setDensity] = useState<'comfortable' | 'intermediate' | 'compact'>('comfortable');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [isLoading] = useState(false);
  
  // Estados para Date Range
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState(() => getBusinessTodayISODate());
  const [tempDateTo, setTempDateTo] = useState(() => getBusinessTodayISODate());
  
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
  const [selectedCuentaCobranza, setSelectedCuentaCobranza] = useState<CuentaPorCobrarSummary | null>(null);
  const [showCobranzaModal, setShowCobranzaModal] = useState(false);

  // --------------------
  // Column manager (config local)
  // --------------------
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

  const cuentasPorComprobante = useMemo(() => {
    return cuentas.reduce<Record<string, CuentaPorCobrarSummary>>((acc, cuenta) => {
      acc[cuenta.comprobanteId] = cuenta;
      return acc;
    }, {});
  }, [cuentas]);

  const canGenerateCobranza = useCallback((invoice: Comprobante) => {
    const cuenta = cuentasPorComprobante[invoice.id];
    if (!cuenta) {
      return false;
    }
    return cuenta.estado !== 'cancelado';
  }, [cuentasPorComprobante]);

  const handleGenerateCobranza = useCallback((invoice: Comprobante) => {
    const cuenta = cuentasPorComprobante[invoice.id];
    if (!cuenta) {
      return;
    }
    setSelectedCuentaCobranza(cuenta);
    setShowCobranzaModal(true);
  }, [cuentasPorComprobante]);

  const cartItemsForCobranza = useMemo<CartItem[]>(() => {
    if (!selectedCuentaCobranza) {
      return [];
    }
    return [
      {
        id: selectedCuentaCobranza.comprobanteId,
        code: selectedCuentaCobranza.comprobanteSerie,
        name: `Saldo pendiente ${selectedCuentaCobranza.comprobanteSerie}-${selectedCuentaCobranza.comprobanteNumero}`,
        price: selectedCuentaCobranza.saldo,
        quantity: 1,
        subtotal: selectedCuentaCobranza.saldo,
        total: selectedCuentaCobranza.saldo,
        stock: 1,
        requiresStockControl: false,
      },
    ];
  }, [selectedCuentaCobranza]);

  const totalsForCobranza = useMemo<PaymentTotals>(() => ({
    subtotal: selectedCuentaCobranza?.saldo ?? 0,
    igv: 0,
    total: selectedCuentaCobranza?.saldo ?? 0,
    currency: selectedCuentaCobranza?.moneda ?? 'PEN',
  }), [selectedCuentaCobranza]);

  const clienteCobranza = useMemo<ClientData | undefined>(() => {
    if (!selectedCuentaCobranza) {
      return undefined;
    }
    return {
      nombre: selectedCuentaCobranza.clienteNombre,
      tipoDocumento: selectedCuentaCobranza.clienteDocumento.length === 11 ? 'RUC' : 'DNI',
      documento: selectedCuentaCobranza.clienteDocumento,
    };
  }, [selectedCuentaCobranza]);

  const tipoComprobanteCobranza: TipoComprobante = selectedCuentaCobranza
    ? resolveTipoComprobante(selectedCuentaCobranza.tipoComprobante)
    : 'factura';

  const handleCobranzaComplete = useCallback(async (payload: PaymentCollectionPayload) => {
    if (!selectedCuentaCobranza) {
      return false;
    }
    try {
      await registerCobranza({ cuenta: selectedCuentaCobranza, payload });
      setShowCobranzaModal(false);
      setSelectedCuentaCobranza(null);
      return true;
    } catch (cobranzaError) {
      console.error('No se pudo registrar la cobranza desde la lista de comprobantes:', cobranzaError);
      return false;
    }
  }, [registerCobranza, selectedCuentaCobranza]);

  const handleCloseCobranzaModal = () => {
    setShowCobranzaModal(false);
    setSelectedCuentaCobranza(null);
  };

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
    if (!selectedInvoiceForVoid) {
      return;
    }
    if (!voidReason.trim()) {
      alert('Debe ingresar un motivo de anulación');
      return;
    }

    try {
      dispatch({
        type: 'UPDATE_COMPROBANTE',
        payload: {
          ...selectedInvoiceForVoid,
          status: 'Anulado',
          statusColor: 'red'
        }
      });
    } catch (error) {
      console.error('No se pudo actualizar el comprobante en memoria', error);
    }

    try {
      devLocalIndicadoresStore.marcarVentaAnulada(selectedInvoiceForVoid.id);
    } catch (error) {
      console.warn('No se pudo marcar la venta como anulada en indicadores locales', error);
    }

    alert(`Comprobante ${selectedInvoiceForVoid.id} anulado. Motivo: ${voidReason}`);

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

  const handleRequestFilter = (columnKey: string, position: { top: number; left: number }) => {
    if (activeFilterColumn === columnKey) {
      setActiveFilterColumn(null);
      setFilterPopoverPosition(null);
      return;
    }

    setActiveFilterColumn(columnKey);
    setFilterPopoverPosition(position);
  };

  const handleCloseFilterPopover = () => {
    setActiveFilterColumn(null);
    setFilterPopoverPosition(null);
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
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-full" style={{ paddingBottom: selection.selectedCount > 0 ? '80px' : '0' }}>
      {/* Header */}
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
        activeFiltersCount={activeFiltersCount}
        onOpenFilters={() => setShowFilterPanel(true)}
        showColumnManager={showColumnManager}
        columnsConfig={columnsConfig}
        density={density}
        onToggleColumnManager={() => setShowColumnManager(!showColumnManager)}
        onToggleColumn={toggleColumn}
        onDensityChange={setDensity}
        onExport={async () => {
          if (searchedInvoices.length === 0) {
            alert('No hay datos para exportar');
            return;
          }

          setProgressMessage('Exportando comprobantes...');
          setProgress(0);
          setShowProgress(true);

          try {
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

            const filename = `comprobantes_${dateFrom}_${dateTo}`;
            await exportToExcel(exportData, filename, setProgress);

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
      />

      

      {/* Main Content */}
      <div className="px-6 py-6">
        <InvoiceListTable
          invoices={paginatedInvoices}
          visibleColumns={visibleColumns}
          density={density}
          selection={selection}
          isLoading={isLoading}
          hasActiveFilter={hasActiveFilter}
          onRequestFilter={handleRequestFilter}
          onViewDetails={handleViewDetails}
          onPrint={handlePrint}
          onShare={handleShare}
          onDuplicate={handleDuplicate}
          onEdit={(invoice) => navigate('/comprobantes/emision', { state: { edit: invoice } })}
          onVoid={handleVoid}
          onNavigateToDocuments={() => navigate('/documentos')}
          onGenerateCobranza={handleGenerateCobranza}
          canGenerateCobranza={canGenerateCobranza}
          onCreateInvoice={() => navigate('/comprobantes/emision')}
          hasDateFilter={Boolean(dateFrom || dateTo)}
        />

        <TableFooter
          recordsPerPage={recordsPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          startRecord={startRecord}
          endRecord={endRecord}
          totalRecords={totalRecords}
          onToggleTotals={() => setShowTotals(!showTotals)}
          onRecordsPerPageChange={setRecordsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

        {/* Totals Panel - Componente modular */}
        <StatsCards
          totalComprobantes={totalComprobantes}
          totalVentas={totalVentas}
          enviados={enviados}
          aceptados={aceptados}
          porCorregir={porCorregir}
          rechazados={rechazados}
          anulados={anulados}
          showTotals={showTotals}
          onToggleTotals={() => setShowTotals(false)}
        />

        <ColumnFilterPopover
          columnKey={activeFilterColumn}
          position={filterPopoverPosition}
          tempFilters={tempColumnFilters}
          onTempFiltersChange={setTempColumnFilters}
          onFilterChange={handleColumnFilterChange}
          onClearFilter={clearColumnFilter}
          onClose={handleCloseFilterPopover}
        />

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

        <CobranzaModal
          isOpen={showCobranzaModal && Boolean(selectedCuentaCobranza)}
          onClose={handleCloseCobranzaModal}
          cartItems={cartItemsForCobranza}
          totals={totalsForCobranza}
          cliente={clienteCobranza}
          tipoComprobante={tipoComprobanteCobranza}
          serie={selectedCuentaCobranza?.comprobanteSerie || ''}
          numeroTemporal={selectedCuentaCobranza?.comprobanteNumero}
          fechaEmision={selectedCuentaCobranza?.fechaEmision || ''}
          moneda={selectedCuentaCobranza?.moneda || 'PEN'}
          formaPago={selectedCuentaCobranza?.formaPago}
          onComplete={handleCobranzaComplete}
          creditTerms={selectedCuentaCobranza?.creditTerms}
          installmentsState={selectedCuentaCobranza?.installments}
          context="cobranzas"
        />

        <VoidInvoiceModal
          isOpen={showVoidModal && Boolean(selectedInvoiceForVoid)}
          invoiceId={selectedInvoiceForVoid?.id}
          reason={voidReason}
          onReasonChange={setVoidReason}
          onCancel={() => {
            setShowVoidModal(false);
            setSelectedInvoiceForVoid(null);
            setVoidReason('');
          }}
          onConfirm={confirmVoid}
        />
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
