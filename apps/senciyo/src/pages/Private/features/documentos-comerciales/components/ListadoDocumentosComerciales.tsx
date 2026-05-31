import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Copy,
  Ban,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { EstadoDocumentoBadge } from './EstadoDocumentoBadge';
import { useDocumentosComercialesContext } from '../contexts/DocumentosComercialesContext';
import { useDocumentoComercialActions } from '../hooks/useDocumentoComercialActions';
import type {
  TipoDocumentoComercial,
  DocumentoComercial,
  EstadoDocumentoComercial,
  FiltrosDocumentosComerciales,
} from '../models/documentoComercial.types';
import {
  TIPO_DOCUMENTO_COMERCIAL_NUEVA,
  ESTADOS_POR_TIPO,
} from '../models/documentoComercial.constants';

interface ListadoDocumentosComercialesProps {
  tipo: TipoDocumentoComercial;
}

const REGISTROS_POR_PAGINA = 10;

export default function ListadoDocumentosComerciales({
  tipo,
}: ListadoDocumentosComercialesProps) {
  const navigate = useNavigate();
  const { state } = useDocumentosComercialesContext();
  const { anularDocumento, duplicarDocumento, eliminarBorrador } = useDocumentoComercialActions();

  const [filtros, setFiltros] = useState<Omit<FiltrosDocumentosComerciales, 'tipo'>>({
    busqueda: '',
    estados: [],
    fechaDesde: '',
    fechaHasta: '',
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [documentoDetalle, setDocumentoDetalle] = useState<DocumentoComercial | null>(null);
  const [confirmandoAccion, setConfirmandoAccion] = useState<{
    tipo: 'anular' | 'eliminar';
    id: string;
    numero?: string;
  } | null>(null);

  const estadosDisponibles = ESTADOS_POR_TIPO[tipo];

  const documentosFiltrados = useMemo(() => {
    let lista = state.documentos.filter((d) => d.tipo === tipo);

    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      lista = lista.filter(
        (d) =>
          d.cliente?.nombre?.toLowerCase().includes(q) ||
          d.cliente?.numeroDocumento?.includes(q) ||
          d.numero?.toLowerCase().includes(q) ||
          d.serie?.toLowerCase().includes(q),
      );
    }

    if (filtros.estados && filtros.estados.length > 0) {
      lista = lista.filter((d) =>
        filtros.estados!.includes(d.estado),
      );
    }

    if (filtros.fechaDesde) {
      lista = lista.filter((d) => d.fechaEmision >= filtros.fechaDesde!);
    }

    if (filtros.fechaHasta) {
      lista = lista.filter((d) => d.fechaEmision <= filtros.fechaHasta!);
    }

    return lista.sort(
      (a, b) =>
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
    );
  }, [state.documentos, tipo, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(documentosFiltrados.length / REGISTROS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;
  const documentosPagina = documentosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);

  const limpiarFiltros = () => {
    setFiltros({ busqueda: '', estados: [], fechaDesde: '', fechaHasta: '' });
    setPaginaActual(1);
  };

  const toggleEstadoFiltro = (estado: EstadoDocumentoComercial) => {
    setFiltros((prev) => {
      const estados = prev.estados ?? [];
      return {
        ...prev,
        estados: estados.includes(estado)
          ? estados.filter((e) => e !== estado)
          : [...estados, estado],
      };
    });
    setPaginaActual(1);
  };

  const handleNuevo = () => {
    navigate(`/documentos-comerciales/nuevo/${tipo}`);
  };

  const handleEditar = (doc: DocumentoComercial) => {
    setMenuAbierto(null);
    navigate(`/documentos-comerciales/editar/${doc.id}`, { state: { documento: doc } });
  };

  const handleDuplicar = (id: string) => {
    setMenuAbierto(null);
    const resultado = duplicarDocumento(id);
    if (resultado.exito && resultado.documento) {
      navigate(`/documentos-comerciales/editar/${resultado.documento.id}`, {
        state: { documento: resultado.documento },
      });
    }
  };

  const handleConfirmarAccion = () => {
    if (!confirmandoAccion) return;
    if (confirmandoAccion.tipo === 'anular') {
      anularDocumento(confirmandoAccion.id);
    } else {
      eliminarBorrador(confirmandoAccion.id);
    }
    setConfirmandoAccion(null);
  };

  const hayFiltrosActivos =
    (filtros.busqueda ?? '').trim() !== '' ||
    (filtros.estados ?? []).length > 0 ||
    (filtros.fechaDesde ?? '') !== '' ||
    (filtros.fechaHasta ?? '') !== '';

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por cliente, número..."
              value={filtros.busqueda ?? ''}
              onChange={(e) => {
                setFiltros((p) => ({ ...p, busqueda: e.target.value }));
                setPaginaActual(1);
              }}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
            {(filtros.busqueda ?? '').trim() !== '' && (
              <button
                type="button"
                onClick={() => setFiltros((p) => ({ ...p, busqueda: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMostrarFiltros((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              hayFiltrosActivos
                ? 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-600'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
            }`}
          >
            <Filter size={14} />
            <span>Filtros</span>
            {hayFiltrosActivos && (
              <span className="text-xs bg-violet-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                {(filtros.estados ?? []).length +
                  ((filtros.fechaDesde ?? '') !== '' ? 1 : 0) +
                  ((filtros.fechaHasta ?? '') !== '' ? 1 : 0)}
              </span>
            )}
          </button>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
            >
              Limpiar
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleNuevo}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg shadow-sm transition-all"
        >
          <Plus size={15} />
          {TIPO_DOCUMENTO_COMERCIAL_NUEVA[tipo]}
        </button>
      </div>

      {/* Filtros avanzados */}
      {mostrarFiltros && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Desde
              </label>
              <input
                type="date"
                value={filtros.fechaDesde ?? ''}
                onChange={(e) => {
                  setFiltros((p) => ({ ...p, fechaDesde: e.target.value }));
                  setPaginaActual(1);
                }}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Hasta
              </label>
              <input
                type="date"
                value={filtros.fechaHasta ?? ''}
                onChange={(e) => {
                  setFiltros((p) => ({ ...p, fechaHasta: e.target.value }));
                  setPaginaActual(1);
                }}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {estadosDisponibles.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => toggleEstadoFiltro(estado as EstadoDocumentoComercial)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    (filtros.estados ?? []).includes(estado as EstadoDocumentoComercial)
                      ? 'bg-violet-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-violet-300'
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {documentosFiltrados.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Search size={20} />
            </div>
            <p className="text-sm">
              {hayFiltrosActivos
                ? 'No hay documentos con los filtros aplicados'
                : 'Aún no hay documentos en este módulo'}
            </p>
            {!hayFiltrosActivos && (
              <button
                type="button"
                onClick={handleNuevo}
                className="text-sm text-violet-600 dark:text-violet-400 font-medium underline"
              >
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Moneda
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {documentosPagina.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {doc.numero ?? (doc.esBorrador ? `${doc.serie || '—'} (borrador)` : '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.cliente ? (
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[200px]">
                            {doc.cliente.nombre}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {doc.cliente.tipoDocumento}: {doc.cliente.numeroDocumento}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Sin cliente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {doc.fechaEmision}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {doc.moneda}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                      {doc.moneda === 'USD' ? '$' : 'S/'}{' '}
                      {doc.totales.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoDocumentoBadge estado={doc.estado} />
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuAbierto((prev) => (prev === doc.id ? null : doc.id))
                        }
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-400"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {menuAbierto === doc.id && (
                        <div className="absolute right-2 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl min-w-[160px] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setMenuAbierto(null);
                              setDocumentoDetalle(doc);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Eye size={14} />
                            Ver detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditar(doc)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Edit3 size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicar(doc.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Copy size={14} />
                            Duplicar
                          </button>
                          {!doc.esBorrador && doc.estado !== 'Anulada' && doc.estado !== 'Convertida' && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAbierto(null);
                                setConfirmandoAccion({ tipo: 'anular', id: doc.id, numero: doc.numero });
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Ban size={14} />
                              Anular
                            </button>
                          )}
                          {doc.esBorrador && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAbierto(null);
                                setConfirmandoAccion({ tipo: 'eliminar', id: doc.id });
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={14} />
                              Eliminar borrador
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Mostrando {inicio + 1}–{Math.min(inicio + REGISTROS_POR_PAGINA, documentosFiltrados.length)} de{' '}
            {documentosFiltrados.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={paginaSegura <= 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2">
              {paginaSegura} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {documentoDetalle && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end"
          onClick={() => setDocumentoDetalle(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 h-full w-full max-w-lg shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {TIPO_DOCUMENTO_COMERCIAL_NUEVA[documentoDetalle.tipo].replace('Nueva ', '')}
                </p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {documentoDetalle.numero ?? 'Borrador'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDocumentoDetalle(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <EstadoDocumentoBadge estado={documentoDetalle.estado} tamano="md" />

              {documentoDetalle.cliente && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Cliente
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {documentoDetalle.cliente.nombre}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {documentoDetalle.cliente.tipoDocumento}: {documentoDetalle.cliente.numeroDocumento}
                  </p>
                  {documentoDetalle.cliente.email && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {documentoDetalle.cliente.email}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha emisión</p>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.fechaEmision}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Moneda</p>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{documentoDetalle.moneda}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Forma de pago</p>
                  <p className="font-medium text-gray-800 dark:text-gray-100">
                    {documentoDetalle.formaPago ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                  <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                    {documentoDetalle.moneda === 'USD' ? '$' : 'S/'}{' '}
                    {documentoDetalle.totales.total.toFixed(2)}
                  </p>
                </div>
              </div>

              {documentoDetalle.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Ítems ({documentoDetalle.items.length})
                  </p>
                  <div className="space-y-2">
                    {documentoDetalle.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.quantity} × {documentoDetalle.moneda === 'USD' ? '$' : 'S/'} {item.price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 ml-3">
                          {documentoDetalle.moneda === 'USD' ? '$' : 'S/'}{' '}
                          {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documentoDetalle.observaciones && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Observaciones
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {documentoDetalle.observaciones}
                  </p>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDocumentoDetalle(null);
                    handleEditar(documentoDetalle);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-violet-300 text-violet-700 dark:text-violet-300 dark:border-violet-600 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  <Edit3 size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentoDetalle(null);
                    handleDuplicar(documentoDetalle.id);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Copy size={14} />
                  Duplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmandoAccion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {confirmandoAccion.tipo === 'anular' ? 'Anular documento' : 'Eliminar borrador'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {confirmandoAccion.tipo === 'anular'
                ? `¿Está seguro que desea anular ${confirmandoAccion.numero ?? 'este documento'}? Esta acción no se puede deshacer.`
                : '¿Está seguro que desea eliminar este borrador? Se perderán todos los datos.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmandoAccion(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAccion}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {confirmandoAccion.tipo === 'anular' ? 'Anular' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cerrar menú al hacer clic fuera */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenuAbierto(null)}
        />
      )}
    </div>
  );
}
