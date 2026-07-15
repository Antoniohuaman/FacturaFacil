import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  FileText,
  Receipt,
  Search,
  Plus,
  XCircle,
  Pencil,
  Trash2,
  Send,
  Printer,
  Download,
  Copy,
  CalendarRange,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback';
import { exportDatasetToExcel } from '@/shared/export/exportToExcel';
import type { OrdenCompra } from '../../modelos/OrdenCompra';
import type { EstadoPrincipalOC } from '../../modelos/OrdenCompra';
import type { ComprobanteCompra } from '../../modelos/ComprobanteCompra';
import { BADGE_ESTADO_PRINCIPAL_OC, ETIQUETA_ESTADO_PRINCIPAL_OC } from '../../constantes/estadosCompras';
import {
  filtrarOrdenesCompra,
  obtenerFechaRegistroOC,
  type FiltrosOC,
  type CampoFechaFiltroOC,
} from '../../logica/filtrosCompras';
import { formatearFechaCompra, formatearNumeroCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import {
  puedeAnularOC,
  puedeGenerarCCDesdeOC,
  puedeEditarOC,
  puedeEliminarBorradorOC,
  puedeImprimirOC,
  puedeEnviarOC,
  calcularEstadoPrincipalOC,
  resolverNombreFormaPago,
  ESTADOS_PRINCIPALES_OC,
} from '../../logica/reglasCompras';

interface TablaOrdenesCompraProps {
  ordenes: OrdenCompra[];
  comprobantes: ComprobanteCompra[];
  cargando: boolean;
  errorCarga: string | null;
  onVer: (oc: OrdenCompra) => void;
  onEditar: (oc: OrdenCompra) => void;
  onEliminarBorrador: (oc: OrdenCompra) => void;
  onRegistrarBorrador: (oc: OrdenCompra) => void;
  onAprobarRechazar: (oc: OrdenCompra) => void;
  onAnular: (oc: OrdenCompra) => void;
  onGenerarCC: (oc: OrdenCompra) => void;
  onImprimir: (oc: OrdenCompra) => void;
  onEnviar: (oc: OrdenCompra) => void;
  onDuplicar: (oc: OrdenCompra) => void;
  onNueva: () => void;
  onActualizar: () => void;
  onVerComprobante: (comprobanteId: string) => void;
}

const CAMPOS_FECHA_OC: Array<{ id: CampoFechaFiltroOC; label: string }> = [
  { id: 'fechaEmision', label: 'F. Emisión' },
  { id: 'fechaVencimiento', label: 'F. Vencimiento' },
  { id: 'fechaRegistro', label: 'F. Registro' },
];

type ColumnaConfigurableOC =
  | 'fechaEmision'
  | 'fechaRegistro'
  | 'fechaVencimiento'
  | 'comprador'
  | 'documentoRelacionado'
  | 'moneda'
  | 'formaPago'
  | 'centroCosto'
  | 'presupuesto'
  | 'metodoEnvio'
  | 'contacto';

const COLUMNAS_CONFIGURABLES_OC: Array<{ id: ColumnaConfigurableOC; label: string; labelCorto?: string }> = [
  { id: 'fechaEmision', label: 'Fecha de emisión', labelCorto: 'F. Emisión' },
  { id: 'fechaRegistro', label: 'Fecha de registro', labelCorto: 'F. Registro' },
  { id: 'fechaVencimiento', label: 'Fecha de vencimiento', labelCorto: 'F. Vencimiento' },
  { id: 'comprador', label: 'Comprador' },
  { id: 'documentoRelacionado', label: 'Documento relacionado', labelCorto: 'Doc. Relacionado' },
  { id: 'moneda', label: 'Moneda' },
  { id: 'formaPago', label: 'Forma de pago' },
  { id: 'centroCosto', label: 'Centro de costo' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'metodoEnvio', label: 'Método de envío' },
  { id: 'contacto', label: 'Contacto' },
];

const COLUMNAS_VISIBLES_DEFAULT_OC: ColumnaConfigurableOC[] = [
  'fechaEmision',
  'fechaVencimiento',
  'comprador',
  'documentoRelacionado',
  'formaPago',
];

const STORAGE_KEY_COLUMNAS_OC = 'compras_oc_tabla_columnas';

interface ConfigColumnasOC {
  visibles: ColumnaConfigurableOC[];
  orden: ColumnaConfigurableOC[];
}

function esColumnaValida(id: string): id is ColumnaConfigurableOC {
  return COLUMNAS_CONFIGURABLES_OC.some((c) => c.id === id);
}

function cargarConfigColumnasOC(): ConfigColumnasOC {
  const ordenCompleto = COLUMNAS_CONFIGURABLES_OC.map((c) => c.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_OC);
    if (!raw) return { visibles: COLUMNAS_VISIBLES_DEFAULT_OC, orden: ordenCompleto };
    const parsed = JSON.parse(raw) as { visibles?: string[]; orden?: string[] };
    const visibles = Array.isArray(parsed.visibles)
      ? parsed.visibles.filter(esColumnaValida)
      : COLUMNAS_VISIBLES_DEFAULT_OC;
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const orden = [...ordenGuardado, ...ordenCompleto.filter((id) => !ordenGuardado.includes(id))];
    return { visibles, orden };
  } catch {
    return { visibles: COLUMNAS_VISIBLES_DEFAULT_OC, orden: ordenCompleto };
  }
}

function guardarConfigColumnasOC(config: ConfigColumnasOC): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_OC, JSON.stringify(config));
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
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function TablaOrdenesCompra({
  ordenes,
  comprobantes,
  cargando,
  errorCarga,
  onVer,
  onEditar,
  onEliminarBorrador,
  onRegistrarBorrador,
  onAprobarRechazar,
  onAnular,
  onGenerarCC,
  onImprimir,
  onEnviar,
  onDuplicar,
  onNueva,
  onActualizar,
  onVerComprobante,
}: TablaOrdenesCompraProps) {
  const { state: config } = useConfigurationContext();
  const feedback = useFeedback();
  const [filtros, setFiltros] = useState<FiltrosOC>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtradas = filtrarOrdenesCompra(ordenes, filtros, comprobantes);

  async function handleExportar() {
    if (!filtradas.length) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    try {
      const rows = filtradas.map((oc) => ({
        numero: formatearNumeroCompra(oc.serie, oc.correlativo),
        estado: ETIQUETA_ESTADO_PRINCIPAL_OC[calcularEstadoPrincipalOC(oc)],
        fechaEmision: formatearFechaCompra(oc.fechaEmision),
        fechaVencimiento: oc.fechaVencimiento ? formatearFechaCompra(oc.fechaVencimiento) : '—',
        comprador: oc.compradorNombre ?? '—',
        formaPago: resolverNombreFormaPago(oc, config.paymentMethods),
        moneda: oc.moneda,
        total: oc.totales.total,
      }));
      await exportDatasetToExcel({
        rows,
        columns: [
          { header: 'N° Orden', key: 'numero', width: 20 },
          { header: 'Estado', key: 'estado', width: 14 },
          { header: 'F. Emisión', key: 'fechaEmision', width: 14 },
          { header: 'F. Vencimiento', key: 'fechaVencimiento', width: 16 },
          { header: 'Comprador', key: 'comprador', width: 24 },
          { header: 'Forma de pago', key: 'formaPago', width: 20 },
          { header: 'Moneda', key: 'moneda', width: 10 },
          { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
        ],
        filename: `ordenes-de-compra_${new Date().toISOString().split('T')[0]}`,
        worksheetName: 'Órdenes de Compra',
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
  const compradoresUnicos = Array.from(
    new Map(
      ordenes
        .filter((oc): oc is OrdenCompra & { compradorId: string; compradorNombre: string } =>
          Boolean(oc.compradorId && oc.compradorNombre),
        )
        .map((oc) => [oc.compradorId, { id: oc.compradorId, nombre: oc.compradorNombre }]),
    ).values(),
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const hayRangoFechas = Boolean(filtros.fechaDesde || filtros.fechaHasta);
  const filtrosAvanzadosActivos = [
    filtros.estadoPrincipal,
    filtros.formaPagoMetodoId,
    filtros.compradorId,
    filtros.documentoRelacionado && filtros.documentoRelacionado !== 'todos' ? filtros.documentoRelacionado : undefined,
    filtros.moneda,
  ].filter(Boolean).length;

  function limpiarFiltros() {
    setFiltros({ busqueda: '', campoFecha: 'fechaEmision' });
    setMostrarFiltros(false);
  }

  const [colConfig, setColConfig] = useState<ConfigColumnasOC>(() => cargarConfigColumnasOC());
  useEffect(() => {
    guardarConfigColumnasOC(colConfig);
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
      visibles: COLUMNAS_VISIBLES_DEFAULT_OC,
      orden: COLUMNAS_CONFIGURABLES_OC.map((c) => c.id),
    });
  }
  function seleccionarTodasColumnas() {
    setColConfig((prev) => ({ ...prev, visibles: COLUMNAS_CONFIGURABLES_OC.map((c) => c.id) }));
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
      label: COLUMNAS_CONFIGURABLES_OC.find((c) => c.id === id)?.label ?? id,
      visible: colConfig.visibles.includes(id),
    })),
    { id: 'total', label: 'Total', visible: true, fixed: true },
    { id: 'estado', label: 'Estado', visible: true, fixed: true },
    { id: 'acciones', label: 'Acciones', visible: true, fixed: true },
  ];

  function renderCeldaColumna(oc: OrdenCompra, id: ColumnaConfigurableOC): React.ReactNode {
    switch (id) {
      case 'fechaEmision':
        return formatearFechaCompra(oc.fechaEmision);
      case 'fechaRegistro': {
        const fecha = obtenerFechaRegistroOC(oc);
        return fecha ? formatearFechaCompra(fecha) : '—';
      }
      case 'fechaVencimiento':
        return oc.fechaVencimiento ? formatearFechaCompra(oc.fechaVencimiento) : '—';
      case 'comprador':
        return oc.compradorNombre ?? '—';
      case 'documentoRelacionado': {
        const relacionados = comprobantes.filter((c) => c.ordenCompraOrigenId === oc.id);
        if (relacionados.length === 0) return '—';
        if (relacionados.length === 1) {
          const comprobante = relacionados[0];
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onVerComprobante(comprobante.id); }}
              title="Abrir comprobante de compra relacionado"
              className="font-mono text-blue-600 hover:underline"
            >
              {comprobante.serieProveedor}-{comprobante.numeroProveedor}
            </button>
          );
        }
        return (
          <span title={relacionados.map((c) => `${c.serieProveedor}-${c.numeroProveedor}`).join(', ')}>
            {relacionados.length} comprobantes
          </span>
        );
      }
      case 'moneda':
        return oc.moneda;
      case 'formaPago':
        return resolverNombreFormaPago(oc, config.paymentMethods);
      case 'centroCosto':
        return oc.centroCosto ?? '—';
      case 'presupuesto':
        return oc.presupuesto ?? '—';
      case 'metodoEnvio':
        return oc.metodoEnvio ?? '—';
      case 'contacto':
        return oc.proveedorContactoNombre ?? '—';
      default:
        return '—';
    }
  }

  function renderAccionesDirectas(oc: OrdenCompra, estado: EstadoPrincipalOC) {
    if (estado === 'Borrador') {
      return (
        <>
          <BotonAccionDirecta icon={Pencil} label="Editar orden de compra" onClick={() => onEditar(oc)} />
          {puedeEliminarBorradorOC(oc) && (
            <BotonAccionDirecta icon={Trash2} label="Eliminar borrador" onClick={() => onEliminarBorrador(oc)} danger />
          )}
          <BotonAccionDirecta icon={Copy} label="Duplicar orden de compra" onClick={() => onDuplicar(oc)} />
        </>
      );
    }
    if (estado === 'Registrada') {
      return (
        <>
          {puedeEditarOC(oc) && (
            <BotonAccionDirecta icon={Pencil} label="Editar orden de compra" onClick={() => onEditar(oc)} />
          )}
          {puedeGenerarCCDesdeOC(oc) && (
            <BotonAccionDirecta icon={Receipt} label="Generar comprobante de compra" onClick={() => onGenerarCC(oc)} />
          )}
          {puedeAnularOC(oc) && (
            <BotonAccionDirecta icon={XCircle} label="Anular orden de compra" onClick={() => onAnular(oc)} danger />
          )}
        </>
      );
    }
    if (estado === 'Pendiente de aprobación') {
      return (
        <>
          <BotonAccionDirecta icon={CheckCircle} label="Aprobar / No aprobar" onClick={() => onAprobarRechazar(oc)} />
          {puedeAnularOC(oc) && (
            <BotonAccionDirecta icon={XCircle} label="Anular orden de compra" onClick={() => onAnular(oc)} danger />
          )}
          <BotonAccionDirecta icon={Copy} label="Duplicar orden de compra" onClick={() => onDuplicar(oc)} />
        </>
      );
    }
    if (estado === 'Aprobada') {
      return (
        <>
          {puedeGenerarCCDesdeOC(oc) && (
            <BotonAccionDirecta icon={Receipt} label="Generar comprobante de compra" onClick={() => onGenerarCC(oc)} />
          )}
          {puedeAnularOC(oc) && (
            <BotonAccionDirecta icon={XCircle} label="Anular orden de compra" onClick={() => onAnular(oc)} danger />
          )}
          <BotonAccionDirecta icon={Copy} label="Duplicar orden de compra" onClick={() => onDuplicar(oc)} />
        </>
      );
    }
    if (estado === 'No Aprobada') {
      return (
        <>
          <BotonAccionDirecta icon={Pencil} label="Editar orden de compra" onClick={() => onEditar(oc)} />
          <BotonAccionDirecta icon={Copy} label="Duplicar orden de compra" onClick={() => onDuplicar(oc)} />
          {puedeAnularOC(oc) && (
            <BotonAccionDirecta icon={XCircle} label="Anular orden de compra" onClick={() => onAnular(oc)} danger />
          )}
        </>
      );
    }
    if (estado === 'Convertida') {
      return (
        <>
          {puedeEditarOC(oc) && (
            <BotonAccionDirecta icon={Pencil} label="Editar orden de compra" onClick={() => onEditar(oc)} />
          )}
          {puedeImprimirOC(oc) && (
            <BotonAccionDirecta icon={Printer} label="Imprimir orden de compra" onClick={() => onImprimir(oc)} />
          )}
          {puedeImprimirOC(oc) && (
            <BotonAccionDirecta icon={Download} label="Descargar PDF" onClick={() => onImprimir(oc)} />
          )}
        </>
      );
    }
    if (estado === 'Anulada') {
      return (
        <>
          <BotonAccionDirecta icon={Copy} label="Duplicar orden de compra" onClick={() => onDuplicar(oc)} />
          {puedeImprimirOC(oc) && (
            <BotonAccionDirecta icon={Printer} label="Imprimir orden de compra" onClick={() => onImprimir(oc)} />
          )}
          {puedeImprimirOC(oc) && (
            <BotonAccionDirecta icon={Download} label="Descargar PDF" onClick={() => onImprimir(oc)} />
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

  const ocActiva = menu ? ordenes.find((o) => o.id === menu.id) ?? null : null;
  const estadoPrincipalActivo = ocActiva ? calcularEstadoPrincipalOC(ocActiva) : null;

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
                    setFiltros((f) => ({ ...f, estadoPrincipal: e.target.value as EstadoPrincipalOC | '' }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_PRINCIPALES_OC.map((estado) => (
                    <option key={estado} value={estado}>{ETIQUETA_ESTADO_PRINCIPAL_OC[estado]}</option>
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
                <label className="block text-xs text-gray-500 mb-1">Comprador</label>
                <select
                  value={filtros.compradorId ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, compradorId: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {compradoresUnicos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
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
                  value={filtros.campoFecha ?? 'fechaEmision'}
                  onChange={(e) => setFiltros((f) => ({ ...f, campoFecha: e.target.value as CampoFechaFiltroOC }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {CAMPOS_FECHA_OC.map((c) => (
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
          onClick={onNueva}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nueva OC
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
                const columna = COLUMNAS_CONFIGURABLES_OC.find((c) => c.id === id);
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
            ) : ordenes.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay órdenes de compra registradas.</p>
                  <p className="text-sm mt-1">Crea la primera orden de compra para empezar.</p>
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No se encontraron órdenes con los filtros aplicados.</p>
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
              filtradas.map((oc) => {
                const estadoPrincipal = calcularEstadoPrincipalOC(oc);
                return (
                  <tr
                    key={oc.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onVer(oc)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {oc.correlativo ? (
                        formatearNumeroCompra(oc.serie, oc.correlativo)
                      ) : (
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-semibold">{oc.serie}</span>
                          <span className="text-xs font-normal text-gray-400">sin correlativo</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]">
                        {oc.proveedorNombre}
                      </div>
                      <div className="text-xs text-gray-500">{oc.proveedorNumeroDocumento}</div>
                    </td>
                    {columnasVisiblesOrdenadas.map((id) => (
                      <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {renderCeldaColumna(oc, id)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono">
                      {formatMoney(oc.totales.total, oc.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge estado={estadoPrincipal} labels={ETIQUETA_ESTADO_PRINCIPAL_OC} clases={BADGE_ESTADO_PRINCIPAL_OC} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        {renderAccionesDirectas(oc, estadoPrincipal)}
                        <button
                          onClick={(e) => abrirMenu(e, oc.id)}
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
      {menu && ocActiva && (
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
            onClick={() => { onVer(ocActiva); setMenu(null); }}
          />
          {(estadoPrincipalActivo === 'Registrada' || estadoPrincipalActivo === 'Convertida') && (
            <MenuItem
              icon={Copy}
              label="Duplicar"
              onClick={() => { onDuplicar(ocActiva); setMenu(null); }}
            />
          )}
          {estadoPrincipalActivo === 'Borrador' && (
            <MenuItem
              icon={CheckCircle}
              label="Registrar"
              onClick={() => { onRegistrarBorrador(ocActiva); setMenu(null); }}
            />
          )}
          {estadoPrincipalActivo !== 'Convertida' &&
            estadoPrincipalActivo !== 'Anulada' &&
            puedeImprimirOC(ocActiva) && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <MenuItem
                icon={Printer}
                label="Imprimir"
                onClick={() => { onImprimir(ocActiva); setMenu(null); }}
              />
              <MenuItem
                icon={Download}
                label="Descargar PDF"
                onClick={() => { onImprimir(ocActiva); setMenu(null); }}
              />
            </>
          )}
          {puedeEnviarOC(ocActiva) && (
            <MenuItem
              icon={Send}
              label="Compartir"
              onClick={() => { onEnviar(ocActiva); setMenu(null); }}
            />
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {ordenes.length} órdenes
      </p>
    </div>
  );
}
