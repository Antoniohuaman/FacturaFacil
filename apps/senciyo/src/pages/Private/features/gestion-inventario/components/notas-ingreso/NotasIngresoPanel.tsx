// src/features/gestion-inventario/components/notas-ingreso/NotasIngresoPanel.tsx

import React, { useState, useMemo } from 'react';
import { Search, Plus, Eye, Pencil, Trash2, Copy, Printer, SlidersHorizontal, Download } from 'lucide-react';
import { useNotasIngreso } from '../../hooks/useNotasIngreso';
import {
  TIPO_INGRESO_LABEL,
  ESTADO_NI_BADGE,
  TIPOS_INGRESO,
} from '../../models/notaIngreso.constants';
import type { NotaIngreso, EstadoNotaIngreso, TipoIngreso } from '../../models/notaIngreso.types';
import FormularioNotaIngreso from './FormularioNotaIngreso';
import DetalleNotaIngreso from './DetalleNotaIngreso';
import { imprimirNotaIngreso } from '../../services/notaIngreso.print';
import { prepararDuplicado } from '../../services/notaIngreso.service';
import { useFeedback } from '../../../../../../shared/feedback';
import { exportDatasetToExcel } from '@/shared/export/exportToExcel';

const PAGE_SIZE = 15;

const DOC_ORIGEN_LABEL: Record<string, string> = {
  '01': 'Factura', '03': 'Boleta de Venta', '52': 'Liq. de compra', '91': 'Comp. de operaciones',
};

const fmtFecha = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const NotasIngresoPanel: React.FC = () => {
  const { notas, eliminarNI } = useNotasIngreso();
  const feedback = useFeedback();

  const [vista, setVista] = useState<'lista' | 'nuevo' | 'editar'>('lista');
  const [notaEditando, setNotaEditando] = useState<NotaIngreso | undefined>();
  const [notaDetalle, setNotaDetalle] = useState<NotaIngreso | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoNotaIngreso | 'todos'>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroTipoIngreso, setFiltroTipoIngreso] = useState<TipoIngreso | ''>('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  const resetearFiltrosAvanzados = () => {
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setFiltroTipoIngreso('');
    setFiltroProveedor('');
    setFiltroAlmacen('');
    setPaginaActual(1);
  };

  const filtrosAdicActivos = [
    filtroFechaDesde, filtroFechaHasta, filtroTipoIngreso, filtroProveedor, filtroAlmacen,
  ].filter(Boolean).length;

  const almacenesEnNotas = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; nombre: string }[] = [];
    for (const n of notas) {
      if (!seen.has(n.almacenDestinoId)) {
        seen.add(n.almacenDestinoId);
        result.push({ id: n.almacenDestinoId, nombre: n.almacenDestinoNombre });
      }
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
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
    if (filtroTipoIngreso) {
      lista = lista.filter(n => n.tipoIngreso === filtroTipoIngreso);
    }
    if (filtroProveedor.trim()) {
      const q = filtroProveedor.trim().toLowerCase();
      lista = lista.filter(n => (n.proveedorNombre ?? '').toLowerCase().includes(q));
    }
    if (filtroAlmacen) {
      lista = lista.filter(n => n.almacenDestinoId === filtroAlmacen);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        n =>
          (n.numero ?? '').toLowerCase().includes(q) ||
          (n.proveedorNombre ?? '').toLowerCase().includes(q) ||
          (n.almacenDestinoNombre ?? '').toLowerCase().includes(q) ||
          TIPO_INGRESO_LABEL[n.tipoIngreso]?.toLowerCase().includes(q),
      );
    }
    return lista.sort(
      (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
    );
  }, [notas, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroTipoIngreso, filtroProveedor, filtroAlmacen, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / PAGE_SIZE));
  const notasPagina = notasFiltradas.slice(
    (paginaActual - 1) * PAGE_SIZE,
    paginaActual * PAGE_SIZE,
  );

  const handleBusquedaChange = (v: string) => { setBusqueda(v); setPaginaActual(1); };
  const handleFiltroEstado = (v: EstadoNotaIngreso | 'todos') => { setFiltroEstado(v); setPaginaActual(1); };

  const handleNuevo = () => { setNotaEditando(undefined); setVista('nuevo'); };
  const handleEditar = (nota: NotaIngreso) => { setNotaEditando(nota); setVista('editar'); };
  const handleGuardado = () => { setVista('lista'); setNotaEditando(undefined); };
  const handleCancelar = () => { setVista('lista'); setNotaEditando(undefined); };

  const handleEliminar = async (nota: NotaIngreso) => {
    const ok = await feedback.openConfirm({
      title: 'Eliminar borrador',
      message: `¿Eliminar el borrador ${nota.serie}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      icon: 'danger',
    });
    if (ok) eliminarNI(nota.id);
  };

  const handleDuplicar = (nota: NotaIngreso) => {
    const duplicada = prepararDuplicado(nota);
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
        fechaDocumento: fmtFecha(n.fechaDocumento),
        fechaIngreso: fmtFecha(n.fechaIngresoAlmacen),
        tipoIngreso: `${n.tipoIngreso} — ${TIPO_INGRESO_LABEL[n.tipoIngreso] ?? n.tipoIngreso}`,
        proveedor: n.proveedorNombre ?? '—',
        documentoProveedor: n.numeroDocumentoProveedor ?? '—',
        almacen: n.almacenDestinoNombre,
        moneda: n.moneda,
        total: n.total,
        estado: n.estado,
        docOrigen: n.documentoOrigen
          ? `${DOC_ORIGEN_LABEL[n.documentoOrigen] ?? n.documentoOrigen}${n.numeroDocumentoOrigen ? `: ${n.numeroDocumentoOrigen}` : ''}`
          : '—',
        guiaRemision: n.guiaRemision ?? '—',
        observaciones: n.observaciones ?? '',
      }));
      await exportDatasetToExcel({
        rows,
        columns: [
          { header: 'Número', key: 'numero', width: 20 },
          { header: 'Fecha documento', key: 'fechaDocumento', width: 16 },
          { header: 'Fecha ingreso almacén', key: 'fechaIngreso', width: 22 },
          { header: 'Tipo de ingreso', key: 'tipoIngreso', width: 36 },
          { header: 'Proveedor', key: 'proveedor', width: 30 },
          { header: 'RUC / DNI', key: 'documentoProveedor', width: 15 },
          { header: 'Almacén', key: 'almacen', width: 25 },
          { header: 'Moneda', key: 'moneda', width: 10 },
          { header: 'Total', key: 'total', width: 14, numFmt: '#,##0.00' },
          { header: 'Estado', key: 'estado', width: 12 },
          { header: 'Doc. origen', key: 'docOrigen', width: 30 },
          { header: 'Guía de remisión', key: 'guiaRemision', width: 20 },
          { header: 'Observaciones', key: 'observaciones', width: 40 },
        ],
        filename: `notas-ingreso-${new Date().toISOString().split('T')[0]}`,
        worksheetName: 'Notas de Ingreso',
      });
    } catch {
      feedback.error('Error al exportar. Intente nuevamente.');
    }
  };

  if (vista === 'nuevo' || vista === 'editar') {
    return (
      <FormularioNotaIngreso
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
              placeholder="Buscar por número, proveedor..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={e => handleFiltroEstado(e.target.value as EstadoNotaIngreso | 'todos')}
            className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
          >
            <option value="todos">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Generada">Generada</option>
            <option value="Anulada">Anulada</option>
          </select>

          {/* Advanced filters toggle */}
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

          {/* Export to Excel */}
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
            Nueva nota de ingreso
          </button>
        </div>
      </div>

      {/* Advanced filter panel */}
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
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tipo de ingreso</label>
              <select
                value={filtroTipoIngreso}
                onChange={e => { setFiltroTipoIngreso(e.target.value as TipoIngreso | ''); setPaginaActual(1); }}
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              >
                <option value="">Todos los tipos</option>
                {TIPOS_INGRESO.map(t => (
                  <option key={t.codigo} value={t.codigo}>{t.codigo} — {t.descripcion}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Proveedor</label>
              <input
                type="text"
                value={filtroProveedor}
                onChange={e => { setFiltroProveedor(e.target.value); setPaginaActual(1); }}
                placeholder="Buscar proveedor..."
                className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Almacén</label>
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
              {notas.length === 0 ? 'No hay notas de ingreso registradas' : 'Sin resultados para los filtros aplicados'}
            </p>
            {notas.length === 0 && (
              <button onClick={handleNuevo} className="mt-4 text-sm text-[#6F36FF] dark:text-[#8B5CF6] hover:underline">
                Crear primera nota de ingreso
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tipo ingreso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Proveedor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">RUC / DNI</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Almacén</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {notasPagina.map(nota => {
                  const badge = ESTADO_NI_BADGE[nota.estado] ?? ESTADO_NI_BADGE['Borrador'];
                  return (
                    <tr key={nota.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {nota.numero ?? <span className="text-gray-400 italic">borrador</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {fmtFecha(nota.fechaDocumento)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs max-w-[160px] truncate">
                        {nota.tipoIngreso} — {TIPO_INGRESO_LABEL[nota.tipoIngreso]}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[140px] truncate">
                        {nota.proveedorNombre ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {nota.numeroDocumentoProveedor ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {nota.almacenDestinoNombre}
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
                          {/* Ver detalle — all states */}
                          <ActionBtn
                            title="Ver detalle"
                            onClick={() => setNotaDetalle(nota)}
                            icon={<Eye className="w-3.5 h-3.5" />}
                          />

                          {/* Borrador: Editar */}
                          {nota.estado === 'Borrador' && (
                            <ActionBtn
                              title="Editar borrador"
                              onClick={() => handleEditar(nota)}
                              icon={<Pencil className="w-3.5 h-3.5" />}
                            />
                          )}

                          {/* Generada + Anulada: Imprimir */}
                          {(nota.estado === 'Generada' || nota.estado === 'Anulada') && (
                            <ActionBtn
                              title="Imprimir"
                              onClick={() => imprimirNotaIngreso(nota)}
                              icon={<Printer className="w-3.5 h-3.5" />}
                            />
                          )}

                          {/* All states: Duplicar — opens pre-filled form, no auto-save */}
                          <ActionBtn
                            title="Duplicar como nueva nota de ingreso"
                            onClick={() => handleDuplicar(nota)}
                            icon={<Copy className="w-3.5 h-3.5" />}
                          />

                          {/* Borrador: Eliminar */}
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

            {/* Paginación */}
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

      {/* Drawer de detalle */}
      {notaDetalle && (
        <DetalleNotaIngreso
          nota={notaDetalle}
          onClose={() => setNotaDetalle(null)}
          onRefresh={() => setNotaDetalle(null)}
          onDuplicar={(notaDuplicada) => {
            setNotaDetalle(null);
            setNotaEditando(notaDuplicada);
            setVista('nuevo');
          }}
        />
      )}
    </div>
  );
};

// ── Small helper component ──────────────────────────────────────────────────
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

export default NotasIngresoPanel;
