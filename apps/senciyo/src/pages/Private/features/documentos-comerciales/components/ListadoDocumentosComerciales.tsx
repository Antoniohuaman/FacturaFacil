import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, MoreHorizontal, Edit3, Copy, Ban, Trash2, Eye,
  ChevronLeft, ChevronRight, X, Printer, Share2, Download,
  Mail, MessageCircle, ClipboardCopy, SlidersHorizontal,
} from 'lucide-react';
import { EstadoDocumentoBadge } from './EstadoDocumentoBadge';
import { useDocumentosComercialesContext } from '../contexts/DocumentosComercialesContext';
import { useDocumentoComercialActions } from '../hooks/useDocumentoComercialActions';
import { useFeedback } from '@/shared/feedback/useFeedback';
import { exportDatasetToExcel } from '@/shared/export/exportToExcel';
import { tryLsKey } from '@/shared/tenant';
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
} from '../utils/documentoComercial.helpers';

interface ListadoDocumentosComercialesProps {
  tipo: TipoDocumentoComercial;
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

const REGISTROS_POR_PAGINA = 10;

function puedeEditar(doc: DocumentoComercial): boolean {
  return doc.esBorrador || ['Generada', 'Aprobada', 'Reservada', 'Atendida parcial'].includes(doc.estado);
}

function puedeAnular(doc: DocumentoComercial): boolean {
  return !doc.esBorrador && doc.estado !== 'Anulada' && doc.estado !== 'Convertida';
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
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set(COLUMNAS_VISIBLES_DEFAULT);
  }
}

function guardarColumnasEnStorage(tipo: TipoDocumentoComercial, visibles: Set<string>): void {
  try {
    const clave = tryLsKey(`documentos_comerciales_columnas_${tipo}`) ?? `documentos_comerciales_columnas_${tipo}`;
    localStorage.setItem(clave, JSON.stringify([...visibles]));
  } catch { /* silencioso */ }
}

export default function ListadoDocumentosComerciales({ tipo }: ListadoDocumentosComercialesProps) {
  const navigate = useNavigate();
  const { state } = useDocumentosComercialesContext();
  const { anularDocumento, duplicarDocumento, eliminarBorrador } = useDocumentoComercialActions();
  const feedback = useFeedback();

  const [busqueda, setBusqueda] = useState('');
  const [estadosFiltro, setEstadosFiltro] = useState<EstadoDocumentoComercial[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [mostrarFiltrosEstado, setMostrarFiltrosEstado] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [menuCompartirAbierto, setMenuCompartirAbierto] = useState<string | null>(null);
  const [documentoDetalle, setDocumentoDetalle] = useState<DocumentoComercial | null>(null);
  const [exportando, setExportando] = useState(false);
  const [mostrarConfigColumnas, setMostrarConfigColumnas] = useState(false);

  const [columnasVisibles, setColumnasVisibles] = useState<Set<string>>(
    () => leerColumnasDeStorage(tipo),
  );

  useEffect(() => {
    setColumnasVisibles(leerColumnasDeStorage(tipo));
    setBusqueda('');
    setEstadosFiltro([]);
    setFechaDesde('');
    setFechaHasta('');
    setPaginaActual(1);
  }, [tipo]);

  const [confirmandoAccion, setConfirmandoAccion] = useState<{
    tipo: 'anular' | 'eliminar';
    id: string;
    numero?: string;
    motivo: string;
  } | null>(null);

  const labelTipo = TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo];
  const estadosDisponibles = ESTADOS_POR_TIPO[tipo];
  const columnaNumerolabel = COLUMNA_NUMERO_LABELS[tipo];

  const toggleColumna = useCallback((id: string) => {
    setColumnasVisibles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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
      lista = lista.filter(
        (d) =>
          d.cliente?.nombre?.toLowerCase().includes(q) ||
          d.cliente?.numeroDocumento?.includes(q) ||
          d.numero?.toLowerCase().includes(q) ||
          d.serie?.toLowerCase().includes(q) ||
          d.vendedor?.toLowerCase().includes(q),
      );
    }

    if (estadosFiltro.length > 0) {
      lista = lista.filter((d) => estadosFiltro.includes(d.estado));
    }

    if (fechaDesde) lista = lista.filter((d) => d.fechaEmision >= fechaDesde);
    if (fechaHasta) lista = lista.filter((d) => d.fechaEmision <= fechaHasta);

    return lista.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  }, [state.documentos, tipo, busqueda, estadosFiltro, fechaDesde, fechaHasta]);

  const totalPaginas = Math.max(1, Math.ceil(documentosFiltrados.length / REGISTROS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;
  const documentosPagina = documentosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);

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

  const handleNuevo = useCallback(() => navigate(`/documentos-comerciales/nuevo/${tipo}`), [navigate, tipo]);

  const handleEditar = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null);
    navigate(`/documentos-comerciales/editar/${doc.id}`, { state: { documento: doc } });
  }, [navigate]);

  const handleDuplicar = useCallback((id: string) => {
    setMenuAbierto(null);
    const resultado = duplicarDocumento(id);
    if (resultado.exito && resultado.documento) {
      feedback.success('Borrador creado a partir del documento duplicado.');
      navigate(`/documentos-comerciales/editar/${resultado.documento.id}`, {
        state: { documento: resultado.documento },
      });
    } else {
      feedback.error(resultado.error ?? 'Error al duplicar el documento.');
    }
  }, [duplicarDocumento, feedback, navigate]);

  const handleConfirmarAccion = useCallback(() => {
    if (!confirmandoAccion) return;
    if (confirmandoAccion.tipo === 'anular') {
      if (!confirmandoAccion.motivo.trim()) {
        feedback.warning('El motivo de anulación es obligatorio.');
        return;
      }
      const resultado = anularDocumento(confirmandoAccion.id, confirmandoAccion.motivo);
      if (resultado.exito) {
        feedback.success(`${labelTipo} anulada exitosamente.`);
      } else {
        feedback.error(resultado.error ?? 'Error al anular el documento.');
      }
    } else {
      const resultado = eliminarBorrador(confirmandoAccion.id);
      if (resultado.exito) {
        feedback.success(`Borrador de ${labelTipo.toLowerCase()} eliminado.`);
      } else {
        feedback.error(resultado.error ?? 'Error al eliminar el borrador.');
      }
    }
    setConfirmandoAccion(null);
  }, [confirmandoAccion, anularDocumento, eliminarBorrador, feedback, labelTipo]);

  const handleImprimir = useCallback((doc: DocumentoComercial) => {
    setMenuAbierto(null);
    const ventana = window.open('', '_blank', 'width=600,height=700');
    if (!ventana) { feedback.error('No se pudo abrir la ventana de impresión.'); return; }
    const numero = doc.numero ?? formatearNumeroParaBorrador(doc.serie);
    const simbolo = obtenerSimboloMoneda(doc.moneda);
    ventana.document.write(`<html><head><title>${labelTipo} ${numero}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}th{text-align:left;font-size:11px;text-transform:uppercase;color:#666;padding:6px 8px;border-bottom:2px solid #ddd}td{padding:6px 8px;font-size:13px;border-bottom:1px solid #eee}.total{text-align:right;font-weight:bold;font-size:16px;margin-top:12px}</style></head><body><h1>${labelTipo}: ${numero}</h1><p>Fecha: ${doc.fechaEmision} | Estado: ${doc.estado} | Moneda: ${doc.moneda}</p>${doc.cliente ? `<p><strong>Cliente:</strong> ${doc.cliente.nombre}<br><small>${formatearDocumentoCliente(doc.cliente.tipoDocumento, doc.cliente.numeroDocumento)}</small></p>` : ''}<table><thead><tr><th>Descripción</th><th>Cant.</th><th>P.Unit.</th><th>Importe</th></tr></thead><tbody>${doc.items.map((i) => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${simbolo} ${i.price.toFixed(2)}</td><td>${simbolo} ${(i.price * i.quantity).toFixed(2)}</td></tr>`).join('')}</tbody></table><div class="total">Total: ${simbolo} ${doc.totales.total.toFixed(2)}</div>${doc.observaciones ? `<p><strong>Observaciones:</strong> ${doc.observaciones}</p>` : ''}<script>window.onload=function(){window.print()}</script></body></html>`);
    ventana.document.close();
    feedback.info('Preparando impresión...');
  }, [labelTipo, feedback]);

  const handleCompartirEmail = useCallback((doc: DocumentoComercial) => {
    setMenuCompartirAbierto(null); setMenuAbierto(null);
    const texto = generarTextoCompartir(doc, labelTipo);
    const numero = doc.numero ?? formatearNumeroParaBorrador(doc.serie);
    window.open(`mailto:${doc.cliente?.email ? encodeURIComponent(doc.cliente.email) : ''}?subject=${encodeURIComponent(`${labelTipo} ${numero}`)}&body=${encodeURIComponent(texto)}`, '_self');
  }, [labelTipo]);

  const handleCompartirWhatsApp = useCallback((doc: DocumentoComercial) => {
    setMenuCompartirAbierto(null); setMenuAbierto(null);
    window.open(`https://wa.me/?text=${encodeURIComponent(generarTextoCompartir(doc, labelTipo))}`, '_blank');
  }, [labelTipo]);

  const handleCopiarTexto = useCallback(async (doc: DocumentoComercial) => {
    setMenuCompartirAbierto(null); setMenuAbierto(null);
    try {
      await navigator.clipboard.writeText(generarTextoCompartir(doc, labelTipo));
      feedback.success('Información copiada al portapapeles.');
    } catch { feedback.error('No se pudo copiar al portapapeles.'); }
  }, [labelTipo, feedback]);

  const handleExportarExcel = useCallback(async () => {
    if (documentosFiltrados.length === 0) {
      feedback.warning('No hay documentos para exportar con los filtros actuales.');
      return;
    }
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
        const idxCliente = columnasExcel.findIndex((c) => c.key === 'cliente');
        columnasExcel.splice(
          idxCliente >= 0 ? idxCliente + 1 : columnasExcel.length,
          0,
          { header: 'N° Doc. Cliente', key: 'numeroDocCliente', width: 18 },
        );
      }

      if (columnasExcel.length === 0) {
        feedback.warning('No hay columnas visibles para exportar.');
        return;
      }

      await exportDatasetToExcel({
        rows: filas,
        columns: columnasExcel,
        filename: `${TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo].toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}`,
        worksheetName: TIPO_DOCUMENTO_COMERCIAL_LABELS[tipo],
      });
      feedback.success('Exportación completada.');
    } catch {
      feedback.error('Error al exportar. Intente nuevamente.');
    } finally {
      setExportando(false);
    }
  }, [documentosFiltrados, columnasDef, columnasVisibles, columnaNumerolabel, tipo, feedback]);

  return (
    <div className="space-y-3">
      {/* Barra principal: búsqueda + fechas + acciones */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, número..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={12} /></button>
          )}
        </div>

        {/* Fechas siempre visibles */}
        <div className="flex items-center gap-1">
          <input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPaginaActual(1); }} className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500" title="Desde" />
          <span className="text-gray-400 text-xs">—</span>
          <input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPaginaActual(1); }} className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 outline-none focus:ring-1 focus:ring-violet-500" title="Hasta" />
        </div>

        {/* Filtro estados */}
        <button
          type="button"
          onClick={() => setMostrarFiltrosEstado((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${estadosFiltro.length > 0 ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}
        >
          Estado
          {estadosFiltro.length > 0 && <span className="text-xs bg-violet-600 text-white rounded-full px-1.5 py-0.5 leading-none">{estadosFiltro.length}</span>}
        </button>

        {hayFiltrosActivos && (
          <button type="button" onClick={limpiarFiltros} className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline">Limpiar</button>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={() => setMostrarConfigColumnas((v) => !v)} className="flex items-center gap-1 px-2.5 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 transition-colors" title="Personalizar columnas">
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline text-xs">Columnas</span>
          </button>
          <button type="button" onClick={() => void handleExportarExcel()} disabled={exportando} className="flex items-center gap-1 px-2.5 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50" title="Exportar a Excel">
            <Download size={14} />
            <span className="hidden sm:inline text-xs">Excel</span>
          </button>
          <button type="button" onClick={handleNuevo} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg shadow-sm transition-all whitespace-nowrap">
            <Plus size={15} />{TIPO_DOCUMENTO_COMERCIAL_NUEVA[tipo]}
          </button>
        </div>
      </div>

      {/* Panel estados */}
      {mostrarFiltrosEstado && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Filtrar por estado</p>
          <div className="flex flex-wrap gap-1.5">
            {estadosDisponibles.map((estado) => (
              <button key={estado} type="button" onClick={() => toggleEstadoFiltro(estado as EstadoDocumentoComercial)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${estadosFiltro.includes(estado as EstadoDocumentoComercial) ? 'bg-violet-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-violet-300'}`}>
                {estado}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Panel configuración de columnas */}
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

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {documentosFiltrados.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"><Search size={20} /></div>
            <p className="text-sm">{hayFiltrosActivos ? 'No hay documentos con los filtros aplicados' : `Aún no hay ${labelTipo.toLowerCase()}s`}</p>
            {!hayFiltrosActivos && <button type="button" onClick={handleNuevo} className="text-sm text-violet-600 dark:text-violet-400 font-medium underline">Crear la primera</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                      {columnasVisibles.has('numero') && (
                        <td className="px-4 py-3">
                          <span className={`font-mono text-sm ${doc.esBorrador ? 'text-gray-400 dark:text-gray-500' : 'font-semibold text-gray-800 dark:text-gray-100'}`}>{numeroMostrado}</span>
                        </td>
                      )}
                      {columnasVisibles.has('cliente') && (
                        <td className="px-4 py-3">
                          <span className={`font-medium truncate max-w-[160px] block ${doc.cliente?.nombre ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 text-xs'}`}>
                            {doc.cliente?.nombre ?? 'Sin cliente'}
                          </span>
                        </td>
                      )}
                      {columnasVisibles.has('docCliente') && (
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{docCliente}</td>
                      )}
                      {columnasVisibles.has('fechaEmision') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{doc.fechaEmision}</td>
                      )}
                      {columnasVisibles.has('fechaVencimiento') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{doc.camposOpcionales?.fechaVencimiento ?? '—'}</td>
                      )}
                      {columnasVisibles.has('formaPago') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.formaPago ?? '—'}</td>
                      )}
                      {columnasVisibles.has('moneda') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.moneda}</td>
                      )}
                      {columnasVisibles.has('total') && (
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                          {obtenerSimboloMoneda(doc.moneda)} {doc.totales.total.toFixed(2)}
                        </td>
                      )}
                      {columnasVisibles.has('estado') && (
                        <td className="px-4 py-3"><EstadoDocumentoBadge estado={doc.estado} /></td>
                      )}
                      {columnasVisibles.has('usuario') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-[100px] truncate">{doc.vendedor ?? '—'}</td>
                      )}
                      {columnasVisibles.has('metodoEnvio') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.camposOpcionales?.metodoEnvio ?? '—'}</td>
                      )}
                      {columnasVisibles.has('fechaEnvio') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{doc.camposOpcionales?.fechaEntrega ?? '—'}</td>
                      )}
                      {columnasVisibles.has('requiereAprobacion') && (
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{doc.camposOpcionales?.requiereAprobacion ? 'Sí' : 'No'}</td>
                      )}
                      {columnasVisibles.has('docRelacionado') && (
                        <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{doc.trazabilidad?.documentoOrigenNumero ?? '—'}</td>
                      )}
                      <td className="px-4 py-3 relative">
                        <button type="button" onClick={() => setMenuAbierto((p) => p === doc.id ? null : doc.id)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-400">
                          <MoreHorizontal size={16} />
                        </button>
                        {menuAbierto === doc.id && (
                          <div className="absolute right-2 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl min-w-[170px] overflow-hidden">
                            <button type="button" onClick={() => { setMenuAbierto(null); setDocumentoDetalle(doc); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><Eye size={14} />Ver detalle</button>
                            {puedeEditar(doc) && <button type="button" onClick={() => handleEditar(doc)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><Edit3 size={14} />Editar</button>}
                            <button type="button" onClick={() => handleDuplicar(doc.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><Copy size={14} />Duplicar</button>
                            {!doc.esBorrador && <button type="button" onClick={() => handleImprimir(doc)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><Printer size={14} />Imprimir</button>}
                            {!doc.esBorrador && (
                              <div className="relative">
                                <button type="button" onClick={() => setMenuCompartirAbierto((p) => p === doc.id ? null : doc.id)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><Share2 size={14} />Compartir</button>
                                {menuCompartirAbierto === doc.id && (
                                  <div className="absolute left-full top-0 ml-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl min-w-[150px] overflow-hidden">
                                    <button type="button" onClick={() => handleCompartirEmail(doc)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><Mail size={14} />Por correo</button>
                                    <button type="button" onClick={() => handleCompartirWhatsApp(doc)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><MessageCircle size={14} />WhatsApp</button>
                                    <button type="button" onClick={() => void handleCopiarTexto(doc)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"><ClipboardCopy size={14} />Copiar texto</button>
                                  </div>
                                )}
                              </div>
                            )}
                            {puedeAnular(doc) && <button type="button" onClick={() => { setMenuAbierto(null); setConfirmandoAccion({ tipo: 'anular', id: doc.id, numero: doc.numero, motivo: '' }); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Ban size={14} />Anular</button>}
                            {doc.esBorrador && <button type="button" onClick={() => { setMenuAbierto(null); setConfirmandoAccion({ tipo: 'eliminar', id: doc.id, motivo: '' }); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} />Eliminar borrador</button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
          {documentosFiltrados.length > 0
            ? `Mostrando ${inicio + 1}–${Math.min(inicio + REGISTROS_POR_PAGINA, documentosFiltrados.length)} de ${documentosFiltrados.length}`
            : 'Sin resultados'}
        </span>
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
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{TIPO_DOCUMENTO_COMERCIAL_LABELS[documentoDetalle.tipo]}</p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {documentoDetalle.esBorrador ? formatearNumeroParaBorrador(documentoDetalle.serie) : documentoDetalle.numero ?? '—'}
                </h2>
              </div>
              <button type="button" onClick={() => setDocumentoDetalle(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
            </div>
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

              {documentoDetalle.motivoAnulacion && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-2">Anulación</p>
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
                          <p className="text-xs text-gray-500">{item.quantity} × {obtenerSimboloMoneda(documentoDetalle.moneda)} {item.price.toFixed(2)}</p>
                        </div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 ml-3 whitespace-nowrap">{obtenerSimboloMoneda(documentoDetalle.moneda)} {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1 text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
                    <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {documentoDetalle.totales.subtotal.toFixed(2)}</span></div>
                    {documentoDetalle.totales.igv > 0 && <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>IGV</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {documentoDetalle.totales.igv.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white"><span>Total</span><span>{obtenerSimboloMoneda(documentoDetalle.moneda)} {documentoDetalle.totales.total.toFixed(2)}</span></div>
                  </div>
                </div>
              )}

              {documentoDetalle.observaciones && (
                <div><p className="text-xs font-semibold text-gray-500 uppercase mb-1">Observaciones</p><p className="text-sm text-gray-700 dark:text-gray-300">{documentoDetalle.observaciones}</p></div>
              )}

              <div className="pt-4 flex gap-3 flex-wrap">
                {puedeEditar(documentoDetalle) && (
                  <button type="button" onClick={() => { setDocumentoDetalle(null); handleEditar(documentoDetalle); }} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-violet-300 text-violet-700 dark:text-violet-300 dark:border-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                    <Edit3 size={14} />Editar
                  </button>
                )}
                <button type="button" onClick={() => { setDocumentoDetalle(null); handleDuplicar(documentoDetalle.id); }} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Copy size={14} />Duplicar
                </button>
                {!documentoDetalle.esBorrador && (
                  <button type="button" onClick={() => { setDocumentoDetalle(null); handleImprimir(documentoDetalle); }} className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Printer size={14} />Imprimir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación con motivo de anulación */}
      {confirmandoAccion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {confirmandoAccion.tipo === 'anular' ? 'Anular documento' : 'Eliminar borrador'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {confirmandoAccion.tipo === 'anular'
                ? `¿Está seguro que desea anular ${confirmandoAccion.numero ?? 'este documento'}?`
                : '¿Está seguro que desea eliminar este borrador? Se perderán todos los datos.'}
            </p>
            {confirmandoAccion.tipo === 'anular' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Motivo de anulación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={confirmandoAccion.motivo}
                  onChange={(e) => setConfirmandoAccion((prev) => prev ? { ...prev, motivo: e.target.value } : null)}
                  placeholder="Ingrese el motivo de anulación..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 outline-none resize-none"
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setConfirmandoAccion(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAccion}
                disabled={confirmandoAccion.tipo === 'anular' && !confirmandoAccion.motivo.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmandoAccion.tipo === 'anular' ? 'Anular' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(menuAbierto || menuCompartirAbierto) && (
        <div className="fixed inset-0 z-40" onClick={() => { setMenuAbierto(null); setMenuCompartirAbierto(null); }} />
      )}
    </div>
  );
}
