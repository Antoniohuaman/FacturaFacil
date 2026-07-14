import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  XCircle,
  Search,
  Plus,
  Receipt,
  Pencil,
  Trash2,
  Copy,
  Printer,
  Download,
  CheckCircle,
  CalendarRange,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback';
import { exportDatasetToExcel } from '@/shared/export/exportToExcel';
import type { ComprobanteCompra, EstadoPrincipalCC } from '../../modelos/ComprobanteCompra';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import { BADGE_ESTADO_PRINCIPAL_CC, ETIQUETA_ESTADO_PRINCIPAL_CC } from '../../constantes/estadosCompras';
import {
  filtrarComprobantesCompra,
  type FiltrosCC,
  type CampoFechaFiltroCC,
} from '../../logica/filtrosCompras';
import {
  calcularEstadoPrincipalCC,
  ESTADOS_PRINCIPALES_CC,
  puedeEditarCC,
  puedeEliminarBorradorCC,
  puedeAnularCC,
  puedeImprimirCC,
  resolverNombreFormaPago,
} from '../../logica/reglasCompras';
import { TIPOS_DOCUMENTO_PROVEEDOR } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra, formatearNumeroCompra, formatearNumeroComprobanteCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface TablaComprobantesCompraProps {
  comprobantes: ComprobanteCompra[];
  ordenes: OrdenCompra[];
  cargando: boolean;
  errorCarga: string | null;
  onVer: (cc: ComprobanteCompra) => void;
  onEditar: (cc: ComprobanteCompra) => void;
  onEliminarBorrador: (cc: ComprobanteCompra) => void;
  onRegistrarBorrador: (cc: ComprobanteCompra) => void;
  onAnular: (cc: ComprobanteCompra) => void;
  onDuplicar: (cc: ComprobanteCompra) => void;
  onImprimir: (cc: ComprobanteCompra) => void;
  onVerOC: (ocId: string) => void;
  onNuevo: () => void;
  onActualizar: () => void;
}

type ColumnaConfigurableCC =
  | 'fechaEmision'
  | 'fechaRegistro'
  | 'fechaVencimiento'
  | 'documentoRelacionado'
  | 'formaPago'
  | 'moneda'
  | 'comprador'
  | 'centroCosto'
  | 'presupuesto'
  | 'tipoComprobante';

const COLUMNAS_CONFIGURABLES_CC: Array<{ id: ColumnaConfigurableCC; label: string; labelCorto?: string }> = [
  { id: 'fechaEmision', label: 'Fecha de emisión', labelCorto: 'F. Emisión' },
  { id: 'fechaRegistro', label: 'Fecha de registro', labelCorto: 'F. Registro' },
  { id: 'fechaVencimiento', label: 'Fecha de vencimiento', labelCorto: 'F. Vencimiento' },
  { id: 'documentoRelacionado', label: 'Documento relacionado', labelCorto: 'Doc. Relacionado' },
  { id: 'formaPago', label: 'Forma de pago' },
  { id: 'moneda', label: 'Moneda' },
  { id: 'comprador', label: 'Comprador' },
  { id: 'centroCosto', label: 'Centro de costo' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'tipoComprobante', label: 'Tipo de comprobante' },
];

const COLUMNAS_VISIBLES_DEFAULT_CC: ColumnaConfigurableCC[] = [
  'fechaEmision',
  'fechaRegistro',
  'fechaVencimiento',
  'documentoRelacionado',
  'formaPago',
];

const STORAGE_KEY_COLUMNAS_CC = 'compras_cc_tabla_columnas';

const CAMPOS_FECHA_CC: Array<{ id: CampoFechaFiltroCC; label: string }> = [
  { id: 'fechaEmisionProveedor', label: 'F. Emisión' },
  { id: 'fechaVencimiento', label: 'F. Vencimiento' },
  { id: 'fechaRegistro', label: 'F. Registro' },
];

interface ConfigColumnasCC {
  visibles: ColumnaConfigurableCC[];
  orden: ColumnaConfigurableCC[];
}

function esColumnaValida(id: string): id is ColumnaConfigurableCC {
  return COLUMNAS_CONFIGURABLES_CC.some((c) => c.id === id);
}

function cargarConfigColumnasCC(): ConfigColumnasCC {
  const ordenCompleto = COLUMNAS_CONFIGURABLES_CC.map((c) => c.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_CC);
    if (!raw) return { visibles: COLUMNAS_VISIBLES_DEFAULT_CC, orden: ordenCompleto };
    const parsed = JSON.parse(raw) as { visibles?: string[]; orden?: string[] };
    const visibles = Array.isArray(parsed.visibles)
      ? parsed.visibles.filter(esColumnaValida)
      : COLUMNAS_VISIBLES_DEFAULT_CC;
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const orden = [...ordenGuardado, ...ordenCompleto.filter((id) => !ordenGuardado.includes(id))];
    return { visibles, orden };
  } catch {
    return { visibles: COLUMNAS_VISIBLES_DEFAULT_CC, orden: ordenCompleto };
  }
}

function guardarConfigColumnasCC(config: ConfigColumnasCC): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_CC, JSON.stringify(config));
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

export default function TablaComprobantesCompra({
  comprobantes,
  ordenes,
  cargando,
  errorCarga,
  onVer,
  onEditar,
  onEliminarBorrador,
  onRegistrarBorrador,
  onAnular,
  onDuplicar,
  onImprimir,
  onVerOC,
  onNuevo,
  onActualizar,
}: TablaComprobantesCompraProps) {
  const { state: config } = useConfigurationContext();
  const feedback = useFeedback();
  const [filtros, setFiltros] = useState<FiltrosCC>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtrados = filtrarComprobantesCompra(comprobantes, filtros);

  async function handleExportar() {
    if (!filtrados.length) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    try {
      const rows = filtrados.map((cc) => ({
        numero: cc.serieProveedor && cc.numeroProveedor ? formatearNumeroComprobanteCompra(cc) : 'Sin número',
        tipo: TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === cc.tipoComprobanteProveedor)?.nombre ?? cc.tipoComprobanteProveedor,
        proveedor: cc.proveedorNombre,
        documento: cc.proveedorNumeroDocumento,
        estado: ETIQUETA_ESTADO_PRINCIPAL_CC[calcularEstadoPrincipalCC(cc)],
        fechaEmision: cc.fechaEmisionProveedor ? formatearFechaCompra(cc.fechaEmisionProveedor) : '—',
        fechaVencimiento: cc.fechaVencimiento ? formatearFechaCompra(cc.fechaVencimiento) : '—',
        formaPago: resolverNombreFormaPago(cc, config.paymentMethods),
        moneda: cc.moneda,
        total: cc.totales.total,
      }));
      await exportDatasetToExcel({
        rows,
        columns: [
          { header: 'Comprobante', key: 'numero', width: 20 },
          { header: 'Tipo', key: 'tipo', width: 22 },
          { header: 'Proveedor', key: 'proveedor', width: 30 },
          { header: 'RUC / DNI', key: 'documento', width: 15 },
          { header: 'Estado', key: 'estado', width: 14 },
          { header: 'F. Emisión', key: 'fechaEmision', width: 14 },
          { header: 'F. Vencimiento', key: 'fechaVencimiento', width: 16 },
          { header: 'Forma de pago', key: 'formaPago', width: 20 },
          { header: 'Moneda', key: 'moneda', width: 10 },
          { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
        ],
        filename: `comprobantes-de-compra_${new Date().toISOString().split('T')[0]}`,
        worksheetName: 'Comprobantes de Compra',
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

  const formasPagoActivas = config.paymentMethods.filter((m) => m.isActive);
  const monedasActivas = config.currencies.filter((c) => c.isActive);

  const hayRangoFechas = Boolean(filtros.fechaDesde || filtros.fechaHasta);
  const filtrosAvanzadosActivos = [
    filtros.estadoPrincipal,
    filtros.tipoComprobanteProveedor,
    filtros.formaPagoMetodoId,
    filtros.documentoRelacionado && filtros.documentoRelacionado !== 'todos' ? filtros.documentoRelacionado : undefined,
    filtros.moneda,
  ].filter(Boolean).length;

  function limpiarFiltros() {
    setFiltros({ busqueda: '', campoFecha: 'fechaEmisionProveedor' });
    setMostrarFiltros(false);
  }

  const [colConfig, setColConfig] = useState<ConfigColumnasCC>(() => cargarConfigColumnasCC());
  useEffect(() => {
    guardarConfigColumnasCC(colConfig);
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
      visibles: COLUMNAS_VISIBLES_DEFAULT_CC,
      orden: COLUMNAS_CONFIGURABLES_CC.map((c) => c.id),
    });
  }
  function seleccionarTodasColumnas() {
    setColConfig((prev) => ({ ...prev, visibles: COLUMNAS_CONFIGURABLES_CC.map((c) => c.id) }));
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
    { id: 'comprobante', label: 'Comprobante', visible: true, fixed: true },
    { id: 'proveedor', label: 'Proveedor', visible: true, fixed: true },
    ...colConfig.orden.map((id) => ({
      id,
      label: COLUMNAS_CONFIGURABLES_CC.find((c) => c.id === id)?.label ?? id,
      visible: colConfig.visibles.includes(id),
    })),
    { id: 'total', label: 'Total', visible: true, fixed: true },
    { id: 'estado', label: 'Estado', visible: true, fixed: true },
    { id: 'acciones', label: 'Acciones', visible: true, fixed: true },
  ];

  function renderCeldaColumna(cc: ComprobanteCompra, id: ColumnaConfigurableCC): React.ReactNode {
    switch (id) {
      case 'fechaEmision':
        return cc.fechaEmisionProveedor ? formatearFechaCompra(cc.fechaEmisionProveedor) : '—';
      case 'fechaRegistro':
        return cc.fechaRegistro ? formatearFechaCompra(cc.fechaRegistro) : '—';
      case 'fechaVencimiento':
        return cc.fechaVencimiento ? formatearFechaCompra(cc.fechaVencimiento) : '—';
      case 'documentoRelacionado': {
        if (!cc.ordenCompraOrigenId) return '—';
        const ocOrigen = ordenes.find((o) => o.id === cc.ordenCompraOrigenId);
        if (!ocOrigen) return '—';
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onVerOC(ocOrigen.id); }}
            title="Abrir orden de compra relacionada"
            className="font-mono text-blue-600 hover:underline"
          >
            {formatearNumeroCompra(ocOrigen.serie, ocOrigen.correlativo)}
          </button>
        );
      }
      case 'formaPago':
        return resolverNombreFormaPago(cc, config.paymentMethods);
      case 'moneda':
        return cc.moneda;
      case 'comprador':
        return cc.compradorNombre ?? '—';
      case 'centroCosto':
        return cc.centroCosto ?? '—';
      case 'presupuesto':
        return cc.presupuesto ?? '—';
      case 'tipoComprobante':
        return TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === cc.tipoComprobanteProveedor)?.nombre ?? '—';
      default:
        return '—';
    }
  }

  function renderAccionesDirectas(cc: ComprobanteCompra, estado: EstadoPrincipalCC) {
    if (estado === 'Borrador') {
      return (
        <>
          {puedeEditarCC(cc) && <BotonAccionDirecta icon={Pencil} label="Editar comprobante de compra" onClick={() => onEditar(cc)} />}
          {puedeEliminarBorradorCC(cc) && (
            <BotonAccionDirecta icon={Trash2} label="Eliminar borrador" onClick={() => onEliminarBorrador(cc)} danger />
          )}
          <BotonAccionDirecta icon={Copy} label="Duplicar comprobante de compra" onClick={() => onDuplicar(cc)} />
        </>
      );
    }
    if (estado === 'Registrado') {
      return (
        <>
          {puedeAnularCC(cc) && (
            <BotonAccionDirecta icon={XCircle} label="Anular comprobante de compra" onClick={() => onAnular(cc)} danger />
          )}
          <BotonAccionDirecta icon={Copy} label="Duplicar comprobante de compra" onClick={() => onDuplicar(cc)} />
        </>
      );
    }
    if (estado === 'Anulado' || estado === 'Convertido') {
      return (
        <>
          <BotonAccionDirecta icon={Copy} label="Duplicar comprobante de compra" onClick={() => onDuplicar(cc)} />
          {puedeImprimirCC(cc) && (
            <BotonAccionDirecta icon={Printer} label="Imprimir comprobante de compra" onClick={() => onImprimir(cc)} />
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

  const ccActivo = menu ? comprobantes.find((c) => c.id === menu.id) ?? null : null;
  const estadoPrincipalActivo = ccActivo ? calcularEstadoPrincipalCC(ccActivo) : null;

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
            placeholder="Buscar por número, proveedor o RUC..."
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
                    setFiltros((f) => ({ ...f, estadoPrincipal: e.target.value as EstadoPrincipalCC | '' }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_PRINCIPALES_CC.map((estado) => (
                    <option key={estado} value={estado}>{ETIQUETA_ESTADO_PRINCIPAL_CC[estado]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de comprobante</label>
                <select
                  value={filtros.tipoComprobanteProveedor ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, tipoComprobanteProveedor: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {TIPOS_DOCUMENTO_PROVEEDOR.map((t) => (
                    <option key={t.codigo} value={t.codigo}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
                <select
                  value={filtros.formaPagoMetodoId ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, formaPagoMetodoId: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todas</option>
                  {formasPagoActivas.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
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
                  value={filtros.campoFecha ?? 'fechaEmisionProveedor'}
                  onChange={(e) => setFiltros((f) => ({ ...f, campoFecha: e.target.value as CampoFechaFiltroCC }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {CAMPOS_FECHA_CC.map((c) => (
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
          Registrar comprobante
        </button>
      </div>

      {/* Tabla — el contenedor, thead y columna Acciones siempre se renderizan; solo el tbody cambia según el estado real. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Comprobante</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
              {columnasVisiblesOrdenadas.map((id) => {
                const columna = COLUMNAS_CONFIGURABLES_CC.find((c) => c.id === id);
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
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
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
            ) : comprobantes.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay comprobantes de compra registrados.</p>
                  <p className="text-sm mt-1">Registra el primer comprobante de compra.</p>
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <Receipt size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No se encontraron comprobantes con los filtros aplicados.</p>
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
              filtrados.map((cc) => {
                const estadoPrincipal = calcularEstadoPrincipalCC(cc);
                return (
                  <tr
                    key={cc.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onVer(cc)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {cc.serieProveedor && cc.numeroProveedor ? (
                        formatearNumeroComprobanteCompra(cc)
                      ) : (
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-semibold">
                            {TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.codigo === cc.tipoComprobanteProveedor)?.nombreCorto ?? 'Comprobante'}
                          </span>
                          <span className="text-xs font-normal text-gray-400">sin número</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]">
                        {cc.proveedorNombre}
                      </div>
                      <div className="text-xs text-gray-500">{cc.proveedorNumeroDocumento}</div>
                    </td>
                    {columnasVisiblesOrdenadas.map((id) => (
                      <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {renderCeldaColumna(cc, id)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(cc.totales.total, cc.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge estado={estadoPrincipal} labels={ETIQUETA_ESTADO_PRINCIPAL_CC} clases={BADGE_ESTADO_PRINCIPAL_CC} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {renderAccionesDirectas(cc, estadoPrincipal)}
                        <button
                          onClick={(e) => abrirMenu(e, cc.id)}
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
      {menu && ccActivo && (
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
            onClick={() => { onVer(ccActivo); setMenu(null); }}
          />
          {estadoPrincipalActivo === 'Borrador' && (
            <MenuItem
              icon={CheckCircle}
              label="Registrar"
              onClick={() => { onRegistrarBorrador(ccActivo); setMenu(null); }}
            />
          )}
          {estadoPrincipalActivo !== 'Borrador' && puedeImprimirCC(ccActivo) && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={Printer}
                label="Imprimir"
                onClick={() => { onImprimir(ccActivo); setMenu(null); }}
              />
              <MenuItem
                icon={Download}
                label="Descargar PDF"
                onClick={() => { onImprimir(ccActivo); setMenu(null); }}
              />
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtrados.length} de {comprobantes.length} comprobantes
      </p>
    </div>
  );
}
