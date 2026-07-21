// src/features/gestion-inventario/components/transferencias/TransferenciasPanel.tsx

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Eye, Truck, CheckCircle, XCircle, Ban, Download } from 'lucide-react';
import type { Transferencia, EstadoTransferencia } from '../../models/transferencia.types';
import DetalleTransferencia from './DetalleTransferencia';
import ConfirmacionAnulacion from './ConfirmacionAnulacion';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { getUnitDisplayForUI } from '@/shared/units/unitDisplay';
import { formatBusinessDateTimeForTicket, getBusinessTodayISODate } from '@/shared/time/businessTime';

interface TransferenciasPanelProps {
  transferencias: Transferencia[];
  onNuevaTransferencia: () => void;
  onDespachar: (id: string) => void;
  onRecibir: (id: string) => void;
  onCancelar: (id: string) => void;
  onAnular: (id: string) => void;
  /** ID del establecimiento activo del usuario */
  currentEstablecimientoId: string;
  /** Si el usuario tiene permiso inventario.transferir en el establecimiento activo */
  puedeTransferir: boolean;
}

const ESTADO_BADGE: Record<EstadoTransferencia, { label: string; cls: string }> = {
  PENDIENTE:   { label: 'Pendiente',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700' },
  EN_TRANSITO: { label: 'En tránsito', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700' },
  CONFIRMADA:  { label: 'Confirmada',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700' },
  RECIBIDA:    { label: 'Recibida',    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-700' },
  CANCELADA:   { label: 'Cancelada',   cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600' },
  ANULADA:     { label: 'Anulada',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700' },
  REVERTIDA:   { label: 'Revertida',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700' },
};

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  INTRA_ESTABLECIMIENTO: { label: 'Mismo estab.', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  INTER_ESTABLECIMIENTO: { label: 'Entre estab.', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

const ESTADOS_TODOS = 'todos';

const TransferenciasPanel: React.FC<TransferenciasPanelProps> = ({
  transferencias,
  onNuevaTransferencia,
  onDespachar,
  onRecibir,
  onCancelar,
  onAnular,
  currentEstablecimientoId,
  puedeTransferir,
}) => {
  const [detallId, setDetallId] = useState<string | null>(null);
  const [anularId, setAnularId] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>(ESTADOS_TODOS);
  const [filtroTipo, setFiltroTipo] = useState<string>(ESTADOS_TODOS);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 15;

  const { allProducts } = useProductStore();
  const { state: configState } = useConfigurationContext();

  // Mapa productoId → unidad display para mostrar junto a la cantidad
  const unidadPorProducto = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allProducts) {
      map[p.id] = getUnitDisplayForUI({
        units: configState.units,
        code: p.unidad,
        fallbackSymbol: p.unitSymbol,
        fallbackName: p.unitName,
      }) || p.unidad || '';
    }
    return map;
  }, [allProducts, configState.units]);

  const datosFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    return transferencias.filter(t => {
      if (filtroEstado !== ESTADOS_TODOS && t.estado !== filtroEstado) return false;
      if (filtroTipo !== ESTADOS_TODOS && t.tipoTransferencia !== filtroTipo) return false;
      if (termino) {
        return (
          t.id.toLowerCase().includes(termino) ||
          t.productoNombre.toLowerCase().includes(termino) ||
          t.productoCodigo.toLowerCase().includes(termino) ||
          t.almacenOrigenNombre.toLowerCase().includes(termino) ||
          t.almacenDestinoNombre.toLowerCase().includes(termino)
        );
      }
      return true;
    });
  }, [transferencias, filtroEstado, filtroTipo, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(datosFiltrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * POR_PAGINA;
  const datosPagina = datosFiltrados.slice(inicio, inicio + POR_PAGINA);

  const handleFiltroEstado = (v: string) => { setFiltroEstado(v); setPagina(1); };
  const handleFiltroTipo = (v: string) => { setFiltroTipo(v); setPagina(1); };
  const handleBusqueda = (v: string) => { setBusqueda(v); setPagina(1); };

  const transferenciaDetalle = detallId ? transferencias.find(t => t.id === detallId) : null;
  const transferenciaAnular = anularId ? transferencias.find(t => t.id === anularId) : null;

  const confirmarAnulacion = () => {
    if (anularId) {
      onAnular(anularId);
      setAnularId(null);
    }
  };

  // Exportar a Excel los resultados filtrados (todas las páginas)
  const handleExportarExcel = () => {
    const formatFecha = (d?: Date): string => {
      if (!d) return '—';
      try {
        return formatBusinessDateTimeForTicket(d instanceof Date ? d : new Date(d as unknown as string));
      } catch {
        return '—';
      }
    };

    const data = datosFiltrados.map(t => ({
      'Código':                t.id,
      'Fecha creación':        formatFecha(t.fecha),
      'Producto':              t.productoNombre,
      'Código producto':       t.productoCodigo,
      'Cantidad':              t.cantidad,
      'Unidad':                unidadPorProducto[t.productoId] || '—',
      'Tipo':                  t.tipoTransferencia === 'INTRA_ESTABLECIMIENTO' ? 'Mismo establecimiento' : 'Entre establecimientos',
      'Estado':                ESTADO_BADGE[t.estado].label,
      'Estab. origen':         t.establecimientoOrigenNombre || '—',
      'Almacén origen':        t.almacenOrigenNombre,
      'Estab. destino':        t.establecimientoDestinoNombre || '—',
      'Almacén destino':       t.almacenDestinoNombre,
      'Usuario':               t.usuario,
      'Referencia':            t.documentoReferencia || '—',
      'Observaciones':         t.observaciones || '—',
      'Fecha despacho':        formatFecha(t.fechaDespacho),
      'Fecha recepción':       formatFecha(t.fechaRecepcion),
      'Fecha anulación':       formatFecha(t.fechaAnulacion),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transferencias');

    ws['!cols'] = [
      { wch: 22 }, { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 25 }, { wch: 28 }, { wch: 25 },
      { wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
    ];

    XLSX.writeFile(wb, `transferencias-inventario-${getBusinessTodayISODate()}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-[#E5E7EB] dark:border-gray-700 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={e => handleBusqueda(e.target.value)}
              placeholder="Buscar por código, producto o almacén…"
              className="h-9 pl-9 pr-3 w-full text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 focus:border-[#6F36FF] dark:bg-gray-700 dark:text-white transition-all"
            />
          </div>

          {/* Estado */}
          <select
            value={filtroEstado}
            onChange={e => handleFiltroEstado(e.target.value)}
            className="h-9 px-3 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 transition-all"
          >
            <option value={ESTADOS_TODOS}>Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_TRANSITO">En tránsito</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="RECIBIDA">Recibida</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="ANULADA">Anulada</option>
          </select>

          {/* Tipo */}
          <select
            value={filtroTipo}
            onChange={e => handleFiltroTipo(e.target.value)}
            className="h-9 px-3 text-sm border border-[#E5E7EB] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 transition-all"
          >
            <option value={ESTADOS_TODOS}>Todos los tipos</option>
            <option value="INTRA_ESTABLECIMIENTO">Mismo establecimiento</option>
            <option value="INTER_ESTABLECIMIENTO">Entre establecimientos</option>
          </select>

          <div className="flex-1" />

          {/* Exportar Excel */}
          <button
            onClick={handleExportarExcel}
            disabled={datosFiltrados.length === 0}
            title="Exportar transferencias filtradas a Excel"
            className="inline-flex items-center h-9 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Excel
          </button>

          {/* Nueva transferencia */}
          <button
            onClick={onNuevaTransferencia}
            className="inline-flex items-center h-9 px-4 text-sm font-medium text-white bg-[#6F36FF] hover:bg-[#6F36FF]/90 dark:bg-[#8B5CF6] dark:hover:bg-[#8B5CF6]/90 rounded-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva transferencia
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-[#E5E7EB] dark:border-gray-700 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E5E7EB] dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {['Código', 'Fecha', 'Producto', 'Origen', 'Destino', 'Cant.', 'Tipo', 'Estado', 'Usuario', 'Referencia', 'Acciones'].map(h => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-[#111827] dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-[#E5E7EB] dark:divide-gray-700">
                {datosPagina.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <svg className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No hay transferencias</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {busqueda || filtroEstado !== ESTADOS_TODOS || filtroTipo !== ESTADOS_TODOS
                          ? 'Ajusta los filtros para ver resultados'
                          : 'Crea la primera transferencia con el botón de arriba'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  datosPagina.map(t => {
                    const estadoBadge = ESTADO_BADGE[t.estado];
                    const tipoBadge = TIPO_BADGE[t.tipoTransferencia];
                    const unidad = unidadPorProducto[t.productoId] || '';
                    const esOrigen = t.establecimientoOrigenId === currentEstablecimientoId;
                    const esDestino = t.establecimientoDestinoId === currentEstablecimientoId;
                    const flags = {
                      puedeDespachar:
                        puedeTransferir &&
                        t.estado === 'PENDIENTE' &&
                        t.tipoTransferencia === 'INTER_ESTABLECIMIENTO' &&
                        esOrigen,
                      puedeRecibir:
                        puedeTransferir &&
                        t.estado === 'EN_TRANSITO' &&
                        esDestino,
                      puedeCancelar:
                        puedeTransferir &&
                        t.estado === 'PENDIENTE' &&
                        esOrigen,
                      puedeAnular:
                        puedeTransferir &&
                        (t.estado === 'CONFIRMADA' || t.estado === 'RECIBIDA' || t.estado === 'EN_TRANSITO') &&
                        (esOrigen || esDestino),
                    };
                    return (
                      <tr key={t.id} className="hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors">
                        {/* Código */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-xs font-mono font-medium text-[#6F36FF] dark:text-[#8B5CF6]">{t.id}</span>
                        </td>
                        {/* Fecha */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {formatBusinessDateTimeForTicket(t.fecha)}
                        </td>
                        {/* Producto */}
                        <td className="px-3 py-2.5 max-w-[160px]">
                          <p className="text-xs font-medium text-[#111827] dark:text-gray-100 truncate" title={t.productoNombre}>{t.productoNombre}</p>
                          <p className="text-xs font-mono text-gray-400">{t.productoCodigo}</p>
                        </td>
                        {/* Origen */}
                        <td className="px-3 py-2.5 max-w-[140px]">
                          <p className="text-xs font-medium text-[#111827] dark:text-gray-100 truncate" title={t.almacenOrigenNombre}>{t.almacenOrigenNombre}</p>
                          {t.establecimientoOrigenNombre && (
                            <p className="text-xs text-gray-400 truncate" title={t.establecimientoOrigenNombre}>{t.establecimientoOrigenNombre}</p>
                          )}
                        </td>
                        {/* Destino */}
                        <td className="px-3 py-2.5 max-w-[140px]">
                          <p className="text-xs font-medium text-[#111827] dark:text-gray-100 truncate" title={t.almacenDestinoNombre}>{t.almacenDestinoNombre}</p>
                          {t.establecimientoDestinoNombre && (
                            <p className="text-xs text-gray-400 truncate" title={t.establecimientoDestinoNombre}>{t.establecimientoDestinoNombre}</p>
                          )}
                        </td>
                        {/* Cantidad con unidad */}
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          <span className="text-sm font-bold text-[#111827] dark:text-gray-100">{t.cantidad}</span>
                          {unidad && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{unidad}</span>}
                        </td>
                        {/* Tipo */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${tipoBadge.cls}`}>
                            {tipoBadge.label}
                          </span>
                        </td>
                        {/* Estado */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge.cls}`}>
                            {estadoBadge.label}
                          </span>
                        </td>
                        {/* Usuario */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 max-w-[100px] truncate" title={t.usuario}>
                          {t.usuario}
                        </td>
                        {/* Referencia */}
                        <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[110px] truncate" title={t.documentoReferencia}>
                          {t.documentoReferencia || '—'}
                        </td>
                        {/* Acciones */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {/* Ver */}
                            <button
                              onClick={() => setDetallId(t.id)}
                              title="Ver detalle"
                              className="p-1.5 text-gray-400 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-md transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Despachar */}
                            {flags.puedeDespachar && (
                              <button
                                onClick={() => onDespachar(t.id)}
                                title="Despachar"
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Recibir */}
                            {flags.puedeRecibir && (
                              <button
                                onClick={() => onRecibir(t.id)}
                                title="Confirmar recepción"
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancelar */}
                            {flags.puedeCancelar && (
                              <button
                                onClick={() => onCancelar(t.id)}
                                title="Cancelar"
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Anular — acción destructiva, ícono Ban */}
                            {flags.puedeAnular && (
                              <button
                                onClick={() => setAnularId(t.id)}
                                title="Anular transferencia"
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {datosFiltrados.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#E5E7EB] dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-[#4B5563] dark:text-gray-400 tabular-nums">
                <span className="font-medium text-[#111827] dark:text-gray-100">
                  {inicio + 1}–{Math.min(inicio + POR_PAGINA, datosFiltrados.length)}
                </span>
                {' '}de{' '}
                <span className="font-medium text-[#111827] dark:text-gray-100">{datosFiltrados.length}</span>
              </p>
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaSegura === 1}
                  className="p-1.5 text-gray-400 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-[#4B5563] dark:text-gray-400 tabular-nums px-2">
                  {paginaSegura} / {totalPaginas}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura === totalPaginas}
                  className="p-1.5 text-gray-400 hover:text-[#6F36FF] hover:bg-[#6F36FF]/8 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {transferenciaDetalle && (
        <DetalleTransferencia
          transferencia={transferenciaDetalle}
          onCerrar={() => setDetallId(null)}
        />
      )}

      {/* Modal confirmación anulación */}
      {transferenciaAnular && (
        <ConfirmacionAnulacion
          transferencia={transferenciaAnular}
          onConfirmar={confirmarAnulacion}
          onCancelar={() => setAnularId(null)}
        />
      )}
    </div>
  );
};

export default TransferenciasPanel;
