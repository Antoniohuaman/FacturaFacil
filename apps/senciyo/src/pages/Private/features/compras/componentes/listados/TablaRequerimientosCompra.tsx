import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  FileText,
  ShoppingCart,
  Receipt,
  Search,
  Plus,
  XCircle,
  Pencil,
  Trash2,
  CheckCircle,
  CalendarRange,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback';
import { exportDatasetToExcel, type SimpleExcelColumn } from '@/shared/export/exportToExcel';
import type { RequerimientoCompra, EstadoPrincipalRC } from '../../modelos/RequerimientoCompra';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import { BADGE_ESTADO_PRINCIPAL_RC, ETIQUETA_ESTADO_PRINCIPAL_RC } from '../../constantes/estadosCompras';
import {
  filtrarRequerimientosCompra,
  type FiltrosRC,
  type CampoFechaFiltroRC,
} from '../../logica/filtrosCompras';
import { formatearFechaCompra, formatearNumeroCompra, formatearNumeroComprobanteCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import {
  puedeAnularRC,
  puedeEditarRC,
  puedeEliminarBorradorRC,
  puedeConvertirRCaOC,
  puedeConvertirRCaCC,
  calcularEstadoPrincipalRC,
  ESTADOS_PRINCIPALES_RC,
  obtenerDocumentosGeneradosRC,
} from '../../logica/reglasCompras';

interface TablaRequerimientosCompraProps {
  requerimientos: RequerimientoCompra[];
  ordenes: OrdenCompra[];
  comprobantes: ComprobanteCompra[];
  cargando: boolean;
  errorCarga: string | null;
  onVer: (rc: RequerimientoCompra) => void;
  onEditar: (rc: RequerimientoCompra) => void;
  onEliminarBorrador: (rc: RequerimientoCompra) => void;
  onRegistrarBorrador: (rc: RequerimientoCompra) => void;
  onAnular: (rc: RequerimientoCompra) => void;
  onGenerarOC: (rc: RequerimientoCompra) => void;
  onGenerarCC: (rc: RequerimientoCompra) => void;
  onNuevo: () => void;
  onActualizar: () => void;
  onVerOrdenCompra: (ocId: string) => void;
  onVerComprobante: (ccId: string) => void;
}

const CAMPOS_FECHA_RC: Array<{ id: CampoFechaFiltroRC; label: string }> = [
  { id: 'fechaSolicitud', label: 'F. Solicitud' },
  { id: 'fechaRequerida', label: 'F. Requerida' },
  { id: 'fechaRegistro', label: 'F. Registro' },
];

type ColumnaConfigurableRC = 'solicitante' | 'fechaSolicitud' | 'fechaRequerida' | 'documentoRelacionado';

const COLUMNAS_CONFIGURABLES_RC: Array<{ id: ColumnaConfigurableRC; label: string; labelCorto?: string }> = [
  { id: 'solicitante', label: 'Solicitante' },
  { id: 'fechaSolicitud', label: 'Fecha de solicitud', labelCorto: 'F. Solicitud' },
  { id: 'fechaRequerida', label: 'Fecha requerida', labelCorto: 'F. Requerida' },
  { id: 'documentoRelacionado', label: 'Documento relacionado', labelCorto: 'Doc. Relacionado' },
];

const COLUMNAS_VISIBLES_DEFAULT_RC: ColumnaConfigurableRC[] = [
  'solicitante',
  'fechaSolicitud',
  'fechaRequerida',
  'documentoRelacionado',
];

const STORAGE_KEY_COLUMNAS_RC = 'compras_rc_tabla_columnas';

interface ConfigColumnasRC {
  visibles: ColumnaConfigurableRC[];
  orden: ColumnaConfigurableRC[];
}

function esColumnaValida(id: string): id is ColumnaConfigurableRC {
  return COLUMNAS_CONFIGURABLES_RC.some((c) => c.id === id);
}

function cargarConfigColumnasRC(): ConfigColumnasRC {
  const ordenCompleto = COLUMNAS_CONFIGURABLES_RC.map((c) => c.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_RC);
    if (!raw) return { visibles: COLUMNAS_VISIBLES_DEFAULT_RC, orden: ordenCompleto };
    const parsed = JSON.parse(raw) as { visibles?: string[]; orden?: string[] };
    const visibles = Array.isArray(parsed.visibles)
      ? parsed.visibles.filter(esColumnaValida)
      : COLUMNAS_VISIBLES_DEFAULT_RC;
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const orden = [...ordenGuardado, ...ordenCompleto.filter((id) => !ordenGuardado.includes(id))];
    return { visibles, orden };
  } catch {
    return { visibles: COLUMNAS_VISIBLES_DEFAULT_RC, orden: ordenCompleto };
  }
}

function guardarConfigColumnasRC(config: ConfigColumnasRC): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_RC, JSON.stringify(config));
  } catch {
    // ignorar cuota de almacenamiento
  }
}

interface PosMenu {
  id: string;
  x: number;
  y: number;
}

function Badge({
  estado,
  labels,
  clases,
}: {
  estado: string;
  labels: Record<string, string>;
  clases: Record<string, string>;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${clases[estado] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

function BotonAccionDirecta({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg transition-colors ${
        danger ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
      }`}
    >
      <Icon size={15} />
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function TablaRequerimientosCompra({
  requerimientos,
  ordenes,
  comprobantes,
  cargando,
  errorCarga,
  onVer,
  onEditar,
  onEliminarBorrador,
  onRegistrarBorrador,
  onAnular,
  onGenerarOC,
  onGenerarCC,
  onNuevo,
  onActualizar,
  onVerOrdenCompra,
  onVerComprobante,
}: TablaRequerimientosCompraProps) {
  const { state: config } = useConfigurationContext();
  const feedback = useFeedback();
  const [filtros, setFiltros] = useState<FiltrosRC>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtradas = filtrarRequerimientosCompra(requerimientos, filtros, ordenes, comprobantes);

  async function handleExportar() {
    if (!filtradas.length) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    try {
      const columnasExport: SimpleExcelColumn[] = [
        { header: 'Número', key: 'numero', width: 20 },
        { header: 'Proveedor', key: 'proveedor', width: 28 },
        ...columnasVisiblesOrdenadas.map((id): SimpleExcelColumn => ({
          header: COLUMNAS_CONFIGURABLES_RC.find((c) => c.id === id)?.label ?? id,
          key: id,
        })),
        { header: 'Total referencial', key: 'total', width: 16, numFmt: '#,##0.00' },
        { header: 'Estado', key: 'estado', width: 16 },
      ];
      const rows = filtradas.map((rc) => ({
        numero: formatearNumeroCompra(rc.serie, rc.correlativo),
        proveedor: rc.proveedorNombre ?? '—',
        ...Object.fromEntries(columnasVisiblesOrdenadas.map((id) => [id, obtenerValorExportacionColumna(rc, id)])),
        total: rc.totales.total,
        estado: ETIQUETA_ESTADO_PRINCIPAL_RC[calcularEstadoPrincipalRC(rc, ordenes, comprobantes)],
      }));
      await exportDatasetToExcel({
        rows,
        columns: columnasExport,
        filename: `requerimientos-de-compra_${new Date().toISOString().split('T')[0]}`,
        worksheetName: 'Requerimientos de Compra',
      });
    } catch {
      feedback.error('Error al exportar. Intenta nuevamente.');
    }
  }

  const [mostrarFechas, setMostrarFechas] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const fechaPopoverRef = useRef<HTMLDivElement>(null);
  const filtrosPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (fechaPopoverRef.current && !fechaPopoverRef.current.contains(e.target as Node)) {
        setMostrarFechas(false);
      }
      if (filtrosPanelRef.current && !filtrosPanelRef.current.contains(e.target as Node)) {
        setMostrarFiltros(false);
      }
    }
    if (mostrarFechas || mostrarFiltros) {
      document.addEventListener('mousedown', handleClickFuera);
      return () => document.removeEventListener('mousedown', handleClickFuera);
    }
  }, [mostrarFechas, mostrarFiltros]);

  const monedasActivas = config.currencies.filter((c) => c.isActive);

  const hayRangoFechas = Boolean(filtros.fechaDesde || filtros.fechaHasta);
  const filtrosAvanzadosActivos = [
    filtros.estadoPrincipal,
    filtros.documentoRelacionado && filtros.documentoRelacionado !== 'todos' ? filtros.documentoRelacionado : undefined,
    filtros.moneda,
  ].filter(Boolean).length;

  function limpiarFiltros() {
    setFiltros({ busqueda: '', campoFecha: 'fechaSolicitud' });
    setMostrarFiltros(false);
  }

  const [colConfig, setColConfig] = useState<ConfigColumnasRC>(() => cargarConfigColumnasRC());
  useEffect(() => {
    guardarConfigColumnasRC(colConfig);
  }, [colConfig]);

  function alternarColumna(id: string) {
    if (!esColumnaValida(id)) return;
    setColConfig((prev) => ({
      ...prev,
      visibles: prev.visibles.includes(id)
        ? prev.visibles.filter((v) => v !== id)
        : [...prev.visibles, id],
    }));
  }
  function restablecerColumnas() {
    setColConfig({
      visibles: COLUMNAS_VISIBLES_DEFAULT_RC,
      orden: COLUMNAS_CONFIGURABLES_RC.map((c) => c.id),
    });
  }
  function seleccionarTodasColumnas() {
    setColConfig((prev) => ({ ...prev, visibles: COLUMNAS_CONFIGURABLES_RC.map((c) => c.id) }));
  }
  function reordenarColumnas(sourceId: string, targetId: string) {
    if (!esColumnaValida(sourceId) || !esColumnaValida(targetId)) return;
    setColConfig((prev) => {
      const orden = [...prev.orden];
      const from = orden.indexOf(sourceId);
      const to = orden.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      orden.splice(from, 1);
      orden.splice(to, 0, sourceId);
      return { ...prev, orden };
    });
  }

  const columnasVisiblesOrdenadas = colConfig.orden.filter((id) => colConfig.visibles.includes(id));
  const totalColumnas = 5 + columnasVisiblesOrdenadas.length;

  const columnasManager: ColumnsManagerColumn[] = [
    { id: 'numero', label: 'Número', visible: true, fixed: true },
    { id: 'proveedor', label: 'Proveedor', visible: true, fixed: true },
    ...colConfig.orden.map((id) => ({
      id,
      label: COLUMNAS_CONFIGURABLES_RC.find((c) => c.id === id)?.label ?? id,
      visible: colConfig.visibles.includes(id),
    })),
    { id: 'total', label: 'Total referencial', visible: true, fixed: true },
    { id: 'estado', label: 'Estado', visible: true, fixed: true },
    { id: 'acciones', label: 'Acciones', visible: true, fixed: true },
  ];

  function renderCeldaColumna(rc: RequerimientoCompra, id: ColumnaConfigurableRC): React.ReactNode {
    switch (id) {
      case 'solicitante':
        return rc.solicitanteNombre ?? '—';
      case 'fechaSolicitud':
        return formatearFechaCompra(rc.fechaSolicitud);
      case 'fechaRequerida':
        return rc.fechaRequerida ? formatearFechaCompra(rc.fechaRequerida) : '—';
      case 'documentoRelacionado': {
        const relacionados = obtenerDocumentosGeneradosRC(rc, ordenes, comprobantes);
        if (relacionados.length === 0) return '—';
        if (relacionados.length === 1) {
          const rel = relacionados[0];
          const numero =
            rel.tipo === 'orden_compra'
              ? formatearNumeroCompra(rel.documento.serie, rel.documento.correlativo || undefined)
              : formatearNumeroComprobanteCompra(rel.documento);
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (rel.tipo === 'orden_compra') {
                  onVerOrdenCompra(rel.documento.id);
                } else {
                  onVerComprobante(rel.documento.id);
                }
              }}
              title={rel.tipo === 'orden_compra' ? 'Abrir orden de compra relacionada' : 'Abrir comprobante de compra relacionado'}
              className="font-mono text-blue-600 hover:underline"
            >
              {numero}
            </button>
          );
        }
        return (
          <span
            title={relacionados
              .map((r) => (r.tipo === 'orden_compra' ? formatearNumeroCompra(r.documento.serie, r.documento.correlativo || undefined) : formatearNumeroComprobanteCompra(r.documento)))
              .join(', ')}
          >
            {relacionados.length} documentos
          </span>
        );
      }
      default:
        return '—';
    }
  }

  function obtenerValorExportacionColumna(rc: RequerimientoCompra, id: ColumnaConfigurableRC): string {
    if (id === 'documentoRelacionado') {
      const relacionados = obtenerDocumentosGeneradosRC(rc, ordenes, comprobantes);
      return relacionados.length === 0
        ? '—'
        : relacionados
            .map((r) => (r.tipo === 'orden_compra' ? formatearNumeroCompra(r.documento.serie, r.documento.correlativo || undefined) : formatearNumeroComprobanteCompra(r.documento)))
            .join(', ');
    }
    const valor = renderCeldaColumna(rc, id);
    return typeof valor === 'string' ? valor : '—';
  }

  function renderAccionesDirectas(rc: RequerimientoCompra, estado: EstadoPrincipalRC) {
    if (estado === 'Borrador') {
      return (
        <>
          <BotonAccionDirecta icon={Pencil} label="Editar requerimiento de compra" onClick={() => onEditar(rc)} />
          {puedeEliminarBorradorRC(rc, ordenes, comprobantes) && (
            <BotonAccionDirecta icon={Trash2} label="Eliminar borrador" onClick={() => onEliminarBorrador(rc)} danger />
          )}
        </>
      );
    }
    if (estado === 'Pendiente') {
      return (
        <>
          {puedeEditarRC(rc, ordenes, comprobantes) && (
            <BotonAccionDirecta icon={Pencil} label="Editar requerimiento de compra" onClick={() => onEditar(rc)} />
          )}
          {puedeConvertirRCaOC(rc, ordenes, comprobantes) && (
            <BotonAccionDirecta icon={ShoppingCart} label="Generar orden de compra" onClick={() => onGenerarOC(rc)} />
          )}
          {puedeConvertirRCaCC(rc, ordenes, comprobantes) && (
            <BotonAccionDirecta icon={Receipt} label="Generar comprobante de compra" onClick={() => onGenerarCC(rc)} />
          )}
          {puedeAnularRC(rc, ordenes, comprobantes) && (
            <BotonAccionDirecta icon={XCircle} label="Anular requerimiento de compra" onClick={() => onAnular(rc)} danger />
          )}
        </>
      );
    }
    return null;
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    if (menu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menu]);

  function abrirMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ id, x: rect.left, y: rect.bottom });
  }

  const rcActiva = menu ? requerimientos.find((r) => r.id === menu.id) ?? null : null;
  const estadoPrincipalActivo = rcActiva ? calcularEstadoPrincipalRC(rcActiva, ordenes, comprobantes) : null;

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filtros.busqueda ?? ''}
            onChange={(e) => setFiltros((f) => ({ ...f, busqueda: e.target.value }))}
            placeholder="Buscar por número, solicitante o proveedor..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="relative" ref={fechaPopoverRef}>
          <button
            type="button"
            onClick={() => setMostrarFechas((v) => !v)}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <CalendarRange size={16} className="text-gray-400" />
            {hayRangoFechas
              ? `${filtros.fechaDesde ? formatearFechaCompra(filtros.fechaDesde) : '…'} – ${filtros.fechaHasta ? formatearFechaCompra(filtros.fechaHasta) : '…'}`
              : 'Todas las fechas'}
          </button>
          {mostrarFechas && (
            <div className="absolute z-40 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg space-y-2">
              <label className="block text-sm">
                <span className="text-xs text-gray-500">Desde</span>
                <input
                  type="date"
                  value={filtros.fechaDesde ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value || undefined }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-gray-500">Hasta</span>
                <input
                  type="date"
                  value={filtros.fechaHasta ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value || undefined }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => setFiltros((f) => ({ ...f, fechaDesde: undefined, fechaHasta: undefined }))}
                className="text-xs text-blue-600 hover:underline"
              >
                Limpiar rango
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={filtrosPanelRef}>
          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <SlidersHorizontal size={16} className="text-gray-400" />
            Filtros
            {filtrosAvanzadosActivos > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-medium">
                {filtrosAvanzadosActivos}
              </span>
            )}
          </button>
          {mostrarFiltros && (
            <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado</label>
                <select
                  value={filtros.estadoPrincipal ?? ''}
                  onChange={(e) =>
                    setFiltros((f) => ({ ...f, estadoPrincipal: e.target.value as EstadoPrincipalRC | '' }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_PRINCIPALES_RC.map((estado) => (
                    <option key={estado} value={estado}>{ETIQUETA_ESTADO_PRINCIPAL_RC[estado]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Documento relacionado</label>
                <select
                  value={filtros.documentoRelacionado ?? 'todos'}
                  onChange={(e) =>
                    setFiltros((f) => ({ ...f, documentoRelacionado: e.target.value as 'todos' | 'con' | 'sin' }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="con">Con documento relacionado</option>
                  <option value="sin">Sin documento relacionado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                <select
                  value={filtros.moneda ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, moneda: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todas</option>
                  {monedasActivas.map((c) => (
                    <option key={c.id} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Campo de fecha del filtro</label>
                <select
                  value={filtros.campoFecha ?? 'fechaSolicitud'}
                  onChange={(e) => setFiltros((f) => ({ ...f, campoFecha: e.target.value as CampoFechaFiltroRC }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {CAMPOS_FECHA_RC.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="w-full text-center text-sm text-blue-600 hover:underline pt-1"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          title="Actualizar"
          aria-label="Actualizar"
          className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={cargando ? 'animate-spin text-gray-400' : 'text-gray-400'} />
        </button>

        <ColumnsManager
          columns={columnasManager}
          onToggleColumn={alternarColumna}
          onResetColumns={restablecerColumnas}
          onSelectAllColumns={seleccionarTodasColumnas}
          onReorderColumns={reordenarColumnas}
          buttonLabel="Columnas"
        />
        <button
          type="button"
          onClick={() => void handleExportar()}
          title="Exportar"
          aria-label="Exportar"
          className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          <FileDown size={16} className="text-gray-400" />
          Exportar
        </button>
        <button
          onClick={onNuevo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo Requerimiento
        </button>
      </div>

      {/* Tabla — el contenedor, thead y columna Acciones siempre se renderizan; solo el tbody cambia según el estado real. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Número</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
              {columnasVisiblesOrdenadas.map((id) => {
                const columna = COLUMNAS_CONFIGURABLES_RC.find((c) => c.id === id);
                return (
                  <th
                    key={id}
                    className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap"
                    title={columna?.label}
                  >
                    {columna?.labelCorto ?? columna?.label}
                  </th>
                );
              })}
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total referencial</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={totalColumnas} className="px-4 py-3">
                    <div className="h-4 w-full max-w-sm animate-pulse rounded bg-gray-200" />
                  </td>
                </tr>
              ))
            ) : errorCarga ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-red-600">{errorCarga}</p>
                  <button
                    type="button"
                    onClick={onActualizar}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Reintentar
                  </button>
                </td>
              </tr>
            ) : requerimientos.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay requerimientos de compra registrados.</p>
                  <p className="text-sm mt-1">Crea el primer requerimiento de compra para empezar.</p>
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No se encontraron requerimientos con los filtros aplicados.</p>
                  <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </td>
              </tr>
            ) : (
              filtradas.map((rc) => {
                const estadoPrincipal = calcularEstadoPrincipalRC(rc, ordenes, comprobantes);
                return (
                  <tr
                    key={rc.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onVer(rc)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {rc.correlativo ? (
                        formatearNumeroCompra(rc.serie, rc.correlativo)
                      ) : (
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-semibold">{rc.serie}</span>
                          <span className="text-xs font-normal text-gray-400">sin correlativo</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]">
                        {rc.proveedorNombre ?? '—'}
                      </div>
                      {rc.proveedorNumeroDocumento && (
                        <div className="text-xs text-gray-500">{rc.proveedorNumeroDocumento}</div>
                      )}
                    </td>
                    {columnasVisiblesOrdenadas.map((id) => (
                      <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {renderCeldaColumna(rc, id)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(rc.totales.total, rc.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge estado={estadoPrincipal} labels={ETIQUETA_ESTADO_PRINCIPAL_RC} clases={BADGE_ESTADO_PRINCIPAL_RC} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {renderAccionesDirectas(rc, estadoPrincipal)}
                        <button
                          onClick={(e) => abrirMenu(e, rc.id)}
                          aria-label="Más acciones"
                          title="Más acciones"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Menú contextual con posición fija */}
      {menu && rcActiva && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-52 overflow-hidden"
          style={{
            top: Math.min(menu.y + 4, window.innerHeight - 220),
            left: Math.min(menu.x, window.innerWidth - 216),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={Eye}
            label="Ver detalle"
            onClick={() => { onVer(rcActiva); setMenu(null); }}
          />
          {estadoPrincipalActivo === 'Borrador' && (
            <MenuItem
              icon={CheckCircle}
              label="Registrar"
              onClick={() => { onRegistrarBorrador(rcActiva); setMenu(null); }}
            />
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {requerimientos.length} requerimientos
      </p>
    </div>
  );
}
