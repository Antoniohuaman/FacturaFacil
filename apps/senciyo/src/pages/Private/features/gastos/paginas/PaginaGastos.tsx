// gastos/paginas/PaginaGastos.tsx
//
// Página única del módulo Gastos (§2 del alcance: sin tabs). Mismo patrón
// visual y funcional que Compras: encabezado simple, toolbar
// Buscar/Periodo/Filtros/Actualizar/Columnas/Exportar/Nuevo, tabla con menú
// de acciones por fila, paginación, Drawer compartido para
// ver/crear/editar/pagar. Reutiliza `ColumnsManager`, `exportDatasetToExcel`,
// `useFeedback`, `Drawer` — nunca copiados, siempre importados.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Copy, Ban, FileDown, MoreVertical, Plus, RefreshCw, Search, SlidersHorizontal, Wallet } from 'lucide-react';
import { PageHeader } from '@/contasis';
import { formatMoney, currencyManager } from '@/shared/currency';
import { getTenantEmpresaId, lsKey } from '@/shared/tenant';
import { useFeedback } from '@/shared/feedback/useFeedback';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { exportDatasetToExcel, type SimpleExcelColumn } from '@/shared/export/exportToExcel';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useContextoGastos } from '../contexto/useContextoGastos';
import { cargarCategoriasGasto, EVENTO_CATEGORIAS_GASTO_CAMBIADAS } from '../repositorios/repositorioCategoriasGasto';
import { listarCuentasPorPagarPorOrigen } from '../../compras/repositorios/repositorioCuentasPorPagar';
import {
  proyectarFilasGastosOperativos,
  filtrarFilasGastosOperativos,
  calcularIndicadoresGastosOperativos,
  agruparFilasGastosOperativos,
  type AgrupacionGasto,
  type FilaGastoOperativo,
} from '../servicios/consultaGastosOperativos.service';
import { ESTADO_DOCUMENTO_GASTO_LABELS, ESTADO_PAGO_GASTO_LABELS, type EstadoDocumentoGasto, type EstadoPagoGasto, type Gasto } from '../modelos/Gasto';
import { datosParaDuplicarGasto } from '../servicios/servicioGasto';
import DrawerGasto, { type ModoDrawerGasto } from '../componentes/DrawerGasto';

type ColumnaGastoId = 'fecha' | 'categoria' | 'proveedor' | 'documento' | 'condicionPago' | 'total' | 'estadoPago';

const ETIQUETA_COLUMNA: Record<ColumnaGastoId, string> = {
  fecha: 'Fecha',
  categoria: 'Categoría',
  proveedor: 'Proveedor o beneficiario',
  documento: 'Documento',
  condicionPago: 'Condición de pago',
  total: 'Total',
  estadoPago: 'Estado de pago',
};

const ORDEN_COLUMNAS_POR_DEFECTO: ColumnaGastoId[] = ['fecha', 'categoria', 'proveedor', 'documento', 'condicionPago', 'total', 'estadoPago'];

const CLAVE_COLUMNAS = 'gastos_tabla_columnas_v1';
const TAMANO_PAGINA = 25;

const OPCIONES_AGRUPACION: Array<{ value: AgrupacionGasto; label: string }> = [
  { value: 'sin_agrupar', label: 'Sin agrupar' },
  { value: 'categoria', label: 'Categoría' },
  { value: 'proveedor', label: 'Proveedor' },
  { value: 'establecimiento', label: 'Establecimiento' },
  { value: 'periodo', label: 'Periodo' },
];

function primerDiaDelMes(): string {
  const hoy = new Date().toISOString().slice(0, 10);
  return `${hoy.slice(0, 7)}-01`;
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface PreferenciaColumnasGasto {
  visibles: ColumnaGastoId[];
  orden: ColumnaGastoId[];
}

const PREFERENCIA_COLUMNAS_POR_DEFECTO: PreferenciaColumnasGasto = {
  visibles: [...ORDEN_COLUMNAS_POR_DEFECTO],
  orden: [...ORDEN_COLUMNAS_POR_DEFECTO],
};

function esColumnaValida(valor: unknown): valor is ColumnaGastoId {
  return typeof valor === 'string' && (ORDEN_COLUMNAS_POR_DEFECTO as string[]).includes(valor);
}

function cargarPreferenciaColumnas(empresaId: string): PreferenciaColumnasGasto {
  try {
    const raw = localStorage.getItem(lsKey(CLAVE_COLUMNAS, empresaId));
    if (!raw) return PREFERENCIA_COLUMNAS_POR_DEFECTO;
    const parsed = JSON.parse(raw) as Partial<PreferenciaColumnasGasto>;
    const visibles = Array.isArray(parsed.visibles) ? parsed.visibles.filter(esColumnaValida) : [];
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const faltantes = ORDEN_COLUMNAS_POR_DEFECTO.filter((id) => !ordenGuardado.includes(id));
    return { visibles, orden: [...ordenGuardado, ...faltantes] };
  } catch {
    return PREFERENCIA_COLUMNAS_POR_DEFECTO;
  }
}

function guardarPreferenciaColumnas(empresaId: string, preferencia: PreferenciaColumnasGasto): void {
  try {
    localStorage.setItem(lsKey(CLAVE_COLUMNAS, empresaId), JSON.stringify(preferencia));
  } catch {
    // best-effort
  }
}

function renderCelda(fila: FilaGastoOperativo, gasto: Gasto, id: ColumnaGastoId): React.ReactNode {
  switch (id) {
    case 'fecha': return fila.fecha.slice(0, 10);
    case 'categoria': return fila.categoriaNombre;
    case 'proveedor': return fila.proveedorONombre;
    case 'documento': return gasto.tipoDocumento ? `${gasto.serieDocumentoProveedor ?? ''}-${gasto.numeroDocumentoProveedor ?? ''}` : 'Sin documento';
    case 'condicionPago': return gasto.condicionPago === 'credito' ? 'Crédito' : 'Contado';
    case 'total': return formatMoney(fila.total, fila.monedaOriginal);
    case 'estadoPago': return fila.estadoDocumento === 'anulado' ? 'Anulado' : ESTADO_PAGO_GASTO_LABELS[fila.estadoPago];
    default: return '—';
  }
}

export default function PaginaGastos() {
  const feedback = useFeedback();
  const { state } = useContextoGastos();
  const { state: config } = useConfigurationContext();
  const empresaId = getTenantEmpresaId();
  const monedaBase = currencyManager.getSnapshot().baseCurrency.code;

  const [categorias, setCategorias] = useState(() => cargarCategoriasGasto(empresaId));
  useEffect(() => {
    const recargar = () => setCategorias(cargarCategoriasGasto(empresaId));
    recargar();
    window.addEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargar);
    return () => window.removeEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargar);
  }, [empresaId]);

  const establecimientoOptions = useMemo(() => {
    const activos = config.Establecimientos.filter((e) => e.estaActivoEstablecimiento !== false);
    return [
      { value: 'Todos', label: 'Todos los establecimientos' },
      ...activos.map((e) => ({ value: e.id, label: `${e.codigoEstablecimiento ?? e.id} - ${e.nombreEstablecimiento}` })),
    ];
  }, [config.Establecimientos]);

  const monedas = useMemo(
    () => config.currencies.map((c) => ({ code: c.code, label: `${c.code} · ${c.symbol}` })),
    [config.currencies],
  );

  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState(primerDiaDelMes());
  const [fechaHasta, setFechaHasta] = useState(hoyISO());
  const [mostrarFechas, setMostrarFechas] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [establecimientoId, setEstablecimientoId] = useState('Todos');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [filtroEstadoDocumento, setFiltroEstadoDocumento] = useState<EstadoDocumentoGasto | ''>('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<EstadoPagoGasto | ''>('');
  const [filtroConDocumento, setFiltroConDocumento] = useState<'todos' | 'con' | 'sin'>('todos');
  const [agrupacion, setAgrupacion] = useState<AgrupacionGasto>('sin_agrupar');
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);

  const [preferenciaColumnas, setPreferenciaColumnas] = useState<PreferenciaColumnasGasto>(() => cargarPreferenciaColumnas(empresaId));
  useEffect(() => { guardarPreferenciaColumnas(empresaId, preferenciaColumnas); }, [empresaId, preferenciaColumnas]);

  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fechaPopoverRef = useRef<HTMLDivElement>(null);
  const filtrosPanelRef = useRef<HTMLDivElement>(null);

  const [drawer, setDrawer] = useState<{ modo: ModoDrawerGasto; gasto?: Gasto; valoresIniciales?: ReturnType<typeof datosParaDuplicarGasto> } | null>(null);

  useEffect(() => {
    function cerrarAlHacerClickFuera(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
      if (fechaPopoverRef.current && !fechaPopoverRef.current.contains(e.target as Node)) setMostrarFechas(false);
      if (filtrosPanelRef.current && !filtrosPanelRef.current.contains(e.target as Node)) setMostrarFiltros(false);
    }
    document.addEventListener('mousedown', cerrarAlHacerClickFuera);
    return () => document.removeEventListener('mousedown', cerrarAlHacerClickFuera);
  }, []);

  const categoriasPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c.nombre])), [categorias]);
  const establecimientosPorId = useMemo(
    () => new Map(config.Establecimientos.map((e) => [e.id, e.nombreEstablecimiento])),
    [config.Establecimientos],
  );

  const cuentasPorPagar = useMemo(() => {
    const idsRelevantes = new Set(state.gastos.map((g) => g.cuentaPorPagarId).filter(Boolean));
    return listarCuentasPorPagarPorOrigen('gasto').filter((c) => idsRelevantes.has(c.id));
  }, [state.gastos]);

  const filasBase = useMemo(
    () => proyectarFilasGastosOperativos({
      gastos: state.gastos,
      cuentasPorPagar,
      categorias: categoriasPorId,
      establecimientos: establecimientosPorId,
      monedaBase,
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      establecimientoId,
    }),
    [state.gastos, cuentasPorPagar, categoriasPorId, establecimientosPorId, monedaBase, fechaDesde, fechaHasta, establecimientoId],
  );

  const filasFiltradas = useMemo(
    () => filtrarFilasGastosOperativos(filasBase, {
      busqueda: busqueda || undefined,
      categoriaId: filtroCategoriaId || undefined,
      estadoDocumento: filtroEstadoDocumento || undefined,
      estadoPago: filtroEstadoPago || undefined,
      conDocumento: filtroConDocumento === 'todos' ? undefined : filtroConDocumento === 'con',
    }),
    [filasBase, busqueda, filtroCategoriaId, filtroEstadoDocumento, filtroEstadoPago, filtroConDocumento],
  );

  const indicadores = useMemo(() => calcularIndicadoresGastosOperativos(filasFiltradas), [filasFiltradas]);
  const gruposParaExportar = useMemo(
    () => (agrupacion === 'sin_agrupar' ? [] : agruparFilasGastosOperativos(filasFiltradas, agrupacion)),
    [filasFiltradas, agrupacion],
  );

  useEffect(() => { setPagina(1); }, [busqueda, fechaDesde, fechaHasta, establecimientoId, filtroCategoriaId, filtroEstadoDocumento, filtroEstadoPago, filtroConDocumento, agrupacion]);

  const totalItems = agrupacion === 'sin_agrupar' ? filasFiltradas.length : gruposParaExportar.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = agrupacion === 'sin_agrupar' ? filasFiltradas.slice((paginaSegura - 1) * TAMANO_PAGINA, paginaSegura * TAMANO_PAGINA) : [];
  const gruposPagina = agrupacion === 'sin_agrupar' ? [] : gruposParaExportar.slice((paginaSegura - 1) * TAMANO_PAGINA, paginaSegura * TAMANO_PAGINA);

  const gastosPorId = useMemo(() => new Map(state.gastos.map((g) => [g.id, g])), [state.gastos]);

  const columnasManager: ColumnsManagerColumn[] = useMemo(
    () => preferenciaColumnas.orden.map((id) => ({ id, label: ETIQUETA_COLUMNA[id], visible: preferenciaColumnas.visibles.includes(id) })),
    [preferenciaColumnas],
  );

  const alternarColumna = useCallback((id: string) => {
    if (!esColumnaValida(id)) return;
    setPreferenciaColumnas((prev) => ({
      ...prev,
      visibles: prev.visibles.includes(id) ? prev.visibles.filter((c) => c !== id) : [...prev.visibles, id],
    }));
  }, []);
  const restablecerColumnas = useCallback(() => setPreferenciaColumnas(PREFERENCIA_COLUMNAS_POR_DEFECTO), []);
  const seleccionarTodasColumnas = useCallback(() => setPreferenciaColumnas((prev) => ({ ...prev, visibles: [...prev.orden] })), []);
  const reordenarColumnas = useCallback((sourceId: string, targetId: string) => {
    if (!esColumnaValida(sourceId) || !esColumnaValida(targetId)) return;
    setPreferenciaColumnas((prev) => {
      const orden = [...prev.orden];
      const sourceIndex = orden.indexOf(sourceId);
      const targetIndex = orden.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const [movido] = orden.splice(sourceIndex, 1);
      orden.splice(targetIndex, 0, movido);
      return { ...prev, orden };
    });
  }, []);

  const columnasOrdenVisible = preferenciaColumnas.orden.filter((id) => preferenciaColumnas.visibles.includes(id));

  const construirYExportar = useCallback(async (filas: FilaGastoOperativo[], modo: AgrupacionGasto) => {
    if (filas.length === 0) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    const esSinAgrupar = modo === 'sin_agrupar';
    const grupos = esSinAgrupar ? [] : agruparFilasGastosOperativos(filas, modo);
    const columnas: SimpleExcelColumn[] = esSinAgrupar
      ? [
          { header: 'Fecha', key: 'fecha', width: 14, numFmt: 'dd/mm/yyyy' },
          { header: 'Concepto', key: 'concepto', width: 32 },
          { header: 'Categoría', key: 'categoria', width: 20 },
          { header: 'Proveedor o beneficiario', key: 'proveedor', width: 28 },
          { header: 'Establecimiento', key: 'establecimiento', width: 20 },
          { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
          { header: 'Moneda', key: 'moneda', width: 10 },
          { header: 'Gasto reconocido (moneda base)', key: 'reconocido', width: 20, numFmt: '#,##0.00' },
          { header: 'Estado documental', key: 'estadoDocumento', width: 16 },
          { header: 'Estado de pago', key: 'estadoPago', width: 16 },
        ]
      : [
          { header: OPCIONES_AGRUPACION.find((o) => o.value === modo)?.label ?? 'Grupo', key: 'grupo', width: 28 },
          { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
          { header: 'Gasto reconocido (moneda base)', key: 'reconocido', width: 20, numFmt: '#,##0.00' },
          { header: 'Cantidad', key: 'cantidad', width: 12, numFmt: '#,##0' },
        ];

    const rows = esSinAgrupar
      ? filas.map((f) => ({
          fecha: new Date(`${f.fecha.slice(0, 10)}T00:00:00`),
          concepto: f.concepto,
          categoria: f.categoriaNombre,
          proveedor: f.proveedorONombre,
          establecimiento: f.establecimientoNombre,
          total: f.total,
          moneda: f.monedaOriginal,
          reconocido: f.importeReconocidoBase,
          estadoDocumento: ESTADO_DOCUMENTO_GASTO_LABELS[f.estadoDocumento],
          estadoPago: f.estadoDocumento === 'anulado' ? '—' : ESTADO_PAGO_GASTO_LABELS[f.estadoPago],
        }))
      : grupos.map((g) => ({ grupo: g.etiqueta, total: g.totalGastos, reconocido: g.importeReconocidoBase, cantidad: g.cantidadFilas }));

    await exportDatasetToExcel({ rows, columns: columnas, filename: `gastos_operativos_${fechaDesde}_${fechaHasta}`, worksheetName: 'Gastos' });
  }, [feedback, fechaDesde, fechaHasta]);

  const handleExportarClick = useCallback(async () => {
    if (exportando) return;
    setExportando(true);
    try {
      await construirYExportar(filasFiltradas, agrupacion);
    } catch (error) {
      console.error('[Gastos] Error al exportar', error);
      feedback.error('No se pudo exportar. Intenta nuevamente.');
    } finally {
      setExportando(false);
    }
  }, [exportando, construirYExportar, filasFiltradas, agrupacion, feedback]);

  const exportHandlerRef = useRef<() => Promise<void>>(async () => {});
  exportHandlerRef.current = async () => {
    await construirYExportar(filasFiltradas, 'sin_agrupar');
  };
  const { request: autoExportRequest, finish: finishAutoExport } = useAutoExportRequest('gastos-operativos');
  const autoExportHandledRef = useRef(false);
  useEffect(() => {
    if (!autoExportRequest || autoExportHandledRef.current) return;
    autoExportHandledRef.current = true;
    const ejecutar = async () => {
      try {
        await exportHandlerRef.current();
      } finally {
        finishAutoExport(REPORTS_HUB_PATH);
      }
    };
    void ejecutar();
  }, [autoExportRequest, finishAutoExport]);

  function abrirMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ id, x: rect.left, y: rect.bottom });
  }

  const gastoActivo = menu ? gastosPorId.get(menu.id) : undefined;

  function abrirVer(gasto: Gasto) { setDrawer({ modo: 'ver', gasto }); setMenu(null); }
  function abrirDuplicar(gasto: Gasto) { setDrawer({ modo: 'crear', valoresIniciales: datosParaDuplicarGasto(gasto) }); setMenu(null); }

  const filtrosAvanzadosActivos = [filtroCategoriaId, filtroEstadoDocumento, filtroEstadoPago].filter(Boolean).length + (filtroConDocumento !== 'todos' ? 1 : 0);

  return (
    <div>
      <PageHeader title="Gastos" actions={null} />
      <div className="px-4 md:px-6 pt-1 pb-1 text-sm text-gray-500 dark:text-gray-400">Gestión y control de gastos operativos</div>

      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Gastos del periodo</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{formatMoney(indicadores.gastosOperativosReconocidos, monedaBase)}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pendiente</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
              {filasFiltradas.filter((f) => f.estadoDocumento === 'registrado' && f.estadoPago !== 'pagado').length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pagado</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">
              {filasFiltradas.filter((f) => f.estadoPago === 'pagado').length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Categoría principal</p>
            <p className="mt-1 text-base font-bold text-gray-900 dark:text-gray-100 truncate">
              {[...agruparFilasGastosOperativos(filasFiltradas, 'categoria')].sort((a, b) => b.importeReconocidoBase - a.importeReconocidoBase)[0]?.etiqueta ?? '—'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por concepto o proveedor..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="relative" ref={fechaPopoverRef}>
            <button type="button" onClick={() => setMostrarFechas((v) => !v)} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 whitespace-nowrap">
              {fechaDesde} – {fechaHasta}
            </button>
            {mostrarFechas && (
              <div className="absolute z-40 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-lg space-y-2">
                <label className="block text-sm">
                  <span className="text-xs text-gray-500">Desde</span>
                  <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-gray-500">Hasta</span>
                  <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </label>
              </div>
            )}
          </div>

          <select value={establecimientoId} onChange={(e) => setEstablecimientoId(e.target.value)} className="h-[38px] px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            {establecimientoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={agrupacion} onChange={(e) => setAgrupacion(e.target.value as AgrupacionGasto)} className="h-[38px] px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            {OPCIONES_AGRUPACION.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="relative" ref={filtrosPanelRef}>
            <button type="button" onClick={() => setMostrarFiltros((v) => !v)} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 whitespace-nowrap">
              <SlidersHorizontal size={16} className="text-gray-400" />
              Filtros
              {filtrosAvanzadosActivos > 0 && <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-medium">{filtrosAvanzadosActivos}</span>}
            </button>
            {mostrarFiltros && (
              <div className="absolute right-0 z-40 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                  <select value={filtroCategoriaId} onChange={(e) => setFiltroCategoriaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todas</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado documental</label>
                  <select value={filtroEstadoDocumento} onChange={(e) => setFiltroEstadoDocumento(e.target.value as EstadoDocumentoGasto | '')} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Registrados (sin anulados)</option>
                    <option value="registrado">Registrado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado de pago</label>
                  <select value={filtroEstadoPago} onChange={(e) => setFiltroEstadoPago(e.target.value as EstadoPagoGasto | '')} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Pago parcial</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Documento</label>
                  <select value={filtroConDocumento} onChange={(e) => setFiltroConDocumento(e.target.value as 'todos' | 'con' | 'sin')} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="todos">Con o sin documento</option>
                    <option value="con">Con documento</option>
                    <option value="sin">Sin documento</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setBusqueda((b) => b)}
            title="Actualizar"
            className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60"
          >
            <RefreshCw size={16} className="text-gray-400" />
          </button>

          <ColumnsManager
            columns={columnasManager}
            onToggleColumn={alternarColumna}
            onResetColumns={restablecerColumnas}
            onSelectAllColumns={seleccionarTodasColumnas}
            onReorderColumns={reordenarColumnas}
            buttonLabel="Columnas"
          />

          <button type="button" onClick={() => void handleExportarClick()} disabled={exportando} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-50">
            <FileDown size={16} className="text-gray-400" />
            Exportar
          </button>

          <button type="button" onClick={() => setDrawer({ modo: 'crear' })} className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus size={16} />
            Registrar gasto
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
                  {agrupacion === 'sin_agrupar' ? 'Concepto' : OPCIONES_AGRUPACION.find((o) => o.value === agrupacion)?.label}
                </th>
                {agrupacion === 'sin_agrupar' && columnasOrdenVisible.map((id) => (
                  <th key={id} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{ETIQUETA_COLUMNA[id]}</th>
                ))}
                {agrupacion !== 'sin_agrupar' && (
                  <>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Total</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Gasto reconocido</th>
                  </>
                )}
                {agrupacion === 'sin_agrupar' && <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {agrupacion === 'sin_agrupar' && filasPagina.length === 0 && (
                <tr><td colSpan={columnasOrdenVisible.length + 2} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">No hay gastos para los filtros seleccionados.</td></tr>
              )}
              {agrupacion === 'sin_agrupar' && filasPagina.map((fila) => {
                const gasto = gastosPorId.get(fila.gastoId);
                if (!gasto) return null;
                return (
                  <tr key={fila.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                      <div className="font-medium">{fila.concepto}</div>
                      {fila.estadoDocumento === 'anulado' && <span className="text-xs text-rose-600 dark:text-rose-300">Anulado</span>}
                    </td>
                    {columnasOrdenVisible.map((id) => (
                      <td key={id} className="px-3 py-2 text-gray-700 dark:text-gray-200">{renderCelda(fila, gasto, id)}</td>
                    ))}
                    <td className="px-3 py-2">
                      <button type="button" onClick={(e) => abrirMenu(e, gasto.id)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" aria-label="Acciones">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {agrupacion !== 'sin_agrupar' && gruposPagina.map((g) => (
                <tr key={g.clave} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{g.etiqueta}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{formatMoney(g.totalGastos, monedaBase)}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{formatMoney(g.importeReconocidoBase, monedaBase)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <p>{totalItems} resultado{totalItems === 1 ? '' : 's'}</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40">Anterior</button>
            <span>Página {paginaSegura} de {totalPaginas}</span>
            <button type="button" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>

      {menu && gastoActivo && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 w-52 overflow-hidden"
          style={{ top: Math.min(menu.y + 4, window.innerHeight - 220), left: Math.min(menu.x, window.innerWidth - 216) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => abrirVer(gastoActivo)} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60">
            <Eye size={15} /> Ver detalle
          </button>
          {gastoActivo.estadoDocumento === 'registrado' && (
            <button onClick={() => { setMenu(null); setDrawer({ modo: 'ver', gasto: gastoActivo }); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60">
              <Wallet size={15} /> Registrar pago
            </button>
          )}
          <button onClick={() => abrirDuplicar(gastoActivo)} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60">
            <Copy size={15} /> Duplicar
          </button>
          {gastoActivo.estadoDocumento === 'registrado' && (
            <button onClick={() => { setMenu(null); setDrawer({ modo: 'ver', gasto: gastoActivo }); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Ban size={15} /> Anular
            </button>
          )}
        </div>
      )}

      {drawer && (
        <DrawerGasto
          modo={drawer.modo}
          gasto={drawer.gasto}
          valoresIniciales={drawer.valoresIniciales}
          categorias={categorias}
          establecimientos={establecimientoOptions.filter((o) => o.value !== 'Todos')}
          monedas={monedas}
          monedaBase={monedaBase}
          empresaId={empresaId}
          onCerrar={() => setDrawer(null)}
          onGuardado={() => {
            // Refresca la instantánea del gasto dentro del Drawer (pagos/estado recién
            // aplicados) sin cerrar la vista — `state.gastos` ya es reactivo vía contexto.
            setDrawer((d) => {
              if (!d?.gasto) return d;
              const actualizado = state.gastos.find((g) => g.id === d.gasto!.id);
              return actualizado ? { ...d, gasto: actualizado } : d;
            });
          }}
        />
      )}
    </div>
  );
}
