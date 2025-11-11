/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import React, { useState, useMemo } from 'react';
import { MoreHorizontal, Edit, Copy, Trash2, Send, Clock, AlertTriangle, FileText, ChevronLeft, Printer, Search, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import type { Draft } from '../mockData/drafts.mock';
import { filterByDateRange, getTodayISO, formatDateShortSpanish, DATE_PRESETS } from '../../utils/dateUtils';
import { validateDraftsForBulkEmit } from '../../utils/draftValidation';
import { PAGINATION_CONFIG } from '../../models/constants';
import { ListHeader } from '../components/ListHeader';
import { useUserSession } from '../../../../contexts/UserSessionContext';

type DraftStatus = 'Vigente' | 'Por vencer' | 'Vencido';
type StatusColor = 'green' | 'orange' | 'red';

interface DraftInvoicesModuleProps {
  hideSidebar?: boolean;
}

const DraftInvoicesModule: React.FC<DraftInvoicesModuleProps> = ({ hideSidebar }) => {
  // Obtener usuario actual del contexto de sesión
  const { session } = useUserSession();
  const currentUserName = session?.userName || 'Usuario';

  const [showEmitPopup, setShowEmitPopup] = useState<boolean>(false);
  const [invalidDrafts, setInvalidDrafts] = useState<Draft[]>([]);
  const [validDrafts, setValidDrafts] = useState<Draft[]>([]);
  const [dateFrom, setDateFrom] = useState<string>(getTodayISO());
  const [dateTo, setDateTo] = useState<string>(getTodayISO());
  const [tempDateFrom, setTempDateFrom] = useState<string>(getTodayISO());
  const [tempDateTo, setTempDateTo] = useState<string>(getTodayISO());
  const [showDateRangePicker, setShowDateRangePicker] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showTotals, setShowTotals] = useState<boolean>(false);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [showPrintPopup, setShowPrintPopup] = useState<boolean>(false);
  const [density] = useState<'comfortable' | 'intermediate' | 'compact'>('comfortable');

  // ========================================
  // EXTRACTORES ROBUSTOS DE DATOS DE BORRADOR
  // ========================================
  // Función helper para seleccionar primer valor no vacío
  const pick = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && v !== '') ?? '';

  // Extractor de documento de cliente
  const getClientDoc = (d: any): string => 
    pick(
      d.clienteDoc,
      d.clienteDocumento,
      d.clientDocument,
      d.numeroDocumentoCliente,
      d.cliente?.documento,
      d.cliente?.numeroDocumento,
      d.cliente?.doc,
      d.cliente?.ruc,
      d.cliente?.dni
    );

  // Extractor de nombre de cliente
  const getClientName = (d: any): string =>
    pick(
      d.cliente,
      d.clienteNombre,
      d.clientName,
      d.razonSocial,
      d.cliente?.razonSocial,
      d.cliente?.nombres,
      d.cliente?.nombre,
      d.cliente?.name
    );

  // Extractor de fecha de creación
  const getCreatedAt = (d: any): string =>
    pick(
      d.fechaEmision,
      d.creado,
      d.fechaCreacion,
      d.createdAt,
      d.fechaRegistro,
      d.created_at
    );

  // Extractor de fecha de vencimiento
  const getDueAt = (d: any): string =>
    pick(
      d.fechaVencimiento,
      d.vence,
      d.dueAt,
      d.dueDate,
      d.due_at
    );

  // Extractor de total
  const getTotal = (d: any): number => {
    const totalDirecto = pick(d.total, d.importeTotal, d.montoTotal, d.amount);
    if (totalDirecto !== '') return Number(totalDirecto) || 0;
    
    // Calcular desde productos si existe
    if (d.productos && Array.isArray(d.productos)) {
      return d.productos.reduce((sum: number, p: any) => {
        const price = Number(p.price || p.precio || p.precioUnitario || 0);
        const quantity = Number(p.quantity || p.cantidad || 1);
        return sum + (price * quantity);
      }, 0);
    }
    
    return 0;
  };

  // Extractor de vendedor con fallback a usuario actual
  const getVendor = (d: any): string =>
    pick(
      d.vendedor,
      d.vendedorNombre,
      d.vendor,
      d.salesPerson,
      currentUserName
    );

  // ========================================
  // CÁLCULO DE ESTADO DESDE FECHA DE VENCIMIENTO
  // ========================================
  const calculateDraftStatusFromDueDate = (venceIso?: string): {
    status: DraftStatus;
    statusColor: StatusColor;
    daysLeft: number;
  } => {
    if (!venceIso) {
      return { status: 'Vigente', statusColor: 'green', daysLeft: 999 };
    }

    const now = new Date();
    const vence = new Date(venceIso);
    const diffMs = vence.getTime() - now.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    const days = Math.ceil(hours / 24);

    if (hours <= 0) {
      return { status: 'Vencido', statusColor: 'red', daysLeft: 0 };
    }
    
    if (hours <= 24) {
      return { status: 'Por vencer', statusColor: 'orange', daysLeft: 1 };
    }
    
    return { status: 'Vigente', statusColor: 'green', daysLeft: days };
  };

  // Log de campos usados para debugging
  console.info('[ListaBorradores] Extractores configurados:', {
    clientDoc: 'clienteDoc | clienteDocumento | cliente.documento',
    clientName: 'cliente | clienteNombre | cliente.razonSocial',
    createdAt: 'fechaEmision | creado | fechaCreacion',
    dueAt: 'fechaVencimiento | vence | dueAt',
    vendor: 'vendedor | vendedorNombre | currentUserName'
  });

  // Leer borradores guardados en localStorage y mapearlos a Draft
  const localDraftsRaw = localStorage.getItem('borradores');
  let localDrafts: Draft[] = [];

  if (localDraftsRaw) {
    try {
      const parsed = JSON.parse(localDraftsRaw);
      localDrafts = parsed.map((d: any) => {
        // Extraer datos usando los extractores robustos
        const clientDoc = getClientDoc(d);
        const clientName = getClientName(d);
        const createdAt = getCreatedAt(d);
        const dueAt = getDueAt(d);
        const total = getTotal(d);
        const vendor = getVendor(d);

        // Calcular estado desde fecha de vencimiento
        const { status, statusColor, daysLeft } = calculateDraftStatusFromDueDate(dueAt);

        // Formatear fechas
        const createdDateFormatted = createdAt 
          ? new Date(createdAt).toLocaleDateString('es-PE', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '';

        const expiryDateFormatted = dueAt
          ? new Date(dueAt).toLocaleDateString('es-PE', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })
          : '';

        return {
          id: d.id,
          type: d.tipo === 'factura' ? 'Factura' : 'Boleta de venta',
          clientDoc,
          client: clientName,
          createdDate: createdDateFormatted,
          expiryDate: expiryDateFormatted,
          vendor,
          total,
          status,
          daysLeft,
          statusColor
        };
      });

      // Log de conteo para verificación
      console.info('[ListaBorradores] Borradores cargados:', {
        total: localDrafts.length,
        conCliente: localDrafts.filter(d => d.client).length,
        conDocumento: localDrafts.filter(d => d.clientDoc).length,
        conVendedor: localDrafts.filter(d => d.vendor).length
      });
    } catch (e) {
      console.error('Error parsing drafts from localStorage:', e);
      localDrafts = [];
    }
  }

  // Usar solo borradores de localStorage (sin datos hardcodeados)
  const drafts: Draft[] = useMemo(() => localDrafts, [localDraftsRaw]);

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

  // ========================================
  // HANDLERS FUNCIONALES DE ACCIONES
  // ========================================
  
  // Editar borrador
  const editarBorrador = (id: string) => {
    console.info('[ListaBorradores] Editando borrador:', id);
    // TODO: Navegar a /punto-venta con el borrador cargado
    // navigate(`/punto-venta?draft=${id}`);
  };

  // Emitir desde borrador
  const emitirDesdeBorrador = (id: string) => {
    console.info('[ListaBorradores] Emitiendo borrador:', id);
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    // TODO: Navegar a flujo de emisión con datos del borrador
    // navigate(`/punto-venta?emit=${id}`);
  };

  // Duplicar borrador
  const duplicarBorrador = (id: string) => {
    console.info('[ListaBorradores] Duplicando borrador:', id);
    
    const localDrafts = localStorage.getItem('borradores');
    if (!localDrafts) return;

    try {
      const parsed = JSON.parse(localDrafts);
      const original = parsed.find((d: any) => d.id === id);
      
      if (!original) {
        console.warn('[ListaBorradores] Borrador no encontrado para duplicar:', id);
        return;
      }

      // Crear copia con nuevo ID
      const duplicado = {
        ...original,
        id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fechaEmision: new Date().toISOString(),
        creado: new Date().toISOString()
      };

      const updated = [...parsed, duplicado];
      localStorage.setItem('borradores', JSON.stringify(updated));
      
      // Recargar página para reflejar cambios
      window.location.reload();
    } catch (e) {
      console.error('[ListaBorradores] Error duplicando borrador:', e);
    }
  };

  // Compartir borrador
  const compartirBorrador = (id: string) => {
    console.info('[ListaBorradores] Compartiendo borrador:', id);
    // TODO: Implementar compartir (copiar link, descargar PDF, enviar por email)
    // Por ahora, copiar ID al portapapeles
    navigator.clipboard.writeText(id).then(() => {
      console.info('[ListaBorradores] ID copiado al portapapeles:', id);
    });
  };

  // Eliminar borrador
  const eliminarBorrador = (id: string) => {
    const confirmacion = window.confirm('¿Está seguro de que desea eliminar este borrador?');
    if (!confirmacion) return;

    console.info('[ListaBorradores] Eliminando borrador:', id);
    
    const localDrafts = localStorage.getItem('borradores');
    if (!localDrafts) return;

    try {
      const parsed = JSON.parse(localDrafts);
      const updated = parsed.filter((d: any) => d.id !== id);
      localStorage.setItem('borradores', JSON.stringify(updated));
      
      // Recargar página para reflejar cambios
      window.location.reload();
    } catch (e) {
      console.error('[ListaBorradores] Error eliminando borrador:', e);
    }
  };

  // Exportar borradores
  const handleExport = async () => {
    console.info('[ListaBorradores] Exportando borradores:', {
      total: filteredDrafts.length,
      filtros: { desde: dateFrom, hasta: dateTo }
    });
    
    // TODO: Si existe backend, llamar servicio de exportación
    // await exportService.exportDrafts(filteredDrafts, { dateFrom, dateTo });
    
    // Por ahora, log de datos a exportar
    console.table(filteredDrafts.map(d => ({
      id: d.id,
      tipo: d.type,
      cliente: d.client,
      total: d.total,
      estado: d.status
    })));
  };

  const getStatusBadge = (status: DraftStatus, color: StatusColor, daysLeft: number) => {
    const getStatusText = (): string => {
      if (status === 'Vencido') return 'Vencido';
      if (status === 'Por vencer') return `Vence en ${daysLeft}d`;
      return `${daysLeft} días`;
    };

    // Color configuration matching Comprobantes style
    const statusConfig: Record<StatusColor, { bgColor: string; textColor: string; icon: React.ReactNode }> = {
      green: {
        bgColor: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700',
        textColor: 'text-green-800 dark:text-green-200',
        icon: <Clock className="w-3.5 h-3.5" />
      },
      orange: {
        bgColor: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700',
        textColor: 'text-orange-800 dark:text-orange-200',
        icon: <Clock className="w-3.5 h-3.5" />
      },
      red: {
        bgColor: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
        textColor: 'text-red-800 dark:text-red-200',
        icon: <AlertTriangle className="w-3.5 h-3.5" />
      }
    };

    const config = statusConfig[color];

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor}`}>
        {config.icon}
        {getStatusText()}
      </span>
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

  // Handlers para date range picker
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
    setCurrentPage(1);
  };

  const recordsPerPage = PAGINATION_CONFIG.DRAFTS_PER_PAGE;
  const totalRecords = filteredDrafts.length;
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  // Log de paginación y filtros activos
  console.info('[ListaBorradores] Paginación:', {
    página: currentPage,
    rango: `${startRecord} – ${endRecord} de ${totalRecords}`,
    porPágina: recordsPerPage,
    filtros: { desde: dateFrom, hasta: dateTo }
  });

  // Calculate summary stats using filtered drafts
  const vigenteDrafts = filteredDrafts.filter(d => d.status === 'Vigente').length;
  const porVencerDrafts = filteredDrafts.filter(d => d.status === 'Por vencer').length;
  const vencidoDrafts = filteredDrafts.filter(d => d.status === 'Vencido').length;
  const totalValue = filteredDrafts.reduce((sum, draft) => sum + draft.total, 0);

  // Log de estadísticas calculadas
  console.info('[ListaBorradores] Estadísticas:', {
    vigentes: vigenteDrafts,
    porVencer: porVencerDrafts,
    vencidos: vencidoDrafts,
    valorTotal: `S/ ${totalValue.toFixed(2)}`
  });

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
        {/* Header usando componente de Comprobantes */}
        <ListHeader
          dateFrom={dateFrom}
          dateTo={dateTo}
          tempDateFrom={tempDateFrom}
          tempDateTo={tempDateTo}
          showDateRangePicker={showDateRangePicker}
          formatDateShort={formatDateShortSpanish}
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
          onOpenFilters={() => console.log('Abrir filtros')}
          showColumnManager={false}
          columnsConfig={[]}
          density={density}
          onToggleColumnManager={() => {}}
          onToggleColumn={() => {}}
          onDensityChange={() => {}}
          onExport={handleExport}
          hideActionButtons={true}
        />

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

        {/* Stats Cards - Compact Style */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Vigentes */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {vigenteDrafts}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Vigentes
                  </div>
                </div>
                <div className="w-7 h-7 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Edit className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Por Vencer */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {porVencerDrafts}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Por Vencer (24h)
                  </div>
                </div>
                <div className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            {/* Vencidos */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                    {vencidoDrafts}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Vencidos
                  </div>
                </div>
                <div className="w-7 h-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>

            {/* Valor Total */}
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    S/ {totalValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Valor Total
                  </div>
                </div>
                <div className="w-7 h-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
                      <td className="px-6 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDrafts.includes(draft.id)}
                          onChange={() => handleSelectDraft(draft.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Seleccionar ${draft.id}`}
                        />
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {draft.id.startsWith('DRAFT-')
                          ? draft.id.replace(/^DRAFT-([A-Z0-9]+)-.*/, '$1')
                          : draft.id}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.type}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.clientDoc}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.client}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.createdDate}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.expiryDate}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {draft.vendor}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        S/ {draft.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {getStatusBadge(draft.status, draft.statusColor, draft.daysLeft)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => editarBorrador(draft.id)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Editar"
                            aria-label={`Editar borrador ${draft.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => emitirDesdeBorrador(draft.id)}
                            className="p-1.5 text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                            title="Emitir"
                            aria-label={`Emitir borrador ${draft.id}`}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duplicarBorrador(draft.id)}
                            className="p-1.5 text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                            title="Duplicar"
                            aria-label={`Duplicar borrador ${draft.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => eliminarBorrador(draft.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Eliminar"
                            aria-label={`Eliminar borrador ${draft.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => compartirBorrador(draft.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                            title="Más opciones"
                            aria-label={`Más opciones para borrador ${draft.id}`}
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

            {/* Footer - Matching Comprobantes style */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowTotals(!showTotals)}
                    className="h-10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalRecords / recordsPerPage), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalRecords / recordsPerPage)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                      aria-label="Página siguiente"
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
