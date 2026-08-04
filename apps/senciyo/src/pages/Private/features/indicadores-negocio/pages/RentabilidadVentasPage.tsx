// indicadores-negocio/pages/RentabilidadVentasPage.tsx
//
// Página de "Rentabilidad de ventas" (§1-§26) — único punto de consulta completo (filtrar,
// buscar, agrupar, personalizar columnas, ver detalle, exportar) para la rentabilidad de ventas.
// Reutiliza EXCLUSIVAMENTE fuentes de datos ya aprobadas (comprobantes en memoria, movimientos,
// consumos, capas ya persistidos) a través de la única proyección central
// `consultaRentabilidadVentas.service.ts` — nunca recalcula venta/costo aquí, nunca hace lecturas
// de repositorio por fila, nunca duplica el exportador ni el ColumnsManager.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDown, Search, SlidersHorizontal } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import DateRangePicker from '../components/DateRangePicker';
import TablaRentabilidadVentas from '../components/TablaRentabilidadVentas';
import ModalDetalleRentabilidadVenta from '../components/ModalDetalleRentabilidadVenta';
import {
  proyectarFilasRentabilidadVentas,
  filtrarFilasRentabilidad,
  calcularIndicadoresRentabilidad,
  calcularResultadoOperativo,
  calcularAmplitudPeriodoEnDias,
  agruparFilasRentabilidad,
  ETIQUETA_COLUMNA_RENTABILIDAD,
  COLUMNAS_COMUNES_RENTABILIDAD,
  obtenerColumnasConfigurables,
  etiquetaColumnaAgrupacion,
  type FilaRentabilidadVenta,
  type GrupoRentabilidadVenta,
  type AgrupacionRentabilidad,
  type EstadoCostoRentabilidad,
  type ColumnaRentabilidadId,
  type ColumnaComunRentabilidad,
  type ColumnaOpcionalLineaRentabilidad,
} from '../services/consultaRentabilidadVentas.service';
import { useIndicadoresFilters } from '../hooks/useIndicadoresFilters';
import {
  proyectarFilasGastosOperativos,
  filtrarFilasGastosOperativos,
  calcularIndicadoresGastosOperativos,
} from '../../gastos/servicios/consultaGastosOperativos.service';
import { cargarGastos } from '../../gastos/repositorios/repositorioGastos';
import { cargarCuentasPorPagar } from '../../compras/repositorios/repositorioCuentasPorPagar';
import { cargarCategoriasGasto } from '../../gastos/repositorios/repositorioCategoriasGasto';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useComprobanteContext } from '../../comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext';
import type { ComprobanteStatus } from '../../comprobantes-electronicos/models/comprobante.types';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { StockRepository } from '../../gestion-inventario/repositories/stock.repository';
import { listarConsumosCapaCostoInventarioPorEmpresa } from '../../gestion-inventario/repositories/consumoCapaCostoInventario.repository';
import { listarCapasCostoInventarioPorEmpresa } from '../../gestion-inventario/repositories/capaCostoInventario.repository';
import { getTenantEmpresaId, lsKey } from '@/shared/tenant';
import { currencyManager, formatMoney } from '@/shared/currency';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { exportDatasetToExcel, type SimpleExcelColumn } from '@/shared/export/exportToExcel';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import { useFeedback } from '@/shared/feedback/useFeedback';

type ColumnaConfigurableRentabilidad = ColumnaComunRentabilidad | ColumnaOpcionalLineaRentabilidad;

const OPCIONES_AGRUPACION: Array<{ value: AgrupacionRentabilidad; label: string }> = [
  { value: 'sin_agrupar', label: 'Sin agrupar' },
  { value: 'producto', label: 'Producto' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'establecimiento', label: 'Establecimiento' },
  { value: 'periodo', label: 'Periodo' },
];

const ESTADOS_COSTO_FILTRO: EstadoCostoRentabilidad[] = ['con_costo', 'sin_costo_registrado', 'no_aplica_inventario', 'tipo_cambio_no_disponible'];
const ETIQUETA_ESTADO_COSTO_FILTRO: Record<EstadoCostoRentabilidad, string> = {
  con_costo: 'Con costo',
  sin_costo_registrado: 'Sin costo registrado',
  no_aplica_inventario: 'No aplica al inventario',
  tipo_cambio_no_disponible: 'Tipo de cambio no disponible',
};
const ESTADOS_COMPROBANTE_FILTRO: ComprobanteStatus[] = ['Enviado', 'Aceptado', 'Rechazado', 'Por corregir', 'Anulado'];

const TAMANO_PAGINA = 25;
const CLAVE_COLUMNAS_BASE = 'rentabilidad_ventas_tabla_columnas';
const VERSION_COLUMNAS = 'v1';

interface PreferenciaColumnasRentabilidad {
  visibles: ColumnaRentabilidadId[];
  orden: ColumnaRentabilidadId[];
}

/** Comunes visibles por defecto; las 19 opcionales de línea empiezan apagadas — mismo criterio ya usado en Movimientos de Inventario. */
function columnasPorDefecto(modo: AgrupacionRentabilidad): PreferenciaColumnasRentabilidad {
  const disponibles = obtenerColumnasConfigurables(modo);
  const comunes = new Set<string>(COLUMNAS_COMUNES_RENTABILIDAD);
  return { visibles: disponibles.filter((id) => comunes.has(id)), orden: disponibles };
}

/** Preferencia tenantizada y versionada, aislada por modo de agrupación (§14: una columna inválida de un modo nunca aparece en otro). */
function cargarPreferenciaColumnas(empresaId: string, modo: AgrupacionRentabilidad): PreferenciaColumnasRentabilidad {
  const disponibles = obtenerColumnasConfigurables(modo);
  const esValida = (valor: unknown): valor is ColumnaRentabilidadId => typeof valor === 'string' && (disponibles as string[]).includes(valor);
  try {
    const claveVersion = lsKey(`${CLAVE_COLUMNAS_BASE}_${modo}_version`, empresaId);
    const claveDatos = lsKey(`${CLAVE_COLUMNAS_BASE}_${modo}`, empresaId);
    if (localStorage.getItem(claveVersion) !== VERSION_COLUMNAS) {
      const porDefecto = columnasPorDefecto(modo);
      localStorage.setItem(claveVersion, VERSION_COLUMNAS);
      localStorage.setItem(claveDatos, JSON.stringify(porDefecto));
      return porDefecto;
    }
    const raw = localStorage.getItem(claveDatos);
    if (!raw) return columnasPorDefecto(modo);
    const parsed = JSON.parse(raw) as Partial<PreferenciaColumnasRentabilidad>;
    const visibles = Array.isArray(parsed.visibles) ? parsed.visibles.filter(esValida) : [];
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esValida) : [];
    const faltantes = disponibles.filter((id) => !ordenGuardado.includes(id));
    return { visibles, orden: [...ordenGuardado, ...faltantes] };
  } catch {
    return columnasPorDefecto(modo);
  }
}

function guardarPreferenciaColumnas(empresaId: string, modo: AgrupacionRentabilidad, preferencia: PreferenciaColumnasRentabilidad): void {
  try {
    localStorage.setItem(lsKey(`${CLAVE_COLUMNAS_BASE}_${modo}_version`, empresaId), VERSION_COLUMNAS);
    localStorage.setItem(lsKey(`${CLAVE_COLUMNAS_BASE}_${modo}`, empresaId), JSON.stringify(preferencia));
  } catch {
    // Persistencia best-effort — un fallo de almacenamiento nunca debe romper la tabla.
  }
}

const DEFINICION_COLUMNA_EXCEL: Record<ColumnaConfigurableRentabilidad, Omit<SimpleExcelColumn, 'key'>> = {
  fecha: { header: 'Fecha', width: 14, numFmt: 'dd/mm/yyyy' },
  cantidad: { header: 'Cantidad', width: 12, numFmt: '#,##0' },
  ventaNeta: { header: 'Venta neta', width: 16, numFmt: '#,##0.00' },
  costoVenta: { header: 'Costo de venta', width: 16, numFmt: '#,##0.00' },
  utilidadBruta: { header: 'Utilidad bruta', width: 16, numFmt: '#,##0.00' },
  margenBruto: { header: 'Margen bruto', width: 14, numFmt: '0.00%' },
  cliente: { header: 'Cliente', width: 28 },
  vendedor: { header: 'Vendedor', width: 22 },
  establecimiento: { header: 'Establecimiento', width: 22 },
  almacen: { header: 'Almacén', width: 20 },
  monedaOriginal: { header: 'Moneda original', width: 14 },
  tipoCambio: { header: 'Tipo de cambio', width: 14, numFmt: '#,##0.0000' },
  ventaNetaOriginal: { header: 'Venta neta original', width: 18, numFmt: '#,##0.00' },
  precioUnitarioHistorico: { header: 'Precio unitario histórico', width: 20, numFmt: '#,##0.00' },
  importeBruto: { header: 'Importe bruto', width: 16, numFmt: '#,##0.00' },
  descuentoLinea: { header: 'Descuento de línea', width: 18, numFmt: '#,##0.00' },
  descuentoGlobalAsignado: { header: 'Descuento global asignado', width: 22, numFmt: '#,##0.00' },
  impuesto: { header: 'Impuesto', width: 14, numFmt: '#,##0.00' },
  totalVendido: { header: 'Total vendido', width: 16, numFmt: '#,##0.00' },
  estadoComprobante: { header: 'Estado del comprobante', width: 20 },
  estadoCosto: { header: 'Estado del costo', width: 22 },
  tipoDocumento: { header: 'Tipo de documento', width: 18 },
  canal: { header: 'Canal', width: 14 },
  notaCreditoRelacionada: { header: 'Nota de Crédito relacionada', width: 26 },
  cantidadDevuelta: { header: 'Cantidad devuelta', width: 16, numFmt: '#,##0' },
  costoRecuperado: { header: 'Costo recuperado', width: 16, numFmt: '#,##0.00' },
};

const ETIQUETA_ESTADO_COSTO_EXCEL: Record<EstadoCostoRentabilidad, string> = ETIQUETA_ESTADO_COSTO_FILTRO;

function valorColumnaExcelFila(fila: FilaRentabilidadVenta, id: ColumnaConfigurableRentabilidad): unknown {
  switch (id) {
    case 'fecha': return new Date(`${fila.fecha.slice(0, 10)}T00:00:00`);
    case 'cantidad': return fila.cantidad;
    case 'ventaNeta': return fila.ventaNetaBase;
    case 'costoVenta': return fila.costoVentaBase;
    case 'utilidadBruta': return fila.utilidadBrutaBase;
    case 'margenBruto': return fila.margenBruto;
    case 'cliente': return fila.cliente ?? '';
    case 'vendedor': return fila.vendedor ?? '';
    case 'establecimiento': return fila.establecimiento ?? '';
    case 'almacen': return fila.almacen ?? '';
    case 'monedaOriginal': return fila.monedaOriginal;
    case 'tipoCambio': return fila.tipoCambioHistorico ?? null;
    case 'ventaNetaOriginal': return fila.ventaNetaOriginal;
    case 'precioUnitarioHistorico': return fila.precioUnitarioHistorico;
    case 'importeBruto': return fila.importeBruto;
    case 'descuentoLinea': return fila.descuentoLinea;
    case 'descuentoGlobalAsignado': return fila.descuentoGlobalAsignado;
    case 'impuesto': return fila.impuesto;
    case 'totalVendido': return fila.totalVendido;
    case 'estadoComprobante': return fila.estadoDocumento;
    case 'estadoCosto': return ETIQUETA_ESTADO_COSTO_EXCEL[fila.estadoCosto];
    case 'tipoDocumento': return fila.tipoDocumento;
    case 'canal': return fila.canal ?? '';
    case 'notaCreditoRelacionada': return fila.documentoOrigenRelacionado ?? '';
    case 'cantidadDevuelta': return fila.cantidadDevuelta > 0 ? fila.cantidadDevuelta : null;
    case 'costoRecuperado': return fila.costoRecuperadoBase > 0 ? fila.costoRecuperadoBase : null;
    default: return '';
  }
}

function valorColumnaExcelGrupo(grupo: GrupoRentabilidadVenta, id: ColumnaConfigurableRentabilidad): unknown {
  switch (id) {
    case 'cantidad': return grupo.cantidadNeta;
    case 'ventaNeta': return grupo.ventaNetaBase;
    case 'costoVenta': return grupo.costoVentaBase;
    case 'utilidadBruta': return grupo.utilidadBrutaBase;
    case 'margenBruto': return grupo.margenBruto;
    default: return null;
  }
}

const TarjetaIndicador: React.FC<{ label: string; valor: string }> = ({ label, valor }) => (
  <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
    <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{valor}</p>
  </div>
);

const RentabilidadVentasPage: React.FC = () => {
  const navigate = useNavigate();
  const { error: mostrarError, warning: mostrarAdvertencia } = useFeedback();
  const empresaId = getTenantEmpresaId();
  const monedaBase = currencyManager.getSnapshot().baseCurrency.code;

  const { dateRange, EstablecimientoId, setDateRange, setEstablecimientoId } = useIndicadoresFilters();
  const { state: configState } = useConfigurationContext();
  const { state: comprobanteState } = useComprobanteContext();
  const allProducts = useProductStore((s) => s.allProducts);

  // Cada colección se lee UNA sola vez por montaje (§20) — nunca por fila.
  const movimientos = useMemo(() => StockRepository.getMovements(), []);
  const consumos = useMemo(() => listarConsumosCapaCostoInventarioPorEmpresa(empresaId), [empresaId]);
  const capas = useMemo(() => listarCapasCostoInventarioPorEmpresa(empresaId), [empresaId]);

  const [busqueda, setBusqueda] = useState('');
  const [agrupacion, setAgrupacion] = useState<AgrupacionRentabilidad>('sin_agrupar');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroTipoDocumento, setFiltroTipoDocumento] = useState('');
  const [filtroCanal, setFiltroCanal] = useState('');
  const [filtroEstadoComprobante, setFiltroEstadoComprobante] = useState('');
  const [filtroEstadoCosto, setFiltroEstadoCosto] = useState<EstadoCostoRentabilidad | ''>('');
  const [filtroConDevolucion, setFiltroConDevolucion] = useState<'todos' | 'con' | 'sin'>('todos');
  const [pagina, setPagina] = useState(1);
  const [filaSeleccionada, setFilaSeleccionada] = useState<FilaRentabilidadVenta | null>(null);
  const [exportando, setExportando] = useState(false);

  const filtrosPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mostrarFiltros) return undefined;
    const handler = (event: MouseEvent) => {
      if (filtrosPanelRef.current && !filtrosPanelRef.current.contains(event.target as Node)) {
        setMostrarFiltros(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mostrarFiltros]);

  // Los anulados solo se proyectan cuando el usuario filtra explícitamente por ese estado (§9).
  const incluirAnulados = filtroEstadoComprobante === 'Anulado';

  const filasBase = useMemo(
    () => proyectarFilasRentabilidadVentas({
      empresaId,
      monedaBase,
      comprobantes: comprobanteState.comprobantes,
      movimientos,
      consumos,
      capas,
      periodo: { desde: dateRange.startDate, hasta: dateRange.endDate },
      establecimientoId: EstablecimientoId,
      incluirAnulados,
    }),
    [empresaId, monedaBase, comprobanteState.comprobantes, movimientos, consumos, capas, dateRange.startDate, dateRange.endDate, EstablecimientoId, incluirAnulados]
  );

  const categoriaPorProducto = useMemo(() => {
    const mapa = new Map<string, string>();
    allProducts.forEach((producto) => {
      if (producto.categoria) mapa.set(producto.id, producto.categoria);
    });
    return mapa;
  }, [allProducts]);

  const categoriasDisponibles = useMemo(
    () => Array.from(new Set(configState.categories.map((categoria) => categoria.nombre))).sort(),
    [configState.categories]
  );
  const almacenesDisponibles = useMemo(
    () => Array.from(new Set(filasBase.map((fila) => fila.almacen).filter((valor): valor is string => Boolean(valor)))).sort(),
    [filasBase]
  );
  const tiposDocumentoDisponibles = useMemo(
    () => Array.from(new Set(filasBase.map((fila) => fila.tipoDocumento))).sort(),
    [filasBase]
  );
  const canalesDisponibles = useMemo(
    () => Array.from(new Set(filasBase.map((fila) => fila.canal).filter((valor): valor is string => Boolean(valor)))).sort(),
    [filasBase]
  );

  const filasFiltradas = useMemo(() => {
    const filtradas = filtrarFilasRentabilidad(filasBase, {
      busqueda: busqueda || undefined,
      almacen: filtroAlmacen || undefined,
      tipoDocumento: filtroTipoDocumento || undefined,
      canal: filtroCanal || undefined,
      estadoComprobante: filtroEstadoComprobante || undefined,
      estadoCosto: filtroEstadoCosto || undefined,
      conDevolucion: filtroConDevolucion === 'todos' ? undefined : filtroConDevolucion === 'con',
    });
    if (!filtroCategoria) return filtradas;
    return filtradas.filter((fila) => categoriaPorProducto.get(fila.productoId) === filtroCategoria);
  }, [filasBase, busqueda, filtroAlmacen, filtroCategoria, filtroTipoDocumento, filtroCanal, filtroEstadoComprobante, filtroEstadoCosto, filtroConDevolucion, categoriaPorProducto]);

  const indicadores = useMemo(() => calcularIndicadoresRentabilidad(filasFiltradas), [filasFiltradas]);
  const amplitudPeriodoDias = useMemo(
    () => calcularAmplitudPeriodoEnDias(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate, dateRange.endDate]
  );

  // Resultado operativo — Gastos operativos / Utilidad operativa / Margen operativo (§14).
  // Reutiliza EXCLUSIVAMENTE la proyección canónica de Gastos (`consultaGastosOperativos.service.ts`);
  // nunca inserta gastos como filas de venta ni recalcula el importe reconocido aquí.
  const gastos = useMemo(() => cargarGastos(), []);
  const cuentasPorPagarGasto = useMemo(() => cargarCuentasPorPagar(), []);
  const categoriasGastoPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    cargarCategoriasGasto(empresaId).forEach((categoria) => mapa.set(categoria.id, categoria.nombre));
    return mapa;
  }, [empresaId]);
  const establecimientosPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    configState.Establecimientos.forEach((est) => mapa.set(est.id, est.nombreEstablecimiento));
    return mapa;
  }, [configState.Establecimientos]);

  const filasGastosOperativos = useMemo(
    () => filtrarFilasGastosOperativos(
      proyectarFilasGastosOperativos({
        gastos,
        cuentasPorPagar: cuentasPorPagarGasto,
        categorias: categoriasGastoPorId,
        establecimientos: establecimientosPorId,
        monedaBase,
        periodo: { desde: dateRange.startDate, hasta: dateRange.endDate },
        establecimientoId: EstablecimientoId,
      }),
      // Rentabilidad excluye siempre los gastos anulados — antes era el
      // comportamiento implícito de `filtrarFilasGastosOperativos`, ahora
      // debe pedirse explícitamente (el listado operativo de Gastos sí
      // debe mostrarlos por defecto).
      { estadoDocumento: 'registrado' },
    ),
    [gastos, cuentasPorPagarGasto, categoriasGastoPorId, establecimientosPorId, monedaBase, dateRange.startDate, dateRange.endDate, EstablecimientoId]
  );
  const indicadoresGastos = useMemo(() => calcularIndicadoresGastosOperativos(filasGastosOperativos), [filasGastosOperativos]);
  const resultadoOperativo = useMemo(
    () => calcularResultadoOperativo(indicadores, indicadoresGastos),
    [indicadores, indicadoresGastos]
  );
  const etiquetaUtilidadOperativa = resultadoOperativo.esCompleto ? 'Utilidad operativa' : 'Utilidad operativa estimada';
  const etiquetaMargenOperativo = resultadoOperativo.esCompleto ? 'Margen operativo' : 'Margen operativo estimado';
  const grupos = useMemo(
    () => agruparFilasRentabilidad(filasFiltradas, agrupacion, amplitudPeriodoDias),
    [filasFiltradas, agrupacion, amplitudPeriodoDias]
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroAlmacen, filtroCategoria, filtroTipoDocumento, filtroCanal, filtroEstadoComprobante, filtroEstadoCosto, filtroConDevolucion, agrupacion, dateRange.startDate, dateRange.endDate, EstablecimientoId]);

  const esSinAgrupar = agrupacion === 'sin_agrupar';
  const totalItems = esSinAgrupar ? filasFiltradas.length : grupos.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = esSinAgrupar ? filasFiltradas.slice((paginaSegura - 1) * TAMANO_PAGINA, paginaSegura * TAMANO_PAGINA) : [];
  const gruposPagina = esSinAgrupar ? [] : grupos.slice((paginaSegura - 1) * TAMANO_PAGINA, paginaSegura * TAMANO_PAGINA);

  // Columnas — preferencia persistida y aislada por modo de agrupación.
  const [preferenciaColumnas, setPreferenciaColumnas] = useState<PreferenciaColumnasRentabilidad>(
    () => cargarPreferenciaColumnas(empresaId, 'sin_agrupar')
  );
  useEffect(() => {
    setPreferenciaColumnas(cargarPreferenciaColumnas(empresaId, agrupacion));
  }, [empresaId, agrupacion]);
  useEffect(() => {
    guardarPreferenciaColumnas(empresaId, agrupacion, preferenciaColumnas);
  }, [empresaId, agrupacion, preferenciaColumnas]);

  const disponiblesModo = useMemo(() => obtenerColumnasConfigurables(agrupacion), [agrupacion]);
  const columnasVisiblesOrdenadas = useMemo(
    () => preferenciaColumnas.orden.filter((id) => disponiblesModo.includes(id) && preferenciaColumnas.visibles.includes(id)),
    [preferenciaColumnas, disponiblesModo]
  );
  const columnasManager: ColumnsManagerColumn[] = useMemo(
    () => disponiblesModo.map((id) => ({ id, label: ETIQUETA_COLUMNA_RENTABILIDAD[id], visible: preferenciaColumnas.visibles.includes(id) })),
    [disponiblesModo, preferenciaColumnas]
  );

  const esColumnaValidaModo = useCallback(
    (id: string): id is ColumnaRentabilidadId => (disponiblesModo as string[]).includes(id),
    [disponiblesModo]
  );

  const alternarColumna = useCallback((columnId: string) => {
    if (!esColumnaValidaModo(columnId)) return;
    setPreferenciaColumnas((prev) => ({
      ...prev,
      visibles: prev.visibles.includes(columnId) ? prev.visibles.filter((id) => id !== columnId) : [...prev.visibles, columnId],
    }));
  }, [esColumnaValidaModo]);

  const restablecerColumnas = useCallback(() => {
    setPreferenciaColumnas(columnasPorDefecto(agrupacion));
  }, [agrupacion]);

  const seleccionarTodasColumnas = useCallback(() => {
    setPreferenciaColumnas((prev) => ({ ...prev, visibles: [...prev.orden] }));
  }, []);

  const reordenarColumnas = useCallback((sourceId: string, targetId: string) => {
    if (!esColumnaValidaModo(sourceId) || !esColumnaValidaModo(targetId)) return;
    setPreferenciaColumnas((prev) => {
      const sourceIndex = prev.orden.indexOf(sourceId);
      const targetIndex = prev.orden.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const siguienteOrden = [...prev.orden];
      const [movido] = siguienteOrden.splice(sourceIndex, 1);
      siguienteOrden.splice(targetIndex, 0, movido);
      return { ...prev, orden: siguienteOrden };
    });
  }, [esColumnaValidaModo]);

  // Charts — reutilizan la MISMA función de agrupación central, nunca una agregación paralela.
  const gruposPorPeriodo = useMemo(
    () => [...agruparFilasRentabilidad(filasFiltradas, 'periodo', amplitudPeriodoDias)].sort((a, b) => a.clave.localeCompare(b.clave)),
    [filasFiltradas, amplitudPeriodoDias]
  );
  const gruposPorProducto = useMemo(
    () => [...agruparFilasRentabilidad(filasFiltradas, 'producto', amplitudPeriodoDias)]
      .filter((grupo) => grupo.margenBruto !== null)
      .sort((a, b) => b.ventaNetaBase - a.ventaNetaBase)
      .slice(0, 10),
    [filasFiltradas, amplitudPeriodoDias]
  );
  // Deriva de dos arreglos ya calculados (nunca datos crudos) — decide si la sección "Análisis
  // visual" se muestra o se colapsa a un único estado vacío (§9: nunca dos tarjetas grandes vacías).
  const hayDatosGraficables = gruposPorPeriodo.length > 0 || gruposPorProducto.length > 0;

  // Ajustes por devolución relacionados a una venta (para el modal) — un simple filtro sobre las
  // filas ya proyectadas, nunca un nuevo cálculo monetario.
  const ajustesPorDocumentoOrigen = useMemo(() => {
    const mapa = new Map<string, FilaRentabilidadVenta[]>();
    filasFiltradas.forEach((fila) => {
      if (fila.tipoOperacion === 'venta' || !fila.documentoOrigenRelacionado) return;
      const existentes = mapa.get(fila.documentoOrigenRelacionado);
      if (existentes) existentes.push(fila);
      else mapa.set(fila.documentoOrigenRelacionado, [fila]);
    });
    return mapa;
  }, [filasFiltradas]);

  const ajustesDeFilaSeleccionada = filaSeleccionada && filaSeleccionada.tipoOperacion === 'venta'
    ? ajustesPorDocumentoOrigen.get(filaSeleccionada.numeroDocumento) ?? []
    : [];

  const establecimientoOptions = useMemo(() => {
    const activos = configState.Establecimientos.filter((est) => est.estaActivoEstablecimiento !== false);
    return [
      { value: 'Todos', label: 'Todos los establecimientos' },
      ...activos.map((est) => ({ value: est.id, label: `${est.codigoEstablecimiento ?? est.id} - ${est.nombreEstablecimiento}` })),
    ];
  }, [configState.Establecimientos]);

  const filtrosAvanzadosActivos = [filtroAlmacen, filtroCategoria, filtroTipoDocumento, filtroCanal, filtroEstadoComprobante, filtroEstadoCosto]
    .filter(Boolean).length + (filtroConDevolucion !== 'todos' ? 1 : 0);

  const limpiarFiltrosAvanzados = useCallback(() => {
    setFiltroAlmacen('');
    setFiltroCategoria('');
    setFiltroTipoDocumento('');
    setFiltroCanal('');
    setFiltroEstadoComprobante('');
    setFiltroEstadoCosto('');
    setFiltroConDevolucion('todos');
  }, []);

  // Exportación — reutiliza EXACTAMENTE `exportDatasetToExcel` (§16); las columnas fijas siempre se
  // incluyen; siempre exporta el conjunto FILTRADO completo, nunca solo la página visible.
  const construirYExportar = useCallback(async (
    modo: AgrupacionRentabilidad,
    columnasIds: ColumnaRentabilidadId[],
    filasOrigen: FilaRentabilidadVenta[],
  ) => {
    const esSinAgruparExport = modo === 'sin_agrupar';
    const gruposOrigen = esSinAgruparExport ? [] : agruparFilasRentabilidad(filasOrigen, modo, amplitudPeriodoDias);

    if ((esSinAgruparExport && filasOrigen.length === 0) || (!esSinAgruparExport && gruposOrigen.length === 0)) {
      mostrarAdvertencia('No hay datos para exportar con los filtros actuales.');
      return;
    }

    const columnasConfigurables = columnasIds.filter((id): id is ColumnaConfigurableRentabilidad => id in DEFINICION_COLUMNA_EXCEL);
    const columnas: SimpleExcelColumn[] = [
      { header: etiquetaColumnaAgrupacion(modo), key: 'documento', width: 24 },
      ...(esSinAgruparExport ? [{ header: 'Producto', key: 'producto', width: 30 }] : []),
      ...columnasConfigurables.map((id) => ({ key: id, ...DEFINICION_COLUMNA_EXCEL[id] })),
    ];

    const rows: Record<string, unknown>[] = esSinAgruparExport
      ? filasOrigen.map((fila) => {
          const filaExcel: Record<string, unknown> = { documento: fila.numeroDocumento, producto: fila.productoNombre };
          columnasConfigurables.forEach((id) => { filaExcel[id] = valorColumnaExcelFila(fila, id); });
          return filaExcel;
        })
      : gruposOrigen.map((grupo) => {
          const filaExcel: Record<string, unknown> = { documento: grupo.etiqueta };
          columnasConfigurables.forEach((id) => { filaExcel[id] = valorColumnaExcelGrupo(grupo, id); });
          return filaExcel;
        });

    await exportDatasetToExcel({
      rows,
      columns: columnas,
      filename: `rentabilidad_ventas_${dateRange.startDate}_${dateRange.endDate}`,
      worksheetName: 'Rentabilidad',
    });
  }, [amplitudPeriodoDias, dateRange.startDate, dateRange.endDate, mostrarAdvertencia]);

  const handleExportarClick = useCallback(async () => {
    if (exportando) return;
    setExportando(true);
    try {
      await construirYExportar(agrupacion, columnasVisiblesOrdenadas, filasFiltradas);
    } catch (error) {
      console.error('[Rentabilidad de ventas] Error al exportar', error);
      mostrarError('No se pudo exportar. Intenta nuevamente.');
    } finally {
      setExportando(false);
    }
  }, [exportando, construirYExportar, agrupacion, columnasVisiblesOrdenadas, filasFiltradas, mostrarError]);

  // Auto-exportación desde el Hub (§16) — SIEMPRE en la vista sin agrupar con columnas por
  // defecto, independiente de lo que el usuario tenga personalizado en este momento.
  const exportHandlerRef = useRef<() => Promise<void>>(async () => {});
  exportHandlerRef.current = async () => {
    await construirYExportar('sin_agrupar', columnasPorDefecto('sin_agrupar').visibles, filasFiltradas);
  };

  const { request: autoExportRequest, finish: finishAutoExport } = useAutoExportRequest('rentabilidad-ventas');
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

  return (
    <div>
      {/* Título embebido — la pestaña "Rentabilidad" de Indicadores ya cumple el rol de
          navegación/encabezado global; aquí solo se anuncia el contenido de la vista, sin
          duplicar título de página ni un segundo selector Resumen/Reportes. */}
      <div className="px-4 pt-4 md:px-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Rentabilidad de ventas</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Venta neta, costo, utilidad y margen por producto vendido.</p>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Filtros principales */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Período</p>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">Establecimiento</p>
              <select
                value={EstablecimientoId}
                onChange={(event) => setEstablecimientoId(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {establecimientoOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TarjetaIndicador label="Venta neta" valor={formatMoney(indicadores.ventaNetaTotal, monedaBase)} />
            <TarjetaIndicador label="Costo de ventas" valor={formatMoney(indicadores.costoVentaCubierto, monedaBase)} />
            <TarjetaIndicador label="Utilidad bruta" valor={formatMoney(indicadores.utilidadBrutaCubierta, monedaBase)} />
            <TarjetaIndicador
              label="Margen bruto"
              valor={indicadores.margenBrutoCubierto === null ? '—' : `${(indicadores.margenBrutoCubierto * 100).toFixed(1)}%`}
            />
          </div>

          {/* Cobertura */}
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/30">
            {indicadores.coberturaPorcentaje === null ? (
              <p className="text-slate-600 dark:text-gray-300">Sin ventas inventariables en el periodo.</p>
            ) : (
              <p className="text-slate-700 dark:text-gray-200">
                Cobertura de costo: <span className="font-semibold">{indicadores.coberturaPorcentaje.toFixed(1)}%</span>
                {' · '}Sin costo registrado: <span className="font-semibold">{indicadores.lineasSinCosto}</span>
                {' · '}No aplica a inventario: <span className="font-semibold">{indicadores.lineasNoInventariables}</span>
                {indicadores.lineasTipoCambioNoDisponible > 0 && (
                  <>{' · '}Tipo de cambio no disponible: <span className="font-semibold">{indicadores.lineasTipoCambioNoDisponible}</span></>
                )}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
              Los importes de rentabilidad se muestran en la moneda base de la empresa.
            </p>
          </div>
        </section>

        {/* Resultado operativo — Gastos operativos reconocidos en el mismo periodo/establecimiento,
            nunca insertados como filas de venta (§14). */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Resultado operativo</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <TarjetaIndicador label="Gastos operativos" valor={formatMoney(resultadoOperativo.gastosOperativosReconocidos, monedaBase)} />
            <TarjetaIndicador label={etiquetaUtilidadOperativa} valor={formatMoney(resultadoOperativo.utilidadOperativaEstimada, monedaBase)} />
            <TarjetaIndicador
              label={etiquetaMargenOperativo}
              valor={resultadoOperativo.margenOperativoEstimado === null ? '—' : `${(resultadoOperativo.margenOperativoEstimado * 100).toFixed(1)}%`}
            />
          </div>
          {!resultadoOperativo.esCompleto && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/30">
              <p className="text-slate-700 dark:text-gray-200">
                Resultado estimado: cobertura de costo de venta <span className="font-semibold">{indicadores.coberturaPorcentaje === null ? '—' : `${indicadores.coberturaPorcentaje.toFixed(1)}%`}</span>
                {indicadoresGastos.lineasSinTipoCambio > 0 && (
                  <>{' · '}Gastos sin tipo de cambio: <span className="font-semibold">{indicadoresGastos.lineasSinTipoCambio}</span></>
                )}
              </p>
            </div>
          )}
        </section>

        {/* Buscador / Agrupar / Filtros / Columnas / Exportar */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por documento, producto, cliente o vendedor..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <select
              value={agrupacion}
              onChange={(event) => setAgrupacion(event.target.value as AgrupacionRentabilidad)}
              className="h-[38px] px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {OPCIONES_AGRUPACION.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
              ))}
            </select>

            <div className="relative" ref={filtrosPanelRef}>
              <button
                type="button"
                onClick={() => setMostrarFiltros((v) => !v)}
                className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 whitespace-nowrap"
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
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Almacén</label>
                    <select
                      value={filtroAlmacen}
                      onChange={(event) => setFiltroAlmacen(event.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {almacenesDisponibles.map((almacen) => (<option key={almacen} value={almacen}>{almacen}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
                    <select
                      value={filtroCategoria}
                      onChange={(event) => setFiltroCategoria(event.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Todas</option>
                      {categoriasDisponibles.map((categoria) => (<option key={categoria} value={categoria}>{categoria}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo de documento</label>
                    <select
                      value={filtroTipoDocumento}
                      onChange={(event) => setFiltroTipoDocumento(event.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {tiposDocumentoDisponibles.map((tipo) => (<option key={tipo} value={tipo}>{tipo}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Canal</label>
                    <select
                      value={filtroCanal}
                      onChange={(event) => setFiltroCanal(event.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {canalesDisponibles.map((canal) => (<option key={canal} value={canal}>{canal}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Estado del comprobante</label>
                    <select
                      value={filtroEstadoComprobante}
                      onChange={(event) => setFiltroEstadoComprobante(event.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Todos (sin anulados)</option>
                      {ESTADOS_COMPROBANTE_FILTRO.map((estado) => (<option key={estado} value={estado}>{estado}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Estado del costo</label>
                    <select
                      value={filtroEstadoCosto}
                      onChange={(event) => setFiltroEstadoCosto(event.target.value as EstadoCostoRentabilidad | '')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {ESTADOS_COSTO_FILTRO.map((estado) => (<option key={estado} value={estado}>{ETIQUETA_ESTADO_COSTO_FILTRO[estado]}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Devolución</label>
                    <select
                      value={filtroConDevolucion}
                      onChange={(event) => setFiltroConDevolucion(event.target.value as 'todos' | 'con' | 'sin')}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="todos">Con o sin devolución</option>
                      <option value="con">Con devolución</option>
                      <option value="sin">Sin devolución</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={limpiarFiltrosAvanzados}
                    className="w-full text-center text-sm text-blue-600 hover:underline pt-1"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>

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
              onClick={() => void handleExportarClick()}
              disabled={exportando}
              className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={16} className="text-gray-400" />
              Exportar
            </button>
          </div>

          <TablaRentabilidadVentas
            modo={agrupacion}
            columnasVisibles={columnasVisiblesOrdenadas}
            filas={filasPagina}
            grupos={gruposPagina}
            monedaBase={monedaBase}
            onVerFila={setFilaSeleccionada}
          />

          {/* Paginación — aplicada DESPUÉS de filtrar/agrupar; indicadores/gráficos/Excel nunca dependen de la página visible. */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>{totalItems} resultado{totalItems === 1 ? '' : 's'}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={paginaSegura <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                Anterior
              </button>
              <span>Página {paginaSegura} de {totalPaginas}</span>
              <button
                type="button"
                disabled={paginaSegura >= totalPaginas}
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>

        {/* Análisis visual (máximo 2 gráficos) — colapsa a un único estado vacío compacto cuando
            ninguno de los dos tiene datos calculables; nunca dos tarjetas grandes vacías. */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Análisis visual</h3>
          {!hayDatosGraficables ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Sin datos para graficar en el periodo seleccionado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Utilidad bruta por periodo</p>
                {gruposPorPeriodo.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Sin datos para graficar.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={gruposPorPeriodo} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(156 163 175)" />
                      <XAxis dataKey="etiqueta" tick={{ fill: 'currentColor', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'currentColor', fontSize: 11 }} />
                      <RechartsTooltip
                        content={(props: { active?: boolean; payload?: Array<{ payload: GrupoRentabilidadVenta }> }) => {
                          const { active, payload } = props;
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-600 text-sm">
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{item.etiqueta}</div>
                                <div className="text-gray-700 dark:text-gray-300">
                                  Utilidad bruta: {item.utilidadBrutaBase === null ? '—' : formatMoney(item.utilidadBrutaBase, monedaBase)}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="utilidadBrutaBase" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Margen bruto por producto</p>
                {gruposPorProducto.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10">Sin datos para graficar.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={gruposPorProducto} layout="vertical" margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(156 163 175)" />
                      <XAxis type="number" tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`} tick={{ fill: 'currentColor', fontSize: 11 }} />
                      <YAxis type="category" dataKey="etiqueta" width={120} tick={{ fill: 'currentColor', fontSize: 10 }} />
                      <RechartsTooltip
                        content={(props: { active?: boolean; payload?: Array<{ payload: GrupoRentabilidadVenta }> }) => {
                          const { active, payload } = props;
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-200 dark:border-gray-600 text-sm">
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{item.etiqueta}</div>
                                <div className="text-gray-700 dark:text-gray-300">
                                  Margen bruto: {item.margenBruto === null ? '—' : `${(item.margenBruto * 100).toFixed(1)}%`}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="margenBruto" fill="#2563eb" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {filaSeleccionada && (
        <ModalDetalleRentabilidadVenta
          fila={filaSeleccionada}
          ajustesRelacionados={ajustesDeFilaSeleccionada}
          monedaBase={monedaBase}
          movimientos={movimientos}
          consumos={consumos}
          capas={capas}
          onCerrar={() => setFilaSeleccionada(null)}
          onVerComprobante={() => navigate('/comprobantes')}
        />
      )}
    </div>
  );
};

export default RentabilidadVentasPage;
