// src/features/gestion-inventario/components/notas-salida/NotasSalidaPanel.tsx

import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, Pencil, Trash2, Copy, Printer, SlidersHorizontal, Download, Ban, PackageCheck } from 'lucide-react';
import { useNotasSalida } from '../../hooks/useNotasSalida';
import {
  TIPO_SALIDA_LABEL,
  ESTADO_NS_BADGE,
  TIPOS_SALIDA,
} from '../../models/notaSalida.constants';
import type { NotaSalida, EstadoNotaSalida, TipoSalida, ComprobanteOrigenNS, DocumentoComercialOrigenNS } from '../../models/notaSalida.types';
import FormularioNotaSalida from './FormularioNotaSalida';
import DetalleNotaSalida from './DetalleNotaSalida';
import { imprimirNotaSalida } from '../../services/notaSalida.print';
import { prepararDuplicadoNS, formatDocumentoOrigenNS } from '../../services/notaSalida.service';
import { useFeedback } from '../../../../../../shared/feedback';
import { exportDatasetToExcel } from '@/shared/export/exportToExcel';

const PAGE_SIZE = 15;

function buildNotaSalidaDesdeComprobante(from: ComprobanteOrigenNS): Partial<NotaSalida> {
  return {
    id: `ns_prev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tipoDocumento: 'nota_salida',
    estado: 'Borrador',
    esBorrador: true,
    fechaDocumento: new Date().toISOString().split('T')[0],
    tipoSalida: '01',
    moneda: (from.currency as 'PEN' | 'USD') ?? 'PEN',
    clienteNombre: from.client,
    tipoDocumentoCliente: from.clientDocType,
    numeroDocumentoCliente: from.clientDoc,
    direccionFacturacion: from.address,
    documentoOrigen: from.type,
    numeroDocumentoOrigen: from.id,
    comprobanteOrigenId: from.id,
    ordenVentaOrigenId: from.ordenVentaOrigenId,
    origen: 'Comprobante',
    lineas: from.lineas,
    baseImponible: 0,
    impuesto: 0,
    total: 0,
    historial: [],
    usuario: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    almacenOrigenId: '',
    almacenOrigenNombre: '',
    serie: '',
  };
}

function buildNotaSalidaDesdeDocumentoComercial(from: DocumentoComercialOrigenNS): Partial<NotaSalida> {
  const esDesdeOV = from.tipo === 'orden_venta';
  return {
    id: `ns_prev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tipoDocumento: 'nota_salida',
    estado: 'Borrador',
    esBorrador: true,
    fechaDocumento: new Date().toISOString().split('T')[0],
    tipoSalida: '01',
    moneda: (from.moneda as 'PEN' | 'USD') ?? 'PEN',
    clienteNombre: from.clienteNombre,
    tipoDocumentoCliente: from.clienteDocTipo,
    numeroDocumentoCliente: from.clienteDoc,
    direccionFacturacion: from.clienteDireccion,
    documentoOrigen: esDesdeOV ? 'Orden de Venta' : 'Nota de Venta',
    numeroDocumentoOrigen: from.numero,
    origen: esDesdeOV ? 'OrdenVenta' : 'NotaVenta',
    ordenVentaOrigenId: esDesdeOV ? from.id : undefined,
    notaVentaOrigenId: !esDesdeOV ? from.id : undefined,
    lineas: from.lineas,
    baseImponible: 0,
    impuesto: 0,
    total: 0,
    historial: [],
    usuario: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    almacenOrigenId: '',
    almacenOrigenNombre: '',
    serie: '',
  };
}

const fmtFecha = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const NotasSalidaPanel: React.FC = () => {
  const { notas, eliminarNS, marcarComoEntregada } = useNotasSalida();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();

  const fromComprobante = (location.state as { fromComprobante?: ComprobanteOrigenNS } | null)?.fromComprobante;
  const fromOrdenVenta = (location.state as { fromOrdenVenta?: DocumentoComercialOrigenNS } | null)?.fromOrdenVenta;
  const fromNotaVenta = (location.state as { fromNotaVenta?: DocumentoComercialOrigenNS } | null)?.fromNotaVenta;
  const fromDocumentoComercial = fromOrdenVenta ?? fromNotaVenta;

  const [vista, setVista] = useState<'lista' | 'nuevo' | 'editar'>(
    fromComprobante || fromDocumentoComercial ? 'nuevo' : 'lista'
  );
  const [notaEditando, setNotaEditando] = useState<Partial<NotaSalida> | undefined>(() => {
    if (fromComprobante) return buildNotaSalidaDesdeComprobante(fromComprobante);
    if (fromDocumentoComercial) return buildNotaSalidaDesdeDocumentoComercial(fromDocumentoComercial);
    return undefined;
  });
  const [notaDetalle, setNotaDetalle] = useState<NotaSalida | null>(null);
  const [anulacionDirecta, setAnulacionDirecta] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoNotaSalida | 'todos'>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTipoSalida, setFiltroTipoSalida] = useState<TipoSalida | ''>('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  const resetearFiltrosAvanzados = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroTipoSalida('');
    setFiltroCliente('');
    setFiltroAlmacen('');
    setPaginaActual(1);
  };

  const filtrosAdicActivos = [
    filtroFechaDesde, filtroFechaHasta, filtroTipoSalida, filtroCliente, filtroAlmacen,
  ].filter(Boolean).length;

  const almacenesEnNotas = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of notas) {
      if (n.almacenOrigenId && !seen.has(n.almacenOrigenId)) {
        seen.set(n.almacenOrigenId, n.almacenOrigenNombre);
      }
    }
    return [...seen.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [notas]);

  const notasFiltradas = useMemo(() => {
    let lista = notas;
    if (filtroEstado !== 'todos') {
      lista = lista.filter(n => n.estado === filtroEstado);
    }
    if (filtroFechaDesde) {
      lista = lista.filter(n => n.fechaDocumento >= filtroFechaDesde);
    }
    if (filtroFechaHasta) {
      lista = lista.filter(n => n.fechaDocumento <= filtroFechaHasta);
    }
    if (filtroTipoSalida) {
      lista = lista.filter(n => n.tipoSalida === filtroTipoSalida);
    }
    if (filtroCliente.trim()) {
      const q = filtroCliente.trim().toLowerCase();
      lista = lista.filter(n => (n.clienteNombre ?? '').toLowerCase().includes(q));
    }
    if (filtroAlmacen) {
      lista = lista.filter(n => n.almacenOrigenId === filtroAlmacen);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        n =>
          (n.numero ?? '').toLowerCase().includes(q) ||
          (n.clienteNombre ?? '').toLowerCase().includes(q) ||
          (n.almacenOrigenNombre ?? '').toLowerCase().includes(q) ||
          TIPO_SALIDA_LABEL[n.tipoSalida]?.toLowerCase().includes(q),
      );
    }
    return lista.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notas, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroTipoSalida, filtroCliente, filtroAlmacen, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / PAGE_SIZE));
  const notasPagina = notasFiltradas.slice(
    (paginaActual - 1) * PAGE_SIZE,
    paginaActual * PAGE_SIZE,
  );

  const handleBusquedaChange = (v: string) => { setBusqueda(v); setPaginaActual(1); };
  const handleFiltroEstado = (v: EstadoNotaSalida | 'todos') => { setFiltroEstado(v); setPaginaActual(1); };

  const handleNuevo = () => { setNotaEditando(undefined); setVista('nuevo'); };
  const handleEditar = (nota: NotaSalida) => { setNotaEditando(nota); setVista('editar'); };
  const handleAnularDesdeListar = (nota: NotaSalida) => { setAnulacionDirecta(true); setNotaDetalle(nota); };
  const handleGuardado = () => {
    setVista('lista');
    setNotaEditando(undefined);
    if (fromComprobante) {
      navigate('/comprobantes');
    } else if (fromDocumentoComercial) {
      navigate('/documentos-comerciales', {
        state: { tipo: fromDocumentoComercial.tipo },
      });
    }
  };
  const handleCancelar = () => {
    setVista('lista');
    setNotaEditando(undefined);
    if (fromComprobante) {
      navigate('/comprobantes');
    } else if (fromDocumentoComercial) {
      navigate('/documentos-comerciales', {
        state: { tipo: fromDocumentoComercial.tipo },
      });
    }
  };

  const handleEliminar = async (nota: NotaSalida) => {
    const ok = await feedback.openConfirm({
      title: 'Eliminar borrador',
      message: `¿Eliminar el borrador ${nota.serie}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      icon: 'danger',
    });
    if (ok) eliminarNS(nota.id);
  };

  const handleMarcarEntregada = async (nota: NotaSalida) => {
    const ok = await feedback.openConfirm({
      title: 'Marcar como entregada',
      message: `¿Confirmar que la nota ${nota.numero ?? nota.serie} fue entregada? Esta acción no modifica el stock.`,
      confirmText: 'Confirmar entrega',
      cancelText: 'Cancelar',
      icon: 'info',
    });
    if (ok) marcarComoEntregada(nota.id);
  };

  const handleDuplicar = (nota: NotaSalida) => {
    const duplicada = prepararDuplicadoNS(nota);
    setNotaEditando(duplicada);
    setVista('nuevo');
  };

  const handleExportar = async () => {
    if (!notasFiltradas.length) {
      feedback.warning('No hay datos para exportar con los filtros actuales.');
      return;
    }
    try {
      const rows = notasFiltradas.map(n => ({
        numero: n.numero ?? '—',
        estado: n.estado,
        fechaDocumento: fmtFecha(n.fechaDocumento),
        fechaEntregaPrevista: n.fechaEntregaPrevista ? fmtFecha(n.fechaEntregaPrevista) : '—',
        tipoSalida: `${n.tipoSalida} — ${TIPO_SALIDA_LABEL[n.tipoSalida] ?? n.tipoSalida}`,
        cliente: n.clienteNombre ?? '—',
        documentoCliente: n.numeroDocumentoCliente ?? '—',
        almacenOrigen: n.almacenOrigenNombre,
        documentoOrigen: formatDocumentoOrigenNS(n),
        moneda: n.moneda,
        total: n.total,
        observaciones: n.observaciones ?? '',
        fechaCreacion: fmtFecha(n.createdAt),
      }));
      await exportDatasetToExcel({
        rows,
        columns: [
          { header: 'Número', key: 'numero', width: 20 },
          { header: 'Estado', key: 'estado', width: 12 },
          { header: 'Fecha documento', key: 'fechaDocumento', width: 16 },
          { header: 'Fecha entrega prevista', key: 'fechaEntregaPrevista', width: 22 },
          { header: 'Tipo de salida', key: 'tipoSalida', width: 40 },
          { header: 'Cliente', key: 'cliente', width: 30 },
          { header: 'RUC / DNI', key: 'documentoCliente', width: 15 },
          { header: 'Almacén origen', key: 'almacenOrigen', width: 28 },
          { header: 'Documento origen', key: 'documentoOrigen', width: 28 },
          { header: 'Moneda', key: 'moneda', width: 10 },
          { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
          { header: 'Observaciones', key: 'observaciones', width: 40 },
          { header: 'Fecha creación', key: 'fechaCreacion', width: 16 },
        ],
        filename: `notas-salida-${new Date().toISOString().split('T')[0]}`,
        worksheetName: 'Notas de Salida',
      });
    } catch {
      feedback.error('Error al exportar. Intente nuevamente.');
    }
  };

  if (vista === 'nuevo' || vista === 'editar') {
    return (
      <FormularioNotaSalida
        notaInicial={notaEditando}
        onCancelar={handleCancelar}
        onGuardado={handleGuardado}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-h-0">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => handleBusquedaChange(e.target.value)}
              placeholder="Buscar por número, cliente..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={e => handleFiltroEstado(e.target.value as EstadoNotaSalida | 'todos')}
            className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
          >
            <option value="todos">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Generada">Generada</option>
            <option value="Entregada">Entregada</option>
            <option value="Anulada">Anulada</option>
          </select>

          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`relative h-9 px-3 text-sm border rounded-lg flex items-center gap-1.5 transition-colors ${
              mostrarFiltros || filtrosAdicActivos > 0
                ? 'border-[#6F36FF] bg-[#6F36FF]/5 text-[#6F36FF] dark:border-[#8B5CF6] dark:bg-[#8B5CF6]/10 dark:text-[#8B5CF6]'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {filtrosAdicActivos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#6F36FF] dark:bg-[#8B5CF6] text-white text-[10px] flex items-center justify-center font-bold">
                {filtrosAdicActivos}
              </span>
            )}
          </button>

          <button
            onClick={() => void handleExportar()}
            title="Exportar a Excel"
            className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <div className="flex-1" />

          <button
            onClick={handleNuevo}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-white bg-[#6F36FF] rounded-lg hover:bg-[#6F36FF]/90 dark:bg-[#8B5CF6] dark:hover:bg-[#8B5CF6]/90 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva nota de salida
          </button>
        </div>
      </div>

      {/* Filtros avanzados */}
      {mostrarFiltros && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha desde</label>
              <input
                type="date"
                value={filtroFechaDesde}
                onChange={e => { setFiltroFechaDesde(e.target.value); setPaginaActual(1); }}
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha hasta</label>
              <input
                type="date"
                value={filtroFechaHasta}
                onChange={e => { setFiltroFechaHasta(e.target.value); setPaginaActual(1); }}
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo de salida</label>
              <select
                value={filtroTipoSalida}
                onChange={e => { setFiltroTipoSalida(e.target.value as TipoSalida | ''); setPaginaActual(1); }}
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              >
                <option value="">Todos los tipos</option>
                {TIPOS_SALIDA.map(t => (
                  <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.descripcion}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cliente</label>
              <input
                type="text"
                value={filtroCliente}
                onChange={e => { setFiltroCliente(e.target.value); setPaginaActual(1); }}
                placeholder="Buscar cliente..."
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Almacén origen</label>
              <select
                value={filtroAlmacen}
                onChange={e => { setFiltroAlmacen(e.target.value); setPaginaActual(1); }}
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              >
                <option value="">Todos los almacenes</option>
                {almacenesEnNotas.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {filtrosAdicActivos > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={resetearFiltrosAvanzados}
                className="text-xs text-[#6F36FF] dark:text-[#8B5CF6] hover:underline"
              >
                Limpiar filtros avanzados
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-6">
        {notasPagina.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <Search className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {notas.length === 0 ? 'No hay notas de salida registradas' : 'Sin resultados para los filtros aplicados'}
            </p>
            {notas.length === 0 && (
              <button onClick={handleNuevo} className="mt-4 text-sm text-[#6F36FF] dark:text-[#8B5CF6] hover:underline">
                Crear primera nota de salida
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tipo salida</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">RUC / DNI</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Almacén origen</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Documento origen</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {notasPagina.map(nota => {
                  const badge = ESTADO_NS_BADGE[nota.estado] ?? ESTADO_NS_BADGE['Borrador'];
                  return (
                    <tr key={nota.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {nota.numero ?? <span className="text-gray-400 italic">borrador</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {fmtFecha(nota.fechaDocumento)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs max-w-[160px] truncate">
                        {nota.tipoSalida} — {TIPO_SALIDA_LABEL[nota.tipoSalida]}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[140px] truncate">
                        {nota.clienteNombre ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {nota.numeroDocumentoCliente ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[160px] truncate">
                        {nota.almacenOrigenNombre || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[160px] truncate">
                        {formatDocumentoOrigenNS(nota)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white text-xs">
                        {nota.moneda} {nota.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <ActionBtn
                            title="Ver detalle"
                            onClick={() => setNotaDetalle(nota)}
                            icon={<Eye className="w-3.5 h-3.5" />}
                          />

                          {nota.estado === 'Borrador' && (
                            <ActionBtn
                              title="Editar borrador"
                              onClick={() => handleEditar(nota)}
                              icon={<Pencil className="w-3.5 h-3.5" />}
                            />
                          )}

                          {(nota.estado === 'Generada' || nota.estado === 'Entregada' || nota.estado === 'Anulada') && (
                            <ActionBtn
                              title="Imprimir"
                              onClick={() => imprimirNotaSalida(nota)}
                              icon={<Printer className="w-3.5 h-3.5" />}
                            />
                          )}

                          {nota.estado === 'Generada' && (
                            <ActionBtn
                              title="Marcar como entregada"
                              onClick={() => void handleMarcarEntregada(nota)}
                              icon={<PackageCheck className="w-3.5 h-3.5" />}
                            />
                          )}

                          <ActionBtn
                            title="Duplicar como nueva nota de salida"
                            onClick={() => handleDuplicar(nota)}
                            icon={<Copy className="w-3.5 h-3.5" />}
                          />

                          {nota.estado === 'Generada' && (
                            <ActionBtn
                              title="Anular nota de salida"
                              onClick={() => handleAnularDesdeListar(nota)}
                              icon={<Ban className="w-3.5 h-3.5" />}
                              danger
                            />
                          )}

                          {nota.estado === 'Borrador' && (
                            <ActionBtn
                              title="Eliminar borrador"
                              onClick={() => void handleEliminar(nota)}
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              danger
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Página {paginaActual} de {totalPaginas} — {notasFiltradas.length} resultado(s)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {notaDetalle && (
        <DetalleNotaSalida
          nota={notaDetalle}
          iniciarAnulacion={anulacionDirecta}
          onClose={() => { setNotaDetalle(null); setAnulacionDirecta(false); }}
          onRefresh={() => { setNotaDetalle(null); setAnulacionDirecta(false); }}
          onDuplicar={(notaDuplicada) => {
            setNotaDetalle(null);
            setAnulacionDirecta(false);
            setNotaEditando(notaDuplicada);
            setVista('nuevo');
          }}
        />
      )}
    </div>
  );
};

interface ActionBtnProps {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}
const ActionBtn: React.FC<ActionBtnProps> = ({ title, onClick, icon, danger }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg transition-colors ${
      danger
        ? 'text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        : 'text-gray-400 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/10'
    }`}
  >
    {icon}
  </button>
);

export default NotasSalidaPanel;
