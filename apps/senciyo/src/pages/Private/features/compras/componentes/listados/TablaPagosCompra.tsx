import { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  Eye,
  XCircle,
  Printer,
  Search,
  Wallet,
  CalendarRange,
  SlidersHorizontal,
  RefreshCw,
  FileDown,
} from 'lucide-react';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { formatMoney } from '@/shared/currency';
import { useFeedback } from '@/shared/feedback';
import { exportDatasetToExcel, type SimpleExcelColumn } from '@/shared/export/exportToExcel';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import { useBankAccounts } from '../../../configuracion-sistema/hooks/useCuentasBancarias';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { BankAccount } from '../../../configuracion-sistema/modelos/BankAccount';
import type { PagoCompra } from '../../modelos/PagoCompra';
import { ESTADO_DOCUMENTO_PAGO_LABELS } from '../../modelos/PagoCompra';
import type { CuentaPorPagar, EstadoPagoCxP } from '../../modelos/CuentaPorPagar';
import { ESTADO_PAGO_CXP_LABELS } from '../../modelos/CuentaPorPagar';
import { BADGE_ESTADO_DOCUMENTO_PAGO, BADGE_ESTADO_PAGO_CXP } from '../../constantes/estadosCompras';
import { filtrarPagosCompra, type FiltrosPagos, type CampoFechaFiltroPagos } from '../../logica/filtrosCompras';
import { puedeAnularPago, obtenerCuentasPorPagarDePago } from '../../logica/reglasCompras';
import { tieneMedioDeCaja } from '../../servicios/servicioPagoCompra';
import { formatearFechaCompra } from '../../utilidades/formatearCompras';

const TAMANO_PAGINA_PAGO = 10;

interface TablaPagosCompraProps {
  pagos: PagoCompra[];
  cuentasPorPagar: CuentaPorPagar[];
  cargando: boolean;
  errorCarga: string | null;
  onVer: (pago: PagoCompra) => void;
  onAnular: (pago: PagoCompra) => void;
  onImprimir: (pago: PagoCompra) => void;
  onActualizar: () => void;
  onVerCuentaPorPagar: (cxp: CuentaPorPagar) => void;
}

type ColumnaConfigurablePago =
  | 'documentoOrigen'
  | 'fechaPago'
  | 'mediosPago'
  | 'fechaRegistro'
  | 'moneda'
  | 'cuentaBancaria'
  | 'numeroOperacion'
  | 'documentoSustento'
  | 'concepto'
  | 'cxpRelacionada'
  | 'estadoCxP'
  | 'usuarioRegistro'
  | 'movimientoCaja'
  | 'observaciones';

const COLUMNAS_CONFIGURABLES_PAGO: Array<{ id: ColumnaConfigurablePago; label: string; labelCorto?: string }> = [
  { id: 'documentoOrigen', label: 'Documento origen' },
  { id: 'fechaPago', label: 'Fecha de pago', labelCorto: 'F. Pago' },
  { id: 'mediosPago', label: 'Medios de pago', labelCorto: 'Medios' },
  { id: 'fechaRegistro', label: 'Fecha de registro', labelCorto: 'F. Registro' },
  { id: 'moneda', label: 'Moneda' },
  { id: 'cuentaBancaria', label: 'Cuenta bancaria' },
  { id: 'numeroOperacion', label: 'N° de operación/referencia', labelCorto: 'N° Operación' },
  { id: 'documentoSustento', label: 'Documento sustentatorio', labelCorto: 'Doc. sustento' },
  { id: 'concepto', label: 'Concepto' },
  { id: 'cxpRelacionada', label: 'CxP relacionada' },
  { id: 'estadoCxP', label: 'Estado actual CxP' },
  { id: 'usuarioRegistro', label: 'Usuario que registró', labelCorto: 'Usuario' },
  { id: 'movimientoCaja', label: 'Movimiento de Caja relacionado', labelCorto: 'Mov. Caja' },
  { id: 'observaciones', label: 'Observaciones' },
];

const COLUMNAS_VISIBLES_DEFAULT_PAGO: ColumnaConfigurablePago[] = ['documentoOrigen', 'fechaPago', 'mediosPago'];

const STORAGE_KEY_COLUMNAS_PAGO = 'compras_pagos_tabla_columnas';

const CAMPOS_FECHA_PAGO: Array<{ id: CampoFechaFiltroPagos; label: string }> = [
  { id: 'fechaPago', label: 'F. Pago' },
  { id: 'fechaCreacion', label: 'F. Registro' },
];

const ESTADOS_DOCUMENTO_PAGO: PagoCompra['estadoDocumento'][] = ['registrado', 'anulado'];
const ESTADOS_CXP_FILTRO_PAGO: EstadoPagoCxP[] = ['pendiente', 'parcial', 'pagada', 'anulada'];

interface ConfigColumnasPago {
  visibles: ColumnaConfigurablePago[];
  orden: ColumnaConfigurablePago[];
}

function esColumnaValida(id: string): id is ColumnaConfigurablePago {
  return COLUMNAS_CONFIGURABLES_PAGO.some((c) => c.id === id);
}

function cargarConfigColumnasPago(): ConfigColumnasPago {
  const ordenCompleto = COLUMNAS_CONFIGURABLES_PAGO.map((c) => c.id);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COLUMNAS_PAGO);
    if (!raw) return { visibles: COLUMNAS_VISIBLES_DEFAULT_PAGO, orden: ordenCompleto };
    const parsed = JSON.parse(raw) as { visibles?: string[]; orden?: string[] };
    const visibles = Array.isArray(parsed.visibles)
      ? parsed.visibles.filter(esColumnaValida)
      : COLUMNAS_VISIBLES_DEFAULT_PAGO;
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const orden = [...ordenGuardado, ...ordenCompleto.filter((id) => !ordenGuardado.includes(id))];
    return { visibles, orden };
  } catch {
    return { visibles: COLUMNAS_VISIBLES_DEFAULT_PAGO, orden: ordenCompleto };
  }
}

function guardarConfigColumnasPago(config: ConfigColumnasPago): void {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNAS_PAGO, JSON.stringify(config));
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

export default function TablaPagosCompra({
  pagos,
  cuentasPorPagar,
  cargando,
  errorCarga,
  onVer,
  onAnular,
  onImprimir,
  onActualizar,
  onVerCuentaPorPagar,
}: TablaPagosCompraProps) {
  const { state: config } = useConfigurationContext();
  const { accounts: cuentasBancarias } = useBankAccounts();
  const feedback = useFeedback();
  const [filtros, setFiltros] = useState<FiltrosPagos>({ busqueda: '', campoFecha: 'fechaPago' });
  const [menu, setMenu] = useState<PosMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtrados = filtrarPagosCompra(pagos, filtros, cuentasPorPagar);

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [filtros]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANO_PAGINA_PAGO));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicioRango = filtrados.length === 0 ? 0 : (paginaSegura - 1) * TAMANO_PAGINA_PAGO + 1;
  const finRango = Math.min(paginaSegura * TAMANO_PAGINA_PAGO, filtrados.length);
  const filasPagina = filtrados.slice((paginaSegura - 1) * TAMANO_PAGINA_PAGO, paginaSegura * TAMANO_PAGINA_PAGO);

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

  const mediosDisponibles = getConfiguredPaymentMeans().filter((m) => m.isVisible);
  const monedasActivas = config.currencies.filter((c) => c.isActive);

  const hayRangoFechas = Boolean(filtros.fechaDesde || filtros.fechaHasta);
  const filtrosAvanzadosActivos = [
    filtros.estadoDocumento,
    filtros.medioPagoCodigo,
    filtros.moneda,
    filtros.estadoCxP,
  ].filter(Boolean).length;

  function limpiarFiltros() {
    setFiltros({ busqueda: '', campoFecha: 'fechaPago' });
    setMostrarFiltros(false);
  }

  const [colConfig, setColConfig] = useState<ConfigColumnasPago>(() => cargarConfigColumnasPago());
  useEffect(() => {
    guardarConfigColumnasPago(colConfig);
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
      visibles: COLUMNAS_VISIBLES_DEFAULT_PAGO,
      orden: COLUMNAS_CONFIGURABLES_PAGO.map((c) => c.id),
    });
  }
  function seleccionarTodasColumnas() {
    setColConfig((prev) => ({ ...prev, visibles: COLUMNAS_CONFIGURABLES_PAGO.map((c) => c.id) }));
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
    { id: 'numeroPago', label: 'Número PG', visible: true, fixed: true },
    { id: 'proveedor', label: 'Proveedor', visible: true, fixed: true },
    ...colConfig.orden.map((id) => ({
      id,
      label: COLUMNAS_CONFIGURABLES_PAGO.find((c) => c.id === id)?.label ?? id,
      visible: colConfig.visibles.includes(id),
    })),
    { id: 'total', label: 'Total', visible: true, fixed: true },
    { id: 'estadoPago', label: 'Estado del pago', visible: true, fixed: true },
    { id: 'acciones', label: 'Acciones', visible: true, fixed: true },
  ];

  function renderCeldaColumna(pago: PagoCompra, cxps: CuentaPorPagar[], id: ColumnaConfigurablePago): React.ReactNode {
    switch (id) {
      case 'documentoOrigen': {
        if (cxps.length === 0) return '—';
        if (cxps.length === 1) return cxps[0].comprobanteCompraNumero;
        return (
          <span title={cxps.map((c) => c.comprobanteCompraNumero).join(', ')}>{cxps.length} documentos</span>
        );
      }
      case 'fechaPago':
        return formatearFechaCompra(pago.fechaPago);
      case 'mediosPago':
        return (
          <div className="flex flex-wrap gap-1">
            {pago.mediosPago.map((mp) => (
              <span key={mp.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                {mp.medioPagoNombre}
              </span>
            ))}
          </div>
        );
      case 'fechaRegistro':
        return formatearFechaCompra(pago.fechaCreacion);
      case 'moneda':
        return pago.moneda;
      case 'cuentaBancaria': {
        const nombres = pago.mediosPago
          .map((mp) => (mp.cuentaBancariaId ? cuentasBancarias.find((c) => c.id === mp.cuentaBancariaId) : undefined))
          .filter((c): c is BankAccount => Boolean(c))
          .map((c) => `${c.bankName} — ${c.accountNumber}`);
        return nombres.length > 0 ? nombres.join(', ') : '—';
      }
      case 'numeroOperacion': {
        const refs = pago.mediosPago.map((mp) => mp.referenciaOperacion).filter((r): r is string => Boolean(r));
        return refs.length > 0 ? refs.join(', ') : '—';
      }
      case 'documentoSustento':
        return pago.documentoSustentoTipo || pago.documentoSustentoSerie
          ? `${pago.documentoSustentoTipo ?? ''} ${pago.documentoSustentoSerie ?? ''}-${pago.documentoSustentoNumero ?? ''}`
          : '—';
      case 'concepto':
        return pago.concepto ?? '—';
      case 'cxpRelacionada': {
        if (cxps.length === 0) return '—';
        if (cxps.length === 1) {
          const cxp = cxps[0];
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onVerCuentaPorPagar(cxp); }}
              className="text-blue-600 hover:underline font-mono"
            >
              {cxp.comprobanteCompraNumero}
            </button>
          );
        }
        return (
          <span title={cxps.map((c) => c.comprobanteCompraNumero).join(', ')}>{cxps.length} documentos</span>
        );
      }
      case 'estadoCxP':
        return cxps.length === 1 ? (
          <Badge estado={cxps[0].estadoPago} labels={ESTADO_PAGO_CXP_LABELS} clases={BADGE_ESTADO_PAGO_CXP} />
        ) : (
          '—'
        );
      case 'usuarioRegistro':
        return pago.creadoPor ?? '—';
      case 'movimientoCaja': {
        const caja = pago.cajaId ? config.cajas.find((c) => c.id === pago.cajaId) : undefined;
        if (caja) return `Caja: ${caja.nombreCaja}`;
        return tieneMedioDeCaja(pago.mediosPago) ? 'Caja (sin identificar)' : '—';
      }
      case 'observaciones':
        return pago.observaciones ?? '—';
      default:
        return '—';
    }
  }

  /** Mismo valor que `renderCeldaColumna`, en texto plano para Excel — solo `mediosPago`, `cxpRelacionada` y `estadoCxP` renderizan JSX en pantalla. */
  function obtenerValorExportacionColumna(pago: PagoCompra, cxps: CuentaPorPagar[], id: ColumnaConfigurablePago): string {
    if (id === 'mediosPago') return pago.mediosPago.map((mp) => mp.medioPagoNombre).join(', ') || '—';
    if (id === 'cxpRelacionada') return cxps.map((c) => c.comprobanteCompraNumero).join(', ') || '—';
    if (id === 'estadoCxP') return cxps.length === 1 ? ESTADO_PAGO_CXP_LABELS[cxps[0].estadoPago] : '—';
    const valor = renderCeldaColumna(pago, cxps, id);
    return typeof valor === 'string' ? valor : '—';
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

  const pagoActivo = menu ? pagos.find((p) => p.id === menu.id) ?? null : null;

  // Mismo criterio que las demás tablas de Compras: fijas + exactamente las
  // configurables visibles/ordenadas de colConfig.
  async function handleExportar() {
    if (!filtrados.length) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    try {
      const columnasExport: SimpleExcelColumn[] = [
        { header: 'N° Pago', key: 'numero', width: 20 },
        { header: 'Proveedor', key: 'proveedor', width: 30 },
        { header: 'RUC / DNI', key: 'documento', width: 15 },
        ...columnasVisiblesOrdenadas.map((id): SimpleExcelColumn => ({
          header: COLUMNAS_CONFIGURABLES_PAGO.find((c) => c.id === id)?.label ?? id,
          key: id,
        })),
        { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
        { header: 'Estado del pago', key: 'estadoPago', width: 16 },
      ];
      const rows = filtrados.map((pago) => {
        const cxps = obtenerCuentasPorPagarDePago(pago, cuentasPorPagar);
        return {
          numero: pago.numeroPago,
          proveedor: pago.proveedorNombre,
          documento: cxps[0]?.proveedorNumeroDocumento ?? '—',
          ...Object.fromEntries(
            columnasVisiblesOrdenadas.map((id) => [id, obtenerValorExportacionColumna(pago, cxps, id)]),
          ),
          total: pago.montoTotalPagado,
          estadoPago: ESTADO_DOCUMENTO_PAGO_LABELS[pago.estadoDocumento],
        };
      });
      await exportDatasetToExcel({
        rows,
        columns: columnasExport,
        filename: `pagos-compra_${new Date().toISOString().split('T')[0]}`,
        worksheetName: 'Pagos',
      });
    } catch {
      feedback.error('Error al exportar. Intenta nuevamente.');
    }
  }

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
            placeholder="Buscar por N° de pago, proveedor, RUC/DNI, documento origen, medio de pago o referencia..."
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
                <span className="text-xs text-gray-500">Campo de fecha</span>
                <select
                  value={filtros.campoFecha ?? 'fechaPago'}
                  onChange={(e) => setFiltros((f) => ({ ...f, campoFecha: e.target.value as CampoFechaFiltroPagos }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  {CAMPOS_FECHA_PAGO.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
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
                <label className="block text-xs text-gray-500 mb-1">Estado del pago</label>
                <select
                  value={filtros.estadoDocumento ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, estadoDocumento: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {ESTADOS_DOCUMENTO_PAGO.map((estado) => (
                    <option key={estado} value={estado}>{ESTADO_DOCUMENTO_PAGO_LABELS[estado]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estado actual CxP</label>
                <select
                  value={filtros.estadoCxP ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, estadoCxP: e.target.value as EstadoPagoCxP | '' }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {ESTADOS_CXP_FILTRO_PAGO.map((estado) => (
                    <option key={estado} value={estado}>{ESTADO_PAGO_CXP_LABELS[estado]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Medio de pago</label>
                <select
                  value={filtros.medioPagoCodigo ?? ''}
                  onChange={(e) => setFiltros((f) => ({ ...f, medioPagoCodigo: e.target.value || undefined }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {mediosDisponibles.map((m) => (
                    <option key={m.code} value={m.code}>{m.label}</option>
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
      </div>

      {/* Tabla — el contenedor, thead y columna Acciones siempre se renderizan; solo el tbody cambia según el estado real. */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Número PG</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
              {columnasVisiblesOrdenadas.map((id) => {
                const columna = COLUMNAS_CONFIGURABLES_PAGO.find((c) => c.id === id);
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado del pago</th>
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
            ) : pagos.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay pagos registrados.</p>
                  <p className="text-sm mt-1">Los pagos se registran desde las cuentas por pagar.</p>
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={totalColumnas} className="px-4 py-16 text-center text-gray-500">
                  <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No se encontraron pagos con los filtros aplicados.</p>
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
              filasPagina.map((pago) => {
                const cxps = obtenerCuentasPorPagarDePago(pago, cuentasPorPagar);
                return (
                  <tr
                    key={pago.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onVer(pago)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                      {pago.numeroPago}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]">
                        {pago.proveedorNombre}
                      </div>
                    </td>
                    {columnasVisiblesOrdenadas.map((id) => (
                      <td key={id} className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {renderCeldaColumna(pago, cxps, id)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatMoney(pago.montoTotalPagado, pago.moneda)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        estado={pago.estadoDocumento}
                        labels={ESTADO_DOCUMENTO_PAGO_LABELS}
                        clases={BADGE_ESTADO_DOCUMENTO_PAGO}
                      />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <BotonAccionDirecta icon={Printer} label="Imprimir / Descargar PDF" onClick={() => onImprimir(pago)} />
                        {puedeAnularPago(pago) && (
                          <BotonAccionDirecta icon={XCircle} label="Anular pago" onClick={() => onAnular(pago)} danger />
                        )}
                        <button
                          onClick={(e) => abrirMenu(e, pago.id)}
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
      {menu && pagoActivo && (
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
            onClick={() => { onVer(pagoActivo); setMenu(null); }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Mostrando {inicioRango}–{finRango} de {filtrados.length} pagos
        </span>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaSegura <= 1}
              className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span>Página {paginaSegura} de {totalPaginas}</span>
            <button
              type="button"
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura >= totalPaginas}
              className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
