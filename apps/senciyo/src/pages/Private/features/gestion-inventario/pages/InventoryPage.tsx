// src/features/inventario/pages/InventoryPage.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MovimientoStock } from '../models';
import { Download, Settings } from 'lucide-react';
import { useInventory } from '../hooks';
import MovementsTable from '../components/tables/MovementsTable';
import AdjustmentModal from '../components/modals/AdjustmentModal';
import PanelImportacionStock from '../components/PanelImportacionStock';
import TransferModal from '../components/modals/TransferModal';
import TransferenciasPanel from '../components/transferencias/TransferenciasPanel';
import AlertsPanel from '../components/panels/AlertsPanel';
import InventarioSituacionPage from '../components/disponibilidad/InventarioSituacionPage';
import NotasIngresoPanel from '../components/notas-ingreso/NotasIngresoPanel';
import NotasSalidaPanel from '../components/notas-salida/NotasSalidaPanel';
import CintilloControlStock from '../components/CintilloControlStock';
import { PageHeader } from '@/contasis';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { cargarXlsx } from '@/shared/export/cargarLibreriasExcel';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { formatBusinessDateTimeLocal, getBusinessTodayISODate } from '@/shared/time/businessTime';
import { useFocusFromQuery } from '../../../../../hooks/useFocusFromQuery';
import { useAutoExportRequest } from '@/shared/export/useAutoExportRequest';
import { REPORTS_HUB_PATH } from '@/shared/export/autoExportParams';
import { inferirFuente } from '../utils/inventory.helpers';
import { getTenantEmpresaId, lsKey } from '@/shared/tenant';
import { currencyManager, formatMoney } from '@/shared/currency';
import { esValorizacionActiva, resolverModoInventario, resolverEstadoVisualInventario } from '../utils/estadoActivacionValorizacionInventario';
import { proyectarKardexValorizado } from '../services/consultaKardexValorizado.service';
import ColumnsManager, { type ColumnsManagerColumn } from '@/shared/columns/ColumnsManager';
import { useUserSession } from '@/contexts/UserSessionContext';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../../configuracion-sistema/utilidades/permisos';

/**
 * Corrección final Etapa 5 — el ColumnsManager de Movimientos administra TODAS las columnas
 * configurables: las 8 operativas actuales (visibles por defecto, conservando la experiencia de
 * hoy) más las 2 valorizadas (apagadas por defecto, solo ofrecidas cuando la valorización permite
 * consulta oficial). "Producto" y "Ver" quedan fijas — mismo criterio que usa Compras para sus
 * columnas de identidad/acción (`comprobante`/`acciones`: excluidas del popover, siempre visibles)
 * — nunca configurables ni ocultables.
 */
type ColumnaMovimientoOperativa = 'fecha' | 'tipo' | 'motivo' | 'almacen' | 'cantidad' | 'stock' | 'documento' | 'usuario';
type ColumnaMovimientoValorizada = 'costoUnitario' | 'valorMovimiento';
type ColumnaMovimientoConfigurable = ColumnaMovimientoOperativa | ColumnaMovimientoValorizada;

// §8 de la centralización: el header debe mostrar los mismos 5 estados reales que
// `/configuracion/inventario` (nunca "Inventario: Inactivo" si está contradicho por el estado
// real) — misma fuente `resolverEstadoVisualInventario`, nunca un cálculo local nuevo.
const ETIQUETA_ESTADO_VISUAL_INVENTORY_PAGE: Record<ReturnType<typeof resolverEstadoVisualInventario>, string> = {
  pendiente: 'Pendiente de configurar',
  inactivo: 'Inactivo',
  cuantitativo_activo: 'Activo',
  valorizado_activo: 'Activo · Valorizado FIFO',
  requiere_atencion: 'Requiere atención',
};
const CLASE_ESTADO_VISUAL_INVENTORY_PAGE: Record<ReturnType<typeof resolverEstadoVisualInventario>, string> = {
  pendiente: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400',
  inactivo: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300',
  cuantitativo_activo: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400',
  valorizado_activo: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400',
  requiere_atencion: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400',
};

const ETIQUETA_COLUMNA_MOVIMIENTO: Record<ColumnaMovimientoConfigurable, string> = {
  fecha: 'Fecha',
  tipo: 'Tipo',
  motivo: 'Motivo',
  almacen: 'Almacén',
  cantidad: 'Cantidad',
  stock: 'Stock',
  documento: 'Documento / Referencia',
  usuario: 'Usuario',
  costoUnitario: 'Costo unitario',
  valorMovimiento: 'Valor del movimiento',
};

const COLUMNAS_OPERATIVAS_MOVIMIENTO: ColumnaMovimientoOperativa[] = ['fecha', 'tipo', 'motivo', 'almacen', 'cantidad', 'stock', 'documento', 'usuario'];
const COLUMNAS_VALORIZADAS_MOVIMIENTO: ColumnaMovimientoValorizada[] = ['costoUnitario', 'valorMovimiento'];
const ORDEN_COLUMNAS_MOVIMIENTO_POR_DEFECTO: ColumnaMovimientoConfigurable[] = [...COLUMNAS_OPERATIVAS_MOVIMIENTO, ...COLUMNAS_VALORIZADAS_MOVIMIENTO];

const CLAVE_COLUMNAS_MOVIMIENTOS = 'inventario_movimientos_tabla_columnas';
// v2: el esquema pasó de 2 columnas configurables (solo valorizadas) a 10 (operativas + valorizadas)
// en la corrección final — un valor v1 persistido no es compatible con este arreglo más amplio.
const VERSION_COLUMNAS_MOVIMIENTOS = 'v2';

interface PreferenciaColumnasMovimientos {
  visibles: ColumnaMovimientoConfigurable[];
  orden: ColumnaMovimientoConfigurable[];
}

/** Operativas visibles por defecto (conserva exactamente la experiencia actual); valorizadas apagadas por defecto. */
const PREFERENCIA_COLUMNAS_POR_DEFECTO: PreferenciaColumnasMovimientos = {
  visibles: [...COLUMNAS_OPERATIVAS_MOVIMIENTO],
  orden: ORDEN_COLUMNAS_MOVIMIENTO_POR_DEFECTO,
};

function esColumnaMovimientoValida(valor: unknown): valor is ColumnaMovimientoConfigurable {
  return typeof valor === 'string' && (ORDEN_COLUMNAS_MOVIMIENTO_POR_DEFECTO as string[]).includes(valor);
}

function esColumnaValorizadaEspecifica(id: ColumnaMovimientoConfigurable): id is ColumnaMovimientoValorizada {
  return id === 'costoUnitario' || id === 'valorMovimiento';
}

/**
 * Carga tenantizada (mismo mecanismo `lsKey` ya usado en el resto del feature) — nunca una clave
 * de localStorage sin espacio de tenant. No exportada: `react-refresh/only-export-components`
 * prohíbe exportar funciones/constantes junto al componente de página desde el mismo archivo —
 * crear un archivo nuevo solo para esto excedería el único archivo productivo nuevo permitido en
 * esta etapa (`consultaKardexValorizado.service.ts`). Sin prueba unitaria directa por esa misma
 * razón; ver el informe final.
 */
function cargarPreferenciaColumnasMovimientos(empresaId: string): PreferenciaColumnasMovimientos {
  try {
    const claveVersion = lsKey(`${CLAVE_COLUMNAS_MOVIMIENTOS}_version`, empresaId);
    const claveDatos = lsKey(CLAVE_COLUMNAS_MOVIMIENTOS, empresaId);
    if (localStorage.getItem(claveVersion) !== VERSION_COLUMNAS_MOVIMIENTOS) {
      localStorage.setItem(claveVersion, VERSION_COLUMNAS_MOVIMIENTOS);
      localStorage.setItem(claveDatos, JSON.stringify(PREFERENCIA_COLUMNAS_POR_DEFECTO));
      return PREFERENCIA_COLUMNAS_POR_DEFECTO;
    }
    const raw = localStorage.getItem(claveDatos);
    if (!raw) {
      return PREFERENCIA_COLUMNAS_POR_DEFECTO;
    }
    const parsed = JSON.parse(raw) as Partial<PreferenciaColumnasMovimientos>;
    const visibles = Array.isArray(parsed.visibles) ? parsed.visibles.filter(esColumnaMovimientoValida) : [];
    const ordenGuardado = Array.isArray(parsed.orden) ? parsed.orden.filter(esColumnaMovimientoValida) : [];
    const orden = ORDEN_COLUMNAS_MOVIMIENTO_POR_DEFECTO.filter((id) => !ordenGuardado.includes(id));
    return { visibles, orden: [...ordenGuardado, ...orden] };
  } catch {
    return PREFERENCIA_COLUMNAS_POR_DEFECTO;
  }
}

function guardarPreferenciaColumnasMovimientos(empresaId: string, preferencia: PreferenciaColumnasMovimientos): void {
  try {
    localStorage.setItem(lsKey(`${CLAVE_COLUMNAS_MOVIMIENTOS}_version`, empresaId), VERSION_COLUMNAS_MOVIMIENTOS);
    localStorage.setItem(lsKey(CLAVE_COLUMNAS_MOVIMIENTOS, empresaId), JSON.stringify(preferencia));
  } catch {
    // Persistencia best-effort — un fallo de almacenamiento nunca debe romper la tabla de Movimientos.
  }
}

const formatMovementTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatBusinessDateTimeLocal(date).replace('T', ' ');
};

/**
 * Página principal del módulo de inventario
 * Gestiona todo el control de stock, movimientos, alertas y transferencias
 */
export const InventoryPage: React.FC = () => {
  useFocusFromQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const { state: configState, rolesConfigurados } = useConfigurationContext();
  const { session } = useUserSession();
  const controlStockActivo = configState.salesPreferences.controlStockActivo ?? false;
  const estadoValorizacion = configState.preferenciasInventario.estadoValorizacion;
  // VAL-P1-001: las columnas/exportación valorizadas de Movimientos exigen el permiso específico
  // además de que la valorización esté activa — misma fuente de verdad (`tienePermiso`) que el
  // resto del módulo, nunca una segunda lista de permisos local a esta pantalla.
  const usuarioActualInventario = obtenerUsuarioDesdeSesion(configState.users, session);
  const puedeVerCostosInventario = tienePermiso({
    usuario: usuarioActualInventario,
    permisoId: 'inventario.costos.ver',
    rolesDisponibles: rolesConfigurados,
    establecimientoId: session?.currentEstablecimientoId,
  });
  const puedeConsultarValorizado = esValorizacionActiva(estadoValorizacion) && puedeVerCostosInventario;
  const empresaId = getTenantEmpresaId();
  const modoInventario = resolverModoInventario(controlStockActivo, estadoValorizacion);
  const estadoVisualInventario = resolverEstadoVisualInventario(modoInventario, estadoValorizacion, configState.preferenciasInventario.inventarioConfiguradoAlgunaVez);
  // §8 de la centralización: "Configurar inventario" es solo un atajo hacia la única fuente de
  // verdad (`/configuracion/inventario`) — nunca abre una implementación distinta. `returnTo`
  // permite volver exactamente a esta pantalla de Inventario.
  const irAConfigurarInventario = useCallback(() => {
    navigate(`/configuracion/inventario?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
  }, [navigate, location.pathname, location.search]);
  const [preferenciaColumnasMovimientos, setPreferenciaColumnasMovimientos] = useState<PreferenciaColumnasMovimientos>(
    () => cargarPreferenciaColumnasMovimientos(empresaId)
  );

  useEffect(() => {
    guardarPreferenciaColumnasMovimientos(empresaId, preferenciaColumnasMovimientos);
  }, [empresaId, preferenciaColumnasMovimientos]);

  // Corrección final Etapa 5: columnas configurables efectivamente visibles, en el orden a
  // renderizar — operativas siempre elegibles; valorizadas solo cuando la valorización permite
  // consulta oficial (nunca se filtran las operativas por estadoValorizacion).
  const columnasVisiblesOrdenadas = useMemo(
    () =>
      preferenciaColumnasMovimientos.orden.filter((id) => {
        if (!preferenciaColumnasMovimientos.visibles.includes(id)) return false;
        if (esColumnaValorizadaEspecifica(id) && !puedeConsultarValorizado) return false;
        return true;
      }),
    [puedeConsultarValorizado, preferenciaColumnasMovimientos]
  );

  // Corrección final Etapa 5: el ColumnsManager de Movimientos siempre muestra las columnas
  // operativas (nunca "No hay columnas configurables" — siempre existen las 8 operativas); las 2
  // valorizadas solo se agregan al menú cuando la valorización permite consulta oficial. "Producto"
  // y "Ver" se incluyen como fijas (mismo criterio que Compras) — ColumnsManager las excluye del
  // popover automáticamente.
  const columnasManagerMovimientos: ColumnsManagerColumn[] = useMemo(() => {
    const configurables = preferenciaColumnasMovimientos.orden
      .filter((id) => !esColumnaValorizadaEspecifica(id) || puedeConsultarValorizado)
      .map((id) => ({
        id,
        label: ETIQUETA_COLUMNA_MOVIMIENTO[id],
        visible: preferenciaColumnasMovimientos.visibles.includes(id),
      }));
    return [
      { id: 'producto', label: 'Producto', visible: true, fixed: true },
      ...configurables,
      { id: 'ver', label: 'Ver', visible: true, fixed: true },
    ];
  }, [puedeConsultarValorizado, preferenciaColumnasMovimientos]);

  const alternarColumnaMovimiento = useCallback((columnId: string) => {
    if (!esColumnaMovimientoValida(columnId)) return;
    setPreferenciaColumnasMovimientos((prev) => ({
      ...prev,
      visibles: prev.visibles.includes(columnId)
        ? prev.visibles.filter((id) => id !== columnId)
        : [...prev.visibles, columnId],
    }));
  }, []);

  const restablecerColumnasMovimientos = useCallback(() => {
    setPreferenciaColumnasMovimientos(PREFERENCIA_COLUMNAS_POR_DEFECTO);
  }, []);

  const seleccionarTodasColumnasMovimientos = useCallback(() => {
    setPreferenciaColumnasMovimientos((prev) => ({ ...prev, visibles: [...prev.orden] }));
  }, []);

  const reordenarColumnasMovimientos = useCallback((sourceId: string, targetId: string) => {
    if (!esColumnaMovimientoValida(sourceId) || !esColumnaMovimientoValida(targetId)) return;
    setPreferenciaColumnasMovimientos((prev) => {
      const sourceIndex = prev.orden.indexOf(sourceId);
      const targetIndex = prev.orden.indexOf(targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const siguienteOrden = [...prev.orden];
      const [movido] = siguienteOrden.splice(sourceIndex, 1);
      siguienteOrden.splice(targetIndex, 0, movido);
      return { ...prev, orden: siguienteOrden };
    });
  }, []);
  const {
    selectedView,
    filterPeriodo,
    almacenFiltro,
    showAdjustmentModal,
    showTransferModal,
    selectedProductId,
    suggestedQuantity,
    prefilledAlmacenId,
    adjustmentMode,
    almacenes,
    stockAlerts,
    filteredMovements,
    transferencias,
    establecimientoActualId,
    puedeTransferir,

    setSelectedView,
    setFilterPeriodo,
    setalmacenFiltro,
    setShowTransferModal,

    handleStockAdjustment,
    handleCreateTransfer,
    handleDespacharTransfer,
    handleRecibirTransfer,
    handleCancelarTransfer,
    handleAnularTransfer,
    openAdjustmentModal,
    closeAdjustmentModal,
    openTransferModal,
    reloadMovements,
  } = useInventory();

  useEffect(() => {
    if ((location.state as { tab?: string } | null)?.tab === 'notas-salida') {
      setSelectedView('notas-salida');
    }
  // Solo al montar — el tab inicial se lee una sola vez del router state
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { request: stockAutoExportRequest, finish: finishStockAutoExport } = useAutoExportRequest('inventario-stock');
  const { request: movementsAutoExportRequest, finish: finishMovementsAutoExport } = useAutoExportRequest('inventario-movimientos');
  const movementsAutoExportHandledRef = useRef(false);
  const exportHandlerRef = useRef<() => void>(() => {});
  const [exportandoMovimientos, setExportandoMovimientos] = useState(false);
  const { error: mostrarError } = useFeedback();

  // Almacena los movimientos visibles en la tabla (respetando filtros de tipo y búsqueda)
  const movimientosFiltradosVisiblesRef = useRef<MovimientoStock[]>([]);
  const handleMovimientosFiltradosChange = useCallback((movs: MovimientoStock[]) => {
    movimientosFiltradosVisiblesRef.current = movs;
  }, []);

  /**
   * Exporta movimientos a Excel.
   * Usa los movimientos visibles en la tabla (respeta filtros de tipo y búsqueda)
   * si la tabla ya fue montada; de lo contrario usa el período/almacén del hook.
   */
  // Ancho de columna por encabezado — mismo criterio ya usado (SheetJS `!cols` posicional), ahora
  // indexado por nombre porque el conjunto de columnas presentes varía según "Columnas".
  const ANCHO_COLUMNA_EXCEL: Record<string, number> = {
    'Fecha': 20, 'Producto': 30, 'Código Producto': 15, 'Tipo': 16, 'Motivo': 22, 'Fuente': 22,
    'Movimiento': 12, 'Saldo Anterior': 14, 'Saldo Final': 12, 'Almacén': 25, 'Código Almacén': 14,
    'Establecimiento': 28, 'Usuario': 20, 'Documento / Ref.': 24, 'Observaciones': 45,
    'Es Transferencia': 15, 'Transferencia ID': 24, 'Tipo Transferencia': 22, 'Almacén Origen': 25, 'Almacén Destino': 25,
    'Costo unitario': 18, 'Valor del movimiento': 18,
  };

  /**
   * Corrección final Etapa 5, §5: la exportación respeta la selección de TODAS las columnas
   * configurables (no solo las valorizadas) — mismo botón, mismo handler, misma librería. Cada
   * columna operativa toggleable controla su(s) columna(s) reales del Excel; "Producto" (+ Código
   * Producto) es fija y siempre se exporta, igual que "Fuente"/"Observaciones"/los campos de
   * transferencia (enriquecimiento del export que nunca estuvo atado a "Columnas"). Reutiliza
   * EXACTAMENTE la misma proyección que la tabla y el detalle para las 2 columnas valorizadas —
   * nunca un cálculo de costo distinto para la exportación.
   */
  const handleExportToExcel = async () => {
    if (exportandoMovimientos) {
      return;
    }
    setExportandoMovimientos(true);
    try {
    const XLSX = await cargarXlsx();
    const baseMovements = movimientosFiltradosVisiblesRef.current.length > 0
      ? movimientosFiltradosVisiblesRef.current
      : filteredMovements;

    const esVisible = (id: ColumnaMovimientoConfigurable) => columnasVisiblesOrdenadas.includes(id);
    const incluyeCostos = esVisible('costoUnitario') || esVisible('valorMovimiento');
    const proyeccionCostos = incluyeCostos
      ? proyectarKardexValorizado({ empresaId, movimientos: baseMovements })
      : undefined;
    const monedaBaseActual = currencyManager.getSnapshot().baseCurrency.code;

    /** Construye las entradas [encabezado, valor] de una fila, en el ORDEN exacto de columnas del archivo — determinista independientemente de si hay 0 o más movimientos. */
    const construirEntradasFila = (mov: MovimientoStock): Array<[string, string | number]> => {
      const entradas: Array<[string, string | number]> = [];
      if (esVisible('fecha')) entradas.push(['Fecha', formatMovementTimestamp(mov.fecha)]);
      entradas.push(['Producto', mov.productoNombre], ['Código Producto', mov.productoCodigo]);
      if (esVisible('tipo')) entradas.push(['Tipo', mov.tipo]);
      if (esVisible('motivo')) entradas.push(['Motivo', mov.motivo]);
      entradas.push(['Fuente', inferirFuente(mov)]);
      if (esVisible('cantidad')) entradas.push(['Movimiento', mov.cantidad]);
      if (esVisible('stock')) entradas.push(['Saldo Anterior', mov.cantidadAnterior], ['Saldo Final', mov.cantidadNueva]);
      if (esVisible('almacen')) {
        entradas.push(
          ['Almacén', mov.almacenNombre || ''],
          ['Código Almacén', mov.almacenCodigo || ''],
          ['Establecimiento', mov.EstablecimientoNombre || '']
        );
      }
      if (esVisible('usuario')) entradas.push(['Usuario', mov.usuario]);
      if (esVisible('documento')) entradas.push(['Documento / Ref.', mov.documentoReferencia || '']);
      entradas.push(
        ['Observaciones', mov.observaciones || ''],
        ['Es Transferencia', mov.esTransferencia ? 'Sí' : 'No'],
        ['Transferencia ID', mov.transferenciaId || ''],
        ['Tipo Transferencia', mov.tipoTransferencia || ''],
        ['Almacén Origen', mov.almacenOrigenNombre || ''],
        ['Almacén Destino', mov.almacenDestinoNombre || '']
      );
      if (incluyeCostos) {
        const proyectado = proyeccionCostos?.get(mov.id);
        const tieneValor = proyectado?.tieneValorizacion ?? false;
        if (esVisible('costoUnitario')) {
          entradas.push(['Costo unitario', tieneValor && proyectado?.costoUnitario !== undefined
            ? formatMoney(proyectado.costoUnitario, proyectado?.monedaBase ?? monedaBaseActual)
            : '—']);
        }
        if (esVisible('valorMovimiento')) {
          entradas.push(['Valor del movimiento', tieneValor && proyectado?.valorMovimiento !== undefined
            ? formatMoney(proyectado.valorMovimiento, proyectado?.monedaBase ?? monedaBaseActual)
            : '—']);
        }
      }
      return entradas;
    };

    // Encabezados calculados con la MISMA lógica de visibilidad, independiente de `baseMovements`
    // (nunca depende de si hay 0 o más filas) — SheetJS ordena las columnas según este arreglo.
    const headers: string[] = [];
    if (esVisible('fecha')) headers.push('Fecha');
    headers.push('Producto', 'Código Producto');
    if (esVisible('tipo')) headers.push('Tipo');
    if (esVisible('motivo')) headers.push('Motivo');
    headers.push('Fuente');
    if (esVisible('cantidad')) headers.push('Movimiento');
    if (esVisible('stock')) headers.push('Saldo Anterior', 'Saldo Final');
    if (esVisible('almacen')) headers.push('Almacén', 'Código Almacén', 'Establecimiento');
    if (esVisible('usuario')) headers.push('Usuario');
    if (esVisible('documento')) headers.push('Documento / Ref.');
    headers.push('Observaciones', 'Es Transferencia', 'Transferencia ID', 'Tipo Transferencia', 'Almacén Origen', 'Almacén Destino');
    if (incluyeCostos) {
      if (esVisible('costoUnitario')) headers.push('Costo unitario');
      if (esVisible('valorMovimiento')) headers.push('Valor del movimiento');
    }

    const data = baseMovements.map((mov) => Object.fromEntries(construirEntradasFila(mov)));

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    ws['!cols'] = headers.map((header) => ({ wch: ANCHO_COLUMNA_EXCEL[header] ?? 18 }));

    const fileName = incluyeCostos
      ? `movimientos_costos_${getBusinessTodayISODate()}.xlsx`
      : `movimientos_stock_${getBusinessTodayISODate()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('[Inventario] Error al exportar movimientos', error);
      mostrarError('No se pudo exportar los movimientos. Intenta nuevamente.');
    } finally {
      setExportandoMovimientos(false);
    }
  };

  exportHandlerRef.current = handleExportToExcel;

  useEffect(() => {
    if (!stockAutoExportRequest) {
      return;
    }

    if (selectedView !== 'situacion') {
      setSelectedView('situacion');
    }
  }, [selectedView, setSelectedView, stockAutoExportRequest]);

  useEffect(() => {
    if (!movementsAutoExportRequest || movementsAutoExportHandledRef.current) {
      return;
    }

    if (selectedView !== 'movimientos') {
      setSelectedView('movimientos');
      return;
    }

    movementsAutoExportHandledRef.current = true;
    const runAutoExport = async () => {
      try {
        await Promise.resolve(exportHandlerRef.current());
      } finally {
        finishMovementsAutoExport(REPORTS_HUB_PATH);
      }
    };

    void runAutoExport();
  }, [finishMovementsAutoExport, movementsAutoExportRequest, selectedView, setSelectedView]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <h1 className="text-h3 font-poppins text-primary truncate">Inventario</h1>
            <span
              title={ETIQUETA_ESTADO_VISUAL_INVENTORY_PAGE[estadoVisualInventario]}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${CLASE_ESTADO_VISUAL_INVENTORY_PAGE[estadoVisualInventario]}`}
            >
              {ETIQUETA_ESTADO_VISUAL_INVENTORY_PAGE[estadoVisualInventario]}
            </span>
            {modoInventario !== 'inactivo' && (
              <button
                title="Editar configuración de inventario"
                onClick={irAConfigurarInventario}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      />

      {/* Tabs de navegación - REDISEÑADOS CON PRIMARIO #6F36FF */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex space-x-1">
          {/* Situación Actual */}
          <button
            onClick={() => setSelectedView('situacion')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'situacion'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Stock Actual</span>
          </button>

          {/* Movimientos */}
          <button
            onClick={() => setSelectedView('movimientos')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'movimientos'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Movimientos</span>
          </button>

          {/* Transferencias */}
          <button
            onClick={() => setSelectedView('transferencias')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'transferencias'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Transferencias</span>
          </button>

          {/* Alertas */}
          <button
            onClick={() => setSelectedView('alertas')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'alertas'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Alertas</span>
            {stockAlerts.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[#EF4444] text-white shadow-sm">
                {stockAlerts.length}
              </span>
            )}
          </button>

          {/* Importar stock */}
          <button
            onClick={() => setSelectedView('importar')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'importar'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Importar stock</span>
          </button>

          {/* Notas de Ingreso */}
          <button
            onClick={() => setSelectedView('notas-ingreso')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'notas-ingreso'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Notas de Ingreso</span>
          </button>

          {/* Notas de Salida */}
          <button
            onClick={() => setSelectedView('notas-salida')}
            className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
              selectedView === 'notas-salida'
                ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Notas de Salida</span>
          </button>
        </div>
      </div>

      {/* Banner: control de inventario inactivo */}
      {!controlStockActivo && (
        <CintilloControlStock
          onConfigurar={irAConfigurarInventario}
          yaConfiguradoAntes={configState.preferenciasInventario.inventarioConfiguradoAlgunaVez}
        />
      )}

      {/* Barra de acciones — solo aplica en Movimientos */}
      {selectedView === 'movimientos' && (
        <div className="bg-white dark:bg-gray-800 border-b border-[#E5E7EB] dark:border-gray-700 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de período */}
            <select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value as 'hoy' | 'semana' | 'mes' | 'todo')}
              className="h-9 px-3 py-2 border border-[#E5E7EB] dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 dark:focus:ring-[#8B5CF6]/35 transition-all duration-150"
            >
              <option value="hoy">Hoy</option>
              <option value="semana">Última semana</option>
              <option value="mes">Último mes</option>
              <option value="todo">Todos</option>
            </select>

            {/* Filtro de almacén */}
            <select
              value={almacenFiltro}
              onChange={(e) => setalmacenFiltro(e.target.value)}
              className="h-9 px-3 py-2 border border-[#E5E7EB] dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 dark:focus:ring-[#8B5CF6]/35 transition-all duration-150"
            >
              <option value="todos">Todos los almacenes</option>
              {almacenes.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.nombreAlmacen}
                </option>
              ))}
            </select>

            <div className="flex-1" />

            {/* Cierre puntual Etapa 5, §1: "Columnas" permanece disponible en todos los estados
                para personalizar las columnas operativas de Movimientos — nunca se oculta el
                botón entero solo porque la valorización todavía no está activa. Lo que sí varía
                por estado es qué columnas ofrece el menú (ver columnasManagerMovimientos). */}
            <ColumnsManager
              columns={columnasManagerMovimientos}
              onToggleColumn={alternarColumnaMovimiento}
              onResetColumns={restablecerColumnasMovimientos}
              onSelectAllColumns={seleccionarTodasColumnasMovimientos}
              onReorderColumns={reordenarColumnasMovimientos}
              buttonLabel="Columnas"
              title="Columnas de Movimientos"
            />

            <button
              onClick={handleExportToExcel}
              disabled={exportandoMovimientos}
              className="inline-flex items-center h-9 px-4 py-2 bg-[#6F36FF] text-white text-sm font-medium rounded-lg hover:bg-[#6F36FF]/90 dark:bg-[#8B5CF6] dark:hover:bg-[#8B5CF6]/90 transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </button>

            <button
              onClick={openTransferModal}
              className="inline-flex items-center h-9 px-4 py-2 text-[#6F36FF] dark:text-[#8B5CF6] bg-white dark:bg-gray-800 border border-[#6F36FF]/30 dark:border-[#8B5CF6]/30 hover:bg-[#6F36FF]/5 dark:hover:bg-[#8B5CF6]/10 text-sm font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            >
              Transferir Stock
            </button>

            <button
              onClick={() => openAdjustmentModal('', 0)}
              className="inline-flex items-center h-9 px-4 py-2 text-[#6F36FF] dark:text-[#8B5CF6] bg-white dark:bg-gray-800 border border-[#6F36FF]/30 dark:border-[#8B5CF6]/30 hover:bg-[#6F36FF]/5 dark:hover:bg-[#8B5CF6]/10 text-sm font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            >
              + Ajustar Stock
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className={`flex-1 overflow-auto ${selectedView === 'situacion' || selectedView === 'transferencias' || selectedView === 'importar' || selectedView === 'notas-ingreso' || selectedView === 'notas-salida' ? '' : 'p-6'}`}>
        {selectedView === 'situacion' && (
          <InventarioSituacionPage
            autoExportRequest={stockAutoExportRequest}
            onAutoExportFinished={finishStockAutoExport}
            onActualizacionMasiva={() => setSelectedView('importar')}
            onTransferir={openTransferModal}
            onAjustar={() => openAdjustmentModal('', 0)}
            onAjustarProducto={openAdjustmentModal}
          />
        )}

        {selectedView === 'movimientos' && (
          <MovementsTable
            movimientos={filteredMovements}
            almacenFiltro={almacenFiltro}
            onFilteredDataChange={handleMovimientosFiltradosChange}
            columnasVisibles={columnasVisiblesOrdenadas}
          />
        )}

        {selectedView === 'transferencias' && (
          <TransferenciasPanel
            transferencias={transferencias}
            onNuevaTransferencia={openTransferModal}
            onDespachar={handleDespacharTransfer}
            onRecibir={handleRecibirTransfer}
            onCancelar={handleCancelarTransfer}
            onAnular={handleAnularTransfer}
            currentEstablecimientoId={establecimientoActualId}
            puedeTransferir={puedeTransferir}
          />
        )}

        {selectedView === 'alertas' && (
          <AlertsPanel
            alertas={stockAlerts}
            onReabastecerProducto={openAdjustmentModal}
          />
        )}

        {selectedView === 'importar' && (
          <PanelImportacionStock onRecargarMovimientos={reloadMovements} />
        )}

        {selectedView === 'notas-ingreso' && (
          <NotasIngresoPanel />
        )}

        {selectedView === 'notas-salida' && (
          <NotasSalidaPanel />
        )}
      </div>

      {/* Modal configuración de inventario */}
      {/* Modales */}
      <AdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={closeAdjustmentModal}
        onAdjust={handleStockAdjustment}
        preSelectedProductId={selectedProductId}
        preSelectedQuantity={suggestedQuantity}
        prefilledAlmacenId={prefilledAlmacenId}
        mode={adjustmentMode}
      />

      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleCreateTransfer}
      />
    </div>
  );
};

export default InventoryPage;

