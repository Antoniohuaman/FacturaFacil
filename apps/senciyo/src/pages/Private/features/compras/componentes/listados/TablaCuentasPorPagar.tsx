import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  CreditCard,
  Search,
  Banknote,
  Plus,
  CalendarRange,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { formatMoney } from '@/shared/currency';
import type { CuentaPorPagar, EstadoPagoCxP, EstadoVencimientoCxP } from '../../modelos/CuentaPorPagar';
import {
  ESTADO_PAGO_CXP_LABELS,
  ESTADO_VENCIMIENTO_CXP_LABELS,
} from '../../modelos/CuentaPorPagar';
import type { PagoCompra } from '../../modelos/PagoCompra';
import {
  BADGE_ESTADO_PAGO_CXP,
  BADGE_ESTADO_VENCIMIENTO_CXP,
} from '../../constantes/estadosCompras';
import {
  filtrarCuentasPorPagar,
  type FiltrosCxP,
  type CampoFechaFiltroCxP,
} from '../../logica/filtrosCompras';
import { puedeRegistrarPago, resolverNombreFormaPago } from '../../logica/reglasCompras';
import { calcularDiasVencidos } from '../../servicios/servicioCuentaPorPagar';
import { getNombreTipoDocumentoProveedor } from '../../constantes/tiposDocumentoProveedor';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';

interface TablaCuentasPorPagarProps {
  cuentas: CuentaPorPagar[];
  pagos: PagoCompra[];
  cargando: boolean;
  errorCarga: string | null;
  onVer: (cxp: CuentaPorPagar) => void;
  onRegistrarPago: (cxp: CuentaPorPagar) => void;
  onNuevoPago: () => void;
  onActualizar: () => void;
}

type ColumnaConfigurableCxP =
  | 'fechaEmision'
  | 'fechaVencimiento'
  | 'formaPago'
  | 'pagado'
  | 'estadoVencimiento'
  | 'tipoComprobante'
  | 'moneda'
  | 'fechaRegistro'
  | 'numeroCuotas'
  | 'cuotasPendientes'
  | 'diasVencidos'
  | 'ultimoPago';

const COLUMNAS_CONFIGURABLES_CXP: Array<{ id: ColumnaConfigurableCxP; label: string; labelCorto?: string }> = [
  { id: 'fechaEmision', label: 'Fecha de emisión', labelCorto: 'F. Emisión' },
  { id: 'fechaVencimiento', label: 'Fecha de vencimiento', labelCorto: 'F. Vencimiento' },
  { id: 'formaPago', label: 'Forma de pago' },
  { id: 'pagado', label: 'Pagado' },
  { id: 'estadoVencimiento', label: 'Vencimiento' },
  { id: 'tipoComprobante', label: 'Tipo de comprobante' },
  { id: 'moneda', label: 'Moneda' },
  { id: 'fechaRegistro', label: 'Fecha de registro', labelCorto: 'F. Registro' },
  { id: 'numeroCuotas', label: 'N° cuotas' },
  { id: 'cuotasPendientes', label: 'Cuotas pendientes' },
  { id: 'diasVencidos', label: 'Días vencidos' },
  { id: 'ultimoPago', label: 'Último pago' },
];

const COLUMNAS_VISIBLES_DEFAULT_CXP: ColumnaConfigurableCxP[] = [
  'fechaEmision',
  'fechaVencimiento',
  'formaPago',
  'pagado',
  'estadoVencimiento',
];

const STORAGE_KEY_COLUMNAS_CXP = 'compras_cxp_tabla_columnas';

const CAMPOS_FECHA_CXP: Array<{ id: CampoFechaFiltroCxP; label: string }> = [
  { id: 'fechaEmision', label: 'F. Emisión' },
  { id: 'fechaVencimiento', label: 'F. Vencimiento' },
  { id: 'fechaRegistro', label: 'F. Registro' },
];

const ESTADOS_PAGO_FILTRO_CXP: EstadoPagoCxP[] = ['pendiente', 'parcial', 'anulada'];
const ESTADOS_VENCIMIENTO_CXP: EstadoVencimientoCxP[] = ['vigente', 'por_vencer', 'vencida'];

interface ConfigColumnasCxP {
  visibles: ColumnaConfigurableCxP[];
  orden: ColumnaConfigurableCxP[];
}

function esColumnaValida(id: string): id is ColumnaConfigurableCxP {
  return COLUMNAS_CONFIGURABLES_CXP.some((c) => c.id === id);
}

function cargarConfigColumnasCxP(): ConfigColumnasCxP {
  const ordenCompleto = COLUMNAS_CONFIGURABLES_CXP.map((c) => c.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_CXP);
    if (!raw) return { visibles: COLUMNAS_VISIBLES_DEFAULT_CXP, orden: ordenCompleto };
    const parsed = JSON.parse(raw) as { visibles?: string[]; orden?: string[] };
    const visibles = Array.isArray(parsed.visibles)
      ? parsed.visibles.filter(esColumnaValida)
      : COLUMNAS_VISIBLES_DEFAULT_CXP;
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const orden = [...ordenGuardado, ...ordenCompleto.filter((id) => !ordenGuardado.includes(id))];
    return { visibles, orden };
  } catch {
    return { visibles: COLUMNAS_VISIBLES_DEFAULT_CXP, orden: ordenCompleto };
  }
}

function guardarConfigColumnasCxP(config: ConfigColumnasCxP): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_CXP, JSON.stringify(config));
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
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={label}
      aria-label={label}
      className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
    >
      <Icon size={15} />
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

export default function TablaCuentasPorPagar({
  cuentas,
  pagos,
  cargando,
  errorCarga,
  onVer,
  onRegistrarPago,
  onNuevoPago,
  onActualizar,
}: TablaCuentasPorPagarProps) {
  const { state: config } = useConfigurationContext();
  const [filtros, setFiltros] = useState<FiltrosCxP>({ busqueda: '' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtradas = filtrarCuentasPorPagar(cuentas, filtros);

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
    filtros.estadoPago,
    filtros.estadoVencimiento,
    filtros.formaPagoMetodoId,
    filtros.moneda,
    filtros.soloPendientes === false ? 'incluir-todas' : undefined,
  ].filter(Boolean).length;

  function limpiarFiltros() {
    setFiltros({ busqueda: '', campoFecha: 'fechaEmision' });
    setMostrarFiltros(false);
  }

  const [colConfig, setColConfig] = useState<ConfigColumnasCxP>(() => cargarConfigColumnasCxP());
  useEffect(() => {
    guardarConfigColumnasCxP(colConfig);
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
      visibles: COLUMNAS_VISIBLES_DEFAULT_CXP,
      orden: COLUMNAS_CONFIGURABLES_CXP.map((c) => c.id),
    });
  }
  function seleccionarTodasColumnas() {
    setColConfig((prev) => ({ ...prev, visibles: COLUMNAS_CONFIGURABLES_CXP.map((c) => c.id) }));
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
    { id: 'proveedor', label: 'Proveedor', visible: true, fixed: true },
    { id: 'comprobante', label: 'Comprobante', visible: true, fixed: true },
    ...colConfig.orden.map((id) => ({
      id,
      label: COLUMNAS_CONFIGURABLES_CXP.find((c) => c.id === id)?.label ?? id,
      visible: colConfig.visibles.includes(id),
    })),
    { id: 'total', label: 'Total', visible: true, fixed: true },
    { id: 'saldo', label: 'Saldo', visible: true, fixed: true },
    { id: 'estado', label: 'Estado', visible: true, fixed: true },
    { id: 'acciones', label: 'Acciones', visible: true, fixed: true },
  ];

  function renderCeldaColumna(cxp: CuentaPorPagar, id: ColumnaConfigurableCxP): React.ReactNode {
    switch (id) {
      case 'fechaEmision':
        return formatearFechaCompra(cxp.fechaEmision);
      case 'fechaVencimiento':
        return cxp.fechaVencimiento ? formatearFechaCompra(cxp.fechaVencimiento) : '—';
      case 'formaPago':
        return resolverNombreFormaPago(cxp, config.paymentMethods);
      case 'pagado':
        return formatMoney(cxp.totalPagado, cxp.moneda);
      case 'estadoVencimiento':
        return cxp.fechaVencimiento ? (
          <Badge estado={cxp.estadoVencimiento} labels={ESTADO_VENCIMIENTO_CXP_LABELS} clases={BADGE_ESTADO_VENCIMIENTO_CXP} />
        ) : (
          '—'
        );
      case 'tipoComprobante':
        return getNombreTipoDocumentoProveedor(cxp.tipoComprobanteOrigen);
      case 'moneda':
        return cxp.moneda;
      case 'fechaRegistro':
        return formatearFechaCompra(cxp.fechaCreacion);
      case 'numeroCuotas':
        return cxp.cuotas?.length ?? '—';
      case 'cuotasPendientes':
        return cxp.cuotas ? cxp.cuotas.filter((c) => c.estadoPago !== 'pagada').length : '—';
      case 'diasVencidos': {
        const dias = calcularDiasVencidos(cxp.fechaVencimiento);
        return dias > 0 ? <span className="text-red-600 font-medium">{dias}</span> : '—';
      }
      case 'ultimoPago': {
        const relacionados = pagos
          .filter((p) => cxp.pagosRelacionados.includes(p.id))
          .sort((a, b) => (a.fechaPago < b.fechaPago ? 1 : -1));
        return relacionados[0]?.numeroPago ?? '—';
      }
      default:
        return '—';
    }
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

  const cxpActiva = menu ? cuentas.find((c) => c.id === menu.id) ?? null : null;

  const totalPendiente = cuentas
    .filter((c) => c.estadoPago !== 'pagada' && c.estadoPago !== 'anulada')
    .reduce((s, c) => s + c.saldoPendiente, 0);

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
            placeholder="Buscar por proveedor, RUC o comprobante..."
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
                  value={filtros.estadoPago ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, estadoPago: e.target.value as EstadoPagoCxP | '' }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_PAGO_FILTRO_CXP.map((estado) => (
                    <option key={estado} value={estado}>{ESTADO_PAGO_CXP_LABELS[estado]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vencimiento</label>
                <select
                  value={filtros.estadoVencimiento ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, estadoVencimiento: e.target.value as EstadoVencimientoCxP | '' }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos los vencimientos</option>
                  {ESTADOS_VENCIMIENTO_CXP.map((estado) => (
                    <option key={estado} value={estado}>{ESTADO_VENCIMIENTO_CXP_LABELS[estado]}</option>
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
                  onChange={(e) => setFiltros((f) => ({ ...f, campoFecha: e.target.value as CampoFechaFiltroCxP }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {CAMPOS_FECHA_CXP.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
                <input
                  type="checkbox"
                  checked={filtros.soloPendientes === false}
                  onChange={(e) => setFiltros((f) => ({ ...f, soloPendientes: e.target.checked ? false : undefined }))}
                  className="rounded border-gray-300"
                />
                Incluir pagadas/anuladas
              </label>
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
          onClick={onNuevoPago}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Nuevo pago
        </button>
      </div>

      {/* Resumen: sobre el total real de cuentas gestionables (no sobre el filtrado), excluyendo pagadas/anuladas */}
      {totalPendiente > 0 && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <Banknote size={16} className="text-amber-600" />
          <span className="text-amber-700">
            Total pendiente de pago: <strong>{formatMoney(totalPendiente)}</strong>
          </span>
        </div>
      )}

      {/* Tabla — el contenedor, thead y columna Acciones siempre se renderizan; solo el tbody cambia según el estado real. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Comprobante</th>
              {columnasVisiblesOrdenadas.map((id) => {
                const columna = COLUMNAS_CONFIGURABLES_CXP.find((c) => c.id === id);
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
              <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
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
            ) : cuentas.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay cuentas por pagar.</p>
                  <p className="text-sm mt-1">Las cuentas por pagar se generan al registrar comprobantes de compra.</p>
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No se encontraron cuentas por pagar con los filtros aplicados.</p>
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
              filtradas.map((cxp) => (
                <tr
                  key={cxp.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onVer(cxp)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate max-w-[160px]">
                      {cxp.proveedorNombre}
                    </div>
                    <div className="text-xs text-gray-500">{cxp.proveedorNumeroDocumento}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">
                    {cxp.comprobanteCompraNumero}
                  </td>
                  {columnasVisiblesOrdenadas.map((id) => (
                    <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {renderCeldaColumna(cxp, id)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMoney(cxp.total, cxp.moneda)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {formatMoney(cxp.saldoPendiente, cxp.moneda)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge estado={cxp.estadoPago} labels={ESTADO_PAGO_CXP_LABELS} clases={BADGE_ESTADO_PAGO_CXP} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      {puedeRegistrarPago(cxp) && (
                        <BotonAccionDirecta icon={CreditCard} label="Registrar pago" onClick={() => onRegistrarPago(cxp)} />
                      )}
                      <button
                        onClick={(e) => abrirMenu(e, cxp.id)}
                        aria-label="Más acciones"
                        title="Más acciones"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Menú contextual con posición fija */}
      {menu && cxpActiva && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 w-48 overflow-hidden"
          style={{
            top: Math.min(menu.y + 4, window.innerHeight - 120),
            left: Math.min(menu.x, window.innerWidth - 200),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            icon={Eye}
            label="Ver detalle"
            onClick={() => { onVer(cxpActiva); setMenu(null); }}
          />
        </div>
      )}

      <p className="text-xs text-gray-400">
        Mostrando {filtradas.length} de {cuentas.length} cuentas por pagar
      </p>
    </div>
  );
}
