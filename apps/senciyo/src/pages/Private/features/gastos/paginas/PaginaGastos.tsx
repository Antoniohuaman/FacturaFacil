// gastos/paginas/PaginaGastos.tsx
//
// Página única del módulo Gastos (§1 del alcance: sin tabs principales).
// Mismo patrón visual y funcional que Compras: encabezado simple, toolbar
// Buscar/Periodo/Filtros/Actualizar/Columnas/Exportar/Registrar, fila de
// tabla completa clickeable (abre el Drawer de detalle), acciones directas
// con tooltip + menú "..." para las secundarias, paginación. Reutiliza
// `ColumnsManager`, `exportDatasetToExcel`, `useFeedback`, `Drawer`,
// `ModalAnularDocumento` y el mismo patrón `BadgeEstado` de Compras — nunca
// copiados, siempre importados. Sin tarjetas de resumen ni gráficos: las
// métricas viven en Indicadores.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Eye, FileDown, MoreVertical, Pencil, Plus, Printer, RefreshCw, Search, SlidersHorizontal, Trash2, Wallet, XCircle } from 'lucide-react';
import { PageHeader } from '@/contasis';
import { formatMoney, currencyManager } from '@/shared/currency';
import { getTenantEmpresaId, lsKey } from '@/shared/tenant';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { useUserSession } from '@/contexts/UserSessionContext';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { exportDatasetToExcel, type SimpleExcelColumn } from '@/shared/export/exportToExcel';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import { formatearFecha } from '@/shared/formatters/fechas';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { ModalAnularDocumento } from '@/shared/ui';
import { MOTIVOS_ANULACION_GASTO } from '../constantes/motivosAnulacionGasto';
import { listarCuentasPorPagarPorOrigen } from '../../compras/repositorios/repositorioCuentasPorPagar';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import { listarPagosPorOrigen } from '../../compras/repositorios/repositorioPagosCompra';
import { useContextoGastos } from '../contexto/useContextoGastos';
import { cargarCategoriasGasto, EVENTO_CATEGORIAS_GASTO_CAMBIADAS } from '../repositorios/repositorioCategoriasGasto';
import {
  proyectarFilasGastosOperativos,
  filtrarFilasGastosOperativos,
  construirFilaExcelGastoOperativo,
  type FilaGastoOperativo,
} from '../servicios/consultaGastosOperativos.service';
import type { EstadoDocumentoGasto, EstadoPagoGasto, Gasto } from '../modelos/Gasto';
import { datosParaDuplicarGasto, puedeEditarGasto, resolverEstadoPagoGasto, nombreDocumentoSustentatorioGasto, motivoBloqueoAnulacionGasto, ETIQUETA_ALCANCE_TODA_EMPRESA } from '../servicios/servicioGasto';
import { imprimirGasto, type EmpresaImpresionGasto } from '../servicios/servicioImpresionGasto';
import DrawerGasto from '../componentes/DrawerGasto';

type ColumnaGastoId =
  | 'referenciaInterna' | 'concepto' | 'fecha' | 'categoria' | 'proveedor' | 'documento' | 'condicionPago' | 'total' | 'estado'
  | 'fechaEmision' | 'fechaRegistro' | 'fechaVencimiento' | 'subtotal' | 'impuesto' | 'importeReconocido' | 'saldoPendiente'
  | 'moneda' | 'tipoCambio' | 'establecimiento' | 'numerosPago' | 'cantidadPagos' | 'usuario' | 'cantidadAdjuntos';

/** Textos para el usuario (§2 de la corrección) — los campos internos (fechaReconocimiento, fechaEmision, fechaCreacion...) no se renombran, solo su presentación. */
const ETIQUETA_COLUMNA: Record<ColumnaGastoId, string> = {
  // N° de documento (serie + correlativo) — nunca mezclado con el concepto
  // (remediación visual §6): son dos columnas separadas desde aquí.
  referenciaInterna: 'N° Documento',
  concepto: 'Concepto',
  fecha: 'Fecha del gasto',
  categoria: 'Categoría',
  // Label compacto para la cabecera de tabla (remediación visual §8) — el
  // contenido sigue resolviendo proveedor formal o beneficiario libre
  // (`fila.proveedorONombre`), sin cambiar el modelo.
  proveedor: 'Proveedor',
  documento: 'Documento sustentatorio',
  condicionPago: 'Condición de pago',
  total: 'Total',
  // Columna visual única (§8 de la corrección final) — resuelve estadoDocumento/estadoPago sin fusionar las fuentes internas (ver FilaGastoOperativo.estadoPresentado).
  estado: 'Estado',
  fechaEmision: 'Fecha del documento',
  fechaRegistro: 'Fecha de registro',
  fechaVencimiento: 'Fecha de vencimiento',
  subtotal: 'Subtotal',
  impuesto: 'IGV',
  importeReconocido: 'Gasto considerado',
  saldoPendiente: 'Saldo pendiente',
  moneda: 'Moneda',
  tipoCambio: 'Tipo de cambio',
  establecimiento: 'Establecimiento',
  numerosPago: 'Números de pago PG',
  cantidadPagos: 'Cantidad de pagos',
  usuario: 'Usuario',
  cantidadAdjuntos: 'Cantidad de adjuntos',
};

// Orden por defecto = remediación visual §5: N° Documento, Concepto,
// Proveedor, Fecha, Categoría, Total, Estado (+ Acciones, fija, fuera de este arreglo).
const COLUMNAS_POR_DEFECTO: ColumnaGastoId[] = ['referenciaInterna', 'concepto', 'proveedor', 'fecha', 'categoria', 'total', 'estado'];
const COLUMNAS_OPCIONALES: ColumnaGastoId[] = ['fechaRegistro', 'fechaEmision', 'documento', 'condicionPago', 'fechaVencimiento', 'subtotal', 'impuesto', 'importeReconocido', 'saldoPendiente', 'moneda', 'tipoCambio', 'establecimiento', 'numerosPago', 'cantidadPagos', 'usuario', 'cantidadAdjuntos'];
const ORDEN_COLUMNAS_TODAS: ColumnaGastoId[] = [...COLUMNAS_POR_DEFECTO, ...COLUMNAS_OPCIONALES];

// v5: separa "Gasto / referencia" en dos columnas — "N° Documento" (solo
// serie + correlativo) y "Concepto" (nueva, visible por defecto) — remediación
// visual §5-7. Versión nueva para que las preferencias guardadas de un
// usuario existente migren limpio en vez de dejar "Concepto" invisible.
const CLAVE_COLUMNAS = 'gastos_tabla_columnas_v5';
const TAMANO_PAGINA = 25;

interface PreferenciaColumnasGasto {
  visibles: ColumnaGastoId[];
  orden: ColumnaGastoId[];
}

const PREFERENCIA_COLUMNAS_POR_DEFECTO: PreferenciaColumnasGasto = {
  visibles: [...COLUMNAS_POR_DEFECTO],
  orden: [...ORDEN_COLUMNAS_TODAS],
};

function esColumnaValida(valor: unknown): valor is ColumnaGastoId {
  return typeof valor === 'string' && (ORDEN_COLUMNAS_TODAS as string[]).includes(valor);
}

function cargarPreferenciaColumnas(empresaId: string): PreferenciaColumnasGasto {
  try {
    const raw = localStorage.getItem(lsKey(CLAVE_COLUMNAS, empresaId));
    if (!raw) return PREFERENCIA_COLUMNAS_POR_DEFECTO;
    const parsed = JSON.parse(raw) as Partial<PreferenciaColumnasGasto>;
    const visibles = Array.isArray(parsed.visibles) ? parsed.visibles.filter(esColumnaValida) : [];
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaValida) : [];
    const faltantes = ORDEN_COLUMNAS_TODAS.filter((id) => !ordenGuardado.includes(id));
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

function renderCelda(fila: FilaGastoOperativo, gasto: Gasto, id: ColumnaGastoId, monedaBase: string, cxp: CuentaPorPagar | undefined): React.ReactNode {
  switch (id) {
    case 'referenciaInterna': {
      // Serie + correlativo, nunca mezclado con el concepto (remediación
      // visual §6) — MISMA fuente que búsqueda/Excel/impresión (§11 de una
      // corrección previa), nunca una segunda llamada a
      // `presentarReferenciaGasto` sin el catálogo de Series.
      const esBorrador = gasto.estadoDocumento === 'borrador';
      return <span className={esBorrador ? 'italic text-gray-500' : 'font-mono'}>{fila.referenciaPresentada}</span>;
    }
    // Columna propia (remediación visual §7) — "¿en qué gasté?" debe
    // responderse sin abrir el Drawer, sin competir con el N° de documento.
    case 'concepto': return <span className="block max-w-[260px] truncate" title={gasto.concepto}>{gasto.concepto}</span>;
    case 'fecha': return formatearFecha(fila.fecha);
    case 'categoria': return fila.categoriaNombre;
    case 'proveedor': return fila.proveedorONombre;
    case 'documento': return nombreDocumentoSustentatorioGasto(gasto);
    case 'condicionPago': return gasto.condicionPago === 'credito' ? 'Crédito' : 'Contado';
    case 'total': return formatMoney(fila.total, fila.monedaOriginal);
    case 'estado': return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fila.estadoClase}`}>
        {fila.estadoPresentado}
      </span>
    );
    // Fecha del documento: solo tiene sentido cuando existe documento sustentatorio (§3-B).
    case 'fechaEmision': return gasto.tipoDocumento && gasto.fechaEmision ? formatearFecha(gasto.fechaEmision) : '—';
    case 'fechaRegistro': return `${formatearFecha(gasto.fechaCreacion)} ${gasto.fechaCreacion.slice(11, 16)}`.trim();
    case 'fechaVencimiento': return gasto.fechaVencimiento ? formatearFecha(gasto.fechaVencimiento) : '—';
    case 'subtotal': return formatMoney(fila.subtotal, fila.monedaOriginal);
    case 'impuesto': return formatMoney(fila.impuesto, fila.monedaOriginal);
    case 'importeReconocido': return fila.importeReconocidoBase === null ? '—' : formatMoney(fila.importeReconocidoBase, monedaBase);
    case 'saldoPendiente': return cxp ? formatMoney(cxp.saldoPendiente, cxp.moneda) : '—';
    case 'moneda': return fila.monedaOriginal;
    case 'tipoCambio': return fila.tipoCambio ? fila.tipoCambio.toFixed(4) : '—';
    case 'establecimiento': return fila.establecimientoNombre;
    case 'numerosPago': return fila.numerosPago.join(', ') || '—';
    case 'cantidadPagos': return fila.cantidadPagos;
    case 'usuario': return gasto.creadoPor ?? '—';
    case 'cantidadAdjuntos': return gasto.adjuntos.length;
    default: return '—';
  }
}

export default function PaginaGastos() {
  const feedback = useFeedback();
  const navigate = useNavigate();
  const { state, anularGasto, descartarBorradorGasto } = useContextoGastos();
  const { state: config, rolesConfigurados } = useConfigurationContext();
  const { activeWorkspace } = useTenant();
  const empresaId = getTenantEmpresaId();
  const monedaBase = currencyManager.getSnapshot().baseCurrency.code;

  // Fuente única de permisos reales (misma que usa `PermisoGuard`/`ContextoGastos`):
  // ocultar/deshabilitar aquí es solo la primera capa — el comando en
  // `ContextoGastos.tsx` vuelve a rechazar la operación aunque se invoque
  // sin pasar por estos botones.
  const { session } = useUserSession();
  const usuarioActual = useMemo(() => obtenerUsuarioDesdeSesion(config.users, session), [config.users, session]);
  // Nombre visible del usuario que anula/descarta desde el listado — MISMA
  // fuente central ya resuelta arriba, nunca un id técnico (§36 de la
  // remediación UX).
  const nombreUsuarioActual = usuarioActual?.personalInfo.fullName || session?.userEmail || undefined;
  const parametrosPermiso = { usuario: usuarioActual, rolesDisponibles: rolesConfigurados, establecimientoId: session?.currentEstablecimientoId };
  const puedeCrearGastos = tienePermiso({ ...parametrosPermiso, permisoId: 'gastos.crear' });
  const puedeAnularGastos = tienePermiso({ ...parametrosPermiso, permisoId: 'gastos.anular' });
  const puedePagarGastos = tienePermiso({ ...parametrosPermiso, permisoId: 'gastos.pagar' });

  const [categorias, setCategorias] = useState(() => cargarCategoriasGasto(empresaId));
  const recargarCategorias = useCallback(() => setCategorias(cargarCategoriasGasto(empresaId)), [empresaId]);
  useEffect(() => {
    recargarCategorias();
    window.addEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargarCategorias);
    return () => window.removeEventListener(EVENTO_CATEGORIAS_GASTO_CAMBIADAS, recargarCategorias);
  }, [recargarCategorias]);

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
  // "Todas las fechas" por defecto (§5 de la corrección) — cadena vacía en
  // desde/hasta significa sin límite en ese extremo (ver proyectarFilasGastosOperativos).
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [mostrarFechas, setMostrarFechas] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [establecimientoId, setEstablecimientoId] = useState('Todos');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [filtroProveedorId, setFiltroProveedorId] = useState('');
  const [filtroCondicionPago, setFiltroCondicionPago] = useState<'contado' | 'credito' | ''>('');
  const [filtroMoneda, setFiltroMoneda] = useState('');
  // Estado documental/de pago sin filtro ('') = Todos — incluye anulados (§4 de la corrección).
  const [filtroEstadoDocumento, setFiltroEstadoDocumento] = useState<EstadoDocumentoGasto | ''>('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<EstadoPagoGasto | ''>('');
  const [filtroConDocumento, setFiltroConDocumento] = useState<'todos' | 'con' | 'sin'>('todos');
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  const [preferenciaColumnas, setPreferenciaColumnas] = useState<PreferenciaColumnasGasto>(() => cargarPreferenciaColumnas(empresaId));
  useEffect(() => { guardarPreferenciaColumnas(empresaId, preferenciaColumnas); }, [empresaId, preferenciaColumnas]);

  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fechaPopoverRef = useRef<HTMLDivElement>(null);
  const filtrosPanelRef = useRef<HTMLDivElement>(null);

  const [drawer, setDrawer] = useState<{ gasto: Gasto; pestanaInicial?: 'pagos' } | null>(null);
  const [anulandoGasto, setAnulandoGasto] = useState<Gasto | null>(null);
  const [descartandoBorrador, setDescartandoBorrador] = useState<Gasto | null>(null);

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
  const formasPagoPorId = useMemo(
    () => new Map(config.paymentMethods.map((m) => [m.id, m.name])),
    [config.paymentMethods],
  );

  const proveedorOptions = useMemo(() => {
    const vistos = new Map<string, string>();
    state.gastos.forEach((g) => { if (g.proveedorId && !vistos.has(g.proveedorId)) vistos.set(g.proveedorId, g.proveedorNombre ?? g.proveedorId); });
    return [...vistos.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [state.gastos]);

  const cuentasPorPagar = useMemo(() => {
    const idsRelevantes = new Set(state.gastos.map((g) => g.cuentaPorPagarId).filter(Boolean));
    return listarCuentasPorPagarPorOrigen('gasto').filter((c) => idsRelevantes.has(c.id));
  }, [state.gastos]);

  const pagos = useMemo(() => {
    const idsRelevantes = new Set(state.gastos.flatMap((g) => g.pagosRelacionados));
    return listarPagosPorOrigen('gasto').filter((p) => idsRelevantes.has(p.id));
  }, [state.gastos]);

  const empresaImpresion: EmpresaImpresionGasto | undefined = useMemo(() => (
    activeWorkspace
      ? { razonSocial: activeWorkspace.razonSocial, ruc: activeWorkspace.ruc, direccion: activeWorkspace.domicilioFiscal }
      : undefined
  ), [activeWorkspace]);

  const handleImprimirGasto = useCallback((gasto: Gasto) => {
    const cuentaPorPagar = cuentasPorPagar.find((c) => c.id === gasto.cuentaPorPagarId);
    void imprimirGasto({
      gasto,
      empresa: empresaImpresion,
      categoriaNombre: categoriasPorId.get(gasto.categoriaId) ?? 'Sin categoría',
      establecimientoNombre: gasto.establecimientoId ? establecimientosPorId.get(gasto.establecimientoId) ?? gasto.establecimientoId : ETIQUETA_ALCANCE_TODA_EMPRESA,
      formaPagoNombre: config.paymentMethods.find((m) => m.id === gasto.formaPagoMetodoId)?.name,
      cuentaPorPagar,
      pagos: pagos.filter((p) => gasto.pagosRelacionados.includes(p.id)),
      estadoPago: resolverEstadoPagoGasto(cuentaPorPagar),
      series: config.series,
    });
  }, [cuentasPorPagar, pagos, categoriasPorId, establecimientosPorId, empresaImpresion, config.paymentMethods, config.series]);

  const filasBase = useMemo(
    () => proyectarFilasGastosOperativos({
      gastos: state.gastos,
      cuentasPorPagar,
      pagos,
      categorias: categoriasPorId,
      establecimientos: establecimientosPorId,
      series: config.series,
      monedaBase,
      periodo: { desde: fechaDesde, hasta: fechaHasta },
      establecimientoId,
    }),
    [state.gastos, cuentasPorPagar, pagos, categoriasPorId, establecimientosPorId, config.series, monedaBase, fechaDesde, fechaHasta, establecimientoId],
  );

  const filasFiltradas = useMemo(
    () => filtrarFilasGastosOperativos(filasBase, {
      busqueda: busqueda || undefined,
      categoriaId: filtroCategoriaId || undefined,
      proveedorId: filtroProveedorId || undefined,
      condicionPago: filtroCondicionPago || undefined,
      moneda: filtroMoneda || undefined,
      estadoDocumento: filtroEstadoDocumento || undefined,
      estadoPago: filtroEstadoPago || undefined,
      conDocumento: filtroConDocumento === 'todos' ? undefined : filtroConDocumento === 'con',
    }),
    [filasBase, busqueda, filtroCategoriaId, filtroProveedorId, filtroCondicionPago, filtroMoneda, filtroEstadoDocumento, filtroEstadoPago, filtroConDocumento],
  );

  useEffect(() => { setPagina(1); }, [busqueda, fechaDesde, fechaHasta, establecimientoId, filtroCategoriaId, filtroProveedorId, filtroCondicionPago, filtroMoneda, filtroEstadoDocumento, filtroEstadoPago, filtroConDocumento]);

  const totalItems = filasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = filasFiltradas.slice((paginaSegura - 1) * TAMANO_PAGINA, paginaSegura * TAMANO_PAGINA);

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

  const construirYExportar = useCallback(async (filas: FilaGastoOperativo[]) => {
    if (filas.length === 0) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    // La misma fuente de verdad que la interfaz (§15 de la corrección): sin
    // agrupación (vive solo en la interfaz de gestión, nunca en el Excel),
    // tipo de documento SIEMPRE traducido (nunca el código SUNAT crudo),
    // números PG vacíos cuando no hay pagos, moneda original y moneda base
    // separadas explícitamente, fechas reales de Excel.
    const columnas: SimpleExcelColumn[] = [
      { header: 'Referencia interna', key: 'referenciaInterna', width: 16 },
      { header: 'Concepto', key: 'concepto', width: 32 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Proveedor o beneficiario', key: 'proveedor', width: 28 },
      { header: 'RUC/documento', key: 'ruc', width: 16 },
      { header: 'Fecha del gasto', key: 'fecha', width: 14, numFmt: 'dd/mm/yyyy' },
      { header: 'Fecha del documento', key: 'fechaEmision', width: 14, numFmt: 'dd/mm/yyyy' },
      { header: 'Tipo de documento', key: 'tipoDocumento', width: 22 },
      { header: 'Serie', key: 'serie', width: 10 },
      { header: 'Número', key: 'numero', width: 12 },
      { header: 'Subtotal', key: 'subtotal', width: 14, numFmt: '#,##0.00' },
      { header: 'IGV', key: 'impuesto', width: 14, numFmt: '#,##0.00' },
      { header: 'Tratamiento del IGV', key: 'tratamientoImpuesto', width: 20 },
      { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
      { header: 'Moneda original', key: 'moneda', width: 12 },
      { header: 'Tipo de cambio', key: 'tipoCambio', width: 14, numFmt: '#,##0.0000' },
      { header: 'Gasto considerado', key: 'reconocido', width: 22, numFmt: '#,##0.00' },
      { header: 'Moneda base', key: 'monedaBase', width: 12 },
      { header: 'Condición de pago', key: 'condicionPago', width: 16 },
      { header: 'Forma de pago', key: 'formaPago', width: 22 },
      { header: 'Número de cuotas', key: 'numeroCuotas', width: 14, numFmt: '#,##0' },
      { header: 'Vencimiento', key: 'vencimiento', width: 14, numFmt: 'dd/mm/yyyy' },
      { header: 'Saldo pendiente', key: 'saldoPendiente', width: 16, numFmt: '#,##0.00' },
      // Columna visual ÚNICA (corrección final puntual §3.5) — MISMA función
      // (`presentarEstadoVisualGasto`, vía `fila.estadoPresentado`) que ya usa
      // la tabla en pantalla, nunca recalculada aquí. Las dos fuentes internas
      // (estadoDocumento/estadoPago) se conservan sin fusionar en el modelo —
      // solo se dejan de exportar como columnas separadas.
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Números PG relacionados', key: 'numerosPago', width: 24 },
      { header: 'Total pagado', key: 'totalPagado', width: 14, numFmt: '#,##0.00' },
      { header: 'Establecimiento', key: 'establecimiento', width: 20 },
      { header: 'Usuario', key: 'usuario', width: 18 },
      { header: 'Fecha de registro', key: 'fechaRegistro', width: 18, numFmt: 'dd/mm/yyyy hh:mm' },
      { header: 'Cantidad de adjuntos', key: 'cantidadAdjuntos', width: 16, numFmt: '#,##0' },
    ];

    const rows = filas.map((f) => {
      const gasto = gastosPorId.get(f.gastoId);
      const cxp = cuentasPorPagar.find((c) => c.id === gasto?.cuentaPorPagarId);
      return construirFilaExcelGastoOperativo(f, gasto, cxp, monedaBase, formasPagoPorId);
    });

    await exportDatasetToExcel({ rows, columns: columnas, filename: `gastos_operativos_${fechaDesde || 'inicio'}_${fechaHasta || 'hoy'}`, worksheetName: 'Gastos' });
  }, [feedback, fechaDesde, fechaHasta, gastosPorId, cuentasPorPagar, monedaBase, formasPagoPorId]);

  const handleExportarClick = useCallback(async () => {
    if (exportando) return;
    setExportando(true);
    try {
      await construirYExportar(filasFiltradas);
    } catch (error) {
      console.error('[Gastos] Error al exportar', error);
      feedback.error('No se pudo exportar. Intenta nuevamente.');
    } finally {
      setExportando(false);
    }
  }, [exportando, construirYExportar, filasFiltradas, feedback]);

  const exportHandlerRef = useRef<() => Promise<void>>(async () => {});
  exportHandlerRef.current = async () => {
    // El reporte "Gastos operativos" del Reports Hub excluye anulados por
    // defecto (§19 de la corrección) — a diferencia del listado operativo,
    // que SÍ los muestra por defecto (§4). El botón manual "Exportar" del
    // toolbar respeta en cambio lo que el usuario ve filtrado en pantalla.
    await construirYExportar(filasFiltradas.filter((f) => f.estadoDocumento !== 'anulado'));
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

  function abrirVer(gasto: Gasto, pestanaInicial?: 'pagos') { setDrawer({ gasto, pestanaInicial }); setMenu(null); }
  function abrirEditar(gasto: Gasto, e?: React.MouseEvent) { e?.stopPropagation(); setMenu(null); navigate(`/gastos/${gasto.id}/editar`, { state: { gasto } }); }
  function abrirDuplicar(gasto: Gasto) { setMenu(null); navigate('/gastos/nuevo', { state: { valoresIniciales: datosParaDuplicarGasto(gasto) } }); }
  function abrirRegistrarPago(gasto: Gasto, e?: React.MouseEvent) { e?.stopPropagation(); setMenu(null); navigate(`/gastos/${gasto.id}/pagar`); }

  async function handleConfirmarAnularGasto(motivo: string) {
    if (!anulandoGasto) return;
    await anularGasto(anulandoGasto.id, motivo, nombreUsuarioActual);
    feedback.success('Gasto anulado.');
    setAnulandoGasto(null);
  }

  async function handleConfirmarDescartarBorrador() {
    if (!descartandoBorrador) return;
    await descartarBorradorGasto(descartandoBorrador.id, nombreUsuarioActual);
    feedback.success('Borrador descartado.');
    setDescartandoBorrador(null);
  }

  function handleActualizar() {
    setActualizando(true);
    recargarCategorias();
    // `state.gastos`/CxP/Pagos ya son reactivos vía contexto — releer
    // categorías (la única fuente que no se refresca automáticamente al
    // navegar) es el trabajo real de "Actualizar", nunca un no-op disfrazado.
    window.setTimeout(() => setActualizando(false), 300);
  }

  const filtrosAvanzadosActivos = [filtroCategoriaId, filtroProveedorId, filtroCondicionPago, filtroMoneda, filtroEstadoDocumento, filtroEstadoPago].filter(Boolean).length
    + (establecimientoId !== 'Todos' ? 1 : 0) + (filtroConDocumento !== 'todos' ? 1 : 0);

  return (
    <div>
      <PageHeader title="Gastos" actions={null} />
      <div className="px-4 md:px-6 pt-1 pb-1 text-sm text-gray-500 dark:text-gray-400">Gestión y control de gastos operativos</div>

      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por concepto, proveedor, documento o N° de pago..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="relative shrink-0" ref={fechaPopoverRef}>
            <button type="button" onClick={() => setMostrarFechas((v) => !v)} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 whitespace-nowrap">
              {fechaDesde || fechaHasta ? `${fechaDesde || '…'} – ${fechaHasta || '…'}` : 'Todas las fechas'}
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
                {(fechaDesde || fechaHasta) && (
                  <button type="button" onClick={() => { setFechaDesde(''); setFechaHasta(''); }} className="text-xs text-blue-600 hover:underline">
                    Ver todas las fechas
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative shrink-0" ref={filtrosPanelRef}>
            <button type="button" onClick={() => setMostrarFiltros((v) => !v)} className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 whitespace-nowrap">
              <SlidersHorizontal size={16} className="text-gray-400" />
              Filtros
              {filtrosAvanzadosActivos > 0 && <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-medium">{filtrosAvanzadosActivos}</span>}
            </button>
            {mostrarFiltros && (
              <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg space-y-3 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Establecimiento</label>
                  <select value={establecimientoId} onChange={(e) => setEstablecimientoId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    {establecimientoOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                  <select value={filtroCategoriaId} onChange={(e) => setFiltroCategoriaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todas</option>
                    {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Proveedor / beneficiario</label>
                  <select value={filtroProveedorId} onChange={(e) => setFiltroProveedorId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todos</option>
                    {proveedorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Condición de pago</label>
                  <select value={filtroCondicionPago} onChange={(e) => setFiltroCondicionPago(e.target.value as 'contado' | 'credito' | '')} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todas</option>
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado documental</label>
                  <select value={filtroEstadoDocumento} onChange={(e) => setFiltroEstadoDocumento(e.target.value as EstadoDocumentoGasto | '')} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todos</option>
                    <option value="borrador">Borrador</option>
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
                  <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                  <select value={filtroMoneda} onChange={(e) => setFiltroMoneda(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Todas</option>
                    {monedas.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
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
            onClick={handleActualizar}
            disabled={actualizando}
            title="Actualizar"
            className="shrink-0 flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-gray-400 ${actualizando ? 'animate-spin' : ''}`} />
          </button>

          <div className="shrink-0">
            <ColumnsManager
              columns={columnasManager}
              onToggleColumn={alternarColumna}
              onResetColumns={restablecerColumnas}
              onSelectAllColumns={seleccionarTodasColumnas}
              onReorderColumns={reordenarColumnas}
              buttonLabel="Columnas"
            />
          </div>

          <button type="button" onClick={() => void handleExportarClick()} disabled={exportando} title="Exportar a Excel" className="shrink-0 flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-50 whitespace-nowrap">
            <FileDown size={16} className="text-gray-400" />
            Exportar
          </button>

          {puedeCrearGastos && (
            <button type="button" onClick={() => navigate('/gastos/nuevo')} className="shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap">
              <Plus size={16} />
              Registrar gasto
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {columnasOrdenVisible.map((id) => (
                  <th key={id} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{ETIQUETA_COLUMNA[id]}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-gray-600 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filasPagina.length === 0 && (
                <tr><td colSpan={columnasOrdenVisible.length + 1} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">No hay gastos para los filtros seleccionados.</td></tr>
              )}
              {filasPagina.map((fila) => {
                const gasto = gastosPorId.get(fila.gastoId);
                if (!gasto) return null;
                const cxp = cuentasPorPagar.find((c) => c.id === gasto.cuentaPorPagarId);
                const esBorrador = gasto.estadoDocumento === 'borrador';
                const puedePagar = gasto.estadoDocumento === 'registrado' && (fila.estadoPago === 'pendiente' || fila.estadoPago === 'parcial');
                const pagosDelGasto = pagos.filter((p) => gasto.pagosRelacionados.includes(p.id));
                const esEditable = puedeEditarGasto(gasto, cxp, pagosDelGasto);
                const motivoBloqueoAnular = gasto.estadoDocumento === 'registrado' ? motivoBloqueoAnulacionGasto(gasto, cxp, pagosDelGasto) : null;
                return (
                  <tr key={fila.id} onClick={() => abrirVer(gasto)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    {columnasOrdenVisible.map((id) => (
                      <td key={id} className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">{renderCelda(fila, gasto, id, monedaBase, cxp)}</td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {puedeCrearGastos && (
                          <button type="button" title={esEditable ? (esBorrador ? 'Editar / Registrar' : 'Editar') : 'Un gasto anulado no puede editarse'} disabled={!esEditable} onClick={(e) => abrirEditar(gasto, e)} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-gray-700">
                            <Pencil size={15} />
                          </button>
                        )}
                        {puedePagar && puedePagarGastos && (
                          <button type="button" title="Registrar pago" onClick={(e) => abrirRegistrarPago(gasto, e)} className="p-1.5 rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20">
                            <Wallet size={15} />
                          </button>
                        )}
                        {gasto.estadoDocumento === 'registrado' && puedeAnularGastos && (
                          <button
                            type="button"
                            title={motivoBloqueoAnular ?? 'Anular'}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (motivoBloqueoAnular) {
                                feedback.warning(motivoBloqueoAnular);
                                abrirVer(gasto, 'pagos');
                                return;
                              }
                              setAnulandoGasto(gasto);
                            }}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                        {esBorrador && puedeCrearGastos && (
                          <button
                            type="button"
                            title="Descartar borrador"
                            onClick={(e) => { e.stopPropagation(); setDescartandoBorrador(gasto); }}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        <button type="button" onClick={(e) => abrirMenu(e, gasto.id)} title="Más acciones" className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700" aria-label="Más acciones">
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          {puedeCrearGastos && (
            <button onClick={() => abrirDuplicar(gastoActivo)} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60">
              <Copy size={15} /> Duplicar
            </button>
          )}
          <button onClick={() => { setMenu(null); handleImprimirGasto(gastoActivo); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60">
            <Printer size={15} /> Imprimir / Guardar PDF
          </button>
        </div>
      )}

      {drawer && (
        <DrawerGasto
          gasto={drawer.gasto}
          categorias={categorias}
          establecimientos={establecimientoOptions.filter((o) => o.value !== 'Todos')}
          pestanaInicial={drawer.pestanaInicial}
          onCerrar={() => setDrawer(null)}
          onEditar={(gasto) => { setDrawer(null); navigate(`/gastos/${gasto.id}/editar`, { state: { gasto } }); }}
          onGuardado={() => {
            // Refresca la instantánea del gasto dentro del Drawer (pagos/estado recién
            // aplicados) sin cerrar la vista — `state.gastos` ya es reactivo vía contexto.
            setDrawer((d) => {
              if (!d) return d;
              const actualizado = state.gastos.find((g) => g.id === d.gasto.id);
              return actualizado ? { gasto: actualizado } : d;
            });
          }}
        />
      )}

      {anulandoGasto && (
        <ModalAnularDocumento
          abierto
          titulo="Anular gasto"
          descripcion={`¿Confirmas anular el gasto "${anulandoGasto.concepto}"? Esta acción no elimina el registro, solo lo marca como anulado.`}
          motivos={[...MOTIVOS_ANULACION_GASTO]}
          onConfirmar={handleConfirmarAnularGasto}
          onCerrar={() => setAnulandoGasto(null)}
        />
      )}

      {descartandoBorrador && (
        <ModalAnularDocumento
          abierto
          titulo="Descartar borrador"
          descripcion={`¿Confirmas descartar el borrador "${descartandoBorrador.concepto}"? Nunca fue registrado oficialmente — el registro se conserva para auditoría, pero deja de estar disponible como borrador.`}
          motivos={[...MOTIVOS_ANULACION_GASTO]}
          etiquetaMotivo="Motivo del descarte"
          textoBotonConfirmar="Confirmar descarte"
          textoProcesando="Descartando..."
          onConfirmar={handleConfirmarDescartarBorrador}
          onCerrar={() => setDescartandoBorrador(null)}
        />
      )}
    </div>
  );
}
