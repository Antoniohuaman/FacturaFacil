import { useState, useMemo, useCallback, useEffect, useRef, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck, PackageMinus } from 'lucide-react';
import {
  Plus, Search, MoreHorizontal, Edit3, Copy, Ban, Trash2, Eye,
  ChevronLeft, ChevronRight, X, Printer, Share2, Download,
  Mail, MessageCircle, ClipboardCopy, SlidersHorizontal,
} from 'lucide-react';
import { EstadoDocumentoBadge } from './EstadoDocumentoBadge';
import { DocumentoComercialPrintView } from './DocumentoComercialPrintView';
import { useDocumentosComercialesContext } from '../contexts/DocumentosComercialesContext';
import { useDocumentoComercialActions } from '../hooks/useDocumentoComercialActions';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { SalesPreferences } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useNotasSalida } from '../../gestion-inventario/hooks/useNotasSalida';
import type { LineaNotaSalida, DocumentoComercialOrigenNS } from '../../gestion-inventario/models/notaSalida.types';
import type { CartItem } from '../../comprobantes-electronicos/models/comprobante.types';
import { useTenant } from '@/shared/tenant/TenantContext';
import { exportDatasetToExcel } from '@/shared/export/exportToExcel';
import { tryLsKey } from '@/shared/tenant';
import { imprimirComprobante } from '@/shared/impresion/ServicioImpresionComprobante';
import {
  validarOVParaConversion,
  construirCargaConversionDesdeOV,
  refrescarStockItem,
} from '../utils/convertirOVaComprobante';
import type {
  TipoDocumentoComercial,
  DocumentoComercial,
  EstadoDocumentoComercial,
} from '../models/documentoComercial.types';
import {
  TIPO_DOCUMENTO_COMERCIAL_NUEVA,
  TIPO_DOCUMENTO_COMERCIAL_LABELS,
  ESTADOS_POR_TIPO,
  COLUMNA_NUMERO_LABELS,
} from '../models/documentoComercial.constants';
import {
  formatearNumeroDocumento,
  formatearNumeroParaBorrador,
  obtenerSimboloMoneda,
  formatearDocumentoCliente,
  calcularDesgloseTributos,
} from '../utils/documentoComercial.helpers';
import { calcularReservasPendientes } from '@/shared/documentosComerciales/postEmisionOrdenVenta';
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
import { calculateRequiredUnidadMinima } from '@/shared/inventory/stockGateway';
import { resolveUnidadMinima } from '@/shared/inventory/unitConversion';

interface ListadoDocumentosComercialesProps {
  tipo: TipoDocumentoComercial;
  /** Si se provee, auto-abre el drawer de detalle para ese documento al montar. */
  abrirDetalleId?: string;
}

interface ColumnaDef {
  id: string;
  label: string;
  visible: boolean;
}

const COLUMNAS_DEFAULT: Omit<ColumnaDef, 'visible'>[] = [
  { id: 'numero', label: 'N° Documento' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'docCliente', label: 'N° Doc. Cliente' },
  { id: 'fechaEmision', label: 'F. Emisión' },
  { id: 'fechaVencimiento', label: 'F. Vencimiento' },
  { id: 'formaPago', label: 'Forma de pago' },
  { id: 'moneda', label: 'Moneda' },
  { id: 'total', label: 'Total' },
  { id: 'estado', label: 'Estado' },
  { id: 'usuario', label: 'Usuario' },
  { id: 'metodoEnvio', label: 'Método de envío' },
  { id: 'fechaEnvio', label: 'F. Envío previsto' },
  { id: 'requiereAprobacion', label: 'Req. aprobación' },
  { id: 'docRelacionado', label: 'Doc. relacionado' },
];

const COLUMNAS_VISIBLES_DEFAULT = new Set([
  'numero', 'cliente', 'docCliente', 'fechaEmision', 'fechaVencimiento',
  'moneda', 'total', 'estado', 'usuario',
]);

const OPCIONES_REGISTROS = [10, 25, 50];

function buildLineasNSDesdeCartItems(items: CartItem[]): LineaNotaSalida[] {
  const allProducts = useProductStore.getState().allProducts;
  return items
    .filter((item) => item.tipoBienServicio !== 'servicio' && item.tipoDetalle !== 'libre')
    .map((item, idx) => {
      const producto = allProducts.find((p) => p.codigo === item.code);
      const cantidad = producto
        ? calculateRequiredUnidadMinima({
            product: producto,
            quantity: item.quantity,
            unitCode: item.presentacionId || item.unidadMedida || item.unit,
          })
        : (Number.isFinite(item.quantity) ? Number(item.quantity) : 0);
      const pvUnitario = item.price;
      const subtotal = item.subtotal ?? pvUnitario * item.quantity;
      const igv = item.igv ?? 0;
      const total = item.total ?? subtotal + igv;
      return {
        id: `ln_${item.code}_${idx}`,
        productoId: item.id,
        productoCodigo: item.code,
        productoNombre: item.name,
        tipoBienServicio: item.tipoBienServicio ?? 'bien',
        unidad: item.unidadMedida ?? 'NIU',
        unidadCodigo: item.unidadMedidaCodigo ?? 'NIU',
        impuesto: item.impuesto ?? item.impuestoId,
        cantidad,
        pvUnitario,
        subtotal,
        igv,
        total,
      };
    });
}

function puedeGenerarNS(
  doc: DocumentoComercial,
  salesPreferences: SalesPreferences | undefined,
  controlStockActivo: boolean,
): boolean {
  if (doc.esBorrador || doc.estado === 'Anulada') return false;
  if (doc.tipo === 'orden_venta') {
    if (doc.estado === 'Reservada') return true;
    if (doc.estado === 'Atendida parcialmente') {
      // Solo si queda saldo pendiente (descarta el caso donde despachado cubre todo pero el estado no se actualizó)
      const pendiente = calcularReservasPendientes(doc.reservasStock ?? [], doc.despachado ?? []);
      return pendiente.length > 0;
    }
    return false;
  }
  // Nota de Venta: verificar también que no exista ya una NS generada
  if (doc.notaSalidaGenerada) return false;
  if (doc.tipo === 'nota_venta') {
    if (!controlStockActivo) return false;
    if ((salesPreferences?.stockDescuentoNotaVenta ?? 'automatico') !== 'nota_salida') return false;
    return doc.estado === 'Generada';
  }
  return false;
}

function puedeEditar(doc: DocumentoComercial): boolean {
  // OV en Reservada no se puede editar (stock comprometido)
  if (doc.tipo === 'orden_venta' && doc.estado === 'Reservada') return false;
  return (
    doc.esBorrador ||
    ['Generada', 'Aprobada', 'Reservada', 'Atendida parcial', 'Atendida parcialmente'].includes(doc.estado)
  );
}

function puedeAnular(doc: DocumentoComercial): boolean {
  // OV Atendida no puede anularse (ya tiene comprobante emitido)
  if (doc.tipo === 'orden_venta' && doc.estado === 'Atendida') return false;
  return !doc.esBorrador && doc.estado !== 'Anulada' && doc.estado !== 'Convertida';
}

function puedeConvertir(doc: DocumentoComercial): boolean {
  return doc.tipo === 'orden_venta' && doc.estado === 'Reservada' && !doc.esBorrador;
}

function generarTextoCompartir(doc: DocumentoComercial, labelTipo: string): string {
  const numero = doc.numero ?? formatearNumeroParaBorrador(doc.serie);
  const cliente = doc.cliente?.nombre ?? 'Sin cliente';
  const simbolo = obtenerSimboloMoneda(doc.moneda);
  return `${labelTipo}: ${numero}\nCliente: ${cliente}\nFecha: ${doc.fechaEmision}\nTotal: ${simbolo} ${doc.totales.total.toFixed(2)} ${doc.moneda}`;
}

function leerColumnasDeStorage(tipo: TipoDocumentoComercial): Set<string> {
  try {
    const clave = tryLsKey(`documentos_comerciales_columnas_${tipo}`) ?? `documentos_comerciales_columnas_${tipo}`;
    const raw = localStorage.getItem(clave);
    if (!raw) return new Set(COLUMNAS_VISIBLES_DEFAULT);
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(COLUMNAS_VISIBLES_DEFAULT); }
}

function guardarColumnasEnStorage(tipo: TipoDocumentoComercial, visibles: Set<string>): void {
  try {
    const clave = tryLsKey(`documentos_comerciales_columnas_${tipo}`) ?? `documentos_comerciales_columnas_${tipo}`;
    localStorage.setItem(clave, JSON.stringify([...visibles]));
  } catch { /* silencioso */ }
}


export default function ListadoDocumentosComerciales({ tipo, abrirDetalleId }: ListadoDocumentosComercialesProps) {
  const navigate = useNavigate();
  const { state } = useDocumentosComercialesContext();
  const { anularDocumento, duplicarDocumento, eliminarBorrador } = useDocumentoComercialActions();
  const { anularNS } = useNotasSalida();
  const feedback = useFeedback();
  const { state: configState } = useConfigurationContext();
  const { activeEstablecimientoId } = useTenant();

  const controlStockActivo = configState.salesPreferences?.controlStockActivo ?? false;

  const [busqueda, setBusqueda] = useState('');
  const [estadosFiltro, setEstadosFiltro] = useState<EstadoDocumentoComercial[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [mostrarFiltrosEstado, setMostrarFiltrosEstado] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [menuPosicion, setMenuPosicion] = useState<{ top: number; right: number } | null>(null);
  const [compartirExpandido, setCompartirExpandido] = useState(false);
  const [documentoDetalle, setDocumentoDetalle] = useState<DocumentoComercial | null>(null);
  const [tabDetalle, setTabDetalle] = useState<'detalle' | 'historial'>('detalle');
  const [exportando, setExportando] = useState(false);
  const [mostrarConfigColumnas, setMostrarConfigColumnas] = useState(false);
  const [columnasVisibles, setColumnasVisibles] = useState<Set<string>>(
    () => leerColumnasDeStorage(tipo),
  );
  const [confirmandoAccion, setConfirmandoAccion] = useState<{
    tipo: 'anular' | 'eliminar';
    id: string;
    numero?: string;
    motivo: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setColumnasVisibles(leerColumnasDeStorage(tipo));
    setBusqueda('');
    setEstadosFiltro([]);
    setFechaDesde('');
    setFechaHasta('');
    setPaginaActual(1);
  }, [tipo]);

  useEffect(() => {
    if (!menuAbierto) return;
    const handleScroll = () => { setMenuAbierto(null); setMenuPosicion(null); };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [menuAbierto]);

  // Auto-abrir drawer cuando se navega desde comprobante con id de OV relacionada
  const abrirDetalleIdProcesadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!abrirDetalleId || abrirDetalleId === abrirDetalleIdProcesadoRef.current) return;
    const doc = state.documentos.find((d) => d.id === abrirDetalleId);
    if (doc) {
      abrirDetalleIdProcesadoRef.current = abrirDetalleId;
      setTabDetalle('detalle');
      setDocumentoDetalle(doc);
    }
  }, [abrirDetalleId, state.documentos]);

  const labelTipo = TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo];
  const estadosDisponibles = ESTADOS_POR_TIPO[tipo];
  const columnaNumerolabel = COLUMNA_NUMERO_LABELS[tipo];

  const toggleColumna = useCallback((id: string) => {
    setColumnasVisibles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      guardarColumnasEnStorage(tipo, next);
      return next;
    });
  }, [tipo]);

  const resetColumnas = useCallback(() => {
    const defaults = new Set(COLUMNAS_VISIBLES_DEFAULT);
    setColumnasVisibles(defaults);
    guardarColumnasEnStorage(tipo, defaults);
  }, [tipo]);

  const columnasDef = useMemo<ColumnaDef[]>(
    () => COLUMNAS_DEFAULT.map((c) => ({ ...c, visible: columnasVisibles.has(c.id) })),
    [columnasVisibles],
  );

  const documentosFiltrados = useMemo(() => {
    let lista = state.documentos.filter((d) => d.tipo === tipo);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((d) =>
        d.cliente?.nombre?.toLowerCase().includes(q) ||
        d.cliente?.numeroDocumento?.includes(q) ||
        d.numero?.toLowerCase().includes(q) ||
        d.serie?.toLowerCase().includes(q) ||
        d.vendedor?.toLowerCase().includes(q),
      );
    }
    if (estadosFiltro.length > 0) lista = lista.filter((d) => estadosFiltro.includes(d.estado));
    if (fechaDesde) lista = lista.filter((d) => d.fechaEmision >= fechaDesde);
    if (fechaHasta) lista = lista.filter((d) => d.fechaEmision <= fechaHasta);
    return lista.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }, [state.documentos, tipo, busqueda, estadosFiltro, fechaDesde, fechaHasta]);

  const totalPaginas = Math.max(1, Math.ceil(documentosFiltrados.length / registrosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * registrosPorPagina;
  const documentosPagina = documentosFiltrados.slice(inicio, inicio + registrosPorPagina);

  const hayFiltrosActivos = busqueda.trim() !== '' || estadosFiltro.length > 0 || fechaDesde !== '' || fechaHasta !== '';

  const limpiarFiltros = useCallback(() => {
    setBusqueda('');
    setEstadosFiltro([]);
    setFechaDesde('');
    setFechaHasta('');
    setPaginaActual(1);
  }, []);

  const toggleEstadoFiltro = useCallback((estado: EstadoDocumentoComercial) => {
    setEstadosFiltro((prev) =>
      prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado],
    );
    setPaginaActual(1);
  }, []);

  const handleAbrirMenu = useCallback((e: React.MouseEvent, docId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const estimatedHeight = 300;
    const top = rect.bottom + estimatedHeight > window.innerHeight ? rect.top - estimatedHeight : rect.bottom + 4;
    setMenuAbierto((prev) => {
      if (prev === docId) { setMenuPosicion(null); return null; }
      setMenuPosicion({ top, right: window.innerWidth - rect.right });
      setCompartirExpandido(false);
      return docId;
    });
  }, []);

  const handleGenerarComprobante = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null); setMenuPosicion(null);
    const validacion = validarOVParaConversion(doc);
    if (!validacion.valido) {
      feedback.error(validacion.error ?? 'No se puede generar el comprobante desde esta orden de venta.');
      return;
    }
    // Pasar almacenes y establecimientoId para que se calcule el stock real actual
    // usando la misma fuente que el comprobante directo (no el stock congelado de la OV)
    const { state: navState } = construirCargaConversionDesdeOV(doc, {
      almacenes: configState.almacenes ?? [],
      establecimientoId: activeEstablecimientoId ?? undefined,
    });
    navigate('/comprobantes/emision', { state: navState });
  }, [navigate, feedback, configState.almacenes, activeEstablecimientoId]);

  const handleGenerarNS = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null); setMenuPosicion(null);
    // Para OV parcialmente atendida, prellenar solo con cantidades pendientes (no las originales)
    let itemsParaLineas = doc.items;
    if (doc.tipo === 'orden_venta' && doc.estado === 'Atendida parcialmente' && doc.reservasStock?.length) {
      const pendientes = calcularReservasPendientes(doc.reservasStock, doc.despachado ?? []);
      const pendientePorSku = new Map<string, number>();
      for (const p of pendientes) {
        pendientePorSku.set(p.sku, (pendientePorSku.get(p.sku) ?? 0) + p.cantidad);
      }
      const ovProducts = useProductStore.getState().allProducts;
      itemsParaLineas = doc.items
        .map(item => {
          const prod = ovProducts.find(p => p.codigo === item.code);
          const unidadMin = prod ? resolveUnidadMinima(prod) : (item.unidadMedida ?? 'NIU');
          return {
            ...item,
            quantity: pendientePorSku.get(item.code) ?? 0,
            presentacionId: undefined,
            unidadMedida: unidadMin,
            unit: unidadMin,
          };
        })
        .filter(item => item.quantity > 0);
    }
    const lineas = buildLineasNSDesdeCartItems(itemsParaLineas);
    const from: DocumentoComercialOrigenNS = {
      id: doc.id,
      numero: doc.numero ?? doc.serie,
      tipo: doc.tipo as 'nota_venta' | 'orden_venta',
      clienteNombre: doc.cliente?.nombre,
      clienteDoc: doc.cliente?.numeroDocumento,
      clienteDocTipo: doc.cliente?.tipoDocumento,
      clienteDireccion: doc.cliente?.direccion,
      moneda: doc.moneda,
      lineas,
    };
    const stateKey = doc.tipo === 'orden_venta' ? 'fromOrdenVenta' : 'fromNotaVenta';
    navigate('/inventario', { state: { tab: 'notas-salida', [stateKey]: from } });
  }, [navigate]);

  const handleNuevo = useCallback(() => navigate(`/documentos-comerciales/nuevo/${tipo}`), [navigate, tipo]);

  const handleEditar = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null); setMenuPosicion(null);
    navigate(`/documentos-comerciales/editar/${doc.id}`, { state: { documento: doc } });
  }, [navigate]);

  const handleDuplicar = useCallback((id: string) => {
    setMenuAbierto(null); setMenuPosicion(null);
    const resultado = duplicarDocumento(id);
    if (resultado.exito && resultado.documento) {
      feedback.success('Documento duplicado como borrador.');
      // Refrescar stock de cada ítem desde inventario actual (no usar stock congelado de la OV original)
      const almacenesActuales = configState.almacenes ?? [];
      const itemsConStockActual = resultado.documento.items.map((item) =>
        refrescarStockItem(item, almacenesActuales, activeEstablecimientoId ?? undefined),
      );
      const documentoConStock = { ...resultado.documento, items: itemsConStockActual };
      navigate(`/documentos-comerciales/editar/${resultado.documento.id}`, {
        state: { documento: documentoConStock, modo: 'duplicar' },
      });
    } else {
      feedback.error(resultado.error ?? 'Error al duplicar el documento.');
    }
  }, [duplicarDocumento, feedback, navigate, configState.almacenes, activeEstablecimientoId]);

  const handleConfirmarAccion = useCallback(() => {
    if (!confirmandoAccion) return;
    if (confirmandoAccion.tipo === 'anular') {
      if (!confirmandoAccion.motivo.trim()) { feedback.warning('El motivo de anulación es obligatorio.'); return; }

      // Cascade: anular la NS vinculada antes de anular la NV
      const doc = state.documentos.find((d) => d.id === confirmandoAccion.id);
      if (doc?.tipo === 'nota_venta' && doc.notaSalidaGenerada && doc.notaSalidaId) {
        const okNS = anularNS(doc.notaSalidaId, `Anulado por anulación de ${doc.numero ?? doc.id}`);
        if (!okNS) {
          feedback.error('No se pudo anular la Nota de Salida vinculada. Intente nuevamente.');
          return;
        }
      }

      const r = anularDocumento(confirmandoAccion.id, confirmandoAccion.motivo);
      if (r.exito) feedback.success(`${labelTipo} anulada exitosamente.`);
      else feedback.error(r.error ?? 'Error al anular.');
    } else {
      const r = eliminarBorrador(confirmandoAccion.id);
      if (r.exito) feedback.success(`Borrador de ${labelTipo.toLowerCase()} eliminado.`);
      else feedback.error(r.error ?? 'Error al eliminar.');
    }
    setConfirmandoAccion(null);
  }, [confirmandoAccion, anularDocumento, anularNS, eliminarBorrador, feedback, labelTipo, state.documentos]);

  const handleImprimir = useCallback(async (doc: DocumentoComercial, formato: 'a4' | 'ticket') => {
    setMenuAbierto(null); setMenuPosicion(null);
    try {
      await imprimirComprobante({
        formato: formato === 'ticket' ? 'TICKET' : 'A4',
        titulo: `${labelTipo} ${doc.numero ?? formatearNumeroParaBorrador(doc.serie)}`,
        render: (contexto) => createElement(DocumentoComercialPrintView, { doc, disenoEfectivo: contexto?.disenoEfectivo }),
      });
    } catch {
      feedback.error('No se pudo imprimir el documento.');
    }
  }, [labelTipo, feedback]);

  const handleCompartirEmail = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null); setMenuPosicion(null);
    const numero = doc.numero ?? formatearNumeroParaBorrador(doc.serie);
    window.open(`mailto:${doc.cliente?.email ? encodeURIComponent(doc.cliente.email) : ''}?subject=${encodeURIComponent(`${labelTipo} ${numero}`)}&body=${encodeURIComponent(generarTextoCompartir(doc, labelTipo))}`, '_self');
  }, [labelTipo]);

  const handleCompartirWhatsApp = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null); setMenuPosicion(null);
    window.open(`https://wa.me/?text=${encodeURIComponent(generarTextoCompartir(doc, labelTipo))}`, '_blank');
  }, [labelTipo]);

  const handleCopiarTexto = useCallback(async (doc: DocumentoComercial) => {
    setMenuAbierto(null); setMenuPosicion(null);
    try {
      await navigator.clipboard.writeText(generarTextoCompartir(doc, labelTipo));
      feedback.success('Información copiada al portapapeles.');
    } catch { feedback.error('No se pudo copiar al portapapeles.'); }
  }, [labelTipo, feedback]);

  const handleExportarExcel = useCallback(async () => {
    if (documentosFiltrados.length === 0) { feedback.warning('No hay documentos para exportar.'); return; }
    setExportando(true);
    try {
      const filas = documentosFiltrados.map((doc) => ({
        tipo: TIPO_DOCUMENTO_COMERCIAL_LABELS[doc.tipo],
        numero: doc.numero ?? formatearNumeroParaBorrador(doc.serie),
        cliente: doc.cliente?.nombre ?? 'Sin cliente',
        tipoDocCliente: !doc.cliente?.tipoDocumento || doc.cliente.tipoDocumento === 'OTRO' ? '' : doc.cliente.tipoDocumento,
        numeroDocCliente: doc.cliente?.numeroDocumento && doc.cliente.numeroDocumento !== '00000000' ? doc.cliente.numeroDocumento : '—',
        fechaEmision: doc.fechaEmision,
        fechaVencimiento: doc.camposOpcionales?.fechaVencimiento ?? '—',
        formaPago: doc.formaPago ?? '—',
        moneda: doc.moneda,
        total: doc.totales.total.toFixed(2),
        estado: doc.estado,
        usuario: doc.vendedor ?? '—',
        metodoEnvio: doc.camposOpcionales?.metodoEnvio ?? '—',
        fechaEnvio: doc.camposOpcionales?.fechaEntrega ?? '—',
        requiereAprobacion: doc.camposOpcionales?.requiereAprobacion ? 'Sí' : 'No',
        docRelacionado: doc.trazabilidad?.documentoOrigenNumero ?? '—',
      }));

      const mapaColumnas: Record<string, { header: string; key: string; width?: number }> = {
        numero: { header: columnaNumerolabel, key: 'numero', width: 20 },
        cliente: { header: 'Cliente', key: 'cliente', width: 32 },
        docCliente: { header: 'Tipo Doc.', key: 'tipoDocCliente', width: 12 },
        fechaEmision: { header: 'F. Emisión', key: 'fechaEmision', width: 14 },
        fechaVencimiento: { header: 'F. Vencimiento', key: 'fechaVencimiento', width: 14 },
        formaPago: { header: 'Forma de pago', key: 'formaPago', width: 16 },
        moneda: { header: 'Moneda', key: 'moneda', width: 10 },
        total: { header: 'Total', key: 'total', width: 14 },
        estado: { header: 'Estado', key: 'estado', width: 14 },
        usuario: { header: 'Usuario', key: 'usuario', width: 20 },
        metodoEnvio: { header: 'Método de envío', key: 'metodoEnvio', width: 18 },
        fechaEnvio: { header: 'F. Envío previsto', key: 'fechaEnvio', width: 16 },
        requiereAprobacion: { header: 'Req. aprobación', key: 'requiereAprobacion', width: 14 },
        docRelacionado: { header: 'Doc. relacionado', key: 'docRelacionado', width: 22 },
      };

      const columnasExcel = columnasDef
        .filter((c) => c.visible && c.id !== 'docCliente' && mapaColumnas[c.id])
        .map((c) => mapaColumnas[c.id]);

      if (columnasVisibles.has('docCliente')) {
        const idx = columnasExcel.findIndex((c) => c.key === 'cliente');
        columnasExcel.splice(idx >= 0 ? idx + 1 : columnasExcel.length, 0, { header: 'N° Doc. Cliente', key: 'numeroDocCliente', width: 18 });
      }

      if (columnasExcel.length === 0) { feedback.warning('No hay columnas visibles para exportar.'); return; }

      await exportDatasetToExcel({
        rows: filas,
        columns: columnasExcel,
        filename: `${TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo].toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}`,
        worksheetName: TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo],
      });
      feedback.success('Exportación completada.');
    } catch {
      feedback.error('Error al exportar.');
    } finally {
      setExportando(false);
    }
  }, [documentosFiltrados, columnasDef, columnasVisibles, columnaNumerolabel, tipo, feedback]);

  const menuDocActual = menuAbierto ? state.documentos.find((d) => d.id === menuAbierto) : null;

  return (
    <div className="space-y-3">
      {/* Barra principal */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Buscar por cliente, número..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }} className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none" />
          {busqueda && <button type="button" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>}
        </div>

        <div className="flex items-center gap-1">
          <input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPaginaActual(1); }} className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500" title="Desde" />
          <span className="text-gray-400 text-xs">—</span>
          <input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPaginaActual(1); }} className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500" title="Hasta" />
        </div>

        <button type="button" onClick={() => setMostrarFiltrosEstado((v) => !v)} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${estadosFiltro.length > 0 ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>
          Estado{estadosFiltro.length > 0 && <span className="text-xs bg-violet-600 text-white rounded-full px-1.5 py-0.5 leading-none">{estadosFiltro.length}</span>}
        </button>

        {hayFiltrosActivos && <button type="button" onClick={limpiarFiltros} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline">Limpiar</button>}

        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={() => setMostrarConfigColumnas((v) => !v)} className="flex items-center gap-1 px-2.5 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 transition-colors" title="Personalizar columnas">
            <SlidersHorizontal size={14} /><span className="hidden sm:inline text-xs">Columnas</span>
          </button>
          <button type="button" onClick={() => void handleExportarExcel()} disabled={exportando} className="flex items-center gap-1 px-2.5 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50" title="Exportar a Excel">
            <Download size={14} /><span className="hidden sm:inline text-xs">Excel</span>
          </button>
          <button type="button" onClick={handleNuevo} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg shadow-sm transition-all whitespace-nowrap">
            <Plus size={15} />{TIPO_DOCUMENTO_COMERCIAL_NUEVA[tipo]}
          </button>
        </div>
      </div>

      {mostrarFiltrosEstado && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filtrar por estado</p>
          <div className="flex flex-wrap gap-1.5">
            {estadosDisponibles.map((estado) => (
              <button key={estado} type="button" onClick={() => toggleEstadoFiltro(estado as EstadoDocumentoComercial)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${estadosFiltro.includes(estado as EstadoDocumentoComercial) ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-violet-300'}`}>{estado}</button>
            ))}
          </div>
        </div>
      )}

      {mostrarConfigColumnas && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Columnas visibles</p>
            <button type="button" onClick={resetColumnas} className="text-xs text-violet-600 dark:text-violet-400 underline">Restablecer</button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {COLUMNAS_DEFAULT.map((col) => (
              <label key={col.id} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={columnasVisibles.has(col.id)} onChange={() => toggleColumna(col.id)} className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Tabla — sin overflow-hidden para permitir dropdown fixed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {documentosFiltrados.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><Search size={20} /></div>
            <p className="text-sm">{hayFiltrosActivos ? 'No hay documentos con los filtros aplicados' : `Aún no hay ${labelTipo.toLowerCase()}s`}</p>
            {!hayFiltrosActivos && <button type="button" onClick={handleNuevo} className="text-sm text-violet-600 dark:text-violet-400 font-medium underline">Crear la primera</button>}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  {columnasVisibles.has('numero') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{columnaNumerolabel}</th>}
                  {columnasVisibles.has('cliente') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>}
                  {columnasVisibles.has('docCliente') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">N° Doc. Cliente</th>}
                  {columnasVisibles.has('fechaEmision') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">F. Emisión</th>}
                  {columnasVisibles.has('fechaVencimiento') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">F. Vencimiento</th>}
                  {columnasVisibles.has('formaPago') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Forma pago</th>}
                  {columnasVisibles.has('moneda') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Moneda</th>}
                  {columnasVisibles.has('total') && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>}
                  {columnasVisibles.has('estado') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>}
                  {columnasVisibles.has('usuario') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>}
                  {columnasVisibles.has('metodoEnvio') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Método envío</th>}
                  {columnasVisibles.has('fechaEnvio') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">F. Envío</th>}
                  {columnasVisibles.has('requiereAprobacion') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aprobación</th>}
                  {columnasVisibles.has('docRelacionado') && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Doc. origen</th>}
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {documentosPagina.map((doc) => {
                  const numeroMostrado = doc.esBorrador
                    ? formatearNumeroParaBorrador(doc.serie)
                    : doc.numero ?? (doc.serie && doc.correlativo ? formatearNumeroDocumento(doc.serie, doc.correlativo) : '—');
                  const docCliente = formatearDocumentoCliente(doc.cliente?.tipoDocumento ?? '', doc.cliente?.numeroDocumento ?? '');
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      {columnasVisibles.has('numero') && <td className="px-4 py-3"><span className={`font-mono text-sm ${doc.esBorrador ? 'text-gray-400 dark:text-gray-500' : 'font-semibold text-gray-800 dark:text-gray-100'}`}>{numeroMostrado}</span></td>}
                      {columnasVisibles.has('cliente') && <td className="px-4 py-3 max-w-[200px]"><span title={doc.cliente?.nombre ?? ''} className={`font-medium truncate block ${doc.cliente?.nombre ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 text-xs'}`}>{doc.cliente?.nombre ?? 'Sin cliente'}</span></td>}
                      {columnasVisibles.has('docCliente') && <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{docCliente}</td>}
                      {columnasVisibles.has('fechaEmision') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{doc.fechaEmision}</td>}
                      {columnasVisibles.has('fechaVencimiento') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{doc.camposOpcionales?.fechaVencimiento ?? '—'}</td>}
                      {columnasVisibles.has('formaPago') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.formaPago ?? '—'}</td>}
                      {columnasVisibles.has('moneda') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.moneda}</td>}
                      {columnasVisibles.has('total') && <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{obtenerSimboloMoneda(doc.moneda)} {doc.totales.total.toFixed(2)}</td>}
                      {columnasVisibles.has('estado') && <td className="px-4 py-3"><EstadoDocumentoBadge estado={doc.estado} /></td>}
                      {columnasVisibles.has('usuario') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-[120px]"><span title={doc.vendedor ?? ''} className="truncate block">{doc.vendedor ?? '—'}</span></td>}
                      {columnasVisibles.has('metodoEnvio') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.camposOpcionales?.metodoEnvio ?? '—'}</td>}
                      {columnasVisibles.has('fechaEnvio') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{doc.camposOpcionales?.fechaEntrega ?? '—'}</td>}
                      {columnasVisibles.has('requiereAprobacion') && <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.camposOpcionales?.requiereAprobacion ? 'Sí' : 'No'}</td>}
                      {columnasVisibles.has('docRelacionado') && <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{doc.trazabilidad?.documentoOrigenNumero ?? '—'}</td>}
                      <td className="px-4 py-3">
                        <button type="button" onClick={(e) => handleAbrirMenu(e, doc.id)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-400">
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dropdown de acciones con position:fixed para no quedar cortado */}
      {menuAbierto && menuPosicion && menuDocActual && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPosicion.top, right: menuPosicion.right, zIndex: 9999 }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl min-w-[180px] overflow-hidden"
        >
          <button type="button" onClick={() => { setMenuAbierto(null); setMenuPosicion(null); setTabDetalle('detalle'); setDocumentoDetalle(menuDocActual); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Eye size={14} />Ver detalle</button>
          {puedeEditar(menuDocActual) && <button type="button" onClick={() => handleEditar(menuDocActual)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Edit3 size={14} />{menuDocActual.esBorrador ? 'Retomar borrador' : 'Editar'}</button>}
          <button type="button" onClick={() => handleDuplicar(menuDocActual.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Copy size={14} />Duplicar</button>
          {!menuDocActual.esBorrador && (
            <>
              <button type="button" onClick={() => void handleImprimir(menuDocActual, 'a4')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Printer size={14} />Imprimir A4</button>
              <button type="button" onClick={() => void handleImprimir(menuDocActual, 'ticket')} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Printer size={14} />Imprimir Ticket</button>
              <button type="button" onClick={() => setCompartirExpandido((v) => !v)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Share2 size={14} />Compartir</button>
              {compartirExpandido && (
                <>
                  <button type="button" onClick={() => handleCompartirEmail(menuDocActual)} className="flex items-center gap-2 w-full px-3 py-2 pl-7 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><Mail size={13} />Por correo</button>
                  <button type="button" onClick={() => handleCompartirWhatsApp(menuDocActual)} className="flex items-center gap-2 w-full px-3 py-2 pl-7 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><MessageCircle size={13} />WhatsApp</button>
                  <button type="button" onClick={() => void handleCopiarTexto(menuDocActual)} className="flex items-center gap-2 w-full px-3 py-2 pl-7 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"><ClipboardCopy size={13} />Copiar texto</button>
                </>
              )}
            </>
          )}
          {puedeConvertir(menuDocActual) && (
            <button type="button" onClick={() => handleGenerarComprobante(menuDocActual)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-left font-medium">
              <FileCheck size={14} />Generar comprobante
            </button>
          )}
          {puedeGenerarNS(menuDocActual, configState.salesPreferences, controlStockActivo) && (
            <button type="button" onClick={() => handleGenerarNS(menuDocActual)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left font-medium">
              <PackageMinus size={14} />Generar nota de salida
            </button>
          )}
          {puedeAnular(menuDocActual) && <button type="button" onClick={() => { setMenuAbierto(null); setMenuPosicion(null); setConfirmandoAccion({ tipo: 'anular', id: menuDocActual.id, numero: menuDocActual.numero, motivo: '' }); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"><Ban size={14} />Anular</button>}
          {menuDocActual.esBorrador && <button type="button" onClick={() => { setMenuAbierto(null); setMenuPosicion(null); setConfirmandoAccion({ tipo: 'eliminar', id: menuDocActual.id, motivo: '' }); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"><Trash2 size={14} />Eliminar borrador</button>}
        </div>
      )}

      {/* Paginación con selector de registros */}
      <div className="flex items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs">Mostrar:</span>
          <select value={registrosPorPagina} onChange={(e) => { setRegistrosPorPagina(Number(e.target.value)); setPaginaActual(1); }} className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500">
            {OPCIONES_REGISTROS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-xs">
            {documentosFiltrados.length > 0
              ? `${inicio + 1}–${Math.min(inicio + registrosPorPagina, documentosFiltrados.length)} de ${documentosFiltrados.length}`
              : 'Sin resultados'}
          </span>
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" disabled={paginaSegura <= 1} onClick={() => setPaginaActual((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
            <span className="px-2">{paginaSegura} / {totalPaginas}</span>
            <button type="button" disabled={paginaSegura >= totalPaginas} onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      {/* Drawer de detalle */}
      {documentoDetalle && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end" onClick={() => setDocumentoDetalle(null)}>
          <div className="bg-white dark:bg-gray-900 h-full w-full max-w-lg shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{TIPO_DOCUMENTO_COMERCIAL_LABELS[documentoDetalle.tipo]}</p>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{documentoDetalle.esBorrador ? formatearNumeroParaBorrador(documentoDetalle.serie) : documentoDetalle.numero ?? '—'}</h2>
                </div>
                <button type="button" onClick={() => setDocumentoDetalle(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTabDetalle('detalle')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${tabDetalle === 'detalle' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  Detalle
                </button>
                <button
                  type="button"
                  onClick={() => setTabDetalle('historial')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${tabDetalle === 'historial' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  Historial
                </button>
              </div>
            </div>

            {/* Tab: Detalle */}
            {tabDetalle === 'detalle' && (
              <div className="p-6 space-y-4">
                <EstadoDocumentoBadge estado={documentoDetalle.estado} tamano="md" />

                {documentoDetalle.cliente ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Cliente</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{documentoDetalle.cliente.nombre}</p>
                    <p className="text-sm text-gray-500">{formatearDocumentoCliente(documentoDetalle.cliente.tipoDocumento, documentoDetalle.cliente.numeroDocumento)}</p>
                    {documentoDetalle.cliente.email && <p className="text-sm text-gray-500">{documentoDetalle.cliente.email}</p>}
                    {documentoDetalle.cliente.direccion && <p className="text-sm text-gray-500">{documentoDetalle.cliente.direccion}</p>}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cliente</p><p className="text-sm text-gray-400">Sin cliente asignado</p></div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-gray-500 mb-1">Tipo</p><p className="font-medium text-gray-800 dark:text-gray-100">{TIPO_DOCUMENTO_COMERCIAL_LABELS[documentoDetalle.tipo]}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Serie</p><p className="font-mono font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.serie}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">F. Emisión</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.fechaEmision}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">F. Vencimiento</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.camposOpcionales?.fechaVencimiento ?? '—'}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Moneda</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.moneda}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Forma de pago</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.formaPago ?? '—'}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Usuario</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.vendedor ?? '—'}</p></div>
                  <div><p className="text-xs text-gray-500 mb-1">Total</p><p className="font-bold text-gray-800 dark:text-gray-100 text-lg">{obtenerSimboloMoneda(documentoDetalle.moneda)} {documentoDetalle.totales.total.toFixed(2)}</p></div>
                  {documentoDetalle.camposOpcionales?.metodoEnvio && <div><p className="text-xs text-gray-500 mb-1">Método de envío</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.camposOpcionales.metodoEnvio}</p></div>}
                  {documentoDetalle.camposOpcionales?.fechaEntrega && <div><p className="text-xs text-gray-500 mb-1">F. Envío previsto</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.camposOpcionales.fechaEntrega}</p></div>}
                  {documentoDetalle.camposOpcionales?.requiereAprobacion && <div><p className="text-xs text-gray-500 mb-1">Requiere aprobación</p><p className="font-medium text-gray-800 dark:text-gray-100">Sí</p></div>}
                  {documentoDetalle.camposOpcionales?.ordenCompra && <div><p className="text-xs text-gray-500 mb-1">Orden de compra</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.camposOpcionales.ordenCompra}</p></div>}
                  {documentoDetalle.camposOpcionales?.centroCosto && <div><p className="text-xs text-gray-500 mb-1">Centro de costo</p><p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.camposOpcionales.centroCosto}</p></div>}
                </div>

                {documentoDetalle.trazabilidad?.documentoOrigenNumero && (
                  <div><p className="text-xs text-gray-500 mb-1">Doc. relacionado</p><p className="text-sm font-mono text-gray-700 dark:text-gray-300">{documentoDetalle.trazabilidad.documentoOrigenNumero}</p></div>
                )}
                {documentoDetalle.trazabilidad?.documentoDestinoNumero && documentoDetalle.trazabilidad.documentoDestinoTipo === 'comprobante' && (
                  <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-violet-600 uppercase mb-1">Comprobante generado</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-100">{documentoDetalle.trazabilidad.documentoDestinoNumero}</p>
                  </div>
                )}

                {documentoDetalle.motivoAnulacion && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-600 uppercase mb-2">Anulación</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Motivo:</strong> {documentoDetalle.motivoAnulacion}</p>
                    {documentoDetalle.fechaAnulacion && <p className="text-xs text-gray-500 mt-1">Fecha: {documentoDetalle.fechaAnulacion.split('T')[0]}</p>}
                    {documentoDetalle.usuarioAnulacion && <p className="text-xs text-gray-500">Usuario: {documentoDetalle.usuarioAnulacion}</p>}
                  </div>
                )}

                {documentoDetalle.items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ítems ({documentoDetalle.items.length})</p>
                    <div className="space-y-2">
                      {documentoDetalle.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity} × {obtenerSimboloMoneda(documentoDetalle.moneda)} {item.price.toFixed(2)}{item.unidadMedida ? ` ${item.unidadMedida}` : ''}</p>
                          </div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100 ml-3 whitespace-nowrap">{obtenerSimboloMoneda(documentoDetalle.moneda)} {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
                      {calcularDesgloseTributos(documentoDetalle.items).map((row) => {
                        if (row.kind === 'gravado') {
                          const pct = Math.round(row.igvRate * 100);
                          return (
                            <div key={row.key}>
                              <div className="flex justify-between text-xs text-gray-500"><span>Base IGV {pct}%</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {row.taxableBase.toFixed(2)}</span></div>
                              <div className="flex justify-between text-xs text-gray-500"><span>IGV {pct}%</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {row.taxAmount.toFixed(2)}</span></div>
                            </div>
                          );
                        }
                        const label = row.kind === 'exonerado' ? 'Exonerado' : 'Inafecto';
                        return <div key={row.key} className="flex justify-between text-xs text-gray-500"><span>{label}</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {row.taxableBase.toFixed(2)}</span></div>;
                      })}
                      <div className="flex justify-between font-bold text-sm text-gray-900 dark:text-white pt-1"><span>Total</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {documentoDetalle.totales.total.toFixed(2)}</span></div>
                    </div>
                  </div>
                )}

                {/* Sección de reserva de stock — solo para Orden de Venta */}
                {documentoDetalle.tipo === 'orden_venta' && documentoDetalle.items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Reserva de stock</p>
                    <div className="space-y-1.5">
                      {documentoDetalle.items.map((item) => {
                        const esBien =
                          item.tipoBienServicio === 'bien' ||
                          (item.tipoBienServicio !== 'servicio' && item.tipoDetalle !== 'libre' && item.requiresStockControl === true);
                        const esBienLibre = item.tipoDetalle === 'libre' && item.tipoBienServicio !== 'servicio';
                        const reservasItem = documentoDetalle.reservasStock?.filter((r) => r.sku === item.code) ?? [];
                        const cantidadReservada = reservasItem.reduce((s, r) => s + r.cantidad, 0);
                        const ovReservada = documentoDetalle.estado === 'Reservada';
                        return (
                          <div key={item.id} className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-800 dark:text-gray-100 truncate flex-1">{item.name}</span>
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${esBien || esBienLibre ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                                {item.tipoBienServicio === 'servicio' ? 'Servicio' : 'Bien'}
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                              <span>Solicitado: {item.quantity}</span>
                              {item.tipoBienServicio === 'servicio' ? (
                                <span className="text-gray-400 italic">No aplica</span>
                              ) : esBienLibre ? (
                                <span className="text-gray-400 italic">Ítem libre — sin reserva</span>
                              ) : cantidadReservada > 0 ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">Reservado: {cantidadReservada} ✓</span>
                              ) : ovReservada ? (
                                <span className="text-amber-600 dark:text-amber-400">Sin reserva registrada</span>
                              ) : (
                                <span className="text-gray-400">Pendiente</span>
                              )}
                            </div>
                            {cantidadReservada > 0 && reservasItem.length > 0 && (
                              <div className="text-gray-400 dark:text-gray-500 pl-1 pt-0.5">
                                {reservasItem.length === 1 ? (
                                  reservasItem[0].almacenNombre ? (
                                    <span>{reservasItem[0].almacenNombre}</span>
                                  ) : null
                                ) : (
                                  reservasItem.map((r) => (
                                    <div key={r.almacenId} className="flex justify-between">
                                      <span>{r.almacenNombre ?? r.almacenId}</span>
                                      <span>{r.cantidad}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {documentoDetalle.observaciones && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones</p><p className="text-sm text-gray-700 dark:text-gray-300">{documentoDetalle.observaciones}</p></div>
                )}

                <div className="pt-4 flex gap-3 flex-wrap">
                  {puedeConvertir(documentoDetalle) && (
                    <button
                      type="button"
                      onClick={() => { setDocumentoDetalle(null); handleGenerarComprobante(documentoDetalle); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg shadow-sm transition-all"
                    >
                      <FileCheck size={14} />Generar comprobante
                    </button>
                  )}
                  {puedeGenerarNS(documentoDetalle, configState.salesPreferences, controlStockActivo) && (
                    <button
                      type="button"
                      onClick={() => { setDocumentoDetalle(null); handleGenerarNS(documentoDetalle); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg shadow-sm transition-all"
                    >
                      <PackageMinus size={14} />Generar nota de salida
                    </button>
                  )}
                  {puedeEditar(documentoDetalle) && (
                    <button type="button" onClick={() => { setDocumentoDetalle(null); handleEditar(documentoDetalle); }} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-violet-300 text-violet-700 dark:text-violet-300 dark:border-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                      <Edit3 size={14} />{documentoDetalle.esBorrador ? 'Retomar' : 'Editar'}
                    </button>
                  )}
                  <button type="button" onClick={() => { setDocumentoDetalle(null); handleDuplicar(documentoDetalle.id); }} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Copy size={14} />Duplicar
                  </button>
                  {!documentoDetalle.esBorrador && (
                    <button type="button" onClick={() => { setDocumentoDetalle(null); void handleImprimir(documentoDetalle, 'a4'); }} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Printer size={14} />Imprimir
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Historial */}
            {tabDetalle === 'historial' && (
              <div className="p-6">
                {!documentoDetalle.historial || documentoDetalle.historial.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Search size={18} />
                    </div>
                    <p className="text-sm">Aún no hay movimientos en el historial.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...documentoDetalle.historial].reverse().map((evento, idx) => {
                      const fechaFormateada = (() => {
                        try {
                          return new Date(evento.fecha).toLocaleString('es-PE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          });
                        } catch {
                          return evento.fecha;
                        }
                      })();
                      return (
                        <div key={idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-violet-400 dark:bg-violet-500 mt-1.5 flex-shrink-0" />
                            {idx < documentoDetalle.historial!.length - 1 && (
                              <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                            )}
                          </div>
                          <div className="pb-3 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{evento.accion}</p>
                            {evento.detalle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{evento.detalle}</p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {fechaFormateada}{evento.usuario ? ` · ${evento.usuario}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación con motivo de anulación */}
      {confirmandoAccion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">{confirmandoAccion.tipo === 'anular' ? 'Anular documento' : 'Eliminar borrador'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {confirmandoAccion.tipo === 'anular' ? `¿Está seguro que desea anular ${confirmandoAccion.numero ?? 'este documento'}?` : '¿Está seguro que desea eliminar este borrador? Se perderán todos los datos.'}
            </p>
            {confirmandoAccion.tipo === 'anular' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Motivo de anulación <span className="text-red-500">*</span></label>
                <textarea value={confirmandoAccion.motivo} onChange={(e) => setConfirmandoAccion((prev) => prev ? { ...prev, motivo: e.target.value } : null)} placeholder="Ingrese el motivo..." rows={3} className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none resize-none" />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmandoAccion(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
              <button type="button" onClick={handleConfirmarAccion} disabled={confirmandoAccion.tipo === 'anular' && !confirmandoAccion.motivo.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {confirmandoAccion.tipo === 'anular' ? 'Anular' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {menuAbierto && (
        <div className="fixed inset-0 z-[9998]" onClick={() => { setMenuAbierto(null); setMenuPosicion(null); setCompartirExpandido(false); }} />
      )}
    </div>
  );
}
